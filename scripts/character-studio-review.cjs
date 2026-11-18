const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://game.local/**',route=>{const file=new URL(route.request().url()).pathname.replace(/^\/kolobki\//,'/');return route.fulfill({path:path.join('dist',file==='/'?'index.html':file)});});
  await page.addInitScript(()=>{if(!localStorage.getItem('sharobesy.skin.v1'))localStorage.setItem('sharobesy.skin.v1','4321');});
  await page.goto('http://game.local/?character-editor');
  await page.waitForFunction(()=>window.__CHARACTER_STUDIO__);
  await page.locator('.studio-view canvas').waitFor();
  await fs.mkdir('dist/deploy-review',{recursive:true});
  await page.screenshot({path:'dist/deploy-review/character-editor.png'});
  const boxes=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
   return {save:rect('#studio-save'),back:rect('#studio-back'),reset:rect('#studio-reset'),tabs:[...document.querySelectorAll('.studio-tabs button')].map(e=>({inside:e.getBoundingClientRect().right<=1280,unclipped:e.scrollWidth<=e.clientWidth}))};
  });
  assert.ok(boxes.save.width/boxes.back.width>1.5&&boxes.save.width/boxes.back.width<1.7);
  assert.ok(boxes.reset.width>boxes.back.width);
  assert.ok(boxes.tabs.every(b=>b.inside&&b.unclipped),'reference tabs fit without clipped labels');
  await page.getByRole('button',{name:'Цвет #29c7bf',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.look.design.base),'#29c7bf');
  await page.getByRole('button',{name:'Стрелки',exact:true}).click();
  assert.ok(await page.evaluate(()=>window.__CHARACTER_STUDIO__.look.makeup.includes('liner')));
  await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click();
  assert.ok(await page.evaluate(()=>window.__CHARACTER_STUDIO__.angle>0));
  await page.locator('#studio-save').click();
  const saved=await page.evaluate(()=>JSON.stringify(window.__CHARACTER_STUDIO__.look));
  await page.getByRole('button',{name:'Цвет #f24858',exact:true}).click();
  await page.locator('#studio-reset').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__CHARACTER_STUDIO__.look)),saved);
  assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.angle),0);
  await page.reload();await page.waitForFunction(()=>window.__CHARACTER_STUDIO__);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__CHARACTER_STUDIO__.look)),saved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.skin.v1')),'4321','author editor must not overwrite player seed');
  await page.setViewportSize({width:1440,height:720});
  await page.waitForFunction(()=>document.querySelector('#stage').clientWidth===1280);
  await page.screenshot({path:'dist/deploy-review/character-editor-wide.png'});
  await page.setViewportSize({width:960,height:540});
  await page.waitForFunction(()=>document.querySelector('#stage').clientWidth===960);
  assert.equal(await page.locator('#studio-save').evaluate(e=>Math.round(e.getBoundingClientRect().width)),266);
  await page.screenshot({path:'dist/deploy-review/character-editor-mobile.png'});
  assert.deepEqual(errors,[]);console.log('Character studio: reference proportions, author storage, real previews and uniform 16:9 PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
