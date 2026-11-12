import { test } from "node:test";
import assert from "node:assert/strict";
import { Group, Mesh, Quaternion, Vector3 } from "three";
import { FaceRig } from "../src/face/FaceRig";
import { FaceState } from "../src/face/FaceState";
test("rolling body rotation does not propagate to sibling FaceRig", () => {
  const root = new Group(),
    body = new Group(),
    state = new FaceState("grumpy", () => 0.5),
    face = new FaceRig(state, "#76b8ba");
  root.add(body, face);
  face.update(0, 0.7);
  const before = face.getWorldQuaternion(new Quaternion());
  body.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 1.7);
  root.updateMatrixWorld(true);
  const after = face.getWorldQuaternion(new Quaternion());
  assert.ok(before.angleTo(after) < 1e-8);
  assert.equal(face.rotation.y, 0.7);
});
test("closed blink hides all visible eyeballs and stun uses crosses", () => {
  const state = new FaceState("worried", () => 0),
    face = new FaceRig(state, "#e8c36b");
  state.blink = 1;
  face.update(0, 0);
  assert.ok(face.eyes.every((eye) => !eye.visible));
  assert.ok(face.lids.every((lid) => lid.visible));
  assert.ok(face.stunWhites.every((eye) => !eye.visible));
  state.knockOut(1);
  face.update(0, 0);
  assert.ok(face.eyes.every((eye) => !eye.visible));
  assert.ok(face.lids.every((lid) => !lid.visible));
  assert.ok(face.crosses.every((cross) => cross.visible));
  assert.ok(face.stunWhites.every((eye) => eye.visible));
  assert.ok(face.children.some((x) => x instanceof Mesh));
});

import { EXPRESSIONS, FACE_POSES } from "../src/face/FaceRig";
test("all 12 expressions have distinct usable part combinations inside hemisphere", () => {
  const state = new FaceState("sly", () => 0.5),
    face = new FaceRig(state, "#389fae");
  assert.equal(EXPRESSIONS.length, 12);
  for (const expression of EXPRESSIONS) {
    face.reviewExpression = expression;
    face.update(0.016, 0);
    assert.equal(face.expression(), expression);
    assert.ok(FACE_POSES[expression]);
    for (const child of face.children) {
      if (child instanceof Mesh) {
        const p = child.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          assert.ok(Math.hypot(p.getX(i), p.getY(i)) < 0.95);
          assert.ok(p.getZ(i) > 0);
        }
      }
    }
  }
});
test("reaction returns to individual base expression and closed eyes never expose pupil", () => {
  const state = new FaceState("grumpy", () => 0.5),
    face = new FaceRig(state, "#389fae");
  state.react("joy");
  state.update(0.2);
  face.update(0.2, 0);
  assert.equal(face.expression(), "delighted");
  state.update(1.1);
  face.update(0.1, 0);
  assert.equal(face.expression(), "irritated");
  state.blink = 1;
  face.update(0, 0);
  assert.ok(face.eyes.every((e) => !e.visible));
});

test("mouth stays below both eyes with a visible gap for every expression and impact", () => {
  const face = new FaceRig(new FaceState("sly", () => 0.5), "#389fae");
  const mouth = face.getObjectByName("mouth") as Mesh;
  for (const expression of EXPRESSIONS) {
    face.reviewExpression = expression;
    face.impact();
    face.update(0.016, 0);
    mouth.geometry.computeBoundingBox();
    for (const eye of face.eyes) {
      eye.geometry.computeBoundingBox();
      assert.ok(eye.geometry.boundingBox!.min.y - mouth.geometry.boundingBox!.max.y >= 0.08,
        `${expression}: mouth overlaps eye zone`);
    }
  }
});

test("sculpted brows stay on sphere, reuse geometry, and face tilts as one assembly", () => {
  const face = new FaceRig(new FaceState("sly", () => 0.5), "#389fae");
  face.reviewExpression = "irritated";
  face.update(1, 0);
  assert.ok(face.rotation.x > 0.1);
  const brows = face.getObjectByName("sculpted-brows")!;
  assert.equal(brows.children.length, 2);
  const first = (brows.children[0] as Mesh).geometry;
  face.update(0.016, 0);
  assert.equal((brows.children[0] as Mesh).geometry, first);
  for (const expression of EXPRESSIONS) {
    face.reviewExpression = expression;
    face.update(1, 0);
    for (const child of brows.children) {
      const p = (child as Mesh).geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const radius = Math.hypot(p.getX(i), p.getY(i), p.getZ(i));
        assert.ok(radius >= 1 && radius < 1.09);
      }
    }
  }
  face.reviewExpression = "proud";
  face.update(1, 0);
  assert.ok(face.rotation.x < -0.1);
});
