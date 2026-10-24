import "./style.css";
import * as T from "three";
import R from "@dimforge/rapier3d-compat";
import { loadSkin, randomFrom } from "./core/skin";
import { fit16by9 } from "./core/terrain";
import { EventBus } from "./core/events";
import { loadFaceAtlas } from "./face/FaceAtlas";
import { FaceState } from "./face/FaceState";
import { Input } from "./game/Input";
import { CameraRig } from "./game/CameraRig";
import { createWorld } from "./game/World";
import { PlayerVisual } from "./game/PlayerVisual";
import { PhysicsPlayer } from "./game/PhysicsPlayer";
import { Effects } from "./game/Effects";
import { ImpactAudio } from "./game/ImpactAudio";
import { OrbitInput } from "./game/OrbitInput";
import { RingCollectibles } from "./game/RingCollectibles";
async function start() {
  await R.init();
  const atlas = await loadFaceAtlas();
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
  stage.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0xb9deeb);
  scene.fog = new T.Fog(0xb9deeb, 60, 150);
  scene.add(new T.HemisphereLight(0xfff5df, 0x536f4f, 1.5));
  const sun = new T.DirectionalLight(0xfff1de, 2);
  sun.position.set(-25, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);
  const camera = new T.PerspectiveCamera(52, 16 / 9, 0.1, 220);
  camera.position.set(0, 10, -12);
  const rig = new CameraRig(camera);
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  createWorld(scene, world);
  const bus = new EventBus();
  const audio = new ImpactAudio();
  const rings = new RingCollectibles(scene, bus);
  const player = new PhysicsPlayer(world, bus);
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
  const face = new FaceState(skin.mood, randomFrom(skin.seed + 17));
  const visual = new PlayerVisual(skin, face, atlas);
  scene.add(visual);
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
  portraitScene.add(new T.HemisphereLight(0xfff5df, 0x536f4f, 1.5));
  const portraitLight = new T.DirectionalLight(0xfff1de, 2);
  portraitLight.position.set(-3, 4, 5);
  portraitScene.add(portraitLight);
  const portraitVisual = new PlayerVisual(skin, face, atlas);
  portraitScene.add(portraitVisual);
  const portraitCamera = new T.PerspectiveCamera(38, 1, 0.1, 10);
  portraitCamera.position.set(0, 0.1, 3.9);
  portraitCamera.lookAt(0, 0, 0);
  bus.on("player_jump", () => face.react("joy", 0.5));
  bus.on("player_dash", () => face.react("rage", 0.65));
  bus.on("impact_major", ({ position }) => {
    effects.burst(position);
    audio.play();
    rig.shake = 0.25;
    face.knockOut(0.75);
  });
  bus.on("face_unhinged", () => {
    visual.face.impact();
    portraitVisual.face.impact();
  });
  const ringCount = document.querySelector<HTMLElement>("#ring-count")!;
  const updateRingCount = () => {
    ringCount.textContent =
      `Кольца: ${rings.count} / ${rings.total}` +
      (rings.count === rings.total ? " · Все собраны!" : "");
  };
  updateRingCount();
  bus.on("ring_collected", ({ position }) => {
    updateRingCount();
    effects.sparkle(position);
    audio.collect();
    face.react("joy", 0.6);
  });
  const cameraButton = document.querySelector<HTMLButtonElement>("#camera")!;
  function setCamera(n: number) {
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
  cameraButton.onclick = () => setCamera((rig.mode + 1) % 4);
  addEventListener("keydown", (e) => {
    if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code))
      setCamera(Number(e.code.slice(-1)) - 1);
    if (e.code === "Backquote")
      document.querySelector<HTMLElement>("#diagnostics")!.hidden =
        !document.querySelector<HTMLElement>("#diagnostics")!.hidden;
  });
  document.querySelector<HTMLButtonElement>("#reset")!.onclick = () => {
    player.reset();
    rings.reset();
    updateRingCount();
  };
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
  notice.hidden = true;
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
      player.step(dt, input, direction);
      world.step(events);
      player.sync();
      rings.checkSegment(player.previous, player.current);
      events.drainContactForceEvents((e) => {
        if (
          e.collider1() === player.collider.handle ||
          e.collider2() === player.collider.handle
        )
          player.contact(e.totalForceMagnitude());
      });
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
    face.update(elapsed);
    visual.face.update(elapsed, player.heading);
    portraitVisual.face.update(elapsed, 0);
    portraitVisual.rollingBody.quaternion.copy(visual.rollingBody.quaternion);
    rig.update(visual.position, player.heading, elapsed);
    effects.update(elapsed);
    sun.position.copy(visual.position).add(new T.Vector3(-25, 45, 20));
    sun.target.position.copy(visual.position);
    renderer.render(scene, camera);
    portraitRenderer.render(portraitScene, portraitCamera);
    frames++;
    if (now - fpsTime > 500) {
      fps = (frames * 1000) / (now - fpsTime);
      frames = 0;
      fpsTime = now;
      const v = player.body.linvel();
      document.querySelector("#diagnostics")!.textContent =
        `FPS ${fps.toFixed(0)} | speed ${Math.hypot(v.x, v.z).toFixed(1)}\ncam ${rig.names[rig.mode]} | seed ${skin.seed}\nmood ${face.baseMood} | ${face.stun > 0 ? "STUN" : face.phase}\n~ toggles diagnostics`;
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
      heading: player.heading,
      velocity: { ...player.body.linvel() },
      viewForward: direction.toArray(),
      skin,
      camera: rig.mode,
      freeOrbit: rig.freeOrbit,
      orbitYaw: rig.orbitYaw,
      orbitPitch: rig.orbitPitch,
      fps,
      stun: face.stun,
      phase: face.phase,
      rings: { count: rings.count, total: rings.total },
      input: { x: input.x, z: input.z },
    }),
  });
}
const launch = new URLSearchParams(location.search).has("art-review")
  ? import("./artReview").then((m) => m.startArtReview())
  : start();
launch.catch((error) => {
  console.error(error);
  let errorNotice = document.querySelector<HTMLElement>("#notice");
  if (!errorNotice) {
    errorNotice = document.createElement("div");
    errorNotice.id = "notice";
    document.querySelector("#hud")?.appendChild(errorNotice);
  }
  errorNotice.textContent =
    "Не удалось запустить 3D-сцену. Обновите страницу или проверьте WebGL.";
});
