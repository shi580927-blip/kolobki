import {gardenPoint} from './FruitGardens';
import * as T from 'three';
import {BerryArt,berryPlacement} from './BerryArt';
import {abilityFruit} from './AbilityArt';
import {heightAt} from '../core/terrain';
import type {AbilityKind} from './AbilityModel';
import type {EventBus} from '../core/events';
/** Ordinary berries for the first rolling test; ability fruit is a later task. */
export class BerryCollectibles {
 readonly total:number;count=0;readonly items:{mesh:T.Group;collected:boolean;regrow:number}[]=[];
 readonly powers:{kind:AbilityKind;mesh:T.Group;respawn:number}[]=[];
 private segment=new T.Vector3();private offset=new T.Vector3();private closest=new T.Vector3();
 constructor(scene:T.Scene,private bus:EventBus,environment?:T.Texture,enabled=true,private takePower?:(kind:AbilityKind)=>boolean){
  this.total=enabled?36:0;if(!enabled)return;
  const art=new BerryArt(environment),placements=Array.from({length:this.total},(_,i)=>berryPlacement(i));
  art.plants(scene,placements);
  if(takePower){const points:[AbilityKind,number,number][]=[['pepper',-3.5,8],['lemon',4,14],['bomb',-5,23]];
   for(const garden of [1,2])for(let i=0;i<5;i++){const p=gardenPoint(garden,i+8);points.push([garden===2&&i===4?'pepper':'lemon',p.x,p.z]);}
   this.plantOrchard(scene);for(const [kind,x,z] of points){const group=abilityFruit(kind);group.position.set(x,heightAt(x,z)+.7,z);scene.add(group);this.powers.push({kind,mesh:group,respawn:0});}}
  placements.forEach((p,i)=>{const group=art.fruit(721+i);group.position.set(p.x,p.centerY,p.z);group.rotation.y=i*1.7;group.name='berry-'+i;group.userData.onPlant=p.onPlant;scene.add(group);this.items.push({mesh:group,collected:false,regrow:0});});
 }

 private plantOrchard(scene:T.Scene){
  const trunk=new T.CylinderGeometry(.10,.19,2.3,7),crown=new T.SphereGeometry(1,20,14),wood=new T.MeshStandardMaterial({color:'#986b46',roughness:.95}),leaves=new T.MeshStandardMaterial({color:'#70b84d',roughness:.9});
  for(const garden of [1,2])for(let i=0;i<5;i++){
   const p=gardenPoint(garden,i+8),y=heightAt(p.x+1.7,p.z),x=p.x+1.7;
   const stem=new T.Mesh(trunk,wood);stem.position.set(x,y+1.15,p.z);stem.castShadow=true;scene.add(stem);
   for(let j=0;j<3;j++){const canopy=new T.Mesh(crown,leaves);canopy.position.set(x+Math.cos(j*2.4)*.55,y+2.6+(j===0?.4:0),p.z+Math.sin(j*2.4)*.55);canopy.scale.set(1.15,1.05,1.15);canopy.castShadow=canopy.receiveShadow=true;scene.add(canopy);}
  }
 }
 nibbles=0;
 snackTargets(){return this.items.flatMap((b,id)=>!b.collected&&b.regrow===0?[{id,x:b.mesh.position.x,z:b.mesh.position.z}]:[]);}
 nibble(id:number){const b=this.items[id];if(!b||b.collected||b.regrow>0)return false;b.regrow=12;b.mesh.visible=false;this.nibbles++;return true;}
 step(dt:number){for(const b of this.items)if(b.regrow>0){b.regrow=Math.max(0,b.regrow-dt);if(b.regrow===0&&!b.collected)b.mesh.visible=true;}for(const p of this.powers){if(p.respawn>0){p.respawn=Math.max(0,p.respawn-dt);if(p.respawn===0)p.mesh.visible=true;}p.mesh.rotation.y+=dt*.35;}}
 checkSegment(from:T.Vector3,to:T.Vector3){for(const p of this.powers){if(p.respawn>0)continue;const delta=to.clone().sub(from),length=delta.lengthSq(),t=length?T.MathUtils.clamp(p.mesh.position.clone().sub(from).dot(delta)/length,0,1):0;if(from.clone().addScaledVector(delta,t).distanceToSquared(p.mesh.position)<1.65**2&&this.takePower?.(p.kind)){p.respawn=18;p.mesh.visible=false;this.bus.emit('power_pickup',{kind:p.kind,position:p.mesh.position.clone()});}}this.segment.subVectors(to,from);const length=this.segment.lengthSq();for(const item of this.items){if(item.collected||item.regrow>0)continue;const t=length?T.MathUtils.clamp(this.offset.subVectors(item.mesh.position,from).dot(this.segment)/length,0,1):0;this.closest.copy(from).addScaledVector(this.segment,t);if(this.closest.distanceToSquared(item.mesh.position)>1.45**2)continue;item.collected=true;item.mesh.visible=false;this.count++;this.bus.emit('berry_pickup',{position:item.mesh.position.clone(),count:this.count,total:this.total});}}
 reset(){this.count=0;this.nibbles=0;for(const p of this.powers){p.respawn=0;p.mesh.visible=true;}this.items.forEach(b=>{b.collected=false;b.regrow=0;b.mesh.visible=true;});}
}
