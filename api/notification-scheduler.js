const { rest, deliverCampaign, generateJobAlerts, deliverDigests } = require("./_lib/notifications.cjs");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) return res.status(401).json({ error: "Scheduler authentication required." });
  try {
    const now = new Date().toISOString();
    const due = await rest(`notification_campaigns?select=*&status=eq.scheduled&scheduled_for=lte.${encodeURIComponent(now)}&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(now)})&order=scheduled_for.asc&limit=20`);
    const campaigns = [];
    for (const campaign of due || []) {
      const locked = await rest(`notification_campaigns?id=eq.${campaign.id}&status=eq.scheduled`, { method: "PATCH", body: JSON.stringify({ status: "processing", locked_at: now, updated_at: now }) });
      if (!locked?.length) continue;
      try {
        const outcome = await deliverCampaign(campaign);
        await rest(`notification_campaigns?id=eq.${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), audience_count: outcome.audience, delivered_count: outcome.delivered, failed_count: outcome.failed, updated_at: new Date().toISOString() }), prefer: "return=minimal" });
        campaigns.push({ id: campaign.id, ...outcome });
      } catch (error) {
        await rest(`notification_campaigns?id=eq.${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", updated_at: new Date().toISOString() }), prefer: "return=minimal" });
        campaigns.push({ id: campaign.id, error: "delivery_failed" });
      }
    }
    const jobs = await generateJobAlerts(100),digests=await deliverDigests(500);
    return res.status(200).json({ success: true, campaigns, jobs, digests });
  } catch (error) {
    console.error("notification scheduler failed", error);
    return res.status(500).json({ error: "Notification scheduling failed." });
  }
};
