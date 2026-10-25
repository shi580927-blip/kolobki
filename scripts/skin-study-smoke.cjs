const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.SKIN_TEST_URL||'http://127.0.0.1:4224')+'/?skin-study');await page.waitForFunction(()=>window.__SKIN_STUDY__);
 await page.evaluate(()=>{localStorage.setItem('sharobesy.skin.v1','56789');});
 const state=()=>page.evaluate(()=>window.__SKIN_STUDY__);
 await page.screenshot({path:'test-results/skin-solid.png'});
 for(const pattern of ['none','dots','cow','leopard','tiger','hearts','diamonds','hex','checker','zigzag','waves','splats','scribbles']){
  await page.getByLabel('Узор',{exact:true}).selectOption(pattern);assert.equal((await state()).design.pattern,pattern);
  if(['cow','hex'].includes(pattern))await page.screenshot({path:`test-results/skin-${pattern}.png`});
 }
 await page.getByLabel('Узор',{exact:true}).selectOption('cow');
 async function slider(name,value){await page.getByLabel(name,{exact:true}).fill(String(value));await page.waitForTimeout(80);}
 await slider('Масштаб рисунка',1.65);await slider('Плотность',.35);await slider('Разброс размеров',.5);await slider('Разброс положения',.8);
 for(const surface of ['scales','segments','smooth']){await page.getByLabel('Фактура',{exact:true}).selectOption(surface);assert.equal((await state()).design.surface,surface);if(surface!=='smooth')await page.screenshot({path:`test-results/skin-${surface}.png`});}
 for(const [name,count] of [['Один',1],['Пара',2],['Несколько',12],['Много',80],['Весь шар',240]]){await page.getByRole('button',{name,exact:true}).click();assert.equal((await state()).growthInstances,count);}
 await page.getByLabel('Форма',{exact:true}).selectOption('spike');await page.getByLabel('Наросты цветом рисунка',{exact:true}).check();
 await page.getByLabel('Фактура',{exact:true}).selectOption('scales');await page.screenshot({path:'test-results/skin-scales-growths.png'});
 const before=await state();await page.getByRole('button',{name:'Качение',exact:true}).click();await page.waitForTimeout(500);const after=await state();assert.ok(after.bodyAngle>before.bodyAngle);assert.deepEqual(after.faceQuaternion,before.faceQuaternion);assert.ok(after.drawCalls<55);await page.getByRole('button',{name:'Качение',exact:true}).click();
 await page.getByLabel('Выражение лица').selectOption('happy');await page.getByRole('button',{name:'Свет / тень',exact:true}).click();await page.getByRole('button',{name:'Спереди / ¾',exact:true}).click();await page.screenshot({path:'test-results/skin-shadow-angle.png'});
 const saved=(await state()).design;await page.getByRole('button',{name:'Сохранить здесь',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.__SKIN_STUDY__);assert.deepEqual((await state()).design,saved);assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.skin.v1')),'56789');
 const imported={...saved,pattern:'hearts',growthCount:2,surface:'segments'};await page.locator('input[type=file]').setInputFiles({name:'skin.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});await page.waitForFunction(()=>window.__SKIN_STUDY__.design.pattern==='hearts');assert.equal((await state()).growthInstances,2);
 const waitDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать JSON',exact:true}).click();const download=await waitDownload;const path=await download.path();assert.deepEqual(JSON.parse(require('node:fs').readFileSync(path,'utf8')),imported);
 await page.setViewportSize({width:844,height:390});const dimensions=await page.locator('#stage').boundingBox();assert.ok(Math.abs(dimensions.width/dimensions.height-16/9)<.01);await page.screenshot({path:'test-results/skin-mobile-landscape.png'});
 await page.setViewportSize({width:1280,height:720});await page.goto((process.env.SKIN_TEST_URL||'http://127.0.0.1:4224')+'/?face-animations');await page.waitForFunction(()=>window.__FACE_ANIMATIONS__);await page.getByRole('button',{name:'Гордость',exact:true}).click();await page.waitForFunction(()=>window.__FACE_ANIMATIONS__.phase==='HOLD');await page.screenshot({path:'test-results/pride-brow-clean.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({patterns:13,surfaces:3,maxGrowths:240,roundTrip:true,gameSeedPreserved:true,independentFace:true,drawCalls:after.drawCalls,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
