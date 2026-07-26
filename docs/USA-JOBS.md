# USA Nursing Jobs

The USA jobs system is separate from the existing NHS Jobs pipeline. It uses `profiles.destination_country = 'us'` as the authoritative preference and stores vacancies in `btv_usa_jobs`.

## Production activation

1. Register the organisation for an official USAJOBS API key at https://developer.usajobs.gov/APIRequest/Index.
2. Configure these server-side production environment variables:

   - `USAJOBS_API_KEY`
   - `USAJOBS_USER_AGENT`
   - `USAJOBS_EMAIL` — the email used to request the API key

3. Apply `supabase/migrations/20260726233000_usa_nursing_jobs_v155.sql` to the linked database after reviewing its new tables and the `btv_jobs` destination-separation policy.
4. Deploy the web/API release.
5. Run `/api/usa-jobs-import` from the USA Nursing Jobs admin panel and confirm an import log has status `success` before advertising the route.

The scheduled importer runs at 02:15 and 14:15 UTC. It retries temporary USAJOBS errors, prevents overlapping runs, upserts source records, removes duplicates and expires closed vacancies.

## Security and separation

- `/api/usa-jobs` authenticates the user and checks `profiles.destination_country = 'us'` before returning any vacancy.
- Row-level security independently enforces the same destination rule.
- USA users cannot read the UK `btv_jobs` feed; UK users cannot read `btv_usa_jobs`.
- USA alert generation explicitly filters `profiles.destination_country = 'us'`.
- API credentials remain environment variables and are never returned to browsers or stored in Supabase.
- Sponsorship defaults to `unclear`. Relocation assistance never implies sponsorship.

## Adzuna

`Adzuna USA` is registered as a disabled, pending source. Do not enable it until the USAJOBS production import is healthy and the required Adzuna credentials and licensing are approved:

- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
