const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4240',page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(90000);
 await page.addInitScript(()=>{if(!localStorage.getItem('sharobesy.skin.v1'))localStorage.setItem('sharobesy.skin.v1','4321');});
 let rejectEntry=true;await page.route('**/assets/index-*.js',route=>rejectEntry?route.abort('failed'):route.continue());
 await page.goto(url+'/?valley-study',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#boot').dataset.state==='failed');assert.equal(await page.getByRole('button',{name:'Повторить загрузку',exact:true}).isVisible(),true);
 const box=await page.locator('#stage').boundingBox();assert.ok(box.width>0&&Math.abs(box.width/box.height-16/9)<.001);
 rejectEntry=false;await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);assert.ok(new URL(page.url()).searchParams.has('v'));assert.equal(await page.evaluate(()=>window.__SHAROBESY__.skin.seed),4321);assert.equal(await page.evaluate(()=>window.__SHAROBESY__.buildVersion),'0.1.0-dev.20');
 await page.close();
 const fallback=await browser.newPage({viewport:{width:960,height:540}});fallback.setDefaultTimeout(90000);await fallback.route('**/assets/CloudSky-*.js',route=>route.abort('failed'));
 await fallback.goto(url+'/');await fallback.waitForFunction(()=>window.__SHAROBESY__?.skyArt==='clear-sky'&&document.querySelector('#boot').hidden);assert.equal(await fallback.evaluate(()=>window.__SHAROBESY__.berries.total),12);assert.equal(await fallback.evaluate(()=>window.__SHAROBESY__.cloudCount),0);await fallback.close();
 const atlas=await browser.newPage({viewport:{width:960,height:540}});atlas.setDefaultTimeout(90000);await atlas.route('**/assets/face/animated/atlas.json',route=>route.fulfill({status:503,body:'temporarily unavailable'}));await atlas.goto(url+'/');await atlas.waitForFunction(()=>document.querySelector('#boot').dataset.state==='failed');assert.equal(await atlas.locator('#boot-retry').isVisible(),true);assert.equal(await atlas.locator('#notice').isHidden(),false);await atlas.close();
 for(const mode of ['skin-study','face-animations','face-editor','face-study','art-review']){const author=await browser.newPage({viewport:{width:960,height:540}});author.setDefaultTimeout(90000);await author.goto(url+'/?'+mode);await author.waitForFunction(()=>document.querySelector('#boot').hidden);await author.close();}
 console.log(JSON.stringify({authorViewsReady:true,missingEntryVisible:true,retryLoadsFreshPage:true,seedPreserved:true,optionalCloudFailurePlayable:true,atlasFailureVisible:true,stage16by9BeforeStartup:true}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
