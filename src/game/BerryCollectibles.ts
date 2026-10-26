import * as T from 'three';
import {BerryArt,berryPlacement} from './BerryArt';
import type {EventBus} from '../core/events';
/** Ordinary berries for the first rolling test; ability fruit is a later task. */
export class BerryCollectibles {
 readonly total=12;count=0;readonly items:{mesh:T.Group;collected:boolean}[]=[];
 private segment=new T.Vector3();private offset=new T.Vector3();private closest=new T.Vector3();
 constructor(scene:T.Scene,private bus:EventBus,environment?:T.Texture){
  const art=new BerryArt(environment),placements=Array.from({length:this.total},(_,i)=>berryPlacement(i));
  art.plants(scene,placements);
  placements.forEach((p,i)=>{const group=art.fruit(721+i);group.position.set(p.x,p.centerY,p.z);group.rotation.y=i*1.7;group.name='berry-'+i;group.userData.onPlant=p.onPlant;scene.add(group);this.items.push({mesh:group,collected:false});});
 }

 checkSegment(from:T.Vector3,to:T.Vector3){this.segment.subVectors(to,from);const length=this.segment.lengthSq();for(const item of this.items){if(item.collected)continue;const t=length?T.MathUtils.clamp(this.offset.subVectors(item.mesh.position,from).dot(this.segment)/length,0,1):0;this.closest.copy(from).addScaledVector(this.segment,t);if(this.closest.distanceToSquared(item.mesh.position)>1.45**2)continue;item.collected=true;item.mesh.visible=false;this.count++;this.bus.emit('berry_pickup',{position:item.mesh.position.clone(),count:this.count,total:this.total});}}
 reset(){this.count=0;this.items.forEach(b=>{b.collected=false;b.mesh.visible=true;});}
}
