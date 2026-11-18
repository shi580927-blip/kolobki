const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('sharobesy.skin.v1','4321'));
 await page.goto((process.env.GAME_TEST_URL||'http://127.0.0.1:4240')+'/?valley-study');await page.waitForFunction(()=>window.__SHAROBESY__?.skyArt==='soft-clouds-v1');await page.waitForTimeout(900);
 page.setDefaultTimeout(90000);
 const state=()=>page.evaluate(()=>window.__SHAROBESY__);
 assert.equal((await state()).cloudCount,10);assert.equal((await state()).berries.total,12);assert.equal((await state()).skin.seed,4321);
 for(let i=1;i<=4;i++){await page.keyboard.press('Digit'+i);await page.waitForTimeout(400);assert.equal((await state()).camera,i-1);assert.equal((await state()).cameraFov,52);if(i===1||i===4)await page.screenshot({path:`test-results/clouds-camera-${i}.png`});}
 await page.keyboard.press('Digit1');await page.waitForTimeout(400);await page.mouse.move(480,320);await page.mouse.down({button:'middle'});await page.mouse.move(480,180,{steps:12});await page.mouse.up({button:'middle'});await page.waitForTimeout(600);assert.equal((await state()).freeOrbit,true);await page.screenshot({path:'test-results/clouds-horizon.png'});
 await page.setViewportSize({width:2400,height:1080});const box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);assert.equal((await state()).cameraFov,52);
 await page.setViewportSize({width:960,height:540});const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Сохранить момент',exact:true}).click();const download=await pending;assert.ok(fs.statSync(await download.path()).size>10000);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({clouds:10,cameras:4,fov:52,letterbox:true,snapshot:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
