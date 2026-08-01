import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repo=path.resolve(import.meta.dirname,'..');
const output=path.join(repo,'.tmp-golden-question-images');
const npx=process.platform==='win32'?'npx.cmd':'npx';
const query=`select distinct md5(question_image_url) as image_hash, question_image_url
from public.btv_golden_questions
where question_image_url like 'data:image/svg+xml%'
order by image_hash;`;

function run(args){
  const options={cwd:repo,encoding:'utf8',stdio:['ignore','pipe','inherit'],maxBuffer:32*1024*1024};
  if(process.platform!=='win32')return execFileSync(npx,args,options);
  return execFileSync(process.env.ComSpec||'cmd.exe',['/d','/c',npx,...args],options);
}
function resultJson(raw){
  const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start<0||end<start)throw new Error('Supabase CLI returned no JSON result.');
  return JSON.parse(raw.slice(start,end+1));
}
function safeSvg(dataUrl,expectedHash){
  const match=/^data:image\/svg\+xml;utf8,(.*)$/s.exec(dataUrl||'');
  if(!match)throw new Error(`Unsupported image format for ${expectedHash}.`);
  const svg=decodeURIComponent(match[1]);
  const hasExternalReference=/(?:href|src)\s*=\s*["']https?:\/\//i.test(svg)||/url\(\s*["']?https?:\/\//i.test(svg);
  if(!/^<svg\b/i.test(svg)||/<(?:script|foreignObject)\b/i.test(svg)||/\son\w+\s*=/i.test(svg)||/javascript:/i.test(svg)||hasExternalReference)throw new Error(`Unsafe SVG rejected: ${expectedHash}.`);
  const actual=createHash('md5').update(dataUrl).digest('hex');
  if(actual!==expectedHash)throw new Error(`Image hash mismatch: ${expectedHash}.`);
  return svg;
}

fs.mkdirSync(output,{recursive:true});
const queryFile=path.join(output,'export.sql');
fs.writeFileSync(queryFile,query,'utf8');
const response=resultJson(run(['--yes','supabase@2.109.1','db','query','--linked','--output-format','json','--file',queryFile]));
const rows=response.rows||[];
if(!rows.length)throw new Error('No embedded Golden Question images were found.');
for(const row of rows)fs.writeFileSync(path.join(output,`${row.image_hash}.svg`),safeSvg(row.question_image_url,row.image_hash),'utf8');

if(process.argv.includes('--upload')){
  const supabaseUrl=process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!serviceKey)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for upload.');
  const projectRef=process.env.SUPABASE_PROJECT_REF||new URL(supabaseUrl).hostname.split('.')[0];
  const apiKeys=JSON.parse(run(['--yes','supabase@2.109.1','projects','api-keys','--project-ref',projectRef,'--output','json']));
  const serviceJwt=apiKeys.find(key=>key.name==='service_role'&&key.type==='legacy')?.api_key;
  if(!serviceJwt)throw new Error('The linked project did not return a legacy service-role JWT.');
  for(const row of rows){
    const local=path.join(output,`${row.image_hash}.svg`);
    const objectPath=`questions/equipment/${row.image_hash}.svg`;
    const response=await fetch(`${supabaseUrl}/storage/v1/object/golden-question-images/${objectPath}`,{
      method:'POST',
      headers:{
        apikey:serviceKey,
        authorization:`Bearer ${serviceJwt}`,
        'cache-control':'max-age=31536000',
        'content-type':'image/svg+xml',
        'x-upsert':'true'
      },
      body:fs.readFileSync(local)
    });
    if(!response.ok){
      const detail=(await response.text()).slice(0,500);
      throw new Error(`Upload failed for ${row.image_hash}: HTTP ${response.status} ${detail}`);
    }
  }
}

console.log(JSON.stringify({images:rows.length,uploaded:process.argv.includes('--upload'),output},null,2));
