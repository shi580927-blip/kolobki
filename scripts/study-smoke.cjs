const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.STUDY_TEST_URL||'http://127.0.0.1:4202')+'/?face-study');await page.waitForFunction(()=>window.__FACE_STUDY__);await page.waitForTimeout(500);await page.screenshot({path:'test-results/study-front.png'});
 await page.getByRole('button',{name:'Спереди / ¾'}).click();await page.waitForTimeout(200);await page.screenshot({path:'test-results/study-angle.png'});
 await page.getByRole('button',{name:'Свет / тень'}).click();await page.waitForTimeout(200);await page.screenshot({path:'test-results/study-shadow.png'});
 await page.getByRole('button',{name:'Моргание'}).click();await page.waitForTimeout(100);
 let state=await page.evaluate(()=>window.__FACE_STUDY__);if(state.eyes.some(pair=>pair.some(Boolean)))throw Error('iris visible during closed blink');
 await page.getByRole('button',{name:'Моргание'}).click();await page.getByRole('button',{name:'Качение',exact:true}).click();await page.getByRole('button',{name:'Реакция',exact:true}).click();await page.waitForTimeout(1100);
 state=await page.evaluate(()=>window.__FACE_STUDY__);if(!state.rolling||state.expressions.length!==3)throw Error('study control failed');if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({threeExpressions:true,closedEyesHidden:true,orbitLightingRollingReaction:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
