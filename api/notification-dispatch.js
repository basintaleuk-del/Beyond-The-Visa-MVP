const { requireAdmin, rest, clean, safeTarget, safeImage, audience, deliverCampaign, vapidReady } = require("./_lib/notifications.cjs");
const crypto = require("node:crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(403).json({ error: "Administrator access required." });
    const action = clean(req.body?.action || "save", 20);
    const minuteAgo = new Date(Date.now() - 60000).toISOString();
    const recent = await rest(`notification_campaigns?select=id&created_by=eq.${admin.id}&created_at=gte.${encodeURIComponent(minuteAgo)}&limit=11`);
    if ((recent || []).length > 10) return res.status(429).json({ error: "Too many notification operations. Please wait before trying again." });
    if (action === "cancel") {
      await rest(`notification_campaigns?id=eq.${encodeURIComponent(req.body?.campaignId)}&status=in.(draft,scheduled)`, { method: "PATCH", body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }), prefer: "return=minimal" });
      return res.status(200).json({ success: true });
    }
    if (["audience","send"].includes(action)) {
      const rows = await rest(`notification_campaigns?select=*&id=eq.${encodeURIComponent(req.body?.campaignId)}&limit=1`);
      const campaign = rows?.[0]; if (!campaign) return res.status(404).json({ error: "Notification campaign not found." });
      if (action === "audience") return res.status(200).json({ count: (await audience(campaign)).length, vapidReady: vapidReady() });
      if (!["draft","scheduled","failed"].includes(campaign.status)) return res.status(409).json({ error: "This notification has already been processed." });
      const locked = await rest(`notification_campaigns?id=eq.${campaign.id}&status=in.(draft,scheduled,failed)`, { method: "PATCH", body: JSON.stringify({ status: "processing", locked_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      if (!locked?.length) return res.status(409).json({ error: "This notification is already being processed." });
      const outcome = await deliverCampaign(campaign);
      await rest(`notification_campaigns?id=eq.${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), audience_count: outcome.audience, delivered_count: outcome.delivered, failed_count: outcome.failed, updated_at: new Date().toISOString() }), prefer: "return=minimal" });
      return res.status(200).json({ success: true, ...outcome });
    }
    const data = req.body?.campaign || {};
    const scheduled = data.scheduled_for ? new Date(data.scheduled_for) : null;
    const payload = {
      title: clean(data.title, 120), body: clean(data.body, 240), category: clean(data.category, 40),
      priority: ["low","normal","high","urgent"].includes(data.priority) ? data.priority : "normal",
      target_url: safeTarget(data.target_url), image_url: safeImage(data.image_url),
      delivery_channels: Array.isArray(data.delivery_channels) ? data.delivery_channels.filter(value => ["in_app","push","email"].includes(value)) : ["in_app","push"],
      scheduled_for: scheduled && !Number.isNaN(scheduled.valueOf()) ? scheduled.toISOString() : null,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      targeting_rules: data.targeting_rules && typeof data.targeting_rules === "object" ? data.targeting_rules : {},
      status: scheduled && scheduled > new Date() ? "scheduled" : "draft", created_by: admin.id,
      idempotency_key: clean(data.idempotency_key, 120) || crypto.randomUUID(),
    };
    if (!payload.title || !payload.body) return res.status(400).json({ error: "A title and message are required." });
    const saved = data.id
      ? await rest(`notification_campaigns?id=eq.${encodeURIComponent(data.id)}&status=in.(draft,scheduled)`, { method: "PATCH", body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }) })
      : await rest("notification_campaigns", { method: "POST", body: JSON.stringify(payload) });
    return res.status(200).json({ success: true, campaign: saved?.[0] || null });
  } catch (error) {
    console.error("notification dispatch failed", error);
    return res.status(error.status || 500).json({ error: "The notification operation could not be completed safely." });
  }
};
