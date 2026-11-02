const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const port=4181,url=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(process.argv.includes('--production')?['preview']:[]),'--host','127.0.0.1','--port',String(port)],{stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(process.argv.includes('--map')){
   await page.route('**/qa-map',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"></body></html>'}));
   await page.goto(url+'/qa-map');
   await page.evaluate(async(view)=>{
    const source=await(await fetch('/src/game/World.ts')).text();
    const dep=name=>source.match(new RegExp('from "([^"]*'+name+'[^"]*)"'))[1];
    const T=await import(dep('three')),{default:R}=await import(dep('rapier')),{createWorld}=await import('/src/game/World.ts');
    await R.init();const scene=new T.Scene();scene.background=new T.Color('#bcdfe9');
    scene.add(new T.HemisphereLight('#f4fbff','#7b744c',2.2));const sun=new T.DirectionalLight('#fff1cc',3);sun.position.set(-40,100,-35);scene.add(sun);
    createWorld(scene,new R.World({x:0,y:-18,z:0}));
    const camera=new T.PerspectiveCamera(42,1280/720,.1,700);camera.position.set(8,67,107);camera.lookAt(-62,3,42);if(view.wide){camera.position.set(300,340,340);camera.lookAt(0,0,0);}else if(view.south){camera.position.set(-15,22,105);camera.lookAt(-46,2,74);}
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.setAnimationLoop(null);document.body.appendChild(renderer.domElement);renderer.render(scene,camera);
   },{wide:process.argv.includes('--wide'),south:process.argv.includes('--south')});
   await page.screenshot({path:process.argv.includes('--wide')?`docs/qa/dev${require('../package.json').version.split('dev.')[1]}-map.png`:process.argv.includes('--south')?'docs/qa/dev63-bridge-overview.png':'docs/qa/dev61-coast-overview.png'});assert.deepEqual(errors,[]);return;
  }
  await page.addInitScript(()=>localStorage.setItem('sharobesy.skin.v1','4321'));
  await page.goto(url+'/?skin-test');await page.waitForFunction(()=>window.__SHAROBESY__&&document.querySelector('#boot').hidden);
  // Drive only through the normal pointer controls, with no teleport or test camera.
  const state=()=>page.evaluate(()=>window.__SHAROBESY__);
  const stick=await page.locator('#stick').boundingBox(),sx=stick.x+stick.width/2,sy=stick.y+stick.height/2,r=stick.width/2;
  await page.mouse.move(sx,sy);await page.mouse.down();
  const route=process.argv.includes('--size')?[]:process.argv.includes('--south')?[[0,12],[12,30],[28,42],[16,55],[6,68],[-8,80],[-30,87],[-35,84],[-46.5,74.5]]:[[0,12],[-18,12],[-25,18],[-45,18],[-51,26],[-51,34],[-51,42]];
  for(const [x,z] of route){
   let arrived=false;
   for(let tick=0;tick<300;tick++){
    const s=await state(),dx=x-s.position[0],dz=z-s.position[2],d=Math.hypot(dx,dz);
    if(d<1.4){arrived=true;break;}
    const f=s.viewForward,n=Math.hypot(f[0],f[2]),fx=f[0]/n,fz=f[2]/n,amount=Math.min(.85,Math.max(.28,d/7));
    // Inverse view-relative steering plus a small compensation for the dead zone.
    const ax=(-fz*dx+fx*dz)/d,az=-(fx*dx+fz*dz)/d,raw=.10+.90*amount;
    await page.mouse.move(sx+ax*r*raw,sy+az*r*raw);
    const time=s.physicsTime;await page.waitForFunction(t=>window.__SHAROBESY__.physicsTime>t+.12,time);
   }
   console.log('WAYPOINT',x,z,(await state()).position);assert.ok(arrived,`blocked before ${x},${z}`);
  }
  await page.mouse.up();await page.waitForTimeout(800);
  // Use the game's camera pad to look toward the connected west bank.
  const pad=await page.locator('#camera-pad').boundingBox();
  await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();
  const current=await state(),targetYaw=Math.PI/2,delta=Math.atan2(Math.sin(targetYaw-current.orbitYaw),Math.cos(targetYaw-current.orbitYaw));
  await page.mouse.move(pad.x+pad.width/2-delta/(Math.PI*1.4)*pad.height,pad.y+pad.height/2,{steps:15});await page.mouse.up();
  await page.waitForTimeout(1200);fs.mkdirSync('docs/qa',{recursive:true});await page.screenshot({path:`docs/qa/dev${require('../package.json').version.split('dev.')[1]}.png`,timeout:120000});
  const seen=await state();if(process.argv.includes('--size'))assert.equal(seen.worldSize,400);assert.equal(seen.cameraFov,52);assert.equal(seen.buildVersion,require('../package.json').version);
  await page.getByRole('button',{name:'Проба комбо',exact:true}).click();
  await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase!=='IDLE');
  await page.waitForFunction(()=>window.__SHAROBESY__.comboPhase==='IDLE');
  assert.ok((await state()).faceVisibility.every(p=>p.opacity===1));
  await page.locator('#reset').click();await page.waitForTimeout(500);const reset=await state();assert.equal(reset.skin.seed,4321);assert.equal(reset.immobilized,false);
  for(let i=1;i<=4;i++){await page.keyboard.press('Digit'+i);assert.equal((await state()).camera,i-1);}
  await page.setViewportSize({width:2400,height:1080});const box=await page.locator('#stage').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`docs/qa/dev${require('../package.json').version.split('dev.')[1]}-browser.json`,JSON.stringify({view:seen,reset:{seed:reset.skin.seed,immobilized:reset.immobilized,wetSand:reset.wetSand},aspect:box,errors},null,2));
  console.log('PASS',JSON.stringify({position:seen.position,drawCalls:seen.drawCalls,triangles:seen.triangles,errors}));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
