const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const port=4188,url=`http://127.0.0.1:${port}`,version=require('../package.json').version.split('dev.')[1],quick=process.argv.includes('--quick');
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:quick?{width:640,height:360}:{width:960,height:540}}),errors=[];page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('sharobesy.skin.v1','4321'));await page.goto(url);
  await page.waitForFunction(()=>window.__SHAROBESY__?.match&&document.querySelector('#boot').hidden);
  const state=()=>page.evaluate(()=>window.__SHAROBESY__),report=[];
  assert.equal(await page.locator('#track-choices button').count(),2);assert.equal(await page.locator('#track-choices button:visible').count(),1);assert.equal((await state()).match.phase,'sandbox');
  if(!quick)await page.screenshot({path:`docs/qa/dev${version}-track-choice.png`,timeout:120000});
  await page.locator('#sandbox-choice').click();let s=await state();assert.deepEqual(s.match.visual.visibleTracks,[]);assert.equal(s.valleyFeatures.boostPads,2);assert.equal(s.valleyFeatures.hurdles,1);
  if(!quick)await page.screenshot({path:`docs/qa/dev${version}-sandbox.png`,timeout:120000});report.push({phase:'sandbox',visual:s.match.visual,features:s.valleyFeatures});
  for(const [track,width,gates] of [['meadow',20,10],['hills',12,6]]){
   if(track==='hills'){await page.locator('#reset').click();await page.waitForFunction(()=>window.__SHAROBESY__.match.phase==='sandbox');await page.locator('#track-more').click();await page.locator('[data-track="hills"]').click();}
   await page.locator('#match-start').click();await page.waitForFunction(quick=>quick?window.__SHAROBESY__.match.visual.visible:window.__SHAROBESY__.match.phase==='running',quick);
   if(!quick)await page.waitForFunction(()=>window.__SHAROBESY__.match.progress[1]>0);
   s=await state();assert.equal(s.match.trackId,track);assert.equal(s.match.width,width);assert.equal(s.match.checkpoints,gates);assert.deepEqual(s.match.visual.visibleTracks,[track]);
   if(track==='meadow'&&!quick){
    const before=s.position,time=s.physicsTime;await page.keyboard.down('KeyW');await page.waitForFunction(t=>window.__SHAROBESY__.physicsTime>t+1.1,time);await page.keyboard.up('KeyW');s=await state();assert.ok(Math.hypot(s.position[0]-before[0],s.position[2]-before[2])>1,'normal controls move the player');
   }
   if(!quick)await page.screenshot({path:`docs/qa/dev${version}-${track}-running.png`,timeout:120000});report.push({phase:s.match.phase,track,width,gates,progress:s.match.progress,visual:s.match.visual});console.log('ROUTE PASS',track);
  }
  await page.locator('#reset').click();await page.waitForFunction(()=>window.__SHAROBESY__.match.phase==='sandbox');s=await state();assert.deepEqual(s.match.visual.visibleTracks,[]);assert.equal(s.valleyFeatures.activations,0);assert.equal(s.skin.seed,4321);assert.deepEqual(errors,[]);
  const asset=await page.evaluate(()=>performance.getEntriesByType('resource').find(r=>/assets\/index-.*\.js/.test(r.name))?.name.split('/').pop());
  fs.writeFileSync(`docs/qa/dev${version}-${quick?'final-':''}routes-browser.json`,JSON.stringify({report,reset:true,seed:4321,asset,errors,mode:quick?'final production route selection, visibility and reset; read-only diagnostics':'production game; normal route buttons, reset and keyboard; read-only diagnostics'},null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
