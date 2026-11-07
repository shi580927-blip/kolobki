const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('sharobesy.skin.v1','4321'));
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4240';
 await page.goto(url+'/?valley-study');await page.waitForFunction(()=>window.__SHAROBESY__?.studyActors?.length===10);await page.waitForTimeout(1500);
 const state=await page.evaluate(()=>window.__SHAROBESY__);assert.equal(state.valleyStudy,true);assert.equal(state.skin.seed,4321);assert.ok(state.studyActors.some(a=>a.surface==='shaggy'));assert.ok(!state.studyActors.some(a=>a.surface==='fuzz'));assert.equal(new Set(state.studyActors.map(a=>a.seed)).size,10);
 await page.screenshot({path:'test-results/valley-study-wide.png'});
 await page.keyboard.press('Digit1');await page.waitForTimeout(800);await page.screenshot({path:'test-results/valley-study-rear.png'});
 await page.setViewportSize({width:2400,height:1080});const box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);
 await page.setViewportSize({width:1280,height:720});
 await page.goto(url+'/');await page.waitForFunction(()=>window.__SHAROBESY__);assert.equal(await page.evaluate(()=>window.__SHAROBESY__.valleyStudy),false);assert.equal(await page.evaluate(()=>window.__SHAROBESY__.studyActors),undefined);await page.waitForTimeout(900);await page.screenshot({path:'test-results/valley-game.png'});
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/valley-check.json',JSON.stringify({actors:state.studyActors,drawCalls:state.drawCalls,letterbox:true,errors},null,2));console.log(JSON.stringify({actors:10,drawCalls:state.drawCalls,letterbox:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
