const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const port=4186,url=`http://127.0.0.1:${port}`,version=require('../package.json').version.split('dev.')[1];
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:810}}),errors=[];page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/art-review-scene',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"></body></html>'}));await page.goto(url+'/art-review-scene');
  await page.evaluate(async()=>{
   const source=await(await fetch('/src/game/World.ts')).text(),dep=name=>source.match(new RegExp('from "([^"]*'+name+'[^"]*)"'))[1];
   const T=await import(dep('three')),{default:R}=await import(dep('rapier')),{createWorld}=await import('/src/game/World.ts'),{addCloudSky}=await import('/src/game/CloudSky.ts');await R.init();
   const scene=new T.Scene();scene.background=new T.Color('#91cbed');scene.fog=new T.Fog('#bad9e5',145,640);
   scene.add(new T.HemisphereLight(0xfff2dc,0x72905e,1.55));
   const sun=new T.DirectionalLight(0xfff1de,2.65);sun.position.set(-100,180,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-150,right:150,top:150,bottom:-150,far:650});sun.shadow.normalBias=.02;sun.shadow.bias=-.00003;scene.add(sun);
   const world=new R.World({x:0,y:-18,z:0}),environment=createWorld(scene,world),sky=addCloudSky(scene);
   const {MatchRouteVisual}=await import('/src/game/MatchRouteVisual.ts'),{RouteMatch}=await import('/src/game/RouteMatch.ts'),{VALLEY_TRACKS}=await import('/src/core/valleyRoute.ts'),routeVisual=new MatchRouteVisual(scene),rules=new RouteMatch();
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1440,810);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
   const camera=new T.PerspectiveCamera(48,16/9,.1,1600);
   window.renderArtView=(position,target,trackId)=>{rules.reset();if(trackId){rules.select(VALLEY_TRACKS.find(t=>t.id===trackId));rules.start([{x:0,z:0},{x:4,z:0}]);}routeVisual.update(rules);camera.position.set(...position);camera.lookAt(...target);scene.fog.near=position[1]>300?650:145;scene.fog.far=position[1]>300?1600:640;environment.horizon.update(.2);environment.pond.update(.2);environment.landmarks.update(.2);sky.update(.2,camera);renderer.render(scene,camera);return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};};
  });
  const views=[['free-valley',[140,72,136],[40,2,12]],['meadow-match',[140,72,136],[40,2,12],'meadow'],['hill-match',[140,72,136],[40,2,12],'hills'],['meadow-detail',[-13,12,-17],[6,4,28],'meadow'],['race',[22,15,-25],[0,4,9]],['stone',[-34,13,20],[-49,8,0]],['island',[360,370,410],[0,8,0]],['valley',[96,35,139],[-25,5,10]],['lagoon',[2,22,100],[-43,4,45]],['north',[22,48,-77],[-28,25,-150]],['arches',[68,24,150],[20,3,110]],['windmill',[76,25,79],[112,8,125]]];
  const report=[];fs.mkdirSync('docs/qa',{recursive:true});
  const selected=process.argv.includes('--routes')?views.filter(v=>['free-valley','meadow-match','hill-match','meadow-detail'].includes(v[0])):process.argv.includes('--race-only')?views.filter(v=>v[0]==='race'):process.argv.includes('--stone-only')?views.filter(v=>['north','arches','lagoon','race','stone'].includes(v[0])):views;
  for(const [name,position,target,trackId] of selected){const stats=await page.evaluate(({position,target,trackId})=>window.renderArtView(position,target,trackId),{position,target,trackId});await page.screenshot({path:`docs/qa/dev${version}-${name}-art.png`,timeout:120000});report.push({name,...stats});}
  assert.deepEqual(errors,[]);fs.writeFileSync(`docs/qa/dev${version}-art.json`,JSON.stringify({views:report,errors,mode:'actual World geometry; review cameras; Chromium SwiftShader'},null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
