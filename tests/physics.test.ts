import { test } from "node:test";
import assert from "node:assert/strict";
import R from "@dimforge/rapier3d-compat";
import { terrainData, heightAt } from "../src/core/terrain";
test("Rapier sphere rests on shared terrain and rolls downhill without tunnelling", async () => {
  await R.init();
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  const d = terrainData();
  world.createCollider(R.ColliderDesc.trimesh(d.vertices, d.indices));
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(8, heightAt(8, 0) + 3, 0)
      .setCcdEnabled(true),
  );
  world.createCollider(R.ColliderDesc.ball(1).setFriction(0.8), body);
  for (let i = 0; i < 600; i++) {
    world.step();
    const p = body.translation();
    assert.ok(Number.isFinite(p.y));
    assert.ok(p.y > heightAt(p.x, p.z) - 0.3, "sphere stays above surface");
  }
  const p = body.translation();
  assert.ok(Math.hypot(p.x - 8, p.z) > 1, "rolls on slope");
  world.free();
});

import { PhysicsPlayer } from "../src/game/PhysicsPlayer";
import { EventBus } from "../src/core/events";
import { Vector3 } from "three";
import type { Input } from "../src/game/Input";
test("support contact while rolling does not continuously stun the player", async () => {
  await R.init();
  const world = new R.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  const d = terrainData();
  world.createCollider(R.ColliderDesc.trimesh(d.vertices, d.indices));
  const bus = new EventBus();
  let impacts = 0;
  bus.on("impact_major", () => impacts++);
  const player = new PhysicsPlayer(world, bus),
    events = new R.EventQueue(true);
  const input = { x: 0, z: 0, jump: false, dash: false } as Input;
  for (let i = 0; i < 360; i++) {
    player.step(1 / 60, input, new Vector3(0, 0, 1));
    world.step(events);
    player.sync();
    events.drainContactForceEvents((e) =>
      player.contact(e.totalForceMagnitude()),
    );
  }
  assert.ok(impacts <= 2, `expected isolated landing, got ${impacts} impacts`);
  events.free();
  world.free();
});
