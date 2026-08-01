const { parseNhsJobDetail } = require("./_lib/nhs-job-detail.cjs");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).setHeader("allow", "GET").json({ error: "Method not allowed." });
  const id = String(req.query?.id || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(id)) return res.status(400).json({ error: "Invalid NHS Jobs vacancy reference." });
  const sourceUrl = `https://www.jobs.nhs.uk/candidate/jobadvert/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(sourceUrl, { headers: { accept: "text/html", "user-agent": "BeyondTheVisa/1.0 (+https://beyondthevisa.org)" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error: response.status === 404 ? "This vacancy is no longer available." : "NHS Jobs could not be reached." });
    const details = parseNhsJobDetail(await response.text(), sourceUrl);
    if (!details.title) return res.status(502).json({ error: "The NHS Jobs advert could not be read." });
    res.setHeader("cache-control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.setHeader("content-type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(details));
  } catch {
    return res.status(504).json({ error: "The NHS Jobs advert took too long to respond." });
  }
};
