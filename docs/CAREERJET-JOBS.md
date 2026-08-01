# Careerjet Jobs

Beyond The Visa imports Careerjet vacancies from the official Careerjet v4 publisher API into the existing `btv_jobs` tables. Browser clients read jobs only from Supabase; they never call Careerjet.

## Server configuration

- Set `CAREERJET_AFFILIATE_ID` in Vercel Production and Preview. Despite the retained environment-variable name, its value must be the API key issued for the Beyond The Visa publisher website.
- Do not prefix it with `NEXT_PUBLIC_` and do not store it in Supabase.
- The existing `/api/global-jobs-import` cron at `15 3 * * *` processes enabled providers sequentially. No extra cron is required.

## Controlled activation

1. Apply `20260801190000_careerjet_jobs_v286.sql`.
2. In Admin → Opportunity Centre → Daily imports, run **Test Careerjet**.
3. Run **Sample UK · 10 jobs**. This performs one `registered nurse` query and imports at most ten mapped records.
4. Verify title, employer, location, GBP salary, source link, publication date, destination filtering and deduplication.
5. Enable the `careerjet` source. The next daily run processes GB, US, CA, AU, NZ, IE, AE and SA sequentially.

The provider starts disabled, so deployment cannot consume Careerjet quota before the controlled UK sample is reviewed.
