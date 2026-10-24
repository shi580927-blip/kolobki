import R from "@dimforge/rapier3d-compat";
import { Vector3, Quaternion } from "three";
import { heightAt, headingFromVelocity } from "../core/terrain";
import type { Input } from "./Input";
import type { EventBus } from "../core/events";
export class PhysicsPlayer {
  readonly body: R.RigidBody;
  readonly collider: R.Collider;
  previous = new Vector3();
  current = new Vector3();
  prevRotation = new Quaternion();
  rotation = new Quaternion();
  heading = 0;
  private jumpCooldown = 0;
  private dashCooldown = 0;
  private impactCooldown = 0;
  private grounded = false;
  private velocityBeforeStep = new Vector3();
  private collisionSpeedChange = 0;
  constructor(
    private world: R.World,
    private bus: EventBus,
  ) {
    this.body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(0, heightAt(0, 0) + 2, 0)
        .setCcdEnabled(true)
        .setLinearDamping(0.25)
        .setAngularDamping(0.3),
    );
    this.collider = world.createCollider(
      R.ColliderDesc.ball(1)
        .setDensity(1)
        .setFriction(0.8)
        .setRestitution(0.3)
        .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(60),
      this.body,
    );
    this.reset();
  }
  reset() {
    this.body.setTranslation({ x: 0, y: heightAt(0, 0) + 2, z: 0 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.current.copy(this.body.translation());
    this.previous.copy(this.current);
    this.rotation.copy(this.body.rotation());
    this.prevRotation.copy(this.rotation);
  }
  step(dt: number, input: Input, viewForward: Vector3) {
    this.previous.copy(this.current);
    this.prevRotation.copy(this.rotation);
    this.jumpCooldown -= dt;
    this.dashCooldown -= dt;
    this.impactCooldown -= dt;
    const ray = new R.Ray(this.body.translation(), { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(
      ray,
      1.18,
      true,
      undefined,
      undefined,
      this.collider,
      this.body,
    );
    this.grounded = !!hit;
    const forward = viewForward.clone().setY(0).normalize();
    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));
    const direction = right
      .multiplyScalar(input.x)
      .addScaledVector(forward, -input.z);
    const mass = this.body.mass();
    if (direction.lengthSq() > 0) {
      this.body.applyImpulse(
        {
          x: direction.x * mass * 12 * dt,
          y: 0,
          z: direction.z * mass * 12 * dt,
        },
        true,
      );
      this.body.applyTorqueImpulse(
        {
          x: direction.z * mass * 6 * dt,
          y: 0,
          z: -direction.x * mass * 6 * dt,
        },
        true,
      );
    }
    if (input.jump && this.grounded && this.jumpCooldown <= 0) {
      this.body.applyImpulse({ x: 0, y: mass * 7, z: 0 }, true);
      this.jumpCooldown = 0.3;
      this.bus.emit("player_jump", {});
    }
    input.jump = false;
    if (input.dash && this.dashCooldown <= 0) {
      const d =
        direction.lengthSq() > 0.01
          ? direction.normalize()
          : new Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
      this.body.applyImpulse(
        { x: d.x * mass * 9, y: mass * 0.6, z: d.z * mass * 9 },
        true,
      );
      this.dashCooldown = 1.2;
      this.bus.emit("player_dash", {});
    }
    input.dash = false;
    const v = this.body.linvel(),
      speed = Math.hypot(v.x, v.z);
    if (speed > 22)
      this.body.setLinvel(
        { x: (v.x / speed) * 22, y: v.y, z: (v.z / speed) * 22 },
        true,
      );
    this.velocityBeforeStep.copy(this.body.linvel());
  }
  sync() {
    this.current.copy(this.body.translation());
    this.rotation.copy(this.body.rotation());
    const v = this.body.linvel();
    this.collisionSpeedChange = this.velocityBeforeStep.distanceTo(
      new Vector3(v.x, v.y, v.z),
    );
    this.heading = headingFromVelocity(v.x, v.z, this.heading);
    if (this.current.y < -30) this.reset();
  }
  contact(strength: number) {
    if (
      strength < 90 ||
      this.collisionSpeedChange < 4.5 ||
      this.impactCooldown > 0
    )
      return;
    this.impactCooldown = 0.55;
    this.bus.emit("impact_major", { position: this.current.clone(), strength });
    this.bus.emit("face_unhinged", { duration: 0.85 });
  }
}
