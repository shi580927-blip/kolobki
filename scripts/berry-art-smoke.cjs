const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4240';
 await page.goto(url+'/?valley-study&berry-detail');await page.waitForFunction(()=>window.__SHAROBESY__?.berryArt==='raspberry-plants-v1');await page.waitForTimeout(1200);await page.screenshot({path:'test-results/berry-detail-dev17.png'});
 assert.equal(await page.evaluate(()=>window.__SHAROBESY__.berryDetail),true);assert.equal(await page.evaluate(()=>window.__SHAROBESY__.berries.total),12);
 await page.getByRole('button',{name:'Ягоды крупно / общий вид',exact:true}).click();await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__SHAROBESY__.berryDetail),false);
 await page.goto(url+'/?skin-test');await page.waitForFunction(()=>window.__SHAROBESY__);await page.waitForTimeout(900);await page.screenshot({path:'test-results/shadow-grounded-dev17.png'});
 const ground=await page.evaluate(()=>window.__SHAROBESY__);assert.equal(ground.shadowSettings.mapSize,2048);assert.equal(ground.shadowSettings.contactCount,1);assert.equal(ground.shadowSettings.normalBias,.008);
 await page.keyboard.press('Space');await page.waitForFunction(y=>window.__SHAROBESY__.position[1]>y+.3,ground.position[1]);const air=await page.evaluate(()=>window.__SHAROBESY__);assert.ok(air.position[1]>ground.position[1]+.3);await page.screenshot({path:'test-results/shadow-jump-dev17.png'});
 await page.getByRole('button',{name:'На старт',exact:true}).click();await page.getByRole('button',{name:'Проба комбо',exact:true}).click();await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='DIZZY',null,{timeout:90000});await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='IDLE',null,{timeout:90000});assert.equal(await page.evaluate(()=>window.__SHAROBESY__.immobilized),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({detailView:true,berries:12,groundAndAirShadow:true,comboRecovers:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
