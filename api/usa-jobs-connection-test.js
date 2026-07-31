const { testConnection } = require("./_lib/usajobs-core.cjs");

const env = (name) => process.env[name] || "";
const send = (res, status, body) => res.status(status)
  .setHeader("cache-control", "private, no-store")
  .setHeader("content-type", "application/json; charset=utf-8")
  .send(JSON.stringify(body));

async function isAuthorised(req) {
  const authorization = String(req.headers.authorization || "");
  const cronSecret = env("CRON_SECRET");
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return true;
  const token = authorization.replace(/^Bearer\s+/i, "");
  const base = env("SUPABASE_URL");
  const publicKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
  if (!token || !base || !publicKey) return false;
  const user = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: `Bearer ${token}` } });
  if (!user.ok) return false;
  const admin = await fetch(`${base}/rest/v1/rpc/btv_is_admin`, {
    method: "POST",
    headers: { apikey: publicKey, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  return admin.ok && await admin.json() === true;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  if (!await isAuthorised(req)) return send(res, 401, { error: "Administrator authentication is required." });
  const result = await testConnection({ apiKey: env("USAJOBS_API_KEY"), userAgent: env("USAJOBS_USER_AGENT") });
  return send(res, 200, result);
};
