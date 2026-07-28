import {readFileSync,writeFileSync} from 'node:fs';

const pagePath=new URL('../web/index.html',import.meta.url);
const assetPath=new URL('../web/app-content-v171.js',import.meta.url);
const html=readFileSync(pagePath,'utf8');

if(html.includes('app-content-v171.js')){
  console.log('The heavy application block is already externalised.');
  process.exit(0);
}

const scripts=[...html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/g)];
const target=scripts.find(match=>match.groups.attrs.trim()===''&&match.groups.body.includes("const legalUpdated='24 July 2026';"));
if(!target||target.groups.body.length<1_000_000)throw new Error('Expected heavy inline application block was not found.');

writeFileSync(assetPath,`${target.groups.body.trim()}\n`,'utf8');
writeFileSync(pagePath,html.replace(target[0],'<script src="app-content-v171.js?v=171"></script>'),'utf8');
console.log(`Externalised ${target.groups.body.length.toLocaleString()} bytes from web/index.html.`);
