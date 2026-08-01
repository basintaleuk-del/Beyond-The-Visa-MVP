import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const out=path.resolve(import.meta.dirname,'../assets/golden-question-equipment-v2');
const stroke='stroke="#173f49" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"';
const metal='fill="#c9d4d1" stroke="#173f49" stroke-width="12"';
const glass='fill="#d9f1ed" fill-opacity=".72" stroke="#173f49" stroke-width="10"';
const ivory='fill="#f3ead3" stroke="#173f49" stroke-width="12"';
const copper='fill="#b66b45" stroke="#173f49" stroke-width="12"';

const ticks=(cx,cy,r,count=18)=>Array.from({length:count},(_,i)=>{
  const a=(Math.PI*2*i/count)-Math.PI/2,x1=cx+Math.cos(a)*(r-18),y1=cy+Math.sin(a)*(r-18),x2=cx+Math.cos(a)*r,y2=cy+Math.sin(a)*r;
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#173f49" stroke-width="6"/>`;
}).join('');

const frame=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img">
<defs><radialGradient id="paper"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#e8dcc0"/></radialGradient><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#173f49" flood-opacity=".22"/></filter></defs>
<rect width="800" height="600" rx="36" fill="url(#paper)"/><path d="M70 500C225 455 550 548 730 480" fill="none" stroke="#d2c39d" stroke-width="5" opacity=".7"/>
<g filter="url(#shadow)">${body}</g></svg>`;

const items={
  'old-mercury-thermometer':`<g transform="rotate(-28 400 300)"><rect x="365" y="95" width="70" height="390" rx="35" ${glass}/><circle cx="400" cy="490" r="57" ${glass}/><path d="M400 452V165" stroke="#b8423d" stroke-width="16"/><circle cx="400" cy="490" r="31" fill="#b8423d"/><path d="M438 180h38m-38 45h24m-24 45h38m-38 45h24m-24 45h38m-38 45h24" ${stroke}/></g>`,
  'sphygmomanometer':`<rect x="80" y="245" width="270" height="165" rx="32" fill="#516f73" ${stroke}/><path d="M110 285h210M110 365h210" stroke="#8fa9a8" stroke-width="12"/><path d="M350 330C440 330 430 175 510 175" fill="none" ${stroke}/><circle cx="585" cy="175" r="105" ${ivory}/>${ticks(585,175,78)}<path d="M585 175l42-48" ${stroke}/><path d="M350 370C465 390 470 475 545 475" fill="none" ${stroke}/><ellipse cx="610" cy="475" rx="78" ry="42" ${copper}/><path d="M532 475h-34" ${stroke}/>`,
  'stethoscope':`<path d="M245 110v125c0 92 50 145 155 145s155-53 155-145V110" fill="none" stroke="#315f67" stroke-width="28" stroke-linecap="round"/><path d="M245 110l-42-42m352 42 42-42" ${stroke}/><circle cx="196" cy="62" r="24" ${metal}/><circle cx="604" cy="62" r="24" ${metal}/><path d="M400 380v83" ${stroke}/><circle cx="400" cy="500" r="68" ${metal}/><circle cx="400" cy="500" r="39" fill="#f3ead3" stroke="#173f49" stroke-width="8"/>`,
  'laryngoscope':`<rect x="310" y="245" width="118" height="285" rx="38" ${copper}/><path d="M330 280h78m-78 55h78m-78 55h78m-78 55h78" stroke="#e0a47b" stroke-width="12"/><path d="M370 245V205C370 165 410 145 458 145h128c55 0 88-40 96-91" fill="none" stroke="#b9c8c8" stroke-width="52" stroke-linecap="round"/><path d="M374 205c65-3 74-36 88-60" fill="none" stroke="#173f49" stroke-width="12"/><circle cx="657" cy="72" r="17" fill="#f8df93" stroke="#173f49" stroke-width="7"/>`,
  'amnihook':`<path d="M170 470C280 398 397 328 565 175" fill="none" stroke="#d9e7df" stroke-width="42" stroke-linecap="round"/><path d="M568 177c80-75 62-132 17-111-24 11-21 45 15 50" fill="none" ${stroke}/><path d="M160 477l-43 20" ${stroke}/><path d="M218 424l28 36m60-93 28 36m60-92 28 35m60-90 27 34" stroke="#5d7b79" stroke-width="7"/>`,
  'defibrillator':`<rect x="178" y="155" width="444" height="330" rx="26" ${copper}/><rect x="225" y="205" width="190" height="120" rx="12" ${ivory}/>${ticks(320,265,46,12)}<path d="M320 265l28-26" ${stroke}/><circle cx="493" cy="245" r="34" fill="#d9a441" stroke="#173f49" stroke-width="10"/><circle cx="565" cy="245" r="34" fill="#8ea6a3" stroke="#173f49" stroke-width="10"/><path d="M235 485c-82 45-117 2-95-54 18-46 68-49 97-16m328 70c82 45 117 2 95-54-18-46-68-49-97-16" fill="none" ${stroke}/><path d="M113 377l92-45 42 84-93 45zm574 0l-92-45-42 84 93 45z" ${metal}/><path d="M469 342l-38 56h42l-31 57 92-82h-45l33-31z" fill="#f8df93" stroke="#173f49" stroke-width="8"/>`,
  'doppler-fetal-monitor':`<rect x="110" y="130" width="385" height="330" rx="34" ${ivory}/><rect x="160" y="185" width="285" height="120" rx="12" fill="#2d4e4e" stroke="#173f49" stroke-width="10"/><path d="M180 255h50l25-36 39 76 37-54 24 14h70" fill="none" stroke="#f8df93" stroke-width="9"/><circle cx="205" cy="370" r="35" ${copper}/><circle cx="310" cy="370" r="35" ${metal}/><path d="M495 390c82 0 62 94 127 94" fill="none" ${stroke}/><path d="M585 315c66-9 111 29 104 89s-55 87-119 72" ${glass}/><circle cx="620" cy="394" r="43" fill="#6b8e8a" stroke="#173f49" stroke-width="10"/>`,
  'ecg-machine':`<rect x="145" y="105" width="510" height="370" rx="28" ${ivory}/><rect x="200" y="165" width="260" height="140" rx="12" fill="#d9efe8" stroke="#173f49" stroke-width="10"/><path d="M220 240h55l22-48 38 98 40-78 28 28h37" fill="none" stroke="#b8423d" stroke-width="9"/><path d="M490 175h105m-105 45h105m-105 45h70" stroke="#75918e" stroke-width="14"/><path d="M210 475v65m380-65v65" ${stroke}/><circle cx="210" cy="548" r="24" ${metal}/><circle cx="590" cy="548" r="24" ${metal}/><path d="M235 335h330v88H235z" fill="#fffaf0" stroke="#173f49" stroke-width="10"/><path d="M260 380h48l16-26 24 52 30-52 25 26h136" fill="none" stroke="#b8423d" stroke-width="7"/>`,
  'glucometer':`<rect x="245" y="105" width="310" height="370" rx="52" fill="#7a8f89" stroke="#173f49" stroke-width="14"/><rect x="295" y="165" width="210" height="115" rx="16" fill="#d7e4c4" stroke="#173f49" stroke-width="10"/><path d="M330 220h140" stroke="#506f60" stroke-width="13" stroke-dasharray="22 14"/><circle cx="400" cy="355" r="48" ${ivory}/><path d="M400 475v82" stroke="#e7e0c8" stroke-width="36"/><path d="M400 475v82" ${stroke}/><path d="M370 557h60" ${stroke}/><path d="M590 380c0 36-27 58-55 58s-52-22-52-50c0-36 52-88 52-88s55 48 55 80z" fill="#b8423d" stroke="#173f49" stroke-width="9"/>`,
  'infusion-pump':`<path d="M570 65v475M500 80h140M535 540h70" ${stroke}/><rect x="225" y="130" width="300" height="330" rx="26" ${ivory}/><rect x="270" y="180" width="210" height="85" rx="10" fill="#cae0c7" stroke="#173f49" stroke-width="9"/><circle cx="320" cy="345" r="44" ${copper}/><circle cx="430" cy="345" r="44" ${metal}/><path d="M280 430h190" stroke="#173f49" stroke-width="15"/><path d="M525 330c82 15 35 119 102 153" fill="none" ${stroke}/><path d="M627 483c20 29 18 49-2 65" fill="none" stroke="#6f9c9c" stroke-width="12"/>`,
  'nebuliser':`<rect x="120" y="310" width="330" height="190" rx="36" fill="#8ba4a0" stroke="#173f49" stroke-width="14"/><circle cx="205" cy="405" r="55" ${ivory}/><path d="M295 380h100m-100 48h75" stroke="#173f49" stroke-width="13"/><path d="M450 415c110 0 75-142 164-142" fill="none" ${stroke}/><path d="M585 178c70-28 128 9 135 80 7 70-32 124-101 114l-68-36 18-119z" ${glass}/><path d="M594 220c45 24 69 66 61 118" fill="none" stroke="#6f9c9c" stroke-width="10"/>`,
  'partograph-chart-board':`<rect x="150" y="70" width="500" height="470" rx="24" ${copper}/><rect x="185" y="105" width="430" height="395" fill="#fffdf4" stroke="#173f49" stroke-width="10"/><path d="M225 140v320m55-320v320m55-320v320m55-320v320m55-320v320m55-320v320m55-320v320M220 180h350m-350 55h350m-350 55h350m-350 55h350m-350 55h350m-350 55h350" stroke="#b9c9c3" stroke-width="4"/><path d="M225 414l55-44 55 12 55-104 55 28 55-82 55 20" fill="none" stroke="#b8423d" stroke-width="12"/><rect x="310" y="46" width="180" height="70" rx="22" ${metal}/>`,
  'pinard-fetoscope':`<path d="M250 95h300l-78 150v235c0 55-32 85-72 85s-72-30-72-85V245z" fill="#b9834e" stroke="#173f49" stroke-width="14"/><ellipse cx="400" cy="95" rx="150" ry="48" fill="#d6a56d" stroke="#173f49" stroke-width="14"/><ellipse cx="400" cy="95" rx="105" ry="24" fill="#6f4d2f"/><path d="M333 245h134M345 330h110M345 415h110" stroke="#8f5e37" stroke-width="10"/>`,
  'pulse-oximeter':`<rect x="120" y="120" width="410" height="340" rx="35" ${ivory}/><rect x="170" y="175" width="310" height="130" rx="14" fill="#1e4c49" stroke="#173f49" stroke-width="10"/><path d="M195 246h48l22-40 35 82 36-62 30 20h90" fill="none" stroke="#9bd27d" stroke-width="9"/><circle cx="210" cy="380" r="35" ${copper}/><circle cx="320" cy="380" r="35" ${metal}/><path d="M530 365c94 0 58 100 126 100" fill="none" ${stroke}/><path d="M610 390h94c38 0 52 26 32 58l-32 52h-94c-38 0-52-26-32-58z" fill="#688783" stroke="#173f49" stroke-width="12"/><path d="M620 444h82" stroke="#e8ddd0" stroke-width="20"/>`,
  'simpson-obstetric-forceps':`<g transform="rotate(22 400 300)"><path d="M385 525C340 440 315 365 325 285c8-70 15-160-65-205-28 102 4 180 67 234" fill="none" stroke="#aebfbe" stroke-width="34"/><path d="M415 525c45-85 70-160 60-240-8-70-15-160 65-205 28 102-4 180-67 234" fill="none" stroke="#c6d3d1" stroke-width="34"/><circle cx="400" cy="342" r="25" ${metal}/><path d="M370 520l-35 45m95-45 35 45" ${stroke}/></g>`,
  'sterile-dressing-set':`<path d="M115 330c45-145 525-145 570 0-50 185-520 185-570 0z" ${metal}/><path d="M155 330c90 75 400 75 490 0" fill="none" stroke="#f7fbf8" stroke-width="14"/><rect x="295" y="245" width="210" height="125" rx="12" fill="#fffdf3" stroke="#173f49" stroke-width="10"/><path d="M325 270l150 75m-150 0 150-75" stroke="#d5ddd8" stroke-width="18"/><path d="M220 190l300 205m35-205L250 395" stroke="#7d9694" stroke-width="18"/><circle cx="205" cy="180" r="35" fill="none" stroke="#173f49" stroke-width="12"/><circle cx="570" cy="180" r="35" fill="none" stroke="#173f49" stroke-width="12"/>`,
  'suction-catheter-set':`<rect x="135" y="165" width="250" height="330" rx="55" ${glass}/><rect x="185" y="115" width="150" height="70" rx="18" ${metal}/><path d="M215 115V70m90 45V70" ${stroke}/><path d="M215 70c0-25 25-35 50-35s40 20 40 35M385 255c125 0 80-145 190-145" fill="none" ${stroke}/><path d="M575 110c110 5 115 120 29 167-92 50-53 169 59 200" fill="none" stroke="#809c99" stroke-width="22"/><path d="M180 395h160" stroke="#78a6a0" stroke-width="14" stroke-dasharray="18 12"/>`,
  'syringe-driver':`<rect x="105" y="165" width="590" height="275" rx="32" ${ivory}/><path d="M190 300h335" stroke="#d9e4df" stroke-width="48"/><path d="M190 300h335" ${stroke}/><rect x="230" y="260" width="230" height="80" rx="8" ${glass}/><path d="M460 300h95m-365-55v110m365-82v54" ${stroke}/><path d="M555 300h66l45 35" fill="none" ${stroke}/><circle cx="175" cy="300" r="52" ${copper}/><rect x="495" y="195" width="140" height="50" rx="12" fill="#c9dcbf" stroke="#173f49" stroke-width="9"/>`,
  'tourniquet':`<path d="M150 200c170-110 410-95 500 35 72 105-45 225-195 225-125 0-220-72-185-155 30-72 140-80 222-20" fill="none" stroke="#b76a45" stroke-width="58" stroke-linecap="round"/><rect x="480" y="240" width="155" height="120" rx="18" ${metal}/><rect x="520" y="272" width="75" height="56" rx="10" fill="#f3ead3" stroke="#173f49" stroke-width="9"/><path d="M150 200l-70-35m570 70 73-8" ${stroke}/>`,
  'ventouse-cup':`<path d="M300 355c0-105 45-170 100-170s100 65 100 170" fill="#c4d0ce" stroke="#173f49" stroke-width="14"/><ellipse cx="400" cy="355" rx="155" ry="72" ${metal}/><ellipse cx="400" cy="355" rx="100" ry="38" fill="#f3ead3" stroke="#173f49" stroke-width="10"/><path d="M400 185V85c0-35 30-48 62-48h80" fill="none" ${stroke}/><path d="M542 37c125 0 132 125 48 175" fill="none" stroke="#789693" stroke-width="24"/><rect x="330" y="72" width="140" height="70" rx="28" ${copper}/>`
};

fs.mkdirSync(out,{recursive:true});
for(const [slug,body] of Object.entries(items)){
  const svg=frame(body);
  if(/<text\b|<script\b|<foreignObject\b|\son\w+=|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg','')))throw new Error(`Unsafe or answer-bearing SVG: ${slug}`);
  fs.writeFileSync(path.join(out,`${slug}.svg`),svg,'utf8');
}

if(process.argv.includes('--upload')){
  const supabaseUrl=process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!serviceKey)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for upload.');
  const projectRef=process.env.SUPABASE_PROJECT_REF||new URL(supabaseUrl).hostname.split('.')[0];
  const cliArgs=['--yes','supabase@2.109.1','projects','api-keys','--project-ref',projectRef,'--output','json'];
  const raw=process.platform==='win32'
    ?execFileSync(process.env.ComSpec||'cmd.exe',['/d','/c','npx.cmd',...cliArgs],{encoding:'utf8',stdio:['ignore','pipe','inherit']})
    :execFileSync('npx',cliArgs,{encoding:'utf8',stdio:['ignore','pipe','inherit']});
  const serviceJwt=JSON.parse(raw).find(key=>key.name==='service_role'&&key.type==='legacy')?.api_key;
  if(!serviceJwt)throw new Error('The linked project did not return a legacy service-role JWT.');
  for(const slug of Object.keys(items)){
    const response=await fetch(`${supabaseUrl}/storage/v1/object/golden-question-images/questions/equipment/v2/${slug}.svg`,{
      method:'POST',
      headers:{apikey:serviceKey,authorization:`Bearer ${serviceJwt}`,'cache-control':'max-age=31536000','content-type':'image/svg+xml','x-upsert':'false'},
      body:fs.readFileSync(path.join(out,`${slug}.svg`))
    });
    if(!response.ok)throw new Error(`Upload failed for ${slug}: HTTP ${response.status} ${(await response.text()).slice(0,300)}`);
  }
}

console.log(JSON.stringify({generated:Object.keys(items).length,uploaded:process.argv.includes('--upload'),output:out},null,2));
