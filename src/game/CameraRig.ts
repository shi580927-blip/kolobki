import { PerspectiveCamera, Vector3 } from "three";
import { heightAt } from "../core/terrain";
export class CameraRig {
  mode = 0;
  shake = 0;
  freeOrbit = false;
  orbitYaw = 0;
  orbitPitch = 0.45;
  private orbitDistance = 11;
  setMode(mode: number) {
    this.mode = mode;
    this.freeOrbit = false;
  }
  beginOrbit(position: Vector3) {
    if (this.freeOrbit) return;
    const offset = this.camera.position
      .clone()
      .sub(position)
      .sub(new Vector3(0, 0.7, 0));
    this.orbitDistance = Math.max(3, offset.length());
    this.orbitYaw = Math.atan2(offset.x, offset.z);
    this.orbitPitch = Math.max(
      0.12,
      Math.min(1.25, Math.atan2(offset.y, Math.hypot(offset.x, offset.z))),
    );
    this.freeOrbit = true;
  }
  orbit(dx: number, dy: number) {
    if (!this.freeOrbit || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.orbitYaw -= dx * Math.PI * 1.4;
    this.orbitPitch = Math.max(
      0.12,
      Math.min(1.25, this.orbitPitch + dy * Math.PI),
    );
  }
  readonly names = ["сзади", "сверху", "сбоку", "спереди"];
  constructor(readonly camera: PerspectiveCamera) {}
  update(position: Vector3, heading: number, dt: number) {
    const offsets = [
      new Vector3(0, 5.2, -10),
      new Vector3(0, 15, -8),
      new Vector3(11, 5, 0),
      new Vector3(0, 4, 9),
    ];
    const offset = offsets[this.mode].applyAxisAngle(
      new Vector3(0, 1, 0),
      heading,
    );
    if (this.freeOrbit) {
      const horizontal = Math.cos(this.orbitPitch) * this.orbitDistance;
      offset.set(
        Math.sin(this.orbitYaw) * horizontal,
        Math.sin(this.orbitPitch) * this.orbitDistance + 0.7,
        Math.cos(this.orbitYaw) * horizontal,
      );
    }
    const target = position.clone().add(offset);
    target.y = Math.max(target.y, heightAt(target.x, target.z) + 2);
    this.camera.position.lerp(target, 1 - Math.exp(-5 * dt));
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake > 0)
      this.camera.position.add(
        new Vector3(
          Math.sin(performance.now() * 0.091),
          Math.cos(performance.now() * 0.073),
          0,
        ).multiplyScalar(this.shake * 0.3),
      );
    this.camera.lookAt(position.clone().add(new Vector3(0, 0.7, 0)));
  }
}
