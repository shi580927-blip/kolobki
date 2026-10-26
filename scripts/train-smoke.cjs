const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('sharobesy.skin.v1','4321');Object.defineProperty(crypto,'getRandomValues',{value:array=>{array.fill(4);return array;}});});
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4241';await page.goto(url+'/');
 await page.waitForFunction(()=>window.__SHAROBESY__?.train&&document.querySelector('#boot').hidden);
 const state=()=>page.evaluate(()=>window.__SHAROBESY__),first=await state();
 let held=new Set(),captured;
 for(let attempt=0;attempt<220;attempt++){
  const s=await state();if(s.train.joining!==undefined){for(const key of held)await page.keyboard.up(key);held=new Set();await page.waitForTimeout(100);continue;}if(s.train.attachedTotal>0){captured=s;break;}
  const target=s.npcs.find(n=>n.kind==='sleepy'),dx=target.position[0]-s.position[0],dz=target.position[2]-s.position[2];
  const length=Math.hypot(s.viewForward[0],s.viewForward[2]),fx=s.viewForward[0]/length,fz=s.viewForward[2]/length;
  // Desired low approach speed with velocity braking, in the current camera frame.
  const d=Math.hypot(dx,dz),speed=Math.min(3.5,d*1.5),ax=dx/(d||1)*speed-s.velocity.x,az=dz/(d||1)*speed-s.velocity.z;
  const cx=-fz*ax+fx*az,cz=-(fx*ax+fz*az),next=new Set();
  if(cx>.35)next.add('KeyD');if(cx<-.35)next.add('KeyA');if(cz>.35)next.add('KeyS');if(cz<-.35)next.add('KeyW');
  for(const key of held)if(!next.has(key))await page.keyboard.up(key);for(const key of next)if(!held.has(key))await page.keyboard.down(key);held=next;
  await page.waitForTimeout(100);
 }
 for(const key of held)await page.keyboard.up(key);
 assert.ok(captured,'real player controls collect an NPC');
 assert.ok(captured.train.count>0);assert.match(await page.locator('#train-status').innerText(),/Поезд: [1-5]/);
 await page.screenshot({path:'test-results/train-collected.png',timeout:120000});
 // Lock camera bearing, then drive forwards and backwards through the tail.
 await page.mouse.move(400,250);await page.mouse.down({button:'middle'});await page.mouse.move(405,250);await page.mouse.up({button:'middle'});
 let maxGap=0,minSeparation=100;
 for(const key of ['KeyW','KeyS','KeyW']){
  const start=(await state()).physicsTime;await page.keyboard.down(key);await page.keyboard.press('Space');
  while((await state()).physicsTime<start+1.3){
   const s=await state();maxGap=Math.max(maxGap,...s.train.gaps,0);
   const positions=[s.position,...s.train.ids.map(id=>s.npcs.find(n=>n.id===id).position)];
   for(let i=0;i<positions.length;i++)for(let j=0;j<i;j++)minSeparation=Math.min(minSeparation,Math.hypot(...positions[i].map((v,k)=>v-positions[j][k])));
   assert.notEqual(s.comboPhase,'DIZZY','ordinary jump must not cause dizziness');await page.waitForTimeout(100);
  }
  await page.keyboard.up(key);
 }
 assert.ok(maxGap<2.7,'linked bodies do not trail by two body lengths');assert.ok(minSeparation>1.8,'leader cannot pass through wagons');
 await page.screenshot({path:'test-results/train-reversal.png',timeout:120000});
 const following=await state();assert.ok(following.npcs.every(n=>n.position.every(Number.isFinite)));
 await page.getByRole('button',{name:'На старт',exact:true}).click();const reset=await state();assert.equal(reset.train.count,0);assert.equal(reset.train.attachedTotal,0);assert.equal(reset.skin.seed,4321);assert.deepEqual(reset.npcs.map(n=>n.appearanceSeed),first.npcs.map(n=>n.appearanceSeed));
 for(let i=1;i<=4;i++){await page.keyboard.press('Digit'+i);assert.equal((await state()).camera,i-1);}
 await page.setViewportSize({width:1170,height:540});const box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);assert.equal((await state()).cameraFov,52);
 await page.goto(url+'/?skin-test');await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);assert.equal((await state()).train,undefined);assert.equal((await state()).npcs.length,0);
 await page.getByRole('button',{name:'Проба комбо',exact:true}).click();await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='DIZZY');await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='IDLE');assert.ok((await state()).faceVisibility.length>0);assert.equal((await state()).immobilized,false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({capture:captured.train,following:following.train,maxGap,minSeparation,reversalAndJumps:true,reset:true,seed:4321,cameras:4,aspect16by9:true,authorIsolated:true,comboRecovery:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
