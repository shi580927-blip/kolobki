import * as T from "three";
import type { Skin } from "../core/skin";
import { randomFrom } from "../core/skin";
import { FaceRig } from "../face/FaceRig";
import { GameFaceRig } from "../face/GameFaceRig";
import type { FaceAtlas } from "../face/FaceAtlas";
import { FaceState } from "../face/FaceState";
export class PlayerVisual extends T.Group {
  readonly rollingBody: T.Mesh;
  readonly face: FaceRig | GameFaceRig;
  constructor(skin: Skin, state: FaceState, atlas?: FaceAtlas, gameFaceTexture?: T.Texture) {
    super();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const c = canvas.getContext("2d")!;
    c.fillStyle = skin.color;
    c.fillRect(0, 0, 512, 512);
    c.fillStyle = new T.Color(skin.accent)
      .lerp(new T.Color(skin.color), 0.48)
      .getStyle();
    const r = randomFrom(skin.seed + 1);
    // Seeded jittered grid: small motifs, no stripe bands or large bald patches.
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 20; col++) {
        const x = (col + 0.25 + r() * 0.5) * 512 / 20,
          y = (row + 0.25 + r() * 0.5) * 512 / 16,
          size = 3.5 + r() * 2.5;
        c.save();
        c.translate(x, y);
        c.rotate((r() - 0.5) * 0.8);
        c.beginPath();
        if (skin.pattern === "hearts") {
          c.moveTo(0, size);
          c.bezierCurveTo(-size * 2, -size * 0.2, -size, -size * 1.5, 0, -size * 0.5);
          c.bezierCurveTo(size, -size * 1.5, size * 2, -size * 0.2, 0, size);
        } else if (skin.pattern === "petals") {
          for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2;
            c.moveTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
            c.ellipse(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5,
              size * 0.65, size * 0.65, 0, 0, Math.PI * 2);
          }
        } else c.ellipse(0, 0, size, size * (0.8 + r() * 0.4), 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
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
    this.face = gameFaceTexture ? new GameFaceRig(state, gameFaceTexture) : new FaceRig(state, skin.color, atlas);
    this.add(this.face);
  }
}
