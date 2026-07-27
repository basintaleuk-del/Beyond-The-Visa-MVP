-- Golden Question Centre: add image-aware CBT questions and seed at least 200 active records.
-- This migration is additive and idempotent.

alter table public.cbt_questions
  add column if not exists question_image_url text,
  add column if not exists image_caption text,
  add column if not exists standard_version text,
  add column if not exists blueprint_domain text,
  add column if not exists quality_status text not null default 'approved',
  add column if not exists reviewed_at timestamptz,
  add column if not exists content_kind text not null default 'practice_question',
  add column if not exists semantic_hash text,
  add column if not exists source_reference text;

alter table public.cbt_questions drop constraint if exists cbt_questions_quality_status_check;
alter table public.cbt_questions add constraint cbt_questions_quality_status_check
  check (quality_status in ('needs_clinical_review', 'approved', 'rejected'));

alter table public.cbt_questions drop constraint if exists cbt_questions_content_kind_check;
alter table public.cbt_questions add constraint cbt_questions_content_kind_check
  check (content_kind in ('practice_question', 'unofficial_sample'));

alter table public.cbt_questions drop constraint if exists cbt_questions_publication_review_check;
alter table public.cbt_questions add constraint cbt_questions_publication_review_check
  check (not is_active or (quality_status = 'approved' and review_status = 'approved' and reviewed_at is not null));

with instruments as (
  select * from (values
    (1,'Sphygmomanometer','both','Vital Signs','Classic blood pressure cuff','Used to measure arterial blood pressure'),
    (2,'Stethoscope','both','Assessment','Acoustic listening device','Used to auscultate heart, lung and bowel sounds'),
    (3,'Laryngoscope','nurse','Airway','Direct airway visualisation tool','Used to visualise vocal cords for intubation'),
    (4,'Infusion Pump','both','Medication Safety','Controlled fluid delivery system','Delivers precise IV medication and fluids'),
    (5,'Syringe Driver','both','Palliative Care','Continuous subcutaneous infusion device','Provides small-dose medicines over time'),
    (6,'Pulse Oximeter','both','Monitoring','Non-invasive oxygen monitor','Measures oxygen saturation and pulse rate'),
    (7,'Defibrillator','nurse','Emergency Care','Cardiac rhythm response device','Used for shockable cardiac arrest rhythms'),
    (8,'Nebuliser','both','Respiratory Care','Aerosol medication delivery device','Converts liquid medication into inhaled mist'),
    (9,'Tourniquet','both','Venepuncture','Vascular access aid','Temporarily restricts blood flow for cannulation'),
    (10,'Doppler Fetal Monitor','midwife','Midwifery Monitoring','Portable fetal heart monitor','Assesses fetal heart rate in pregnancy or labour'),
    (11,'Pinard Fetoscope','midwife','Midwifery Heritage','Traditional fetal listening horn','Older manual device for fetal heart auscultation'),
    (12,'Partograph Chart Board','midwife','Labour Management','Labour progress tracking aid','Used to monitor labour progression patterns'),
    (13,'Amnihook','midwife','Intrapartum Care','Membrane rupture instrument','Used for controlled artificial rupture of membranes'),
    (14,'Ventouse Cup','midwife','Operative Birth','Vacuum-assisted birth device','Used during assisted vaginal birth'),
    (15,'Simpson Obstetric Forceps','midwife','Operative Birth','Historic assisted delivery forceps','Traditional forceps design for assisted birth'),
    (16,'Glucometer','both','Diabetes Care','Capillary glucose testing device','Provides point-of-care blood glucose readings'),
    (17,'ECG Machine','nurse','Cardiac Assessment','Cardiac electrical tracing system','Records heart rhythm and conduction patterns'),
    (18,'Suction Catheter Set','nurse','Airway Clearance','Airway secretion removal kit','Used to clear secretions from the airway'),
    (19,'Sterile Dressing Set','both','Wound Care','Aseptic wound management kit','Supports sterile dressing procedures'),
    (20,'Old Mercury Thermometer','both','Equipment Modernisation','Legacy temperature instrument','Largely replaced by digital thermometers')
  ) as x(idx,name,profession,subject,subtitle,hint)
),
templates as (
  select * from (values
    (1,'Which instrument is shown in this image?','easy'),
    (2,'Identify the instrument highlighted in this Golden Question card.','easy'),
    (3,'This device was modernised in many hospitals. What is it?','medium'),
    (4,'Which tool would this visual most likely represent?','medium'),
    (5,'Name the instrument shown before selecting your answer.','medium'),
    (6,'A legacy-to-modernisation check: identify this equipment.','hard'),
    (7,'This image appears in a safety equipment spot-check. What is it?','hard'),
    (8,'Which instrument matches the image and usage clue?','medium'),
    (9,'Clinical induction quiz: what instrument is displayed?','easy'),
    (10,'Rare equipment recognition: identify the instrument shown.','hard')
  ) as t(template_id,stem,difficulty)
),
catalog as (
  select array_agg(name order by idx) as names, count(*)::int as total from instruments
),
seed as (
  select
    i.idx,
    i.name,
    i.profession,
    i.subject,
    i.subtitle,
    i.hint,
    t.template_id,
    t.stem,
    t.difficulty,
    ((i.idx + t.template_id) % 4) + 1 as correct_slot,
    c.names[((i.idx % c.total) + 1)] as d1,
    c.names[(((i.idx + 5) % c.total) + 1)] as d2,
    c.names[(((i.idx + 10) % c.total) + 1)] as d3
  from instruments i
  cross join templates t
  cross join catalog c
),
prepared as (
  select
    profession,
    subject,
    difficulty,
    format('[BTV-GOLDEN-%s] %s', (idx * 1000 + template_id), stem) as question_text,
    case correct_slot when 1 then name when 2 then d1 when 3 then d2 else d3 end as option_a,
    case correct_slot when 1 then d1 when 2 then name when 3 then d3 else d2 end as option_b,
    case correct_slot when 1 then d2 when 2 then d3 when 3 then name else d1 end as option_c,
    case correct_slot when 1 then d3 when 2 then d2 when 3 then d1 else name end as option_d,
    case correct_slot when 1 then 'A' when 2 then 'B' when 3 then 'C' else 'D' end as correct_option,
    format('%s is the correct answer. %s. Modernisation context: %s.', name, hint, subtitle) as explanation,
    format('Golden Question image: %s', name) as image_caption,
    (
      'data:image/svg+xml;utf8,' ||
      replace(replace(replace(replace(replace(replace(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f3243"/><stop offset="100%" stop-color="#1f6f6f"/></linearGradient></defs><rect width="1200" height="700" rx="28" fill="url(#bg)"/><rect x="48" y="48" width="1104" height="604" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/><text x="90" y="130" fill="#f8df93" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="700">Golden Question Centre</text><text x="90" y="240" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="800">' || name || '</text><text x="90" y="310" fill="#d9edf0" font-family="Inter, Arial, sans-serif" font-size="30">' || subtitle || '</text><text x="90" y="390" fill="#e6f5f6" font-family="Inter, Arial, sans-serif" font-size="28">' || hint || '</text><circle cx="980" cy="360" r="128" fill="rgba(248,223,147,0.18)"/><circle cx="980" cy="360" r="80" fill="rgba(248,223,147,0.28)"/></svg>',
        '#','%23'),
        '%','%25'),
        ' ','%20'),
        '"','%22'),
        '<','%3C'),
        '>','%3E')
    ) as question_image_url,
    md5('btv-golden-v119|' || idx::text || '|' || template_id::text) as source_hash,
    md5(lower(regexp_replace(format('[BTV-GOLDEN-%s] %s', (idx * 1000 + template_id), stem), '\s+', '', 'g'))) as semantic_hash
  from seed
)
insert into public.cbt_questions (
  profession,
  subject,
  difficulty,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_option,
  explanation,
  access_level,
  is_active,
  created_at,
  updated_at,
  question_type,
  review_status,
  source_hash,
  standard_version,
  blueprint_domain,
  quality_status,
  reviewed_at,
  content_kind,
  semantic_hash,
  source_reference,
  question_image_url,
  image_caption
)
select
  profession,
  subject,
  difficulty,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_option,
  explanation,
  'free',
  true,
  now(),
  now(),
  'single',
  'approved',
  source_hash,
  'NMC Test of Competence blueprint (current 2026)',
  'Instrument recognition and safe equipment use',
  'approved',
  now(),
  'practice_question',
  semantic_hash,
  'https://www.nmc.org.uk/registration/joining-the-register/toc/toc-nursing-and-midwifery/resources/',
  question_image_url,
  image_caption
from prepared
where not exists (
  select 1
  from public.cbt_questions q
  where q.source_hash = prepared.source_hash
);

create index if not exists cbt_questions_golden_active_idx
  on public.cbt_questions (is_active, profession, subject, difficulty);
