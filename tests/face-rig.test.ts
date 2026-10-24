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
  for (const anchor of face.children.filter((x) => x instanceof Group)) {
    assert.equal(anchor.children[0].visible, false);
    assert.equal(anchor.children[1].visible, true);
  }
  state.knockOut(1);
  face.update(0, 0);
  for (const anchor of face.children.filter((x) => x instanceof Group)) {
    assert.equal(anchor.children[0].visible, false);
    assert.equal(anchor.children[1].visible, false);
    assert.equal(anchor.children[2].visible, true);
  }
  assert.ok(face.children.some((x) => x instanceof Mesh));
});
