const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--autoplay-policy=user-gesture-required']});
 const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
 const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('sharobesy.skin.v1','4321');
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(){super();window.testAudio=this;this.suspend();window.audioPeak=0;const analyser=this.createAnalyser(),samples=new Float32Array(256);this.testAnalyser=analyser;setInterval(()=>{analyser.getFloatTimeDomainData(samples);for(const value of samples)window.audioPeak=Math.max(window.audioPeak,Math.abs(value));},5);}
   createGain(){const gain=super.createGain();if(this.testAnalyser)gain.connect(this.testAnalyser);return gain;}
   resume(){if(!window.firstResumeFailed){window.firstResumeFailed=true;return Promise.reject(new Error('Simulated first gesture denied'));}return super.resume();}
  };
 });
 const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4250';await page.goto(url);await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);
 assert.ok(await page.locator('#match-entry').isVisible());assert.match(await page.locator('#match-entry').innerText(),/Два круга/);assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).audio.state,'locked');
 await page.locator('#sound').tap();await page.waitForFunction(()=>window.__SHAROBESY__.audio.failed);assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).audio.tones,0);
 await page.locator('#sound').tap();await page.waitForFunction(()=>window.__SHAROBESY__.audio.state==='running'&&window.__SHAROBESY__.audio.tones>=2);await page.waitForFunction(()=>window.audioPeak>0.001);
 const tones=await page.evaluate(()=>window.__SHAROBESY__.audio.tones);await page.locator('#sound').tap();assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).audio.muted,true);
 await page.locator('#jump').tap();assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).audio.tones,tones,'muted effects stay silent');
 await page.locator('#sound').tap();await page.waitForFunction(()=>!window.__SHAROBESY__.audio.muted);
 await page.evaluate(()=>window.testAudio.suspend());await page.locator('#jump').tap();await page.waitForFunction(()=>window.__SHAROBESY__.audio.state==='running');
 await page.locator('#fullscreen').tap();await page.waitForFunction(()=>!!document.fullscreenElement);let box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).cameraFov,52);
 await page.locator('#fullscreen').tap();await page.waitForFunction(()=>!document.fullscreenElement);
 await page.locator('#match-start').tap();await page.waitForFunction(()=>window.__SHAROBESY__.match.phase==='running');assert.equal(await page.locator('#match-entry').isVisible(),false);assert.match(await page.locator('#match-status').innerText(),/Жёлтая точка 1\/6/);
 await page.getByRole('button',{name:'На старт',exact:true}).tap();assert.ok(await page.locator('#match-entry').isVisible());assert.equal((await page.evaluate(()=>window.__SHAROBESY__)).skin.seed,4321);
 await page.locator('#sandbox-choice').tap();assert.equal(await page.locator('#match-entry').isVisible(),false);assert.ok(await page.locator('#match-start').isVisible());
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Simulated denied fullscreen'));});await page.locator('#fullscreen').tap();await page.waitForFunction(()=>!document.querySelector('#device-hint').hidden);assert.match(await page.locator('#device-hint').innerText(),/главный экран/);await page.getByRole('button',{name:'Понятно',exact:true}).tap();
 await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;});await page.locator('#fullscreen').tap();assert.ok(await page.locator('#device-hint').isVisible());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({firstDeniedRecovered:true,actualAudioSignal:await page.evaluate(()=>window.audioPeak),mute:true,resumeAfterSuspend:true,fullscreenEnterExit:true,fullscreenFailureHint:true,unsupportedHint:true,matchEntry:true,routeHint:true,resetSeed:true,aspect16by9:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
