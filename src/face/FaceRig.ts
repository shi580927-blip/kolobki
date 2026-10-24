import * as T from "three";
import { FaceState } from "./FaceState";
/** Technical geometry only. Replace feature shapes with approved art, not the rig. */
export class FaceRig extends T.Group {
  private eyes: T.Group[] = [];
  private lids: T.Mesh[] = [];
  private brows: T.Mesh[] = [];
  private crosses: T.Group[] = [];
  private mouth: T.Mesh;
  private unhinged = 0;
  constructor(
    readonly state: FaceState,
    color: string,
  ) {
    super();
    const white = new T.MeshStandardMaterial({
      color: 0xfff6e2,
      roughness: 0.55,
    });
    const dark = new T.MeshStandardMaterial({
      color: 0x30201f,
      roughness: 0.65,
    });
    const lidMat = new T.MeshStandardMaterial({ color, roughness: 0.7 });
    for (const x of [-0.31, 0.31]) {
      const anchor = new T.Group();
      this.attachAt(anchor, x, 0.22);
      const eye = new T.Group();
      const ball = new T.Mesh(new T.SphereGeometry(1, 20, 14), white);
      ball.scale.set(0.235, 0.285, 0.12);
      eye.add(ball);
      const iris = new T.Mesh(
        new T.SphereGeometry(1, 16, 12),
        new T.MeshStandardMaterial({ color: 0x684737 }),
      );
      iris.position.set(0.035, 0, 0.105);
      iris.scale.set(0.105, 0.14, 0.045);
      eye.add(iris);
      const pupil = new T.Mesh(new T.SphereGeometry(1, 14, 10), dark);
      pupil.position.set(0.04, 0, 0.14);
      pupil.scale.set(0.065, 0.095, 0.025);
      eye.add(pupil);
      const glint = new T.Mesh(
        new T.SphereGeometry(0.028, 8, 6),
        new T.MeshBasicMaterial({ color: 0xffffff }),
      );
      glint.position.set(0.01, 0.05, 0.164);
      eye.add(glint);
      anchor.add(eye);
      this.eyes.push(eye);
      const lid = new T.Mesh(new T.SphereGeometry(1, 20, 12), lidMat);
      lid.scale.set(0.24, 0.05, 0.13);
      lid.visible = false;
      anchor.add(lid);
      this.lids.push(lid);
      const cross = new T.Group();
      for (const sign of [-1, 1]) {
        const bar = new T.Mesh(new T.CapsuleGeometry(0.022, 0.3, 3, 6), dark);
        bar.rotation.z = (sign * Math.PI) / 4;
        bar.position.z = 0.14;
        cross.add(bar);
      }
      cross.visible = false;
      anchor.add(cross);
      this.crosses.push(cross);
      const brow = new T.Mesh(new T.CapsuleGeometry(0.05, 0.28, 4, 8), dark);
      this.attachAt(brow, x, 0.57);
      brow.rotation.z += Math.PI / 2;
      this.brows.push(brow);
    }
    this.mouth = new T.Mesh(
      new T.TorusGeometry(0.22, 0.035, 6, 24, Math.PI),
      dark,
    );
    this.attachAt(this.mouth, 0, -0.27);
    this.mouth.rotation.z = Math.PI;
    this.add(this.mouth);
  }
  private attachAt(object: T.Object3D, x: number, y: number) {
    const normal = new T.Vector3(
      x,
      y,
      Math.sqrt(1 - x * x - y * y),
    ).normalize();
    object.position.copy(normal.multiplyScalar(1.025));
    object.quaternion.setFromUnitVectors(
      new T.Vector3(0, 0, 1),
      normal.normalize(),
    );
    this.add(object);
  }
  impact() {
    this.unhinged = 0.85;
  }
  update(dt: number, heading: number) {
    this.unhinged = Math.max(0, this.unhinged - dt);
    this.rotation.set(
      this.unhinged > 0
        ? Math.sin(this.state.time * 29) * this.unhinged * 0.7
        : 0,
      heading +
        (this.unhinged > 0
          ? Math.sin(this.state.time * 22) * this.unhinged * 2
          : 0),
      this.unhinged > 0 ? Math.sin(this.state.time * 35) * this.unhinged : 0,
    );
    const s = this.state,
      micro = Math.sin(s.time * 1.7 + Math.sin(s.time * 0.71)) * 0.015;
    const mood = s.baseMood;
    for (let i = 0; i < 2; i++) {
      const ko = s.stun > 0,
        closed = s.blink >= 0.98;
      this.eyes[i].visible = !ko && !closed;
      this.eyes[i].scale.y = Math.max(0.015, 1 - s.blink);
      this.lids[i].visible = !ko && closed;
      this.crosses[i].visible = ko;
      const base =
        mood === "grumpy"
          ? i === 0
            ? -0.24
            : 0.24
          : mood === "worried"
            ? i === 0
              ? 0.26
              : -0.26
            : i === 0
              ? 0.12
              : -0.17;
      const reaction = s.reaction === "rage" ? (i === 0 ? -0.5 : 0.5) : 0;
      this.brows[i].rotation.z =
        Math.PI / 2 + base * (1 - s.weight) + reaction * s.weight + micro;
    }
    this.mouth.scale.set(
      1,
      s.reaction === "shock" ? 1 + s.weight * 0.8 : mood === "sly" ? 0.65 : 0.9,
      1,
    );
    this.mouth.rotation.z =
      (mood === "grumpy" || mood === "worried" ? 0 : Math.PI) +
      (s.reaction === "joy" ? s.weight * 0.1 : 0);
  }
}
