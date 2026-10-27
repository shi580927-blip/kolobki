import "./style.css";
import {version as buildVersion} from "../package.json";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {loadAnimationAtlas} from "./face/AnimatedAtlas";
import {RuntimeVisual} from "./game/RuntimeVisual";
import {designForGame,gameplayAtlas} from "./game/RuntimeAppearance";
import {validateDesign} from "./skin/SkinDesign";
import {BerryCollectibles} from "./game/BerryCollectibles";
import * as T from "three";
import R from "@dimforge/rapier3d-compat";
import { loadSkin, randomFrom } from "./core/skin";
import { fit16by9, heightAt, WORLD_SIZE } from "./core/terrain";
import { EventBus } from "./core/events";
import {ImpactMeter} from "./game/ImpactModel";
import {TrainSystem,type TrainOptions} from "./game/TrainSystem";
import {MatchSession} from "./game/MatchSession";
import {NpcSystem} from "./game/NpcSystem";
import { Input } from "./game/Input";
import { CameraRig } from "./game/CameraRig";
import {bootProgress,bootReady,bootFail} from "./core/BootStatus";
import {addValleyStudy} from "./game/ValleyStudy";
import { createWorld } from "./game/World";
import { PhysicsPlayer } from "./game/PhysicsPlayer";
import { Effects } from "./game/Effects";
import {applyPondWater,pondSubmersion} from "./game/WaterPhysics";
import {SandFall} from "./game/SandFall";
import {WaterWake} from "./game/WaterWake";
import {RoadDust} from "./game/RoadDust";
import { ImpactAudio } from "./game/ImpactAudio";
import {addDeviceControls} from "./game/DeviceControls";
import { OrbitInput } from "./game/OrbitInput";
async function start() {
  document.querySelector(".brand small")!.textContent=`АЛЬФА 0.1 · ${buildVersion.replace("0.1.0-", "")} · ТЕХНИЧЕСКИЙ ТЕСТ`;
  bootProgress("Готовим игру…");
  await R.init();
  bootProgress("Загружаем персонажа…");
  const resources=await loadAnimationAtlas(),atlas=gameplayAtlas(resources.data);
  const appearanceTest=new URLSearchParams(location.search).has("skin-test");
  const valleyStudy=new URLSearchParams(location.search).has("valley-study");
  let berryDetail=valleyStudy&&new URLSearchParams(location.search).has("berry-detail");
  const stage = document.querySelector<HTMLElement>("#stage")!,
    hud = document.querySelector<HTMLElement>("#hud")!,
    notice = document.querySelector<HTMLElement>("#notice")!;
  const renderer = new T.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.addEventListener("webglcontextlost",event=>{event.preventDefault();bootFail("Не удалось продолжить отображение игры. Повторите загрузку.");});
  stage.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x91cbed);
  scene.fog = new T.Fog(0xb7dbea, 60, 150);
  let sky:ReturnType<typeof import("./game/CloudSky").addCloudSky>|undefined;
  let skyState="pending";
  scene.add(new T.HemisphereLight(0xfff5df, 0x738b83, 1.8));
  const sun = new T.DirectionalLight(0xfff1de, 2);
  sun.position.set(-25, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.normalBias = 0.008;
  sun.shadow.bias = -0.000025;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  scene.add(sun);
  scene.add(sun.target);
  const camera = new T.PerspectiveCamera(52, 16 / 9, 0.1, 220);
  camera.position.set(0, 10, -12);
  const rig = new CameraRig(camera);
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  bootProgress("Создаём долину…");
  const groundLighting=createWorld(scene, world);
  const bus = new EventBus();
  const audio = new ImpactAudio();
  addDeviceControls(audio);
  const player = new PhysicsPlayer(world, bus);
  const dust = new RoadDust(scene);
  const wake = new WaterWake(scene);
  const sandFall = new SandFall(scene);
  let storage: Storage;
  try {
    storage = localStorage;
  } catch {
    storage = { getItem: () => null, setItem: () => {} } as unknown as Storage;
  }
  const skin = loadSkin(
    storage,
    () => crypto.getRandomValues(new Uint32Array(1))[0],
  );
  let design=designForGame(skin);
  if(appearanceTest){try{const saved=storage.getItem('sharobesy.author.skin-study.v1');if(saved)design=validateDesign(JSON.parse(saved));}catch{/* Invalid author config does not change the player. */}}
  function environmentFor(r:T.WebGLRenderer,force=false){if(!force&&(design.gloss<=0||design.surface!=='smooth'||design.growthCount>0))return undefined;const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(r),texture=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();return texture;}
  const worldEnvironment=environmentFor(renderer,true);
  const berries = new BerryCollectibles(scene, bus,worldEnvironment);
  const visual=new RuntimeVisual(design,atlas,resources.textures,skin.mood,worldEnvironment);
  scene.add(visual);
  const casting=valleyStudy?addValleyStudy(scene,atlas,resources.textures,worldEnvironment):undefined;
  const contactPositions=[visual.position,...(casting?.actors.map(a=>a.position)??[])];
  if(casting){const label=document.createElement("div");label.textContent="ПРОБА ДОЛИНЫ · 10 образцов без поведения и столкновений";label.style.cssText="position:absolute;left:24px;bottom:76px;font-size:15px;color:#24463c;background:#fff6dfdf;padding:8px 12px;border-radius:12px;text-shadow:none";hud.appendChild(label);const detailButton=document.createElement('button');detailButton.textContent='Ягоды крупно / общий вид';detailButton.onclick=()=>{berryDetail=!berryDetail;};document.querySelector('#tools')!.appendChild(detailButton);}
  const npcs=!appearanceTest&&!valleyStudy?new NpcSystem(scene,world,bus,atlas,resources.textures,worldEnvironment,crypto.getRandomValues(new Uint32Array(1))[0]):undefined;
  const trainOptions:TrainOptions={};
  const train=npcs?new TrainSystem(world,player,npcs.actors.map(a=>({id:a.entry.id,physics:a.physics})),bus,trainOptions):undefined;
  let match:MatchSession|undefined;
  if(npcs){const label=document.createElement("div");label.id="train-status";label.textContent="Поезд: 0 / 5 · Коснитесь шаробеса без сильного тарана";label.style.cssText="position:absolute;left:30px;top:123px;font-size:13px;color:#fff";hud.appendChild(label);}
  const input = new Input(),
    effects = new Effects(scene);
  const events = new R.EventQueue(true);
  const portraitCanvas =
    document.querySelector<HTMLCanvasElement>("#portrait")!;
  const portraitRenderer = new T.WebGLRenderer({
    canvas: portraitCanvas,
    alpha: true,
    antialias: true,
  });
  portraitRenderer.toneMapping = T.ACESFilmicToneMapping;
  portraitRenderer.toneMappingExposure = 1;
  portraitRenderer.setSize(150, 150, false);
  const portraitScene = new T.Scene();
  portraitScene.add(new T.HemisphereLight(0xfff5df, 0x738b83, 1.8));
  const portraitLight = new T.DirectionalLight(0xfff1de, 2);
  portraitLight.position.set(-3, 4, 5);
  portraitScene.add(portraitLight);
  const portraitVisual=new RuntimeVisual({...design,furCount:Math.min(design.furCount,24)},atlas,resources.textures,skin.mood,environmentFor(portraitRenderer));
  portraitScene.add(portraitVisual);
  const portraitCamera = new T.PerspectiveCamera(38, 1, 0.1, 10);
  portraitCamera.position.set(0, 0.1, 3.9);
  portraitCamera.lookAt(0, 0, 0);
  const faces=[visual.face,portraitVisual.face];
  const react=(name:string)=>faces.forEach(f=>f.play(name));
  bus.on("player_jump",()=>{react("happy");audio.jump();});
  bus.on("player_dash",()=>{react("fury");audio.dash();});
  let npcSoundCooldown=0;
  bus.on("npc_impact",({position})=>{if(position.distanceTo(visual.position)<24){effects.burst(position);if(performance.now()>npcSoundCooldown){audio.play();npcSoundCooldown=performance.now()+250;}}});
  const trainStatus=()=>{const label=document.querySelector('#train-status');if(label){const text=`Поезд: ${train?.count??0} / 5 · ${train?.snapshot().joining!==undefined?"Новичок подкатывается к хвосту":match?.active?"Проба маршрута: сцепки удерживаются":"Сильный удар разрывает состав"}`;if(label.textContent!==text)label.textContent=text;}};
  bus.on('train_attach',e=>{trainStatus();effects.sparkle(e.position);audio.collect();react('happy');npcs?.actors.find(a=>a.entry.id===e.id)?.visual.face.play('shocked');});
  bus.on('train_water_release',()=>{trainStatus();});
  bus.on('train_break',e=>{trainStatus();effects.burst(e.position);audio.play();rig.shake=.2;react('scared');for(const a of npcs?.actors??[])if(e.ids.includes(a.entry.id)){a.brain.hit();a.visual.face.play('dazed');}});
  const impactMeter=new ImpactMeter();let physicsTime=0;
  bus.on("combo",()=>faces.forEach(f=>f.combo()));
  bus.on("impact_major", ({ position,source="collision",closingSpeed=0,severity=0 }) => {
    effects.burst(position);
    audio.play();
    rig.shake = 0.25;
    if(impactMeter.add({source,closingSpeed,severity},physicsTime))bus.emit("combo",{count:1});else react("dazed");
  });
  bus.on("face_unhinged", () => {
    visual.face.impact();
    portraitVisual.face.impact();
  });
  const berryCount = document.querySelector<HTMLElement>("#berry-count")!;
  const updateBerryCount = () => {
    berryCount.textContent =
      `Ягоды: ${berries.count} / ${berries.total}` +
      (berries.count === berries.total ? " · Все собраны!" : "");
  };
  updateBerryCount();
  bus.on("berry_pickup", ({ position }) => {
    updateBerryCount();
    effects.sparkle(position);
    audio.collect();
    react("happy");
  });
  const cameraButton = document.querySelector<HTMLButtonElement>("#camera")!;
  function setCamera(n: number) {
    berryDetail=false;
    rig.setMode(n);
    cameraButton.textContent = "Камера: " + rig.names[n];
  }
  new OrbitInput(
    renderer.domElement,
    rig,
    () => visual.position,
    () => {
      cameraButton.textContent = "Камера: свободная · 1–4 вернуть";
    },
  );
  new OrbitInput(document.querySelector<HTMLElement>("#camera-pad")!, rig, () => visual.position, () => {
    cameraButton.textContent = "Камера: свободная · 1–4 вернуть";
  }, true);
  cameraButton.onclick = () => setCamera((rig.mode + 1) % 4);
  addEventListener("keydown", (e) => {
    if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code))
      setCamera(Number(e.code.slice(-1)) - 1);
    if (e.code === "Backquote")
      document.querySelector<HTMLElement>("#diagnostics")!.hidden =
        !document.querySelector<HTMLElement>("#diagnostics")!.hidden;
  });
  const resetGame = () => {
    player.reset();
    dust.reset();wake.reset();sandFall.reset();
    npcs?.reset();
    train?.reset();trainStatus();
    berries.reset();impactMeter.reset();physicsTime=0;faces.forEach(f=>f.rig.reset());
    updateBerryCount();
  };
  document.querySelector<HTMLButtonElement>("#reset")!.onclick=()=>{match?.exit();resetGame();};
  if(npcs&&train)match=new MatchSession(world,scene,player,npcs,train,trainOptions,resetGame,bus);
  if(appearanceTest){const button=document.createElement('button');button.textContent='Проба комбо';button.onclick=()=>bus.emit('combo',{count:3});document.querySelector('#tools')!.appendChild(button);}
  if(npcs)contactPositions.push(...npcs.actors.map(a=>a.visual.position));
  const resize = () => {
    const fit = fit16by9(innerWidth, innerHeight);
    stage.style.width = fit.width + "px";
    stage.style.height = fit.height + "px";
    hud.style.transform = `scale(${fit.scale})`;
    renderer.setSize(fit.width, fit.height, false);
  };
  addEventListener("resize", resize);
  resize();
  document.querySelector<HTMLButtonElement>("#snapshot")!.onclick = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const c = canvas.getContext("2d")!;
    c.drawImage(renderer.domElement, 0, 0, 1280, 720);
    c.drawImage(portraitCanvas, 1110, 20, 130, 130);
    c.fillStyle = "#193b38dd";
    c.fillRect(0, 635, 1280, 85);
    c.fillStyle = "#fff";
    c.font = "bold 30px Arial";
    c.fillText("ШАРОБЕСЫ · Вот это покатались!", 30, 682);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sharobesy-moment.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    bus.emit("capture_moment", { time: performance.now() });
  };
  let last = performance.now(),
    acc = 0,
    frames = 0,
    fps = 0,
    fpsTime = last;
  const dt = 1 / 60;
  let firstFrame=true;
  const direction = new T.Vector3();
  function frame(now: number) {
    const elapsed = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (document.hidden) {
      acc = 0;
      requestAnimationFrame(frame);
      return;
    }
    input.sample();
    camera.getWorldDirection(direction);
    acc += elapsed;
    let steps = 0;
    while (acc >= dt && steps < 6) {
      match?.preStep(dt);
      if(match?.frozen){input.jump=input.dash=false;player.previous.copy(player.current);npcs?.actors.forEach(a=>a.physics.previous.copy(a.physics.current));acc-=dt;steps++;continue;}
      physicsTime+=dt;
      player.setImmobilized(visual.face.immobilized);
      player.step(dt, input, direction);
      npcs?.step(dt,player,id=>(train?.has(id)||train?.isJoining(id)||match?.controlled(id))??false);
      train?.step(dt);
      match?.stepTrain(dt);
      player.applySandDrag(dt);
      for(const actor of npcs?.actors??[])actor.physics.applySandDrag(dt);
      applyPondWater(player.body,dt);
      for(const actor of npcs?.actors??[])applyPondWater(actor.physics.body,dt);
      world.step(events);
      player.sync();
      wake.emit(-1,player.current,player.body.linvel());
      for(const actor of npcs?.actors??[])wake.emit(actor.entry.id,actor.physics.body.translation(),actor.physics.body.linvel());
      dust.step(dt, player.current, player.body.linvel(), player.hasSurfaceSupport());
      npcs?.sync();
      player.updateCoating(dt);
      sandFall.emit(-1,player.coating.shed,player.current);
      for(const actor of npcs?.actors??[]){actor.physics.updateCoating(dt);sandFall.emit(actor.entry.id,actor.physics.coating.shed,actor.physics.current);}
      berries.checkSegment(player.previous, player.current);
      events.drainContactForceEvents((e) => {
        const internal=(train?.isInternalContact(e.collider1(),e.collider2())||match?.internal(e.collider1(),e.collider2()))??false;
        npcs?.contact(e.collider1(),e.collider2(),e.totalForceMagnitude(),internal,player);
        if (
          e.collider1() === player.collider.handle ||
          e.collider2() === player.collider.handle
        )
          {
          const handle=e.collider1()===player.collider.handle?e.collider2():e.collider1();
          const otherNpc=npcs?.actors.find(a=>a.physics.collider.handle===handle);
          player.contact(e.totalForceMagnitude(),world.getCollider(handle),otherNpc?.physics.impactVelocity,internal);
        }
      });
      train?.afterStep();
      match?.afterStep();
      acc -= dt;
      steps++;
    }
    const alpha = acc / dt;
    visual.position.lerpVectors(player.previous, player.current, alpha);
    visual.rollingBody.quaternion.slerpQuaternions(
      player.prevRotation,
      player.rotation,
      alpha,
    );
    visual.face.update(elapsed, player.heading);
    portraitVisual.face.update(elapsed, 0);
    portraitVisual.rollingBody.quaternion.copy(visual.rollingBody.quaternion);
    visual.updateDecorations();portraitVisual.updateDecorations();
    visual.updateSand(player.coating.sand,player.coating.wetness);
    portraitVisual.updateSand(player.coating.sand,player.coating.wetness);
    const cameraVelocity = player.body.linvel();
    rig.update(visual.position, player.heading, elapsed, Math.hypot(cameraVelocity.x, cameraVelocity.z),train?.count??0);
    groundLighting.art.updateOcclusion(visual.position,camera.position);
    groundLighting.pond.update(elapsed);
    effects.update(elapsed);
    dust.render();wake.update(elapsed);sandFall.update(elapsed);
    casting?.update(elapsed);
    npcs?.update(elapsed,alpha);
    for(const actor of npcs?.actors??[])actor.visual.updateSand(actor.physics.coating.sand,actor.physics.coating.wetness);
    if(train)trainStatus();
    match?.render();
    groundLighting.setContacts(contactPositions);
    sun.position.copy(visual.position).add(new T.Vector3(-25, 45, 20));
    sun.target.position.copy(visual.position);
    if(berryDetail){const ground=heightAt(0,5);camera.position.set(-2.8,ground+1.7,2.7);camera.lookAt(0,ground+.5,5);}
    sky?.update(elapsed,camera);
    renderer.render(scene, camera);
    portraitRenderer.render(portraitScene, portraitCamera);
    if(firstFrame&&!renderer.getContext().isContextLost()){
      firstFrame=false;notice.hidden=true;bootReady();
      // The playable scene starts even if an optional sky chunk cannot be loaded.
      setTimeout(()=>{void import("./game/CloudSky").then(m=>{sky=m.addCloudSky(scene);skyState="soft-clouds-v1";}).catch(error=>{skyState="clear-sky";console.warn("Optional sky unavailable; keeping the playable scene",error);});},0);
    }
    frames++;
    if (now - fpsTime > 500) {
      fps = (frames * 1000) / (now - fpsTime);
      frames = 0;
      fpsTime = now;
      const v = player.body.linvel();
      document.querySelector("#diagnostics")!.textContent =
        `FPS ${fps.toFixed(0)} | speed ${Math.hypot(v.x, v.z).toFixed(1)}\ncam ${rig.names[rig.mode]} | seed ${skin.seed}\nmood ${skin.mood} | ${visual.face.rig.combo.phase!=="IDLE"?visual.face.rig.combo.phase:visual.face.rig.clock.phase}\n~ toggles diagnostics`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for acceptance automation; no skin editor or SDK hooks.
  Object.defineProperty(window, "__SHAROBESY__", {
    get: () => ({
      position: player.current.toArray(),
      rotation: visual.rollingBody.quaternion.toArray(),
      faceRotation: visual.face.rotation.toArray(),
      facePose: visual.face.expression(),
      portraitPose: portraitVisual.face.expression(),
      faceEyes: visual.face.eyes.map(e => e.visible),
      faceArt: "animated-atlas-v03",
      faceVisibility: Object.entries(visual.face.rig.poses).filter(([,g])=>g.visible).map(([name,g])=>({name,rotation:g.rotation.toArray(),opacity:(g.children.find(o=>o.name.startsWith('study-')) as T.Mesh<T.BufferGeometry,T.ShaderMaterial>).material.uniforms.opacity.value})),
      wetSand:{wetness:player.coating.wetness,sand:player.coating.sand},waterSubmersion:pondSubmersion(player.current),dustCount:dust.count, physicsTime,impactCharge:impactMeter.value,train:train?.snapshot(),match:match?.snapshot(),audio:audio.snapshot(),fullscreen:!!document.fullscreenElement,
      npcs:npcs?.snapshot().map(a=>({...a,state:train?.has(a.id)?"wagon":train?.isJoining(a.id)?"joining":match?.controlled(a.id)?a.id===0?"rival":"rival-wagon":a.state}))??[],npcContacts:npcs?.collisionsWithPlayer??0,npcSeed:npcs?.seed,
      buildVersion,worldSize:WORLD_SIZE,worldArt:"sunny-valley-gardens-v2",environmentArt:groundLighting.art,skyArt:skyState,cloudCount:sky?.clouds.length??0,cameraFov:camera.fov,
      berryDetail,
      shadowSettings:{mapSize:sun.shadow.mapSize.x,normalBias:sun.shadow.normalBias,contactCount:contactPositions.length},berryArt:"raspberry-plants-v1",
      valleyStudy:!!casting,studyActors:casting?.actors.map(a=>({seed:a.design.seed,surface:a.design.surface,pattern:a.design.pattern,position:a.position.toArray(),facePose:a.face.expression()})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      design,appearanceTest,faceScale:.9,comboPhase:visual.face.rig.combo.phase,immobilized:visual.face.immobilized,
      heading: player.heading,
      velocity: { ...player.body.linvel() },
      viewForward: direction.toArray(),
      skin,
      camera: rig.mode,
      freeOrbit: rig.freeOrbit,
      orbitYaw: rig.orbitYaw,
      followYaw: rig.followYaw,
      orbitPitch: rig.orbitPitch,
      fps,
      stun: visual.face.immobilized?1:0,
      phase: visual.face.rig.clock.phase,
      berries: {count:berries.count,total:berries.total,positions:berries.items.filter(i=>!i.collected).map(i=>i.mesh.position.toArray())},
      input: { x: input.x, z: input.z, touchDrive:input.touchDrive },
      controlHand:hud.dataset.stickHand??"left",
    }),
  });
}
const launch = new URLSearchParams(location.search).has("skin-study")
  ? import("./skinStudy").then((m) => m.startSkinStudy())
  : new URLSearchParams(location.search).has("face-animations")
  ? import("./faceAnimations").then((m) => m.startFaceAnimations())
  : new URLSearchParams(location.search).has("face-editor")
  ? import("./faceEditor").then((m) => m.startFaceEditor())
  : new URLSearchParams(location.search).has("face-study")
  ? import("./faceStudy").then((m) => m.startFaceStudy())
  : new URLSearchParams(location.search).has("art-review")
  ? import("./artReview").then((m) => m.startArtReview())
  : start();
launch.catch((error) => {
  console.error(error);
  bootFail();
  let errorNotice = document.querySelector<HTMLElement>("#notice");
  if (!errorNotice) {
    errorNotice = document.createElement("div");
    errorNotice.id = "notice";
    document.querySelector("#hud")?.appendChild(errorNotice);
  }
  errorNotice.hidden = false;
  errorNotice.textContent =
    "Не удалось загрузить игру. Обновите страницу и попробуйте ещё раз.";
});
