const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const port=4187,url=`http://127.0.0.1:${port}`,version=require('../package.json').version.split('dev.')[1];
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/water-review',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"></body></html>'}));await page.goto(url+'/water-review');
  await page.evaluate(async()=>{
   const source=await(await fetch('/src/game/World.ts')).text(),dep=name=>source.match(new RegExp('from "([^"]*'+name+'[^"]*)"'))[1];
   const T=await import(dep('three')),{default:R}=await import(dep('rapier')),{createWorld}=await import('/src/game/World.ts'),{PhysicsPlayer}=await import('/src/game/PhysicsPlayer.ts'),{EventBus}=await import('/src/core/events.ts'),{POND,LAGOON_DEEP,pondRadius}=await import('/src/core/terrain.ts'),{applyPondWater,pondSubmersion}=await import('/src/game/WaterPhysics.ts'),{WaterRescue}=await import('/src/game/WaterRescue.ts'),{WaterWake}=await import('/src/game/WaterWake.ts');
   const {loadAnimationAtlas}=await import('/src/face/AnimatedAtlas.ts'),{designForGame,gameplayAtlas}=await import('/src/game/RuntimeAppearance.ts'),{RuntimeVisual}=await import('/src/game/RuntimeVisual.ts'),{skinFrom}=await import('/src/core/skin.ts');
   await R.init();const scene=new T.Scene();scene.background=new T.Color('#90c9ed');scene.add(new T.HemisphereLight(0xfff2dc,0x72905e,1.55));const sun=new T.DirectionalLight(0xfff1de,2.65);sun.position.set(-25,45,20);scene.add(sun);
   const w=new R.World({x:0,y:-18,z:0});w.timestep=1/60;const environment=createWorld(scene,w),p=new PhysicsPlayer(w,new EventBus(),{x:LAGOON_DEEP.x,z:LAGOON_DEEP.z}),wake=new WaterWake(scene),safety=new WaterRescue(w),forward=new T.Vector3(0,0,1),dt=1/60;
   const resources=await loadAnimationAtlas(),skin=skinFrom(4321),visual=new RuntimeVisual(designForGame(skin),gameplayAtlas(resources.data),resources.textures,skin.mood);scene.add(visual);
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
   const camera=new T.PerspectiveCamera(50,16/9,.1,950),angle=1.0,r=pondRadius(angle)+7,target={x:POND.x+Math.cos(angle)*r,z:POND.z+Math.sin(angle)*r};
   p.body.setTranslation({x:LAGOON_DEEP.x,y:POND.water+6,z:LAGOON_DEEP.z},true);p.body.setLinvel({x:0,y:-7,z:0},true);p.sync();
   let maxWet=0,rescued=false;
   const tick=(mode)=>{
    const dx=target.x-p.current.x,dz=target.z-p.current.z,d=Math.hypot(dx,dz)||1,amount=mode==='swim'?Math.min(.75,d/4):0;
    p.step(dt,{x:-dx/d*amount,z:-dz/d*amount,jump:false,dash:false,touchDrive:true},forward);applyPondWater(p.body,dt);w.step();p.sync();
    if(mode==='rescue'){const event=safety.step(-1,p,dt);if(event){rescued=true;wake.splash(event.from.x,event.from.z,9);visual.face.rig.reset();visual.face.play('fury');}}
    wake.emit(-1,p.current,p.body.linvel());wake.update(dt);environment.pond.update(dt);maxWet=Math.max(maxWet,pondSubmersion(p.current));visual.face.update(dt,p.heading);
   };
   const render=()=>{visual.position.copy(p.current);visual.rollingBody.quaternion.copy(p.rotation);visual.updateDecorations();camera.position.set(p.current.x+10,POND.water+8,p.current.z+14);camera.lookAt(p.current.x,POND.water,p.current.z-1);renderer.render(scene,camera);return {position:p.current.toArray(),wet:pondSubmersion(p.current),maxWet,waves:wake.count,splashes:wake.splashCount,rescued,safety:safety.snapshot(-1)};};
   window.waterReview=(stage)=>{
    if(stage==='splash'){for(let i=0;i<120&&wake.splashCount===0;i++)tick('drop');for(let i=0;i<6;i++)tick('drop');}
    if(stage==='wake'){for(let i=0;i<150;i++)tick('swim');}
    if(stage==='shore'){for(let i=0;i<2300;i++){tick('swim');if(Math.hypot(target.x-p.current.x,target.z-p.current.z)<1&&pondSubmersion(p.current)===0)break;}}
    if(stage==='rescue'){p.body.setTranslation({x:LAGOON_DEEP.x,y:POND.water-.15,z:LAGOON_DEEP.z},true);p.body.setLinvel({x:0,y:0,z:0},true);p.sync();wake.reset();safety.reset();for(let i=0;i<360&&!rescued;i++)tick('rescue');for(let i=0;i<12;i++)tick('rescue');}
    return render();
   };
  });
  const report=[];
  for(const stage of ['splash','wake','shore','rescue']){const state=await page.evaluate(stage=>window.waterReview(stage),stage);report.push({stage,...state});await page.screenshot({path:`docs/qa/dev${version}-water-${stage}.png`,timeout:120000});}
  assert.ok(report[0].splashes>0);assert.ok(report[1].waves>0);assert.equal(report[2].wet,0);assert.ok(report[2].maxWet>.95);assert.ok(report[3].rescued);assert.deepEqual(errors,[]);
  fs.writeFileSync(`docs/qa/dev${version}-water-review.json`,JSON.stringify({report,errors,mode:'actual game physics and actor; controlled initial drop fixture, no live-game teleport hooks'},null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
