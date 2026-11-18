import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {POND,heightAt,pondRadius,pondClearance} from '../core/terrain';
import {pondSubmersion} from './WaterPhysics';
import type {PhysicsPlayer} from './PhysicsPlayer';

interface State{idle:number;under:number;cooldown:number;flight?:{target:T.Vector3;remaining:number};rescues:number}
/** A stuck or submerged ball is launched to a verified gentle beach. Ordinary
 * swimming/rolling remains under player control, and shallow water is safe. */
export class WaterRescue {
 private states=new Map<number,State>();
 constructor(private world:R.World){}
 reset(){this.states.clear();}
 snapshot(id:number){const s=this.states.get(id);return {idle:s?.idle??0,under:s?.under??0,flying:!!s?.flight,rescues:s?.rescues??0};}
 private shore(p:PhysicsPlayer){
  const candidates:T.Vector3[]=[];
  for(let a=.45;a<=1.65;a+=.12){
   const r=pondRadius(a)+6,x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,y=heightAt(x,z);
   if(y<POND.water+.18||pondClearance(x,z)<4)continue;
   const point=new T.Vector3(x,y+1.12,z),blocked=this.world.intersectionWithShape(point,{x:0,y:0,z:0,w:1},new R.Ball(.96),R.QueryFilterFlags.EXCLUDE_DYNAMIC,undefined,p.collider,p.body);
   if(!blocked)candidates.push(point);
  }
  candidates.sort((a,b)=>a.distanceToSquared(p.current)-b.distanceToSquared(p.current));
  return candidates[0];
 }
 step(id:number,p:PhysicsPlayer,dt:number){
  let s=this.states.get(id);if(!s){s={idle:0,under:0,cooldown:0,rescues:0};this.states.set(id,s);}
  s.cooldown=Math.max(0,s.cooldown-dt);
  if(s.flight){
   s.flight.remaining-=dt;const target=s.flight.target,v=p.body.linvel(),distance=Math.hypot(target.x-p.current.x,target.z-p.current.z);
   // Finish the arc gently; normal input can steer during the flight.
   if(p.hasSurfaceSupport()&&pondSubmersion(p.current)<.015){s.flight=undefined;s.cooldown=2;return;}
   if(s.flight.remaining>.1){
    const t=s.flight.remaining,k=Math.min(1,dt*3.5),vx=(target.x-p.current.x)/t,vz=(target.z-p.current.z)/t,vy=T.MathUtils.clamp((target.y-p.current.y)/t+9*t,-8,24);
    p.body.setLinvel({x:v.x+(vx-v.x)*k,y:v.y+(vy-v.y)*k,z:v.z+(vz-v.z)*k},true);
   }
   if(s.flight.remaining<.35&&distance<3&&p.current.y<target.y+2)p.body.setLinvel({x:v.x*.95,y:Math.max(-3,v.y),z:v.z*.95},true);
   if(s.flight.remaining<-.8){
    // Last-resort recovery if another body intercepts the physical launch.
    if(pondSubmersion(p.current)>.015||p.current.distanceTo(target)>6){p.body.setTranslation(target,true);p.body.setLinvel({x:0,y:0,z:0},true);p.sync();p.previous.copy(p.current);}
    s.flight=undefined;s.cooldown=2;
   }
   return;
  }
  const wet=pondSubmersion(p.current),deep=POND.water-heightAt(p.current.x,p.current.z)>1.1;
  if(!deep||wet<.25){s.idle=s.under=0;return;}
  s.idle=Math.hypot(p.body.linvel().x,p.body.linvel().z)<.65?s.idle+dt:0;
  s.under=wet>.97?s.under+dt:0;
  if(s.cooldown>0||(s.idle<3&&s.under<2.4))return;
  const target=this.shore(p);if(!target)return;
  const from=p.current.clone(),distance=Math.hypot(target.x-from.x,target.z-from.z),time=T.MathUtils.clamp(distance/12,1.05,2.2);
  p.setImmobilized(false);p.body.setLinvel({x:(target.x-from.x)/time,y:(target.y-from.y)/time+9*time,z:(target.z-from.z)/time},true);
  s.flight={target,remaining:time};s.idle=s.under=0;s.rescues++;return {from,target};
 }
}
