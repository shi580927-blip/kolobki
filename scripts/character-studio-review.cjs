const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS|WebGL.*INVALID/.test(m.text()))errors.push(m.text());});
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
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://game.local/?character-editor&design-study');
  await page.waitForFunction(()=>window.__CHARACTER_STUDIO__?.study&&window.__CHARACTER_STUDIO__.renderedFrames>=3);
  await page.screenshot({path:'dist/deploy-review/design-initial.png'});
  assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.look.accessory),'headphones');
  const fixed=await page.evaluate(()=>{const s=window.__CHARACTER_STUDIO__;return {face:s.faceRotation,tattoo:s.tattooRotation,accessory:s.accessoryRotation};});
  await page.locator('#studio-roll').click();
  await page.waitForFunction(()=>window.__CHARACTER_STUDIO__.bodyRotation>.65);
  const afterRoll=await page.evaluate(()=>{const s=window.__CHARACTER_STUDIO__;return {face:s.faceRotation,tattoo:s.tattooRotation,accessory:s.accessoryRotation};});
  assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.framesIndependent),true,'face, paint and equipment must be siblings of the rolling body');
  assert.deepEqual(afterRoll.tattoo,fixed.tattoo,'paint inherits no body rotation');
  assert.deepEqual(afterRoll.accessory,fixed.accessory,'equipment inherits no body rotation');
  // V5 may tilt its expression around Z. It must never inherit the body's X roll.
  assert.ok(Math.abs(afterRoll.face[0])<.02&&Math.abs(afterRoll.face[1])<.02&&Math.abs(afterRoll.face[2])<.2,'expression remains in the heading frame: '+JSON.stringify(afterRoll.face));
  await page.locator('#studio-roll').click();
  for(const name of ['Алый хищник','Лаймовый бунт','Северный разряд','Черепушка · маска']){
   await page.getByRole('button',{name,exact:true}).click();
   if(name==='Черепушка · маска'){
    // Texture loading is asynchronous; wait for the image, rather than taking an empty-overlay screenshot.
    await page.evaluate(async()=>{const im=new Image();im.src='/assets/cosmetics/skull.webp';await im.decode();});
    assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.look.skullTreatment),'open-mask');
   }
   await page.screenshot({path:'dist/deploy-review/design-'+['Алый хищник','Лаймовый бунт','Северный разряд','Черепушка · маска'].indexOf(name)+'.png'});
   await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click({clickCount:2});
   await page.screenshot({path:'dist/deploy-review/design-side-'+['Алый хищник','Лаймовый бунт','Северный разряд','Черепушка · маска'].indexOf(name)+'.png'});
  }
  await page.getByRole('button',{name:'Повернуть влево',exact:true}).click({clickCount:2});
  await page.getByRole('button',{name:'Без рисунка',exact:true}).click();
  await page.getByRole('button',{name:'Цвет #29c7bf',exact:true}).click();
  await page.getByRole('button',{name:'Без узора',exact:true}).click();
  const catalog=await page.evaluate(()=>Object.entries(window.__CHARACTER_STUDIO__.accessories).filter(([id])=>id!=='none'));
  assert.equal(catalog.length,9,'the reference set contains nine distinct accessories');
  async function captureAccessory(id,view){
   const before=await page.evaluate(()=>window.__CHARACTER_STUDIO__.renderedFrames);
   await page.waitForFunction(n=>window.__CHARACTER_STUDIO__.renderedFrames>n,before);
   const png=await page.locator('.studio-view canvas').evaluate(c=>c.toDataURL('image/png'));
   await fs.writeFile('dist/deploy-review/accessory-'+id+'-'+view+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  for(const [id,name]of catalog){
   await page.getByRole('button',{name,exact:true}).click();
   assert.equal(await page.evaluate(()=>window.__CHARACTER_STUDIO__.look.accessory),id);
   await captureAccessory(id,'front');
   await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click({clickCount:3});
   await captureAccessory(id,'side');
   await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click({clickCount:3});
   await captureAccessory(id,'back');
   await page.getByRole('button',{name:'Повернуть влево',exact:true}).click({clickCount:6});
  }
  await page.locator('#studio-save').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.skin.v1')),'4321');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.author.character-studio.v1')),saved,'new study does not overwrite the approved editor save');
  await page.goto('http://game.local/accessory-gallery.html');
  await page.waitForFunction(()=>document.querySelectorAll('article img').length===9&&[...document.querySelectorAll('article img')].every(im=>im.complete&&im.naturalWidth>600));
  await page.screenshot({path:'dist/deploy-review/accessory-gallery.png',fullPage:true});
  await page.getByRole('button',{name:'Сзади',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(im=>im.complete&&im.naturalWidth>600));
  await page.screenshot({path:'dist/deploy-review/accessory-gallery-back.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Character studio: reference proportions, author storage, independent body roll and nine accessories in three views PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
