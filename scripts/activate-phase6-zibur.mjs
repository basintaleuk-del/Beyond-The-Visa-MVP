import fs from 'node:fs';
let html=fs.readFileSync('web/index.html','utf8');const old="if(!answer)answer=contextualZibur(question);",next="if(!answer)answer=window.BTVZiburFallback?.answer(question,ziburContext())||contextualZibur(question);";if(!html.includes(old)&&!html.includes(next))throw Error('Zibur fallback marker missing');fs.writeFileSync('web/index.html',html.replace(old,next));
fs.copyFileSync('scripts/zibur-phase6-index.ts.txt','supabase/functions/zibur-gemini/index.ts');
