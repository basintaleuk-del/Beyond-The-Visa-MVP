import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = () =>
  createClient(url, serviceKey, { auth: { persistSession: false } });
const clean = (v: unknown, n = 2000) =>
  String(v ?? "")
    .trim()
    .slice(0, n);
const dateParts = (timeZone = "Europe/London", d = new Date()) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, x.value])
  );
const londonDate = (d = new Date()) => {
  const p = dateParts("Europe/London", d);
  return `${p.year}-${p.month}-${p.day}`;
};
const monthStart = (date: string) => date.slice(0, 7) + "-01";
const currentSponsor = (rows: any[], date: string) => {
  const month = monthStart(date);
  return (
    rows.find((row: any) => row.sponsored_month === month) ||
    rows.find(
      (row: any) =>
        !row.sponsored_month &&
        (!row.start_date || row.start_date <= date) &&
        (!row.end_date || row.end_date >= date)
    ) ||
    null
  );
};
const canonicalProfession = (v: unknown) => {
  const x = clean(v, 40).toLowerCase();
  return x.startsWith("midwi")
    ? "midwifery"
    : x.startsWith("nurs")
    ? "nursing"
    : "";
};
const authUser = async (req: Request) => {
  const token = req.headers.get("Authorization");
  if (!token) return null;
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
};
const sha = async (v: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))
    )
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const isAdmin = async (db: any, user: any) =>
  !!user &&
  (user.app_metadata?.role === "admin" ||
    user.app_metadata?.role === "owner" ||
    (
      await db.from("profiles").select("role").eq("id", user.id).maybeSingle()
    ).data?.role?.match(/admin|owner/));

async function settings(db: any) {
  const { data, error } = await db
    .from("golden_question_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data;
}
async function profileFor(db: any, user: any) {
  const { data, error } = await db
    .from("profiles")
    .select(
      "id,profession,golden_profession,golden_profession_locked_at,golden_public_name,golden_leaderboard_opt_out,golden_show_location,full_name,avatar_path,qualification_country,destination_country,role"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function signedImage(db: any, path?: string) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || /^data:image\/svg\+xml[;,]/i.test(path))
    return path;
  const { data } = await db.storage
    .from("golden-question-images")
    .createSignedUrl(path, 900);
  return data?.signedUrl || null;
}
const audienceFor = (profession: string) =>
  profession === "midwifery" ? "midwife" : "nurse";
const optionsFor = (q: any) =>
  ["A", "B", "C", "D"].map((key, i) => ({
    id: `${q.id}:${key}`,
    option_key: key,
    option_text: q[`option_${key.toLowerCase()}`],
    sort_order: i,
  }));
const publicQuestion = (q: any) => ({
  id: q.id,
  profession: q.audience === "both" ? "both" : canonicalProfession(q.audience),
  question_type: "equipment",
  question_text: q.prompt,
  teaser: q.prompt,
  category: q.category,
  subcategory: null,
  difficulty: q.difficulty,
  image_alt: q.image_caption || "Clinical equipment for identification",
  sharing_enabled: true,
});
const adminQuestion = (q: any, metrics: any = {}) => ({
  ...publicQuestion(q),
  audience: q.audience,
  golden_question_options: optionsFor(q),
  correct_answer: [q.correct_option],
  acceptable_answers: [],
  explanation: q.explanation,
  safety_points: null,
  clinical_reference: q.source_reference,
  image_path: q.question_image_url,
  image_alt: q.image_caption,
  image_credit: null,
  copyright_notes: null,
  publication_date: q.publication_date,
  base_points: null,
  max_speed_bonus: 0,
  speed_bonus_enabled: false,
  sharing_enabled: true,
  is_active: q.is_active,
  status: q.archived_at ? "archived" : q.is_active ? "approved" : "draft",
  eligible_for_random: q.eligible_for_random,
  archived_at: q.archived_at,
  last_released_at: q.last_released_at,
  created_at: q.created_at,
  updated_at: q.updated_at,
  sort_order: q.sort_order,
  source_hash: q.source_hash,
  ...metrics,
});
async function ensureAssignment(
  db: any,
  profession: string,
  date: string,
  userId?: string
) {
  let { data: assignment } = await db
    .from("golden_question_daily_assignments")
    .select("*")
    .eq("assignment_date", date)
    .eq("profession", profession)
    .in("status", ["scheduled", "active"])
    .maybeSingle();
  if (assignment) {
    if (assignment.status === "scheduled") {
      await db
        .from("golden_question_daily_assignments")
        .update({ status: "active" })
        .eq("id", assignment.id);
      assignment.status = "active";
    }
    return assignment;
  }
  const { data: pool, error } = await db
    .from("btv_golden_questions")
    .select("id")
    .in("audience", [audienceFor(profession), "both"])
    .eq("is_active", true)
    .eq("eligible_for_random", true)
    .is("archived_at", null)
    .or(`publication_date.is.null,publication_date.lte.${date}`);
  if (error) throw error;
  if (!pool?.length) return null;
  const { data: used } = await db
    .from("golden_question_daily_assignments")
    .select("question_id")
    .eq("profession", profession)
    .order("assignment_date", { ascending: false })
    .limit(pool.length);
  const usedIds = new Set((used || []).map((x: any) => x.question_id)),
    fresh = pool.filter((x: any) => !usedIds.has(x.id));
  let choices = fresh.length ? fresh : pool;
  const previous = (used || [])[0]?.question_id;
  if (choices.length > 1 && previous)
    choices = choices.filter((x: any) => x.id !== previous);
  const digest = await sha(`${date}:${profession}:beyond-the-visa`),
    pick = choices[parseInt(digest.slice(0, 8), 16) % choices.length];
  const inserted = await db
    .from("golden_question_daily_assignments")
    .insert({
      assignment_date: date,
      profession,
      question_id: pick.id,
      assignment_source: "automatic",
      status: "active",
      created_by: userId || null,
    })
    .select("*")
    .single();
  if (inserted.error) {
    const race = await db
      .from("golden_question_daily_assignments")
      .select("*")
      .eq("assignment_date", date)
      .eq("profession", profession)
      .in("status", ["scheduled", "active"])
      .single();
    if (race.error) throw inserted.error;
    return race.data;
  }
  return inserted.data;
}
async function rankRows(
  db: any,
  profession: string,
  month: string,
  userId?: string
) {
  const { data, error } = await db
    .from("golden_question_monthly_scores")
    .select("*")
    .eq("competition_month", month)
    .eq("profession", profession)
    .eq("is_disqualified", false)
    .order("points", { ascending: false })
    .order("correct_answers", { ascending: false })
    .order("longest_streak", { ascending: false })
    .order("final_score_achieved_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  const ids = (data || []).map((x: any) => x.user_id),
    profiles = ids.length
      ? (
          await db
            .from("profiles")
            .select(
              "id,full_name,golden_public_name,golden_leaderboard_opt_out,golden_show_location,qualification_country,destination_country"
            )
            .in("id", ids)
        ).data || []
      : [];
  const byId = new Map(profiles.map((x: any) => [x.id, x])),
    previous = new Date(month + "T12:00:00Z");
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousMonth = previous.toISOString().slice(0, 7) + "-01";
  const { data: winner } = await db
    .from("golden_question_winners")
    .select("user_id")
    .eq("competition_month", previousMonth)
    .eq("profession", profession)
    .eq("verification_status", "approved")
    .maybeSingle();
  return (data || []).map((x: any, i: number) => {
    const p: any = byId.get(x.user_id) || {};
    return {
      position: i + 1,
      user_id: x.user_id,
      display_name: p.golden_leaderboard_opt_out
        ? "Anonymous Participant"
        : p.golden_public_name || p.full_name || "Participant",
      avatar_url: null,
      location: p.golden_show_location
        ? p.qualification_country || p.destination_country
        : null,
      points: x.points,
      correct_answers: x.correct_answers,
      attempts: x.attempts,
      current_streak: x.current_streak,
      accuracy: x.attempts
        ? Math.round((x.correct_answers * 100) / x.attempts)
        : 0,
      previous_winner: winner?.user_id === x.user_id,
      is_me: x.user_id === userId,
    };
  });
}
async function getToday(db: any, user: any, body: any) {
  const s = await settings(db);
  if (s.feature_paused)
    return {
      state: "paused",
      message: "The Golden Question is temporarily paused.",
    };
  const profile = await profileFor(db, user);
  let profession = canonicalProfession(
    body.profession && (await isAdmin(db, user))
      ? body.profession
      : profile?.golden_profession || profile?.profession
  );
  if (!profession) return { state: "profession_missing" };
  if (!profile.golden_profession) {
    await db
      .from("profiles")
      .update({
        golden_profession: profession,
        golden_profession_locked_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }
  const date = londonDate(),
    assignment = await ensureAssignment(db, profession, date, user.id);
  if (!assignment) return { state: "empty", profession, date };
  await db.from("golden_question_analytics_events").upsert(
    {
      user_id: user.id,
      daily_question_id: assignment.id,
      event_type: "impression",
      profession,
    },
    {
      onConflict: "user_id,daily_question_id,event_type",
      ignoreDuplicates: true,
    }
  );
  const { data: q, error } = await db
    .from("btv_golden_questions")
    .select("*")
    .eq("id", assignment.question_id)
    .single();
  if (error) throw error;
  const options = optionsFor(q);
  const { data: attempt } = await db
    .from("golden_question_attempts")
    .select("is_correct,review_status,points_awarded,streak_bonus,submitted_at")
    .eq("user_id", user.id)
    .eq("daily_question_id", assignment.id)
    .maybeSingle();
  const { count } = await db
    .from("golden_question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("daily_question_id", assignment.id);
  const ranks = await rankRows(db, profession, monthStart(date), user.id),
    me = ranks.find((x: any) => x.is_me);
  const { data: sponsorRows } = await db
      .from("golden_question_sponsors")
      .select(
        "id,name,logo_path,website_url,message,prize_description,start_date,end_date,sponsored_month"
      )
      .eq("is_active", true)
      .order("sponsored_month", { ascending: false })
      .limit(50),
    sponsor = currentSponsor(sponsorRows || [], date);
  const result: any = {
    state: attempt ? "answered" : "ready",
    date,
    profession,
    assignment: { id: assignment.id },
    question: {
      ...publicQuestion(q),
      image_url: await signedImage(db, q.question_image_url),
    },
    options,
    attempt_count: count || 0,
    monthly_points: me?.points || 0,
    position: me?.position || null,
    leaderboard: ranks.slice(0, s.leaderboard_limit || 50),
    sponsor: sponsor
      ? {
          ...sponsor,
          logo_url: await signedImage(db, sponsor.logo_path),
          logo_path: undefined,
        }
      : null,
    settings: {
      sharing_enabled: s.sharing_enabled,
      commenting_enabled: s.commenting_enabled,
      terms: s.competition_terms,
      reward: s.monthly_bc_reward,
      sponsor_wording: s.sponsor_prize_wording,
    },
  };
  if (attempt)
    result.result = {
      ...attempt,
      correct_answer: q.correct_option,
      acceptable_answers: [],
      explanation: q.explanation,
      safety_points: null,
      clinical_reference: q.source_reference,
      post_answer_annotations: [],
    };
  return result;
}
function normalAnswer(v: any) {
  return Array.isArray(v)
    ? v
        .map(String)
        .map((x) => x.trim().toLowerCase())
        .sort()
    : [
        String(v ?? "")
          .trim()
          .toLowerCase(),
      ];
}
async function submit(db: any, user: any, body: any) {
  const date = londonDate(),
    profile = await profileFor(db, user),
    profession = canonicalProfession(
      profile?.golden_profession || profile?.profession
    );
  if (!profession)
    throw Object.assign(Error("PROFESSION_REQUIRED"), { status: 409 });
  const { data: terms } = await db
    .from("golden_question_terms_acceptances")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("terms_version", "v1")
    .maybeSingle();
  if (!terms) throw Object.assign(Error("TERMS_REQUIRED"), { status: 409 });
  const { data: a, error: ae } = await db
    .from("golden_question_daily_assignments")
    .select("*")
    .eq("id", clean(body.daily_question_id, 80))
    .eq("assignment_date", date)
    .eq("profession", profession)
    .eq("status", "active")
    .single();
  if (ae) throw Object.assign(Error("QUESTION_EXPIRED"), { status: 409 });
  const { data: q, error } = await db
    .from("btv_golden_questions")
    .select("*")
    .eq("id", a.question_id)
    .single();
  if (error) throw error;
  if (
    !q.is_active ||
    q.archived_at ||
    ![audienceFor(profession), "both"].includes(q.audience)
  )
    throw Object.assign(Error("QUESTION_UNAVAILABLE"), { status: 409 });
  const { data: impression } = await db
    .from("golden_question_analytics_events")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("daily_question_id", a.id)
    .eq("event_type", "impression")
    .maybeSingle();
  const measured = impression
    ? Math.round(
        (Date.now() - new Date(impression.created_at).getTime()) / 1000
      )
    : Number(body.duration_seconds) || 0;
  const answer = body.answer,
    duration = Math.max(0, Math.min(86400, measured)),
    correct = normalAnswer(answer).includes(
      String(q.correct_option).toLowerCase()
    ),
    review = "not_required";
  const s = await settings(db),
    base = correct ? Number(s.correct_points) : 0,
    speed = 0;
  const { data: score, error: se } = await db.rpc("btv_record_golden_attempt", {
    p_user: user.id,
    p_daily: a.id,
    p_question: q.id,
    p_profession: profession,
    p_answer: answer,
    p_correct: correct,
    p_base: base,
    p_speed: speed,
    p_duration: duration,
    p_review: review,
  });
  if (se)
    throw Object.assign(
      Error(
        se.message.includes("ALREADY_ANSWERED")
          ? "ALREADY_ANSWERED"
          : se.message
      ),
      { status: 409 }
    );
  const fingerprint = await sha(
    `${clean(body.client_hint, 300)}:${user.id}:golden-question`
  );
  await db
    .from("golden_question_attempts")
    .update({
      client_fingerprint_hash: fingerprint,
      suspicious_flags: duration < 2 ? ["unrealistic_speed"] : [],
    })
    .eq("user_id", user.id)
    .eq("daily_question_id", a.id);
  await db.from("golden_question_analytics_events").insert({
    user_id: user.id,
    daily_question_id: a.id,
    event_type: "attempt_completed",
    profession,
    duration_seconds: duration,
    metadata: { correct, review_status: review },
  });
  const ranks = await rankRows(db, profession, monthStart(date), user.id),
    me = ranks.find((x: any) => x.is_me);
  await db.from("btv_notifications").upsert(
    {
      user_id: user.id,
      category: "golden_question",
      title:
        review === "pending"
          ? "Answer submitted for review"
          : correct
          ? "Golden Question answered correctly"
          : "Golden Question answer recorded",
      body:
        review === "pending"
          ? "An educator will review your written response."
          : `You earned ${score.points_awarded || 0} competition points.`,
      action_url: "/?golden=history",
      dedupe_key: `golden-result:${a.id}`,
    },
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
  );
  if (
    (score.current_streak || 0) >= 3 &&
    [3, 7, 14].includes(score.current_streak)
  )
    await db.from("btv_notifications").upsert(
      {
        user_id: user.id,
        category: "golden_question",
        title: `${score.current_streak}-day Golden Question streak`,
        body: "Your consistent clinical learning has earned a streak milestone.",
        action_url: "/?golden=history",
        dedupe_key: `golden-streak:${profession}:${
          score.current_streak
        }:${monthStart(date)}`,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    );
  if (me?.position && me.position <= 10)
    await db.from("btv_notifications").upsert(
      {
        user_id: user.id,
        category: "golden_question",
        title:
          me.position === 1
            ? "You’re the current monthly leader"
            : "You entered the Golden Question top ten",
        body: `You are currently #${me.position} in the ${profession} leaderboard.`,
        action_url: "/?golden=leaderboard",
        dedupe_key: `golden-rank-${
          me.position === 1 ? "leader" : "top10"
        }:${profession}:${monthStart(date)}`,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    );
  return {
    state: "answered",
    is_correct: correct,
    review_status: review,
    correct_answer: q.correct_option,
    acceptable_answers: [],
    explanation: q.explanation,
    safety_points: null,
    clinical_reference: q.source_reference,
    annotations: [],
    ...score,
    position: me?.position || null,
  };
}
async function history(db: any, user: any, body: any) {
  const profile = await profileFor(db, user),
    profession = canonicalProfession(
      body.profession || profile?.golden_profession || profile?.profession
    ),
    month = clean(body.month, 10) || monthStart(londonDate());
  const { data } = await db
    .from("golden_question_attempts")
    .select(
      "id,daily_question_id,question_id,submitted_at,is_correct,review_status,points_awarded,answer,answer_duration_seconds"
    )
    .eq("user_id", user.id)
    .eq("profession", profession)
    .gte("submitted_at", month + "T00:00:00Z")
    .order("submitted_at", { ascending: false });
  const ids = (data || []).map((x: any) => x.question_id),
    qs = ids.length
      ? (
          await db
            .from("btv_golden_questions")
            .select("id,prompt,category,correct_option,explanation")
            .in("id", ids)
        ).data || []
      : [],
    map = new Map(
      qs.map((x: any) => [
        x.id,
        {
          question_text: x.prompt,
          category: x.category,
          correct_answer: x.correct_option,
          explanation: x.explanation,
        },
      ])
    );
  return {
    history: (data || []).map((x: any) => ({
      ...x,
      question: map.get(x.question_id),
    })),
    leaderboard: await rankRows(db, profession, month, user.id),
  };
}
async function discussion(db: any, user: any, body: any) {
  const daily = clean(body.daily_question_id, 80);
  if (body.operation === "list") {
    const { data } = await db
      .from("golden_question_comments")
      .select("id,user_id,body,educator_reviewed,like_count,created_at")
      .eq("daily_question_id", daily)
      .eq("status", "visible")
      .order("created_at")
      .limit(100);
    const ids = [...new Set((data || []).map((x: any) => x.user_id))],
      ps = ids.length
        ? (
            await db
              .from("profiles")
              .select(
                "id,full_name,golden_public_name,golden_leaderboard_opt_out"
              )
              .in("id", ids)
          ).data || []
        : [],
      pm = new Map(ps.map((x: any) => [x.id, x]));
    return {
      comments: (data || []).map((x: any) => {
        const p: any = pm.get(x.user_id) || {};
        return {
          ...x,
          display_name: p.golden_leaderboard_opt_out
            ? "Anonymous Participant"
            : p.golden_public_name || p.full_name || "Participant",
          user_id: undefined,
        };
      }),
    };
  }
  if (body.operation === "add") {
    const text = clean(body.body);
    if (/\b(patient|nhs)\s*(name|number)|\bmrn\b/i.test(text))
      throw Object.assign(
        Error("Do not include patient-identifiable information."),
        { status: 400 }
      );
    const { data, error } = await db
      .from("golden_question_comments")
      .insert({ daily_question_id: daily, user_id: user.id, body: text })
      .select("id,body,created_at")
      .single();
    if (error) throw error;
    return { comment: data };
  }
  if (body.operation === "report") {
    const allowed = [
      "unsafe_clinical_advice",
      "harassment",
      "spam",
      "confidentiality_breach",
      "misinformation",
    ];
    if (!allowed.includes(body.category))
      throw Error("INVALID_REPORT_CATEGORY");
    const { error } = await db.from("golden_question_comment_reports").insert({
      comment_id: body.comment_id,
      reported_by: user.id,
      category: body.category,
      details: clean(body.details, 500),
    });
    if (error) throw error;
    return { reported: true };
  }
  if (body.operation === "like") {
    const { error } = await db
      .from("golden_question_comment_likes")
      .insert({ comment_id: body.comment_id, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) throw error;
    const { count } = await db
      .from("golden_question_comment_likes")
      .select("user_id", { count: "exact", head: true })
      .eq("comment_id", body.comment_id);
    await db
      .from("golden_question_comments")
      .update({ like_count: count || 0 })
      .eq("id", body.comment_id);
    return { liked: true, like_count: count || 0 };
  }
  throw Error("INVALID_DISCUSSION_OPERATION");
}
async function publicPreview(db: any, body: any) {
  const id = clean(body.daily_question_id, 80);
  const { data: a } = await db
    .from("golden_question_daily_assignments")
    .select("id,assignment_date,profession,question_id")
    .eq("id", id)
    .maybeSingle();
  if (!a) return { state: "not_found" };
  const { data: q } = await db
    .from("btv_golden_questions")
    .select(
      "id,prompt,audience,category,difficulty,question_image_url,image_caption,is_active,archived_at"
    )
    .eq("id", a.question_id)
    .single();
  if (!q.is_active || q.archived_at) return { state: "not_found" };
  return {
    state: "preview",
    assignment: { id: a.id, date: a.assignment_date, profession: a.profession },
    question: {
      ...publicQuestion(q),
      image_url: await signedImage(db, q.question_image_url),
    },
  };
}
async function adminAction(db: any, user: any, body: any) {
  if (!(await isAdmin(db, user)))
    throw Object.assign(Error("ADMIN_REQUIRED"), { status: 403 });
  const op = clean(body.operation, 40);
  if (op === "dashboard") {
    const date = londonDate();
    const month = monthStart(date);
    const [
      assign,
      attempts,
      questions,
      winners,
      reports,
      participants,
      sponsors,
    ] = await Promise.all([
      db
        .from("golden_question_daily_assignments")
        .select("*")
        .eq("assignment_date", date),
      db
        .from("golden_question_attempts")
        .select("is_correct", { count: "exact" })
        .gte("submitted_at", date + "T00:00:00Z"),
      db
        .from("btv_golden_questions")
        .select(
          "id,audience,is_active,question_image_url,last_released_at,archived_at"
        ),
      db
        .from("golden_question_winners")
        .select("*")
        .order("competition_month", { ascending: false })
        .limit(10),
      db
        .from("golden_question_comment_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      db
        .from("golden_question_monthly_scores")
        .select("user_id", { count: "exact", head: true })
        .eq("competition_month", month),
      db
        .from("golden_question_sponsors")
        .select(
          "id,name,prize_description,start_date,end_date,sponsored_month"
        )
        .eq("is_active", true)
        .order("sponsored_month", { ascending: false })
        .limit(50),
    ]);
    const bank = questions.data || [],
      ids = (assign.data || []).map((x: any) => x.question_id),
      todayQuestions = ids.length
        ? (
            await db
              .from("btv_golden_questions")
              .select("id,prompt")
              .in("id", ids)
          ).data || []
        : [],
      qm = new Map(todayQuestions.map((x: any) => [x.id, x.prompt]));
    return {
      date,
      assignments: (assign.data || []).map((x: any) => ({
        ...x,
        question_text: qm.get(x.question_id),
      })),
      attempts: attempts.count || 0,
      correct_rate: attempts.data?.length
        ? Math.round(
            (attempts.data.filter((x: any) => x.is_correct).length * 100) /
              attempts.data.length
          )
        : 0,
      pool: bank.filter((x: any) => x.is_active && !x.archived_at).length,
      pending: 0,
      winners: winners.data || [],
      open_reports: reports.count || 0,
      counts: {
        total: bank.length,
        nurse: bank.filter((x: any) => x.audience === "nurse").length,
        midwife: bank.filter((x: any) => x.audience === "midwife").length,
        both: bank.filter((x: any) => x.audience === "both").length,
        active: bank.filter((x: any) => x.is_active && !x.archived_at).length,
        used: bank.filter((x: any) => x.last_released_at).length,
        unused: bank.filter((x: any) => !x.last_released_at).length,
        images: bank.filter((x: any) => x.question_image_url).length,
        scheduled: (assign.data || []).length,
        participants: participants.count || 0,
      },
      sponsor: currentSponsor(sponsors.data || [], date),
    };
  }
  if (op === "questions") {
    const [bank, assignments, attempts] = await Promise.all([
      db
        .from("btv_golden_questions")
        .select("*")
        .order("sort_order")
        .limit(1000),
      db
        .from("golden_question_daily_assignments")
        .select("question_id,assignment_date,status")
        .order("assignment_date", { ascending: false }),
      db.from("golden_question_attempts").select("question_id,is_correct"),
    ]);
    if (bank.error) throw bank.error;
    const byQuestion = new Map<string, any>();
    for (const row of attempts.data || []) {
      const m = byQuestion.get(row.question_id) || { responses: 0, correct: 0 };
      m.responses++;
      if (row.is_correct) m.correct++;
      byQuestion.set(row.question_id, m);
    }
    const schedules = new Map<string, string>();
    for (const row of assignments.data || [])
      if (
        ["scheduled", "active"].includes(row.status) &&
        !schedules.has(row.question_id)
      )
        schedules.set(row.question_id, row.assignment_date);
    const questions = (bank.data || []).map((q: any) => {
      const m = byQuestion.get(q.id) || { responses: 0, correct: 0 };
      return adminQuestion(q, {
        response_count: m.responses,
        correct_percentage: m.responses
          ? Math.round((m.correct * 100) / m.responses)
          : 0,
        next_scheduled_date: schedules.get(q.id) || null,
      });
    });
    return { questions, duplicate_groups: 10, total: questions.length };
  }
  if (op === "save_question") {
    const input = body.question || {},
      opts = Array.isArray(body.options) ? body.options : [],
      id = input.id || null,
      correct = clean(
        Array.isArray(input.correct_answer)
          ? input.correct_answer[0]
          : input.correct_answer,
        1
      ).toUpperCase(),
      optionMap = new Map(
        opts.map((o: any) => [
          clean(o.option_key, 1).toUpperCase(),
          clean(o.option_text, 500),
        ])
      );
    if (!["A", "B", "C", "D"].includes(correct))
      throw Error("Choose a valid correct answer.");
    const row: any = {
      audience:
        input.audience ||
        { nursing: "nurse", midwifery: "midwife", both: "both" }[
          input.profession
        ] ||
        "both",
      category: clean(input.category, 120),
      difficulty: clean(input.difficulty, 20),
      prompt: clean(input.question_text, 2000),
      question_image_url: clean(input.image_path, 1000) || null,
      image_caption: clean(input.image_alt, 500) || null,
      option_a: optionMap.get("A"),
      option_b: optionMap.get("B"),
      option_c: optionMap.get("C"),
      option_d: optionMap.get("D"),
      correct_option: correct,
      explanation: clean(input.explanation, 4000),
      is_active: input.status === "approved" && input.is_active !== false,
      eligible_for_random: input.eligible_for_random !== false,
      publication_date: input.publication_date || null,
      archived_at:
        input.status === "archived" ? new Date().toISOString() : null,
      source_reference:
        clean(input.clinical_reference, 1000) || "Golden Question Centre admin",
      updated_at: new Date().toISOString(),
    };
    if (
      !row.prompt ||
      !row.category ||
      !row.explanation ||
      [row.option_a, row.option_b, row.option_c, row.option_d].some(
        (x: any) => !x
      )
    )
      throw Error(
        "Question, category, four options and explanation are required."
      );
    if (!id) {
      row.source_hash = await sha(
        `${row.audience}:${row.prompt}:${row.option_a}:${row.option_b}:${row.option_c}:${row.option_d}`
      );
      row.sort_order =
        (
          await db
            .from("btv_golden_questions")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.sort_order + 1 || 1;
    }
    const result = id
      ? await db
          .from("btv_golden_questions")
          .update(row)
          .eq("id", id)
          .select()
          .single()
      : await db.from("btv_golden_questions").insert(row).select().single();
    if (result.error) throw result.error;
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: id ? "question_updated" : "question_created",
      entity_type: "btv_golden_question",
      entity_id: result.data.id,
      after_data: {
        id: result.data.id,
        audience: result.data.audience,
        status: row.archived_at
          ? "archived"
          : row.is_active
          ? "approved"
          : "draft",
      },
      reason: clean(body.reason, 500),
    });
    return { question: adminQuestion(result.data) };
  }
  if (op === "schedule") {
    const profession = canonicalProfession(body.profession),
      { data: q, error: qe } = await db
        .from("btv_golden_questions")
        .select("audience,is_active,archived_at")
        .eq("id", body.question_id)
        .single();
    if (qe) throw qe;
    if (
      !q.is_active ||
      q.archived_at ||
      ![audienceFor(profession), "both"].includes(q.audience)
    )
      throw Error("That question is not eligible for this profession.");
    const row = {
      assignment_date: clean(body.date, 10),
      profession,
      question_id: body.question_id,
      assignment_source: "scheduled",
      status: "scheduled",
      created_by: user.id,
    };
    const { data, error } = await db
      .from("golden_question_daily_assignments")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return { assignment: data };
  }
  if (op === "leaderboard")
    return {
      leaderboard: await rankRows(
        db,
        canonicalProfession(body.profession),
        clean(body.month, 10) || monthStart(londonDate())
      ),
    };
  if (op === "settings") {
    if (body.patch) {
      const { data, error } = await db
        .from("golden_question_settings")
        .update({
          ...body.patch,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .select()
        .single();
      if (error) throw error;
      return { settings: data };
    }
    return { settings: await settings(db) };
  }
  if (op === "award_winner") {
    const { data, error } = await db.rpc("btv_award_golden_winner", {
      p_winner: body.winner_id,
      p_admin: user.id,
    });
    if (error) throw error;
    return data;
  }
  if (op === "verify_winner") {
    const status = body.approved ? "approved" : "rejected";
    const { data, error } = await db
      .from("golden_question_winners")
      .update({
        verification_status: status,
        verification_notes: clean(body.notes, 1000),
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", body.winner_id)
      .eq("verification_status", "pending_review")
      .select()
      .single();
    if (error) throw error;
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: `winner_${status}`,
      entity_type: "winner",
      entity_id: body.winner_id,
      after_data: data,
      reason: clean(body.notes, 1000),
    });
    return { winner: data };
  }
  if (op === "freeze_month") {
    const { data, error } = await db.rpc("btv_freeze_golden_month", {
      p_month: body.month,
      p_admin: user.id,
    });
    if (error) throw error;
    return { winners_created: data };
  }
  if (op === "disqualify") {
    const patch = body.restore
      ? { is_disqualified: false, disqualification_reason: null }
      : {
          is_disqualified: true,
          disqualification_reason: clean(body.reason, 1000),
        };
    if (!body.restore && !patch.disqualification_reason)
      throw Error("A disqualification reason is required.");
    const { data, error } = await db
      .from("golden_question_monthly_scores")
      .update(patch)
      .eq("user_id", body.user_id)
      .eq("profession", canonicalProfession(body.profession))
      .eq("competition_month", body.month)
      .select()
      .single();
    if (error) throw error;
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: body.restore ? "entry_restored" : "entry_disqualified",
      entity_type: "monthly_score",
      entity_id: data.id,
      after_data: data,
      reason: patch.disqualification_reason,
    });
    return { score: data };
  }
  if (op === "moderate_report") {
    const { data: report, error } = await db
      .from("golden_question_comment_reports")
      .update({ status: "resolved", reviewed_by: user.id })
      .eq("id", body.report_id)
      .select()
      .single();
    if (error) throw error;
    if (body.remove_comment)
      await db
        .from("golden_question_comments")
        .update({ status: "removed" })
        .eq("id", report.comment_id);
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: body.remove_comment ? "comment_removed" : "report_resolved",
      entity_type: "comment_report",
      entity_id: body.report_id,
      reason: clean(body.reason, 1000),
    });
    return { resolved: true };
  }
  if (op === "review_short") {
    const { data, error } = await db.rpc("btv_review_golden_short_answer", {
      p_attempt: body.attempt_id,
      p_correct: !!body.correct,
      p_admin: user.id,
    });
    if (error) throw error;
    return data;
  }
  if (op === "save_sponsor") {
    const input = body.sponsor || {},
      sponsorId = clean(input.id, 60) || null,
      row = {
      name: clean(body.sponsor?.name, 200),
      logo_path: clean(input.logo_path, 1000) || null,
      logo_permission_notes:
        clean(input.logo_permission_notes, 1000) || null,
      website_url: clean(input.website_url, 1000) || null,
      message: clean(input.message, 1000) || null,
      prize_description: clean(input.prize_description, 1000) || null,
      start_date: clean(input.start_date, 10) || null,
      end_date: clean(input.end_date, 10) || null,
      sponsored_month: clean(input.sponsored_month, 10) || null,
      is_active: input.is_active === true || input.is_active === "on",
      updated_at: new Date().toISOString(),
    };
    if (!row.name) throw Error("Sponsor name is required.");
    if (row.start_date && row.end_date && row.start_date > row.end_date)
      throw Error("Sponsor end date must be on or after its start date.");
    const before = sponsorId
      ? (
          await db
            .from("golden_question_sponsors")
            .select("*")
            .eq("id", sponsorId)
            .single()
        ).data
      : null;
    const write = sponsorId
      ? db.from("golden_question_sponsors").update(row).eq("id", sponsorId)
      : db
          .from("golden_question_sponsors")
          .insert({ ...row, created_by: user.id });
    const { data, error } = await write.select().single();
    if (error) throw error;
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: sponsorId ? "sponsor_updated" : "sponsor_created",
      entity_type: "sponsor",
      entity_id: data.id,
      before_data: before,
      after_data: data,
      reason: sponsorId
        ? "Sponsor and prize record updated"
        : "Sponsor and permission record created",
    });
    return { sponsor: data };
  }
  if (op === "save_fulfilment") {
    const row = {
      winner_id: body.fulfilment?.winner_id,
      sponsor_id: body.fulfilment?.sponsor_id || null,
      prize_description: clean(body.fulfilment?.prize_description, 1000),
      dispatch_status:
        clean(body.fulfilment?.dispatch_status, 50) || "not_started",
      tracking_reference:
        clean(body.fulfilment?.tracking_reference, 200) || null,
      private_notes: clean(body.fulfilment?.private_notes, 2000) || null,
      winner_contacted_at: body.fulfilment?.winner_contacted
        ? new Date().toISOString()
        : null,
      delivery_information_requested_at: body.fulfilment?.delivery_requested
        ? new Date().toISOString()
        : null,
      completed_at:
        body.fulfilment?.dispatch_status === "completed"
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from("golden_question_prize_fulfilments")
      .upsert(row, { onConflict: "winner_id" })
      .select()
      .single();
    if (error) throw error;
    await db.from("golden_question_admin_audit_logs").insert({
      admin_id: user.id,
      action: "prize_fulfilment_updated",
      entity_type: "prize_fulfilment",
      entity_id: data.id,
      after_data: { ...data, private_notes: "[redacted]" },
      reason: "Sponsor package fulfilment update",
    });
    return { fulfilment: data };
  }
  if (op === "moderation") {
    const [reports, answers] = await Promise.all([
      db
        .from("golden_question_comment_reports")
        .select("*,golden_question_comments(body)")
        .eq("status", "open")
        .limit(100),
      db
        .from("golden_question_attempts")
        .select("*")
        .eq("review_status", "pending")
        .limit(100),
    ]);
    return { reports: reports.data || [], short_answers: answers.data || [] };
  }
  return {
    sponsors:
      (
        await db
          .from("golden_question_sponsors")
          .select("*,golden_question_prize_fulfilments(*)")
          .order("created_at", { ascending: false })
      ).data || [],
    winners:
      (
        await db
          .from("golden_question_winners")
          .select("*")
          .order("competition_month", { ascending: false })
      ).data || [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const db = admin(),
      body = await req.json().catch(() => ({})),
      action = clean(body.action, 30),
      user = await authUser(req),
      actorHash = await sha(
        `${
          user?.id || clean(req.headers.get("x-forwarded-for"), 80) || "public"
        }:golden-question`
      );
    const since = new Date(Date.now() - 60000).toISOString(),
      limit = action === "submit" ? 5 : action === "preview" ? 60 : 120,
      { count } = await db
        .from("golden_question_request_events")
        .select("id", { count: "exact", head: true })
        .eq("actor_hash", actorHash)
        .eq("action", action)
        .gte("created_at", since);
    if ((count || 0) >= limit)
      return reply(
        {
          error: "Too many requests. Please wait a moment.",
          code: "RATE_LIMITED",
        },
        429
      );
    await db
      .from("golden_question_request_events")
      .insert({ actor_hash: actorHash, action });
    if (action === "preview") return reply(await publicPreview(db, body));
    if (action === "cron") {
      const supplied =
        req.headers.get("apikey") ||
        req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (supplied !== serviceKey)
        return reply(
          {
            error: "Service authentication required.",
            code: "SERVICE_AUTH_REQUIRED",
          },
          403
        );
      if (body.operation === "month_end") {
        const closed = clean(body.month, 10);
        const { data, error } = await db.rpc("btv_freeze_golden_month", {
          p_month: closed,
          p_admin: null,
        });
        if (error) throw error;
        return reply({ frozen: true, winners_created: data });
      }
      const date = londonDate(),
        assignments = [];
      for (const profession of ["nursing", "midwifery"])
        assignments.push(await ensureAssignment(db, profession, date));
      return reply({ date, assignments });
    }
    if (!user)
      return reply(
        { error: "Authentication is required.", code: "AUTH_REQUIRED" },
        401
      );
    if (action === "today") return reply(await getToday(db, user, body));
    if (action === "submit") return reply(await submit(db, user, body));
    if (action === "history") return reply(await history(db, user, body));
    if (action === "leaderboard") {
      const profile = await profileFor(db, user),
        profession = canonicalProfession(
          body.profession || profile?.golden_profession || profile?.profession
        );
      return reply({
        leaderboard: await rankRows(
          db,
          profession,
          clean(body.month, 10) || monthStart(londonDate()),
          user.id
        ),
      });
    }
    if (action === "accept_terms") {
      const { error } = await db
        .from("golden_question_terms_acceptances")
        .upsert({ user_id: user.id, terms_version: "v1" });
      if (error) throw error;
      return reply({ accepted: true });
    }
    if (action === "select_profession") {
      const profession = canonicalProfession(body.profession);
      if (!profession) return reply({ error: "Choose Nurse or Midwife." }, 400);
      const p = await profileFor(db, user);
      if (p?.golden_profession_locked_at && p.golden_profession !== profession)
        return reply(
          {
            error:
              "Your competition profession is locked. Contact support if it is incorrect.",
            code: "PROFESSION_LOCKED",
          },
          409
        );
      const { error } = await db
        .from("profiles")
        .update({
          golden_profession: profession,
          golden_profession_locked_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      return reply({ profession });
    }
    if (action === "discussion") return reply(await discussion(db, user, body));
    if (action === "share") {
      await db.from("golden_question_share_events").insert({
        daily_question_id: body.daily_question_id,
        user_id: user.id,
        channel: clean(body.channel, 30),
        metadata: { platform: clean(body.platform, 60) },
      });
      return reply({ tracked: true });
    }
    if (action === "admin") return reply(await adminAction(db, user, body));
    return reply({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error(e);
    return reply(
      {
        error: e?.message || "Request failed.",
        code: String(e?.message || "REQUEST_FAILED").split(":")[0],
      },
      e?.status || 400
    );
  }
});
