import R from "@dimforge/rapier3d-compat";
import { Vector3, Quaternion } from "three";
import { heightAt, headingFromVelocity } from "../core/terrain";
import {impactSeverity} from "./ImpactModel";
import type { Input } from "./Input";
import type { EventBus } from "../core/events";
export type DriveInput = Pick<Input,"x"|"z"|"jump"|"dash"> & {touchDrive?:boolean};
export class PhysicsPlayer {
  readonly body: R.RigidBody;
  readonly collider: R.Collider;
  previous = new Vector3();
  current = new Vector3();
  prevRotation = new Quaternion();
  rotation = new Quaternion();
  heading = 0;
  private immobilized=false;
  private groundHold=false;
  private jumpCooldown = 0;
  private dashCooldown = 0;
  private impactCooldown = 0;
  private grounded = false;
  private touchImpulseGrace=0;
  private velocityBeforeStep = new Vector3();
  private collisionSpeedChange = 0;
  constructor(
    private world: R.World,
    private bus: EventBus,
    private spawn: {x:number;z:number} = {x:0,z:0},
  ) {
    this.body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, heightAt(spawn.x, spawn.z) + 1.1, spawn.z)
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
  setImmobilized(value:boolean){
    if(value===this.immobilized)return;
    this.immobilized=value;
    if(!value&&this.groundHold){
      this.body.setBodyType(R.RigidBodyType.Dynamic,true);
      this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);
      this.groundHold=false;
    }
    this.collisionSpeedChange=0;
  }
  hasSurfaceSupport(){
    let supported=false;
    const center=this.body.translation();
    // A nearby ray is insufficient: wait for a real lower-surface contact.
    this.world.contactPairsWith(this.collider,other=>{
      if(other.parent()&&!other.parent()!.isFixed())return;
      this.world.contactPair(this.collider,other,manifold=>{
        if(Math.abs(manifold.normal().y)<.45)return;
        for(let i=0;i<manifold.numSolverContacts();i++){
          if(manifold.solverContactDist(i)<=.02&&manifold.solverContactPoint(i).y<center.y-.3)supported=true;
        }
      });
    });
    return supported;
  }
  reset() {
    this.setImmobilized(false);
    this.jumpCooldown=this.dashCooldown=this.impactCooldown=this.touchImpulseGrace=0;
    this.body.setTranslation({ x: this.spawn.x, y: heightAt(this.spawn.x, this.spawn.z) + 1.1, z: this.spawn.z }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.current.copy(this.body.translation());
    this.previous.copy(this.current);
    this.rotation.copy(this.body.rotation());
    this.prevRotation.copy(this.rotation);
  }
  step(dt: number, input: DriveInput, viewForward: Vector3) {
    this.previous.copy(this.current);
    this.prevRotation.copy(this.rotation);
    this.jumpCooldown -= dt;
    this.dashCooldown -= dt;
    this.impactCooldown -= dt;
    this.touchImpulseGrace=Math.max(0,this.touchImpulseGrace-dt);
    if(this.immobilized){
      input.jump=false;input.dash=false;
      // In the air only input is locked; gravity and ballistic momentum continue.
      if(!this.groundHold&&this.body.linvel().y<=.5&&this.hasSurfaceSupport()){
        this.body.setBodyType(R.RigidBodyType.KinematicPositionBased,true);
        this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);
        this.groundHold=true;
      }
      if(this.groundHold)this.body.setNextKinematicTranslation(this.current);
      this.velocityBeforeStep.copy(this.body.linvel());
      return;
    }
    const ray = new R.Ray(this.body.translation(), { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(
      ray,
      1.18,
      true,
      R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC,
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
    if(input.touchDrive&&this.touchImpulseGrace<=0&&!input.jump&&!input.dash&&this.hasSurfaceSupport()){
      // Ground-only arcade assistance: small deflection requests a low speed;
      // release brakes, while airborne motion and recent combat impulses coast.
      const amount=Math.min(1,direction.length()),target=direction.clone();
      if(amount>0)target.normalize().multiplyScalar(14*Math.pow(amount,1.4));
      const v=this.body.linvel(),change=new Vector3(target.x-v.x,0,target.z-v.z).multiplyScalar(5*dt).clampLength(0,(amount>0?18:24)*dt);
      this.body.applyImpulse({x:change.x*mass,y:0,z:change.z*mass},true);
      let next=this.body.linvel();
      // Finish the ground stop instead of creeping forever on a gentle slope.
      if(amount===0&&Math.hypot(next.x,next.z)<.7){next={x:0,y:next.y,z:0};this.body.setLinvel(next,true);}
      const angular=this.body.angvel(),blend=1-Math.exp(-10*dt);
      this.body.setAngvel({x:angular.x+(next.z-angular.x)*blend,y:angular.y,z:angular.z+(-next.x-angular.z)*blend},true);
    } else if (direction.lengthSq() > 0) {
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
      this.touchImpulseGrace=.45;
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
  get impactVelocity(){return this.velocityBeforeStep;}
  captureVelocity(){this.velocityBeforeStep.copy(this.body.linvel());}
  contact(strength: number, other?:R.Collider, otherVelocity?:Vector3, internal=false) {
    if(internal)return;
    let source:'collision'|'landing'='collision',closingSpeed=this.collisionSpeedChange;
    if(other){
      let sideSpeed=0,landingSpeed=0;
      const relative=this.velocityBeforeStep.clone().sub(otherVelocity??new Vector3().copy(other.parent()?.linvel()??{x:0,y:0,z:0}));
      this.world.contactPair(this.collider,other,m=>{
        for(let i=0;i<m.numSolverContacts();i++){
          if(m.solverContactDist(i)>.02)continue;
          const point=new Vector3().copy(m.solverContactPoint(i));
          const speed=Math.max(0,relative.dot(point.clone().sub(this.current).normalize()));
          if(Math.abs(m.normal().y)>.55&&point.y<this.current.y-.35)landingSpeed=Math.max(landingSpeed,speed);
          else sideSpeed=Math.max(sideSpeed,speed);
        }
      });
      source=sideSpeed>=5?'collision':'landing';closingSpeed=source==='collision'?sideSpeed:landingSpeed;
    }
    const severity=impactSeverity(closingSpeed,source);
    if(severity===0)return;
    if (
      this.immobilized ||
      strength < 90 ||
      this.collisionSpeedChange < 4.5 ||
      this.impactCooldown > 0
    )
      return;
    this.impactCooldown = 0.55;
    this.touchImpulseGrace=.35;
    this.bus.emit("impact_major", { position: this.current.clone(), strength,source,closingSpeed,severity });
    this.bus.emit("face_unhinged", { duration: 0.85 });
  }
}
