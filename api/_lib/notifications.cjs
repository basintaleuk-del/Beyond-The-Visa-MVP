const webpush = require("web-push");
const { countryCode, qualifiesForJob } = require("./job-alert-matching.cjs");

const base = () => String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const anon = () => process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const jsonHeaders = token => ({ apikey: service(), Authorization: `Bearer ${token || service()}`, "content-type": "application/json" });
const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const categories = new Set(["jobs","visa","mentor_message","booking","learning","course","mock","application","account","billing","coins","announcement","administrative"]);

function safeTarget(value) {
  const target = clean(value || "/", 500);
  return /^\/(?!\/)[A-Za-z0-9_?&=#%./-]*$/.test(target) ? target : "/";
}
function safeImage(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value), "https://www.beyondthevisa.org");
    return url.protocol === "https:" && ["www.beyondthevisa.org","beyondthevisa.org"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
function configured() {
  return Boolean(base() && anon() && service());
}
async function rest(path, options = {}) {
  if (!configured()) throw new Error("Supabase server configuration is incomplete");
  const response = await fetch(`${base()}/rest/v1/${path}`, {
    ...options,
    headers: { ...jsonHeaders(options.token), Prefer: options.prefer || "return=representation", ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw Object.assign(new Error(body?.message || body?.error || "Notification data request failed"), { status: response.status, body });
  return body;
}
async function userFromRequest(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || !base() || !anon()) return null;
  const response = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: anon(), Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return response.json();
}
async function requireAdmin(req) {
  const user = await userFromRequest(req);
  if (!user) return null;
  const rows = await rest(`profiles?select=id,role&id=eq.${encodeURIComponent(user.id)}&limit=1`);
  return String(rows?.[0]?.role || "").toLowerCase() === "admin" ? user : null;
}
function vapidReady() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
function configureVapid() {
  if (!vapidReady()) throw new Error("VAPID configuration is incomplete");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}
function preferenceKey(category) {
  return ({
    jobs: "job_alerts_enabled", visa: "visa_updates_enabled", mentor_message: "mentor_messages_enabled",
    booking: "booking_updates_enabled", learning: "learning_reminders_enabled", course: "learning_reminders_enabled",
    mock: "learning_reminders_enabled", announcement: "marketing_enabled", account: "account_alerts_enabled",
    billing: "account_alerts_enabled", coins: "account_alerts_enabled", administrative: "account_alerts_enabled",
  })[category] || "in_app_enabled";
}
function allowed(pref, category, channel) {
  if (["account","administrative"].includes(category)) return channel !== "push" || pref?.push_enabled !== false;
  if (pref?.frequency === "none") return false;
  if (channel === "push" && !pref?.push_enabled) return false;
  if (channel === "in_app" && pref?.in_app_enabled === false) return false;
  return pref?.[preferenceKey(category)] !== false;
}
function inQuietHours(pref, now = new Date()) {
  if (!pref?.quiet_hours_enabled || !pref.quiet_start || !pref.quiet_end) return false;
  let local;
  try { local = new Intl.DateTimeFormat("en-GB", { timeZone: pref.timezone || "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now); }
  catch { local = now.toISOString().slice(11, 16); }
  const start = String(pref.quiet_start).slice(0, 5), end = String(pref.quiet_end).slice(0, 5);
  return start < end ? local >= start && local < end : local >= start || local < end;
}
function digestDelay(frequency) {
  if (frequency === "weekly") return 7 * 24 * 60 * 60 * 1000;
  if (frequency === "daily") return 24 * 60 * 60 * 1000;
  return 8 * 60 * 60 * 1000;
}
async function queueDigest(userId, notificationId, frequency) {
  const kind = ["daily","weekly"].includes(frequency) ? frequency : "quiet_hours";
  await rest("notification_digest_queue?on_conflict=user_id,notification_id", {
    method: "POST", prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify({ user_id: userId, notification_id: notificationId, frequency: kind, deliver_after: new Date(Date.now() + digestDelay(kind)).toISOString() }),
  });
}
function matches(profile, rules = {}) {
  const norm = value => clean(value, 120).toLowerCase();
  if (rules.user_id && profile.id !== rules.user_id) return false;
  if (rules.destination_country && norm(profile.destination_country || profile.destination) !== norm(rules.destination_country)) return false;
  if (rules.role && norm(profile.role) !== norm(rules.role)) return false;
  if (rules.account_type && norm(profile.account_type) !== norm(rules.account_type)) return false;
  if (rules.profession && !norm(profile.profession).includes(norm(rules.profession))) return false;
  if (rules.registration_stage && norm(profile.registration_stage) !== norm(rules.registration_stage)) return false;
  return true;
}
async function audience(campaign) {
  const [profiles, prefs] = await Promise.all([
    rest("profiles?select=id,destination_country,destination,role,account_type,profession,registration_stage&limit=10000"),
    rest("notification_preferences?select=*&limit=10000"),
  ]);
  const prefMap = new Map((prefs || []).map(row => [row.user_id, row]));
  return (profiles || []).filter(profile => matches(profile, campaign.targeting_rules || {})).map(profile => ({ profile, pref: prefMap.get(profile.id) || {} }));
}
async function logDelivery(entry) {
  try {
    await rest("notification_delivery_logs", { method: "POST", body: JSON.stringify(entry), prefer: "return=minimal" });
  } catch (error) { console.error("notification delivery log failed", error.message); }
}
async function sendPush(notification, subscription, userId) {
  configureVapid();
  const payload = JSON.stringify({
    notificationId: notification.id, title: clean(notification.title, 120), body: clean(notification.body, 240),
    category: notification.category, url: safeTarget(notification.action_url), icon: notification.icon_url || "/site-logo-mark.png",
    image: notification.image_url || undefined, tag: notification.notification_tag || notification.dedupe_key || notification.id,
    priority: notification.priority || "normal", expiresAt: notification.expires_at || undefined,
    actions: [{ action: "open", title: notification.category === "jobs" ? "View job" : "Open" }, { action: "dismiss", title: "Dismiss" }],
  });
  try {
    const result = await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, payload, { TTL: 3600, urgency: notification.priority === "urgent" ? "high" : "normal" });
    await rest(`push_subscriptions?id=eq.${subscription.id}`, { method: "PATCH", body: JSON.stringify({ failed_delivery_count: 0, last_used_at: new Date().toISOString(), is_active: true, enabled: true }), prefer: "return=minimal" });
    await logDelivery({ notification_id: notification.id, user_id: userId, subscription_id: subscription.id, channel: "push", status: "delivered", provider_response: String(result.statusCode || 201) });
    return true;
  } catch (error) {
    const invalid = [404, 410].includes(error.statusCode);
    await rest(`push_subscriptions?id=eq.${subscription.id}`, { method: "PATCH", body: JSON.stringify(invalid ? { is_active: false, enabled: false, revoked_at: new Date().toISOString(), permission_status: "expired" } : { failed_delivery_count: Number(subscription.failed_delivery_count || 0) + 1 }), prefer: "return=minimal" });
    await logDelivery({ notification_id: notification.id, user_id: userId, subscription_id: subscription.id, channel: "push", status: invalid ? "expired" : "failed", error_code: String(error.statusCode || "PUSH_FAILED"), error_message: clean(error.message, 500) });
    return false;
  }
}
async function deliverCampaign(campaign) {
  if (!categories.has(campaign.category)) throw new Error("Unsupported notification category");
  if (campaign.expires_at && new Date(campaign.expires_at) <= new Date()) return { audience: 0, delivered: 0, failed: 0, expired: true };
  const users = await audience(campaign);
  let delivered = 0, failed = 0, considered = 0;
  for (let offset = 0; offset < users.length; offset += 100) {
    const batch = users.slice(offset, offset + 100);
    const userIds = batch.map(item => item.profile.id);
    const subscriptions = await rest(`push_subscriptions?select=*&user_id=in.(${userIds.join(",")})&enabled=eq.true&is_active=eq.true`);
    const byUser = new Map();
    for (const sub of subscriptions || []) byUser.set(sub.user_id, [...(byUser.get(sub.user_id) || []), sub]);
    for (const { profile, pref } of batch) {
      if (!allowed(pref, campaign.category, "in_app")) continue;
      considered++;
      const dedupe = `campaign:${campaign.id}`;
      const inserted = await rest("notifications?on_conflict=user_id,dedupe_key", {
        method: "POST", prefer: "resolution=ignore-duplicates,return=representation",
        body: JSON.stringify({ user_id: profile.id, campaign_id: campaign.id, category: campaign.category, title: clean(campaign.title, 120), body: clean(campaign.body, 240), action_url: safeTarget(campaign.target_url), image_url: campaign.image_url || null, icon_url: campaign.icon_url || null, priority: campaign.priority, expires_at: campaign.expires_at || null, notification_tag: dedupe, dedupe_key: dedupe, delivery_status: "queued", scheduled_at: campaign.scheduled_for || null }),
      });
      const notification = inserted?.[0];
      if (!notification) continue;
      await logDelivery({ notification_id: notification.id, user_id: profile.id, channel: "in_app", status: "delivered" });
      const digestFrequency=["daily","weekly"].includes(pref.frequency)?pref.frequency:null,quiet=campaign.priority!=="urgent"&&inQuietHours(pref);
      if (campaign.delivery_channels?.includes("push") && allowed(pref,campaign.category,"push") && (digestFrequency||quiet)) await queueDigest(profile.id,notification.id,digestFrequency||"quiet_hours");
      if (!campaign.delivery_channels?.includes("push") || !allowed(pref, campaign.category, "push") || digestFrequency || quiet) {
        delivered++; continue;
      }
      const devices = byUser.get(profile.id) || [];
      if (!devices.length) { delivered++; continue; }
      const results = await Promise.all(devices.map(sub => sendPush(notification, sub, profile.id)));
      if (results.some(Boolean)) delivered++; else failed++;
    }
  }
  return { audience: considered, delivered, failed };
}
async function generateJobAlerts(limit = 100) {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const jobs = await rest(`btv_jobs?select=id,title,employer,country,country_code,profession,specialty,band,location,city,region_or_state,visa_sponsorship,sponsorship_status,employment_type,contract_type,registration_required,registration_status,registration_body,experience_level,closing_date,closing_at,status,created_at&status=in.(published,active,closing_soon)&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${Math.min(limit, 250)}`);
  if (!jobs?.length) return { matched: 0 };
  const [profiles, professionalRows, registrations, practice, alertRows, prefs, previous] = await Promise.all([
    rest("profiles?select=id,destination_country,destination,profession,registration_stage&limit=10000"),
    rest("btv_professional_profiles?select=user_id,profession,qualification_title,nursing_field,clinical_specialty,experience_level&limit=10000"),
    rest("btv_professional_registrations?select=user_id,country,status&status=eq.Active&limit=10000"),
    rest("btv_professional_practice_history?select=user_id,clinical_area&limit=10000"),
    rest("btv_job_alerts?select=user_id,country_code,profession,specialties,locations,sponsorship_preference,employment_types&is_active=eq.true&limit=10000"),
    rest("notification_preferences?select=*&job_alerts_enabled=eq.true&limit=10000"),
    rest(`notification_job_matches?select=user_id,job_id&job_id=in.(${jobs.map(job => job.id).join(",")})`),
  ]);
  const professionalMap=new Map((professionalRows||[]).map(row=>[row.user_id,row])),registrationMap=new Map(),practiceMap=new Map(),alertMap=new Map();
  for(const row of registrations||[])registrationMap.set(row.user_id,[...(registrationMap.get(row.user_id)||[]),row]);
  for(const row of practice||[])practiceMap.set(row.user_id,[...(practiceMap.get(row.user_id)||[]),row]);
  for(const row of alertRows||[])alertMap.set(row.user_id,[...(alertMap.get(row.user_id)||[]),row]);
  const prefMap = new Map((prefs || []).map(row => [row.user_id, row]));
  const seen = new Set((previous || []).map(row => `${row.user_id}:${row.job_id}`));
  let matched = 0;
  for (const profile of profiles || []) {
    const pref = prefMap.get(profile.id); if (!pref || !allowed(pref, "jobs", "in_app")) continue;
    let userMatches=0;
    for (const job of jobs) {
      if(userMatches>=3)break;
      if (seen.has(`${profile.id}:${job.id}`)) continue;
      const closing=job.closing_at||job.closing_date;if(closing&&new Date(closing)<new Date())continue;
      if(!qualifiesForJob(profile,job,{professional:professionalMap.get(profile.id),registrations:registrationMap.get(profile.id)||[],practice:practiceMap.get(profile.id)||[],alerts:alertMap.get(profile.id)||[]}))continue;
      const inserted = await rest("notifications?on_conflict=user_id,dedupe_key", { method: "POST", prefer: "resolution=ignore-duplicates,return=representation", body: JSON.stringify({ user_id: profile.id, category: "jobs", title: clean(job.title, 120), body: clean(`${job.employer}${job.location ? ` · ${job.location}` : ""}${job.visa_sponsorship ? " · sponsorship confirmed" : ""}`, 240), action_url: `/jobs/${job.id}`, data:{job_id:job.id,country_code:countryCode(job.country_code||job.country)}, priority: "normal", notification_tag: `job:${job.id}`, dedupe_key: `job:${job.id}`, delivery_status: "queued" }) });
      const notification = inserted?.[0]; if (!notification) continue;
      await rest("notification_job_matches", { method: "POST", body: JSON.stringify({ user_id: profile.id, job_id: job.id, notification_id: notification.id }), prefer: "return=minimal" });
      const digestFrequency=["daily","weekly"].includes(pref.frequency)?pref.frequency:null,quiet=inQuietHours(pref);
      if(allowed(pref,"jobs","push")&&(digestFrequency||quiet))await queueDigest(profile.id,notification.id,digestFrequency||"quiet_hours");
      const devices = allowed(pref, "jobs", "push") && !digestFrequency && !quiet ? await rest(`push_subscriptions?select=*&user_id=eq.${profile.id}&enabled=eq.true&is_active=eq.true`) : [];
      await Promise.all((devices || []).map(sub => sendPush(notification, sub, profile.id)));
      matched++;userMatches++;
    }
  }
  return { matched };
}
async function deliverDigests(limit=500) {
  const now=new Date().toISOString(),rows=await rest(`notification_digest_queue?select=*&delivered_at=is.null&deliver_after=lte.${encodeURIComponent(now)}&order=deliver_after.asc&limit=${Math.min(limit,1000)}`);
  const grouped=new Map();for(const row of rows||[])grouped.set(row.user_id,[...(grouped.get(row.user_id)||[]),row]);
  let delivered=0,failed=0;
  for(const [userId,items] of grouped){
    const ids=items.map(item=>item.notification_id),notes=await rest(`notifications?select=id,category,title&user_id=eq.${userId}&id=in.(${ids.join(",")})&dismissed_at=is.null`);
    if(!notes?.length){await rest(`notification_digest_queue?id=in.(${items.map(x=>x.id).join(",")})`,{method:"PATCH",body:JSON.stringify({delivered_at:now}),prefer:"return=minimal"});continue}
    const subscriptions=await rest(`push_subscriptions?select=*&user_id=eq.${userId}&enabled=eq.true&is_active=eq.true`);
    const labels=[...new Set(notes.map(note=>note.category.replaceAll("_"," ")))].slice(0,3).join(", ");
    const digest=await rest("notifications?on_conflict=user_id,dedupe_key",{method:"POST",prefer:"resolution=ignore-duplicates,return=representation",body:JSON.stringify({user_id:userId,category:"announcement",title:`${notes.length} new Beyond The Visa update${notes.length===1?"":"s"}`,body:`Your ${labels} updates are ready in your private notification centre.`,action_url:"/?open=notifications",priority:"normal",notification_tag:`digest:${items[0].frequency}:${now.slice(0,10)}`,dedupe_key:`digest:${items[0].frequency}:${now.slice(0,10)}`,delivery_status:"queued"})});
    const notification=digest?.[0];if(notification&&subscriptions?.length){const results=await Promise.all(subscriptions.map(sub=>sendPush(notification,sub,userId)));if(results.some(Boolean))delivered++;else failed++}
    await rest(`notification_digest_queue?id=in.(${items.map(x=>x.id).join(",")})`,{method:"PATCH",body:JSON.stringify({delivered_at:now}),prefer:"return=minimal"});
  }
  return {delivered,failed,users:grouped.size};
}

module.exports = { rest, clean, safeTarget, safeImage, userFromRequest, requireAdmin, audience, deliverCampaign, generateJobAlerts, deliverDigests, qualifiesForJob, countryCode, configured, vapidReady };
