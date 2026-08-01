-- Move to versioned paths so neither the CDN nor browsers retain the original
-- answer-bearing SVG cards. Captions must not disclose the quiz answer either.
with replacements(old_path, new_path) as (
  values
    ('questions/equipment/9694a852b6d923f855bdc96191aedcb2.svg', 'questions/equipment/v2/amnihook.svg'),
    ('questions/equipment/7888b2e793b28c5e65f45e9cc48c6635.svg', 'questions/equipment/v2/defibrillator.svg'),
    ('questions/equipment/ecda02037446b72ea844fba7a1e4c8d1.svg', 'questions/equipment/v2/doppler-fetal-monitor.svg'),
    ('questions/equipment/36319144575f30b543c154f09aad8315.svg', 'questions/equipment/v2/ecg-machine.svg'),
    ('questions/equipment/3f10ecaecd3b74a330a40c7ed198d0ab.svg', 'questions/equipment/v2/glucometer.svg'),
    ('questions/equipment/c1d97936ab376957656348fa8b14c260.svg', 'questions/equipment/v2/infusion-pump.svg'),
    ('questions/equipment/e0ccdaa801dbf591e33a7f87f11b884f.svg', 'questions/equipment/v2/laryngoscope.svg'),
    ('questions/equipment/9cf15ef2ab46498e5a06e12f695ef4b8.svg', 'questions/equipment/v2/nebuliser.svg'),
    ('questions/equipment/123065d53c4fe8ea97b690fefe4f48f7.svg', 'questions/equipment/v2/old-mercury-thermometer.svg'),
    ('questions/equipment/6a7a19c18989ddfa9a030c9451db77b8.svg', 'questions/equipment/v2/partograph-chart-board.svg'),
    ('questions/equipment/6ac28361351c759de0f447cdcb341cdf.svg', 'questions/equipment/v2/pinard-fetoscope.svg'),
    ('questions/equipment/b24aee760b0e0def0d6428286d606a4e.svg', 'questions/equipment/v2/pulse-oximeter.svg'),
    ('questions/equipment/78add0c66d30420cade9b037acf5cb95.svg', 'questions/equipment/v2/simpson-obstetric-forceps.svg'),
    ('questions/equipment/f462a1614c6369eb539d013744772b48.svg', 'questions/equipment/v2/sphygmomanometer.svg'),
    ('questions/equipment/d51341c05d318fd7b75d5b66c7f4417a.svg', 'questions/equipment/v2/sterile-dressing-set.svg'),
    ('questions/equipment/c8e1a5cf2fdfb1281f8ccb575ed32a1f.svg', 'questions/equipment/v2/stethoscope.svg'),
    ('questions/equipment/489a2dd7d2158333114bd5db35c6e943.svg', 'questions/equipment/v2/suction-catheter-set.svg'),
    ('questions/equipment/dc20f627f42cc72b72ed6969eb607967.svg', 'questions/equipment/v2/syringe-driver.svg'),
    ('questions/equipment/ecbd6ae3929309711bbade714294193a.svg', 'questions/equipment/v2/tourniquet.svg'),
    ('questions/equipment/aeb347f95a3817d040675c9e14ae5886.svg', 'questions/equipment/v2/ventouse-cup.svg')
)
update public.btv_golden_questions as question
set
  question_image_url = replacements.new_path,
  image_caption = 'Older clinical equipment presented for identification',
  updated_at = now()
from replacements
where question.question_image_url = replacements.old_path;
