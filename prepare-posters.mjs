// Run before deployment. Never process/flood-fill photographs on a visitor's CPU.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch { sharp = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/sharp'); }
const root = path.resolve('dist/assets');
const masks = JSON.parse(await fs.readFile(new URL('./poster-masks.json', import.meta.url), 'utf8'));
const trace = product => masks[product.id];
const products = JSON.parse(await fs.readFile('dist/products.json', 'utf8'));
for (const product of products) {
  const file = path.join(root, product.id + '.jpg');
  let {data, info} = await sharp(file).resize({width:900,withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h} = info;
  if (product.id.startsWith('kazakhstan') || product.id === 'kairat') {
    const points = trace(product).map(([x,y])=>`${x*w},${y*h}`).join(' ');
    data = await sharp(data,{raw:{width:w,height:h,channels:4}}).composite([{input:Buffer.from(`<svg width="${w}" height="${h}"><polygon points="${points}" fill="white"/></svg>`),blend:'dest-in'}]).raw().toBuffer();
  } else {
    const seen = new Uint8Array(w*h), queue = new Int32Array(w*h);
    let head=0,tail=0;
    const push=i=>{if(i<0||i>=w*h||seen[i]) return; seen[i]=1; const n=i*4;if(data[n]>243&&data[n+1]>243&&data[n+2]>243)queue[tail++]=i;};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){const i=queue[head++];data[i*4+3]=0;if(i%w)push(i-1);if(i%w<w-1)push(i+1);push(i-w);push(i+w);}
  }
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left,top,width:right-left+1,height:bottom-top+1}).resize({width:600,height:720,fit:'inside',withoutEnlargement:true}).webp({quality:84,effort:6}).toFile(path.join(root,product.id+'-poster.webp'));
}
await sharp(path.join(root,'conext-source.jpg')).extract({left:130,top:130,width:820,height:820}).resize(420,420).ensureAlpha().composite([{input:Buffer.from('<svg width="420" height="420"><circle cx="210" cy="210" r="209.5" fill="white"/></svg>'),blend:'dest-in'}]).webp({quality:86,effort:6}).toFile(path.join(root,'ball-conext-poster.webp'));
console.log('Prepared 11 transparent WebP posters');
