import * as T from "three";
import { loadFaceAtlas } from "./face/FaceAtlas";
import { FaceState } from "./face/FaceState";
import { EXPRESSIONS } from "./face/FaceRig";
import { skinFrom } from "./core/skin";
import { PlayerVisual } from "./game/PlayerVisual";
import { fit16by9 } from "./core/terrain";
/** Read-only QA gallery. No selection, reroll, persistence or player skin controls. */
export async function startArtReview() {
  const atlas = await loadFaceAtlas();
  const stage = document.querySelector<HTMLElement>("#stage")!;
  const hud = document.querySelector<HTMLElement>("#hud")!;
  hud.innerHTML =
    '<div class="brand">ЛИЦА v03 <small>ПРОВЕРКА В 3D · 12 ВЫРАЖЕНИЙ · СВЕТ И ЦВЕТ</small></div><a href="./" style="position:absolute;right:25px;top:25px;pointer-events:auto;color:white">Вернуться к игре</a>';
  const renderer = new T.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  stage.appendChild(renderer.domElement);
  const shadow =
    new URLSearchParams(location.search).get("lighting") === "shadow";
  const scene = new T.Scene();
  scene.background = new T.Color("#27383e");
  scene.add(new T.HemisphereLight(0xfff5df, 0x738b83, shadow ? 0.22 : 1.8));
  const light = new T.DirectionalLight(0xfff1de, 2);
  light.position.set(-4, 7, shadow ? -8 : 8);
  scene.add(light);
  const lightingLabel = document.createElement("div");
  lightingLabel.textContent = shadow ? "ПРОВЕРКА В ТЕНИ" : "ПРОВЕРКА НА СВЕТУ";
  lightingLabel.style.cssText =
    "position:absolute;right:25px;top:55px;font-size:12px";
  hud.appendChild(lightingLabel);
  const camera = new T.OrthographicCamera(-6.6, 6.6, 3.7125, -3.7125, 0.1, 30);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
  const names = [
    "Нейтральный",
    "Хитрый",
    "Раздражённый",
    "Ярость",
    "Восторг",
    "Испуг",
    "Удивление",
    "Гордость",
    "Головокружение",
    "Оглушение",
    "Безумная реакция",
    "Сонный",
  ];
  const states: FaceState[] = [],
    visuals: PlayerVisual[] = [];
  EXPRESSIONS.forEach((expression, i) => {
    const skin = skinFrom(
      [1231541045, 840156764, 3304776396, 456, 123, 87654][i % 6],
    );
    const state = new FaceState(skin.mood, () => 0.25 + (i % 4) * 0.15);
    const visual = new PlayerVisual(skin, state, atlas);
    visual.scale.setScalar(0.76);
    visual.position.set(
      ((i % 4) - 1.5) * 3.15,
      2.1 - Math.floor(i / 4) * 2.12,
      0,
    );
    visual.face.reviewExpression = expression;
    scene.add(visual);
    states.push(state);
    visuals.push(visual);
    const label = document.createElement("div");
    label.textContent = names[i];
    label.style.cssText = `position:absolute;left:${(i % 4) * 305 + 36}px;top:${Math.floor(i / 4) * 205 + 237}px;width:290px;text-align:center;font-size:16px;font-weight:bold`;
    hud.appendChild(label);
  });
  const resize = () => {
    const f = fit16by9(innerWidth, innerHeight);
    stage.style.width = f.width + "px";
    stage.style.height = f.height + "px";
    hud.style.transform = `scale(${f.scale})`;
    renderer.setSize(f.width, f.height, false);
  };
  addEventListener("resize", resize);
  resize();
  let last = performance.now();
  const closed = new URLSearchParams(location.search).get("blink") === "closed";
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    states.forEach((s, i) => {
      s.update(dt);
      if (closed) s.blink = 1;
      visuals[i].rollingBody.rotation.x += dt * 0.16;
      visuals[i].rollingBody.rotation.z += dt * 0.08;
      visuals[i].face.update(dt, 0);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  Object.defineProperty(window, "__ART_REVIEW__", {
    get: () => ({
      expressions: EXPRESSIONS,
      closed,
      faces: visuals.map((v) => ({
        expression: v.face.expression(),
        eyes: v.face.eyes.map((e) => e.visible),
      })),
    }),
  });
}
