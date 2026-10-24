import * as T from "three";
import type { Skin } from "../core/skin";
import { randomFrom } from "../core/skin";
import { FaceRig } from "../face/FaceRig";
import type { FaceAtlas } from "../face/FaceAtlas";
import { FaceState } from "../face/FaceState";
export class PlayerVisual extends T.Group {
  readonly rollingBody: T.Mesh;
  readonly face: FaceRig;
  constructor(skin: Skin, state: FaceState, atlas?: FaceAtlas) {
    super();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const c = canvas.getContext("2d")!;
    c.fillStyle = skin.color;
    c.fillRect(0, 0, 512, 512);
    c.fillStyle = new T.Color(skin.accent)
      .lerp(new T.Color(skin.color), 0.24)
      .getStyle();
    const r = randomFrom(skin.seed + 1);
    if (skin.pattern === "stripes") {
      for (let x = 0; x < 512; x += 64) c.fillRect(x, 0, 24, 512);
    } else
      for (let i = 0; i < 70; i++) {
        const x = r() * 512,
          y = r() * 512;
        c.beginPath();
        if (skin.pattern === "hearts") {
          c.moveTo(x, y + 6);
          c.bezierCurveTo(x - 25, y - 8, x - 14, y - 25, x, y - 10);
          c.bezierCurveTo(x + 14, y - 25, x + 25, y - 8, x, y + 6);
        } else c.ellipse(x, y, 7 + r() * 7, 9 + r() * 6, 0, 0, Math.PI * 2);
        c.fill();
      }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    this.rollingBody = new T.Mesh(
      new T.SphereGeometry(1, 40, 28),
      new T.MeshStandardMaterial({
        map: texture,
        roughness: 0.58,
        emissive: skin.color,
        emissiveIntensity: 0.14,
      }),
    );
    this.rollingBody.castShadow = true;
    this.add(this.rollingBody);
    this.face = new FaceRig(state, skin.color, atlas);
    this.add(this.face);
  }
}
