import { PerspectiveCamera, Vector3 } from "three";
import { heightAt } from "../core/terrain";
export class CameraRig {
  obstacleLimit?: (origin:Vector3,end:Vector3)=>number|undefined;
  mode = 0;
  shake = 0;
  freeOrbit = false;
  orbitYaw = 0;
  orbitPitch = 0.45;
  private orbitDistance = 11;
  followYaw: number | null = null;
  private followDistance = 10;
  setMode(mode: number) {
    this.mode = mode;
    this.freeOrbit = false;
    this.followYaw = null;
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
  update(position: Vector3, heading: number, dt: number, speed = 0, wagons = 0) {
    dt = Math.max(0, Math.min(dt, 1));
    if (this.followYaw === null) this.followYaw = heading;
    const angle = Math.atan2(Math.sin(heading - this.followYaw), Math.cos(heading - this.followYaw));
    // Heading lags separately from translation: a quick turn reveals the face.
    this.followYaw += angle * (1 - Math.exp(-1.8 * dt));
    this.followDistance += (10 + Math.min(2, Math.max(0, speed) * .1) + Math.max(0,Math.min(5,wagons))*2 - this.followDistance) * (1 - Math.exp(-2 * dt));
    const offsets = [
      new Vector3(0, 5.2 + Math.max(0,Math.min(5,wagons))*.7, -this.followDistance),
      new Vector3(0, 15, -8),
      new Vector3(11, 5, 0),
      new Vector3(0, 4, 9),
    ];
    const offset = offsets[this.mode].applyAxisAngle(
      new Vector3(0, 1, 0),
      this.mode === 0 ? this.followYaw : heading,
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
    const aim=position.clone().add(new Vector3(0,.7,0));
    const hit=this.obstacleLimit?.(aim,this.camera.position);
    if(hit!==undefined&&Number.isFinite(hit)){
      const ray=this.camera.position.clone().sub(aim),length=ray.length();
      if(length>.001)this.camera.position.copy(aim).addScaledVector(ray,Math.max(.4,hit-.4)/length);
    }
    this.camera.lookAt(aim);
  }
}
