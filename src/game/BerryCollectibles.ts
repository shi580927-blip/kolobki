import * as T from 'three';
import {heightAt} from '../core/terrain';
import type {EventBus} from '../core/events';
/** Ordinary berries for the first rolling test; ability fruit is a later task. */
export class BerryCollectibles {
 readonly total=12;count=0;readonly items:{mesh:T.Group;collected:boolean}[]=[];
 private segment=new T.Vector3();private offset=new T.Vector3();private closest=new T.Vector3();
 constructor(scene:T.Scene,private bus:EventBus){const berryGeometry=new T.SphereGeometry(.24,10,8),berryMaterial=new T.MeshStandardMaterial({color:'#6549bc',roughness:.38}),leafGeometry=new T.SphereGeometry(.18,6,4),leafMaterial=new T.MeshStandardMaterial({color:'#538949',roughness:.85});
  for(let i=0;i<this.total;i++){const x=i===0?0:Math.sin(i*.9)*28,z=5+i*4,group=new T.Group();group.position.set(x,heightAt(x,z)+.8,z);group.name='berry-'+i;
   for(const [px,py,pz] of [[-.18,.1,0],[.18,.1,0],[0,.13,.2],[0,-.15,0],[0,.33,0]]){const m=new T.Mesh(berryGeometry,berryMaterial);m.position.set(px,py,pz);m.castShadow=true;group.add(m);}const leaf=new T.Mesh(leafGeometry,leafMaterial);leaf.position.set(.12,.58,0);leaf.scale.set(1.6,.3,.65);leaf.rotation.z=.4;group.add(leaf);scene.add(group);this.items.push({mesh:group,collected:false});}
 }
 checkSegment(from:T.Vector3,to:T.Vector3){this.segment.subVectors(to,from);const length=this.segment.lengthSq();for(const item of this.items){if(item.collected)continue;const t=length?T.MathUtils.clamp(this.offset.subVectors(item.mesh.position,from).dot(this.segment)/length,0,1):0;this.closest.copy(from).addScaledVector(this.segment,t);if(this.closest.distanceToSquared(item.mesh.position)>1.45**2)continue;item.collected=true;item.mesh.visible=false;this.count++;this.bus.emit('berry_pickup',{position:item.mesh.position.clone(),count:this.count,total:this.total});}}
 reset(){this.count=0;this.items.forEach(b=>{b.collected=false;b.mesh.visible=true;});}
}
