import { test } from "node:test";
import assert from "node:assert/strict";
import { Scene, Vector3 } from "three";
import { EventBus } from "../src/core/events";
import { RingCollectibles } from "../src/game/RingCollectibles";
import { heightAt } from "../src/core/terrain";

test("ring collects once and disappears, then reset restores it", () => {
  const scene = new Scene(),
    bus = new EventBus(),
    rings = new RingCollectibles(scene, bus);
  const events: number[] = [];
  bus.on("ring_collected", (e) => events.push(e.count));
  const p = new Vector3(0, heightAt(0, -8) + 1, -8);
  rings.checkSegment(p, p);
  rings.checkSegment(p, p);
  assert.equal(rings.count, 1);
  assert.deepEqual(events, [1]);
  assert.equal(scene.children[0].visible, false);
  rings.reset();
  assert.equal(rings.count, 0);
  assert.equal(scene.children[0].visible, true);
  rings.checkSegment(p, p);
  assert.equal(rings.count, 1);
});
test("dash swept through ring collects even when both endpoints are outside", () => {
  const rings = new RingCollectibles(new Scene(), new EventBus());
  const y = heightAt(0, -8) + 1;
  rings.checkSegment(new Vector3(-5, y, -8), new Vector3(5, y, -8));
  assert.equal(rings.count, 1);
});
test("passing high over ring or beside it does not collect", () => {
  const rings = new RingCollectibles(new Scene(), new EventBus());
  const y = heightAt(0, -8) + 1;
  rings.checkSegment(new Vector3(-5, y + 8, -8), new Vector3(5, y + 8, -8));
  rings.checkSegment(new Vector3(-5, y, -4), new Vector3(5, y, -4));
  assert.equal(rings.count, 0);
});
