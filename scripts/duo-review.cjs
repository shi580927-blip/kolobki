const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const port=4190,url=`http://127.0.0.1:${port}`,version=require('../package.json').version.split('dev.')[1],signal=process.argv.includes('--signal');
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,proxy,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:800,height:450}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('sharobesy.skin.v1','4321'));await page.goto(url);await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);
  assert.equal(await page.locator('#track-choices button:visible').count(),1);await page.locator('#track-more').click();assert.equal(await page.locator('#track-choices button:visible').count(),2);
  await page.screenshot({path:`docs/qa/dev${version}-manual-tracks.png`,timeout:120000});
  await page.locator('#duo-launch').click();await page.waitForFunction(()=>window.__SHAROBESY__?.duo&&document.querySelector('#boot').hidden);
  let s=await page.evaluate(()=>window.__SHAROBESY__);assert.equal(s.npcs.length,0);assert.equal(s.match,undefined);assert.equal(s.berries.total,0);assert.equal(s.duo.status,'idle');
  if(signal){
   await page.locator('#duo-start').click();await page.waitForFunction(()=>['waiting','error'].includes(window.__SHAROBESY__.duo.status));s=await page.evaluate(()=>window.__SHAROBESY__);assert.equal(s.duo.status,'waiting');
   const invite=await page.locator('#duo-invite').inputValue(),hash=new URLSearchParams(new URL(invite).hash.slice(1));assert.ok(hash.get('join'));assert.match(hash.get('key'),/^[a-f0-9]{32}$/);
  }
  await page.screenshot({path:`docs/qa/dev${version}-duo-lobby.png`,mask:[page.locator('#duo-invite')],timeout:120000});
  await page.locator('#duo-leave').click();await page.waitForFunction(()=>window.__SHAROBESY__.duo.status==='idle');assert.equal(await page.locator('#duo-invite').isVisible(),false);
  assert.deepEqual(errors,[]);fs.writeFileSync(`docs/qa/dev${version}-lobby-browser.json`,JSON.stringify({manualTrackChoice:true,initialVisibleTracks:1,expandedTracks:2,duo:{emptyWorld:true,cloudSignaling:signal,shareLinkFormat:signal,leave:true},networkPairVerified:false,errors,mode:'production UI; optional --signal checks live signaling, never claims a WebRTC pair'},null,2));console.log('LOBBY AND ROUTE MENU PASS');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
