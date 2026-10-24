const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4210');await page.waitForFunction(()=>window.__SHAROBESY__);await page.waitForTimeout(1800);await page.keyboard.press('Digit4');await page.waitForTimeout(900);
 const start=await page.evaluate(()=>window.__SHAROBESY__);if(start.faceArt!=='approved-three-expressions')throw Error('legacy face loaded');
 await page.screenshot({path:'test-results/game-calibrated-base.png'});
 await page.keyboard.press('Space');await page.waitForTimeout(180);const jump=await page.evaluate(()=>window.__SHAROBESY__);if(jump.facePose!=='happy'||jump.portraitPose!=='happy')throw Error('jump did not activate happy face');await page.screenshot({path:'test-results/game-calibrated-happy.png'});
 let sawStun=false;for(let i=0;i<120;i++){await page.waitForTimeout(65);const s=await page.evaluate(()=>window.__SHAROBESY__);if(s.stun>0){sawStun=true;if(s.facePose!=='stunned'||s.faceEyes.some(Boolean))throw Error('stun rendering mismatch');await page.screenshot({path:'test-results/game-calibrated-impact.png'});break;}}
 if(!sawStun)throw Error('jump landing did not produce physical impact');
 await page.waitForTimeout(1800);await page.keyboard.press('Shift');await page.waitForTimeout(180);const dash=await page.evaluate(()=>window.__SHAROBESY__);if(dash.facePose!=='grumpy')throw Error('dash face missing');await page.screenshot({path:'test-results/game-calibrated-grumpy.png'});
 await page.waitForTimeout(2500);const end=await page.evaluate(()=>window.__SHAROBESY__);if(end.facePose==='stunned'||end.facePose!==start.facePose||end.skin.seed!==start.skin.seed)throw Error('base identity did not recover');
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({base:start.facePose,jump:jump.facePose,dash:dash.facePose,physicalLandingStun:sawStun,recovered:end.facePose,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
