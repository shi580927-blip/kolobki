const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.typ…1875 tokens truncated…essories');
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
