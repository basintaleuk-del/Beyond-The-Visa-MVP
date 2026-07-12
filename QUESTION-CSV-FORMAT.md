# CBT and NCLEX CSV import format

Use UTF-8 CSV with a header row. Do not include official, copyrighted exam questions. Imported rows are hidden review drafts.

## CBT required columns

`profession,subject,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,access_level`

Optional: `question_type`.

## NCLEX required columns

`exam,category,client_need,difficulty,question_type,question_text,option_a,option_b,option_c,option_d,correct_options,rationale,access_level`

Optional: `option_e,option_f,test_strategy`.

For select-all questions, separate `correct_options` using commas or pipes. If commas are used inside a field, quote the whole CSV field.

Every import creates a deterministic SHA-256 hash from the exam, question and first options. Re-importing an unchanged record is ignored rather than duplicated.

