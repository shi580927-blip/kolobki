const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4255',results=[];
 const state=()=>page.evaluate(()=>window.__SHAROBESY__);
 for(const appearance of (process.env.GROWTH_ONLY?['soft','spike']:process.env.FUR_ONLY?['fuzz','shaggy']:['fuzz','shaggy','soft','spike'])){
  const growth=appearance==='soft'||appearance==='spike',surface=growth?'smooth':appearance;
  await page.goto(url+'/?skin-study');await page.waitForFunction(()=>window.__SKIN_STUDY__);
  await page.locator('#skin-surface').selectOption(surface);
  if(growth)await page.locator('#skin-growthShape').selectOption(appearance);
  for(const [id,value] of (growth?[['growthCount','240'],['growthSize','.12']]:[['furCount','160'],['furLength','.1']]))await page.locator('#skin-'+id).evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input'));},value);
  await page.waitForTimeout(200);await page.getByRole('button',{name:'В игру с этим скином',exact:true}).click();await page.waitForFunction(()=>window.__SHAROBESY__);
  const initial=await state();assert.equal(growth?initial.design.growthCount:initial.design.furCount,growth?240:160);assert.equal(initial.design.surface,surface);assert.ok(initial.design.furLength<=.1&&initial.design.growthSize<=.12);
  await page.keyboard.press('Digit4');await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.up('KeyD');await page.waitForTimeout(300);
  await page.screenshot({path:`test-results/${appearance}-turned.png`});
  for(let cycle=0;cycle<(growth?1:2);cycle++){
   await page.keyboard.press('Space');await page.waitForFunction(()=>window.__SHAROBESY__.facePose==='happy');
   await page.getByRole('button',{name:'Проба комбо',exact:true}).click();
   await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='ORBIT'&&window.__SHAROBESY__.faceVisibility.some(p=>p.name==='unhinged'&&Math.abs(p.rotation[0])>.01));
   const orbit=await state();assert.ok(orbit.faceVisibility.some(p=>p.name==='unhinged'&&p.opacity===1&&Math.abs(p.rotation[0])>.01));
   await page.screenshot({path:`test-results/${appearance}-orbit-${cycle}.png`});
   await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='DIZZY');assert.equal((await state()).immobilized,true);
   await page.screenshot({path:`test-results/${appearance}-dizzy-${cycle}.png`});
   await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='IDLE',{},{timeout:30000});
   const recovered=await state();assert.equal(recovered.immobilized,false);assert.ok(recovered.faceVisibility.some(p=>p.name===recovered.facePose&&p.opacity===1));
  }
  // No berry, jump or other reaction is allowed to rescue a hidden face here.
  await page.waitForTimeout(11000);const idle=await state();assert.ok(idle.faceVisibility.some(p=>p.name===idle.facePose&&p.opacity===1));
  await page.screenshot({path:`test-results/${appearance}-recovered.png`});results.push({surface,growthShape:growth?appearance:null,growthCount:idle.design.growthCount,furCount:idle.design.furCount,heading:idle.heading,baseVisibleAfter11Seconds:true});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,repeatedCombosRestoreFace:true,verticalOrbit:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
