const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('sharobesy.skin.v1','4321');Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(4);return a;}});});
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4248';await page.goto(url);
 const state=()=>page.evaluate(()=>window.__SHAROBESY__);
 await page.waitForFunction(()=>window.__SHAROBESY__?.match&&document.querySelector('#boot').hidden);
 const original=await state();assert.equal(original.match.phase,'sandbox');
 await page.locator('#match-start').click();const start=await state();assert.equal(start.match.phase,'countdown');assert.equal(start.train.count,0);assert.equal(start.match.rivalTrain.count,0);
 await page.screenshot({path:'test-results/match-countdown.png'});
 await page.waitForFunction(()=>window.__SHAROBESY__.match.phase==='running');
 // Actual keyboard steering toward a free NPC, then the route. No mutation hooks.
 let held=new Set(),captured=false,maxRivalWagons=0,maxRivalProgress=0,maxGap=0;
 const started=Date.now();let loops=0;
 while(Date.now()-started<240000){
  const s=await state();maxRivalWagons=Math.max(maxRivalWagons,s.match.rivalTrain.count);maxRivalProgress=Math.max(maxRivalProgress,s.match.progress[1]);maxGap=Math.max(maxGap,...s.train.gaps,...s.match.rivalTrain.gaps,0);
  assert.equal(new Set([...s.train.ids,...s.match.rivalTrain.ids]).size,s.train.count+s.match.rivalTrain.count,'exclusive ownership');
  if(s.train.count)captured=true;
  if(s.match.phase==='finished')break;
  const free=s.npcs.filter(n=>n.id!==0&&!s.train.ids.includes(n.id)&&!s.match.rivalTrain.ids.includes(n.id)&&n.id!==s.match.rivalTrain.joining);
  const target=!captured&&free.length?free.sort((a,b)=>Math.hypot(a.position[0]-s.position[0],a.position[2]-s.position[2])-Math.hypot(b.position[0]-s.position[0],b.position[2]-s.position[2]))[0].position:[s.match.targets[0].x,0,s.match.targets[0].z];
  const dx=target[0]-s.position[0],dz=target[2]-s.position[2],d=Math.hypot(dx,dz)||1;
  const speed=!captured?Math.min(3.5,d*1.4):Math.min(8,d*1.5),ax=dx/d*speed-s.velocity.x,az=dz/d*speed-s.velocity.z;
  const length=Math.hypot(s.viewForward[0],s.viewForward[2])||1,fx=s.viewForward[0]/length,fz=s.viewForward[2]/length,cx=-fz*ax+fx*az,cz=-(fx*ax+fz*az),next=new Set();
  if(s.train.joining===undefined){if(cx>.5)next.add('KeyD');if(cx<-.5)next.add('KeyA');if(cz>.5)next.add('KeyS');if(cz<-.5)next.add('KeyW');}
  for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k))await page.keyboard.down(k);held=next;
  if(loops++%100===0)console.log(JSON.stringify({phase:s.match.phase,progress:s.match.progress,playerWagons:s.train.count,rivalWagons:s.match.rivalTrain.count,remaining:s.match.remaining}));
  await page.waitForTimeout(100);
 }
 for(const k of held)await page.keyboard.up(k);
 const end=await state();assert.equal(end.match.phase,'finished');assert.ok(captured,'player collects a real NPC during the match');assert.ok(maxRivalWagons>0,'NPC collects its own train');assert.ok(maxRivalProgress>0,'NPC follows checkpoints');assert.ok(end.match.progress.some(p=>p===12),'a full two-lap route is completed, not only timeout');
 assert.ok(maxGap<3,'bounded train gaps');await page.screenshot({path:'test-results/match-finished.png'});assert.ok(await page.locator('#match-result').isVisible());
 await page.locator('#match-start').click();const replay=await state();assert.equal(replay.match.phase,'countdown');assert.deepEqual(replay.match.progress,[0,0]);assert.equal(replay.skin.seed,4321);assert.deepEqual(replay.npcs.map(n=>n.appearanceSeed),original.npcs.map(n=>n.appearanceSeed));
 await page.getByRole('button',{name:'На старт',exact:true}).click();const reset=await state();assert.equal(reset.match.phase,'sandbox');assert.equal(reset.train.count,0);assert.equal(reset.match.rivalTrain.count,0);
 await page.setViewportSize({width:1170,height:540});const box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);for(let i=1;i<=4;i++){await page.keyboard.press('Digit'+i);assert.equal((await state()).camera,i-1);}assert.equal((await state()).cameraFov,52);
 await page.goto(url+'/?skin-test');await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);assert.equal(await page.locator('#match-start').count(),0);
 await page.getByRole('button',{name:'Проба комбо',exact:true}).click();await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='DIZZY');await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='IDLE');assert.ok((await state()).faceVisibility.length>0);assert.equal((await state()).immobilized,false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({winner:end.match.winner,progress:end.match.progress,maxRivalWagons,maxRivalProgress,maxGap,captured,replay:true,reset:true,seed:true,cameras:4,aspect16by9:true,comboRecovery:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
