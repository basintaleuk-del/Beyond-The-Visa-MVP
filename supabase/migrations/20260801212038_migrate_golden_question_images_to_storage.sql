-- Golden Question equipment illustrations are stored privately and returned
-- through short-lived signed URLs by the golden-question Edge Function.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml'
]
where id = 'golden-question-images';

update public.btv_golden_questions
set
  question_image_url = 'questions/equipment/' || md5(question_image_url) || '.svg',
  updated_at = now()
where question_image_url like 'data:image/svg+xml;utf8,%';
