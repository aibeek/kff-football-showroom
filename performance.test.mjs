// node --experimental-vm-modules --test performance.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('./dist/performance.js', import.meta.url),'utf8');
async function policy(profile={},query='',supported=true) {
  let probes=0;
  const elements={quality:{},qualityStatus:{}};
  const context=vm.createContext({navigator:profile,URL,URLSearchParams,location:{search:query},localStorage:{getItem:()=>null},matchMedia:()=>({matches:false}),document:{documentElement:{dataset:{}},getElementById:id=>elements[id],querySelector:()=>null,createElement:()=>({getContext:()=>{probes++;return supported?{getExtension:()=>null}:null;}})},addEventListener(){},dispatchEvent(){},CustomEvent:class{}});
  const mod=new vm.SourceTextModule(source,{context});
  await mod.link(()=>{});await mod.evaluate();
  return {api:mod.namespace,context,probes:()=>probes};
}
test('automatic mode avoids GPU on weak hardware and slow/data-saving connections',async()=>{
  for(const profile of [{hardwareConcurrency:2},{deviceMemory:4},{connection:{saveData:true}},{connection:{effectiveType:'3g'}},{connection:{downlink:.5}}]) {
    const p=await policy(profile);p.api.setupQuality();assert.equal(p.api.use3D(),false);assert.equal(p.probes(),0);
  }
});
test('fast hardware retains full 3D',async()=>{const p=await policy({deviceMemory:8,hardwareConcurrency:8,connection:{effectiveType:'4g',downlink:10}});p.api.setupQuality();assert.equal(p.api.use3D(),true);});
test('manual light mode avoids WebGL even on a fast PC',async()=>{const p=await policy({},'?quality=lite');p.api.setupQuality();assert.equal(p.probes(),0);assert.equal(p.api.use3D(),false);});
test('manual 3D overrides data saver but gracefully falls back when GPU is unavailable',async()=>{
  const p=await policy({connection:{saveData:true}},'?quality=3d',true);p.api.setupQuality();assert.equal(p.api.use3D(),true);
  const failed=await policy({},'?quality=3d',false);failed.api.setupQuality();assert.equal(failed.api.use3D(),false);assert.equal(failed.context.document.documentElement.dataset.quality,'lite');
});
test('missing browser hints do not disable a working GPU',async()=>{const p=await policy();p.api.setupQuality();assert.equal(p.api.use3D(),true);p.api.enableLite();assert.equal(p.api.use3D(),false);});
