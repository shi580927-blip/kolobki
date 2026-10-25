import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { CameraRig } from "../src/game/CameraRig";
test("orbit starts from current view and persists independently of player heading", () => {
  const camera = new PerspectiveCamera();
  camera.position.set(0, 8, -10);
  const rig = new CameraRig(camera),
    p = new Vector3();
  rig.beginOrbit(p);
  assert.equal(rig.freeOrbit, true);
  rig.orbit(0.25, 0.1);
  const yaw = rig.orbitYaw;
  rig.update(p, 0, 1);
  rig.update(p, Math.PI, 1);
  assert.equal(rig.orbitYaw, yaw);
  const first = camera.position.clone();
  rig.update(p, Math.PI / 2, 1);
  assert.ok(camera.position.distanceTo(first) < 0.01);
  rig.setMode(2);
  assert.equal(rig.mode, 2);
  assert.equal(rig.freeOrbit, false);
});
test("orbit pitch is constrained and invalid input cannot poison camera", () => {
  const camera = new PerspectiveCamera();
  camera.position.set(0, 5, -10);
  const rig = new CameraRig(camera);
  rig.beginOrbit(new Vector3());
  rig.orbit(0, 100);
  assert.equal(rig.orbitPitch, 1.25);
  rig.orbit(0, -100);
  assert.equal(rig.orbitPitch, 0.12);
  const yaw = rig.orbitYaw;
  rig.orbit(NaN, 1);
  assert.equal(rig.orbitYaw, yaw);
  rig.orbit(1, Infinity);
  assert.ok(Number.isFinite(rig.orbitPitch));
});

test("rear heading has weight, takes shortest arc and settles without snapping",()=>{
 const rig=new CameraRig(new PerspectiveCamera()),p=new Vector3(0,4,0);
 rig.update(p,Math.PI-.05,1/60);rig.update(p,-Math.PI+.05,1/60);
 assert.ok(rig.followYaw!>Math.PI-.05&&rig.followYaw!<Math.PI+.05);
 rig.setMode(0);rig.update(p,0,1/60);rig.update(p,Math.PI,1/60);
 assert.ok(rig.followYaw!>0&&rig.followYaw!<.15);
 for(let i=0;i<240;i++)rig.update(p,Math.PI,1/60);
 assert.ok(Math.abs(rig.followYaw!-Math.PI)<.01);
});
