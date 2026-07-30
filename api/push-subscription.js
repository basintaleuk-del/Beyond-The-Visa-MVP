const { userFromRequest, clean } = require("./_lib/notifications.cjs");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["POST","DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: "Please sign in before managing notifications." });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const rpc = req.method === "DELETE" ? "btv_notification_disable_subscription" : "btv_notification_register_subscription";
  const subscription = req.body?.subscription || {};
  const keys = subscription.keys || {};
  const body = req.method === "DELETE"
    ? { p_endpoint: clean(req.body?.endpoint, 2048) }
    : {
        p_endpoint: clean(subscription.endpoint, 2048), p_p256dh: clean(keys.p256dh, 220), p_auth_key: clean(keys.auth, 120),
        p_user_agent: clean(req.headers["user-agent"], 600), p_browser: clean(req.body?.browser, 80),
        p_device_type: clean(req.body?.deviceType, 80), p_operating_system: clean(req.body?.operatingSystem, 80),
      };
  const response = await fetch(`${String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/,"")}/rest/v1/rpc/${rpc}`, {
    method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) return res.status(response.status).json({ error: "We could not update notifications on this device." });
  return res.status(200).json({ success: true, subscriptionId: req.method === "POST" ? result : undefined });
};
