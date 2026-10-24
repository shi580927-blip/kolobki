import { test } from "node:test";
import assert from "node:assert/strict";
import { FaceState } from "../src/face/FaceState";
import { loadSkin, skinFrom } from "../src/core/skin";
import {
  fit16by9,
  terrainData,
  headingFromVelocity,
} from "../src/core/terrain";
test("skin survives reload and rejects corrupt storage", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, v: string) => {
      data.set(key, v);
    },
  };
  const first = loadSkin(storage, () => 123);
  assert.deepEqual(
    loadSkin(storage, () => 456),
    first,
  );
  data.set("sharobesy.skin.v1", "bad");
  assert.deepEqual(
    loadSkin(storage, () => 456),
    skinFrom(456),
  );
});
test("each reaction holds then returns to persistent character", () => {
  for (const mood of ["sly", "grumpy", "worried"] as const)
    for (const reaction of ["joy", "rage", "shock"] as const) {
      const f = new FaceState(mood, () => 0.5);
      f.react(reaction);
      f.update(0.2);
      assert.equal(f.phase, "HOLD");
      assert.equal(f.weight, 1);
      f.update(0.7);
      assert.equal(f.phase, "OUT");
      f.update(0.2);
      assert.equal(f.phase, "IDLE");
      assert.equal(f.reaction, null);
      assert.equal(f.baseMood, mood);
    }
});
test("blink has fully closed interval and stun suppresses blinking", () => {
  const f = new FaceState("sly", () => 0);
  f.update(1.8);
  for (let i = 0; i < 10; i++) f.update(0.02);
  assert.equal(f.blink, 1);
  f.knockOut(0.8);
  f.update(0.4);
  assert.equal(f.blink, 0);
  assert.equal(f.stun, 0.4);
  f.update(0.5);
  assert.equal(f.stun, 0);
  assert.equal(f.baseMood, "sly");
});
test("16:9 fits without cropping in landscape, ultrawide and portrait", () => {
  for (const [w, h] of [
    [1920, 1080],
    [2400, 1080],
    [390, 844],
  ]) {
    const fit = fit16by9(w, h);
    assert.ok(fit.width <= w + 0.001 && fit.height <= h + 0.001);
    assert.ok(Math.abs(fit.width / fit.height - 16 / 9) < 1e-10);
  }
});
test("terrain triangles face upwards and all collision indices are valid", () => {
  const { vertices: v, indices: ix } = terrainData(20);
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3,
      b = ix[i + 1] * 3,
      c = ix[i + 2] * 3;
    assert.ok(c < v.length);
    const up =
      (v[b + 2] - v[a + 2]) * (v[c] - v[a]) -
      (v[b] - v[a]) * (v[c + 2] - v[a + 2]);
    assert.ok(up > 0);
  }
  const heights = Array.from(v).filter((_, i) => i % 3 === 1);
  assert.ok(Math.max(...heights) - Math.min(...heights) > 10);
});
test("face course preserves last heading at rest", () => {
  assert.equal(headingFromVelocity(0, 0, 1.3), 1.3);
  assert.equal(headingFromVelocity(2, 0, 0), Math.PI / 2);
});

test("saved seed keeps identity while all patterns use small motifs", () => {
  const patterns = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const skin = skinFrom(seed);
    assert.equal(skin.seed, seed);
    assert.deepEqual(skin, skinFrom(seed));
    assert.notEqual(skin.pattern, "stripes");
    patterns.add(skin.pattern);
  }
  assert.equal(patterns.size, 3);
});
