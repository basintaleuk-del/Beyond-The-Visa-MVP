-- Normalise legacy specialty labels into the eight 2026 NCLEX-RN client-need categories.
with mapped as (
  select id,
    case
      when category in ('Management of Care', 'Delegation', 'Leadership', 'Ethics') then 'Management of Care'
      when category in ('Safety and Infection Prevention and Control', 'Safety and Infection Control', 'Infection Control') then 'Safety and Infection Prevention and Control'
      when category in ('Health Promotion and Maintenance', 'Maternal-Newborn', 'Maternal-Newborn Nursing', 'Pediatrics', 'Paediatric Nursing') then 'Health Promotion and Maintenance'
      when category in ('Psychosocial Integrity', 'Mental Health') then 'Psychosocial Integrity'
      when category in ('Basic Care and Comfort', 'Fundamentals', 'Fundamentals of Care') then 'Basic Care and Comfort'
      when category in ('Pharmacological and Parenteral Therapies', 'Pharmacological Therapies', 'Pharmacology') then 'Pharmacological and Parenteral Therapies'
      when category in ('Reduction of Risk Potential', 'Prioritisation') then 'Reduction of Risk Potential'
      when category in ('Physiological Adaptation', 'Medical-Surgical', 'Medical-Surgical Nursing', 'Diabetes', 'Neurology', 'Renal', 'Respiratory') then 'Physiological Adaptation'
      else 'Reduction of Risk Potential'
    end as client_need
  from public.nclex_questions
)
update public.nclex_questions q
set category = mapped.client_need,
    client_need = mapped.client_need,
    blueprint_domain = mapped.client_need,
    updated_at = now()
from mapped
where mapped.id = q.id;
