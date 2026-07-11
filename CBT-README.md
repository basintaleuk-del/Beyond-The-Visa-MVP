# Beyond The Visa CBT Learning and Mock Exams

## 1. Run the database setup
In Supabase, open **SQL Editor → New query**, paste all contents of `BTV-CBT-SETUP.sql`, then run it.

The warning about destructive operations can appear because the script removes old policies before recreating them. It does not delete the question or progress tables.

## 2. Upload the project files
Upload every file in this package to the existing GitHub repository and replace matching files.

New files:
- `cbt.html`
- `cbt.css`
- `cbt.js`
- `BTV-CBT-SETUP.sql`
- `CBT-README.md`

## 3. Test
1. Sign in to Beyond The Visa.
2. Open **Learning**.
3. Select **Open CBT Learning Centre**.
4. Complete practice questions and a mock exam.
5. In Supabase, check `cbt_attempts`, `cbt_exam_sessions`, and `cbt_bookmarks` in Table Editor.

## Important content note
The included questions form a starter demonstration bank. Before charging users or describing the bank as exam-standard, have all questions and explanations clinically reviewed and expand the bank with original, licensed content. Do not copy protected questions from NMC/Pearson or commercial preparation products.
