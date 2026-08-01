# Jooble Jobs

Jooble is integrated into the existing `btv_jobs` import, filtering, saving and destination-country pipeline. The existing Vercel Cron request to `/api/global-jobs-import` runs Jooble sequentially with NHS Jobs, USAJOBS, Adzuna, Reed and the approved international sources at 03:15 UTC each day.

## Required production configuration

Add one server-side Vercel environment variable for Production (and Preview only if preview testing is required):

- `JOOBLE_API_KEY`

Do not prefix it with `NEXT_PUBLIC_`. The key is inserted only into the server-to-server Jooble endpoint path and is never returned to the browser, written to Supabase or included in structured logs.

Apply `supabase/migrations/20260801170000_jooble_jobs_v282.sql` before the first sync. No additional Vercel Cron entry is required; the existing `/api/global-jobs-import` schedule owns the daily run and uses the existing `CRON_SECRET` authentication.

## Controlled activation

1. In Admin → Opportunity Centre → Daily imports, run **Test Jooble**. This requests one UK `registered nurse` result.
2. Enable the approved **jooble** source in the existing source controls.
3. Run **Sample GB**. This performs one UK keyword request with at most three results.
4. Review the import summary and UK job cards.
5. Run **Sync Jooble now** to process all eight configured destinations sequentially.

The normal daily run makes three controlled healthcare searches per country and one result page per search. Temporary failures and rate limits are retried with bounded exponential backoff. A Jooble job is archived—not deleted—only after at least three complete misses and a minimum fourteen-day missing window.

Official API contract: `POST https://jooble.org/api/{api_key}` with `keywords`, `location`, `page` and `ResultOnPage` in the JSON body. Jooble pages are not scraped.
