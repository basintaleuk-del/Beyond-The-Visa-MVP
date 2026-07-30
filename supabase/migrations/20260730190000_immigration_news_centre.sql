create table if not exists public.btv_immigration_news_sources(
  id uuid primary key default gen_random_uuid(),
  country_code text not null check(country_code in ('uk','us','au','ca','nz','ie','ae','sa')),
  name text not null,
  feed_url text not null unique,
  source_kind text not null default 'rss' check(source_kind in ('rss','atom')),
  is_official boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  last_checked_at timestamptz,
  last_successful_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.btv_immigration_news_items(
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.btv_immigration_news_sources(id) on delete set null,
  country_code text not null check(country_code in ('uk','us','au','ca','nz','ie','ae','sa')),
  title text not null,
  summary text,
  publisher text,
  canonical_url text not null unique,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  status text not null default 'published' check(status in ('published','archived','rejected')),
  is_featured boolean not null default false,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists btv_immigration_news_country_date_idx
  on public.btv_immigration_news_items(country_code,published_at desc)
  where status='published';

create table if not exists public.btv_immigration_news_runs(
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check(status in ('running','completed','partial','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  sources_checked integer not null default 0,
  items_received integer not null default 0,
  items_upserted integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

alter table public.btv_immigration_news_sources enable row level security;
alter table public.btv_immigration_news_items enable row level security;
alter table public.btv_immigration_news_runs enable row level security;

drop policy if exists immigration_news_public_read on public.btv_immigration_news_items;
create policy immigration_news_public_read on public.btv_immigration_news_items
  for select to anon,authenticated using(status='published');
drop policy if exists immigration_news_sources_public_read on public.btv_immigration_news_sources;
create policy immigration_news_sources_public_read on public.btv_immigration_news_sources
  for select to anon,authenticated using(is_active=true);
drop policy if exists immigration_news_admin_runs on public.btv_immigration_news_runs;
create policy immigration_news_admin_runs on public.btv_immigration_news_runs
  for select to authenticated using(public.btv_is_admin());

grant select on public.btv_immigration_news_items,public.btv_immigration_news_sources to anon,authenticated;
grant select on public.btv_immigration_news_runs to authenticated;

insert into public.btv_immigration_news_sources(country_code,name,feed_url,source_kind,is_official,sort_order) values
('uk','UK Visas and Immigration','https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=uk-visas-and-immigration&order=updated-newest','atom',true,10),
('ca','Immigration, Refugees and Citizenship Canada','https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&sort=publishedDate&orderBy=desc&pick=50&format=atom&atomtitle=Immigration%20Refugees%20and%20Citizenship%20Canada','atom',true,10),
('uk','United Kingdom immigration news','https://news.google.com/rss/search?q=United%20Kingdom%20immigration%20visa%20work%20permit&hl=en-GB&gl=GB&ceid=GB:en','rss',false,50),
('us','United States immigration news','https://news.google.com/rss/search?q=United%20States%20immigration%20visa%20work%20permit&hl=en-US&gl=US&ceid=US:en','rss',false,50),
('au','Australia immigration news','https://news.google.com/rss/search?q=Australia%20immigration%20visa%20work%20permit&hl=en-AU&gl=AU&ceid=AU:en','rss',false,50),
('ca','Canada immigration news','https://news.google.com/rss/search?q=Canada%20immigration%20visa%20work%20permit&hl=en-CA&gl=CA&ceid=CA:en','rss',false,50),
('nz','New Zealand immigration news','https://news.google.com/rss/search?q=New%20Zealand%20immigration%20visa%20work%20permit&hl=en-NZ&gl=NZ&ceid=NZ:en','rss',false,50),
('ie','Ireland immigration news','https://news.google.com/rss/search?q=Ireland%20immigration%20employment%20permit%20visa&hl=en-IE&gl=IE&ceid=IE:en','rss',false,50),
('ae','United Arab Emirates immigration news','https://news.google.com/rss/search?q=UAE%20immigration%20residence%20work%20visa&hl=en&gl=AE&ceid=AE:en','rss',false,50),
('sa','Saudi Arabia immigration news','https://news.google.com/rss/search?q=Saudi%20Arabia%20immigration%20residence%20work%20visa&hl=en&gl=SA&ceid=SA:en','rss',false,50)
on conflict(feed_url) do update set name=excluded.name,country_code=excluded.country_code,is_active=true,updated_at=now();
