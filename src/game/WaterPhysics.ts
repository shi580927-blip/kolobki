import type R from '@dimforge/rapier3d-compat';
import {POND,pondDistance} from '../core/terrain';

/** Fraction of a radius-one sphere below a horizontal surface (spherical cap). */
export function submergedFraction(centerY:number,surface:number,radius=1){
 const h=Math.max(0,Math.min(2*radius,surface-centerY+radius));
 return h*h*(3*radius-h)/(4*radius*radius*radius);
}
export function pondSubmersion(position:{x:number;y:number;z:number}){
 return pondDistance(position.x,position.z)<=1?submergedFraction(position.y,POND.water):0;
}
/** Applied after all drive/train controllers and before Rapier's gravity step. */
export function applyPondWater(body:R.RigidBody,dt:number){
 if(!body.isDynamic()||!Number.isFinite(dt)||dt<=0)return 0;
 const wet=pondSubmersion(body.translation());if(wet<=0)return 0;
 const mass=body.mass(),v=body.linvel(),step=Math.min(dt,.05);
 // At rest buoyancy balances gravity with about 62.5% of the sphere submerged.
 // Exponential damping is bounded even for fast impacts, without cancelling gravity.
 const horizontal=1-Math.exp(-4.5*wet*step),vertical=1-Math.exp(-3.5*wet*step);
 body.applyImpulse({x:-v.x*mass*horizontal,y:mass*(18*1.6*wet*step-v.y*vertical),z:-v.z*mass*horizontal},true);
 const angular=body.angvel(),spin=Math.exp(-2*wet*step);
 body.setAngvel({x:angular.x*spin,y:angular.y*spin,z:angular.z*spin},true);
 return wet;
}
