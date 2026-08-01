-- Preserve the complete question bank while keeping the learner competition
-- unavailable until the product launch is approved.
update public.golden_question_settings
set
  feature_paused = true,
  sharing_enabled = false,
  commenting_enabled = false,
  updated_at = now()
where id = true;
