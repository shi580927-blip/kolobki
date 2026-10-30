import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {VALLEY_CLEARINGS,nearestExplorationPath} from '../core/valleyExploration';
import {nearestRoutePoint} from '../core/valleyRoute';
import {heightAt,pondDistance} from '../core/terrain';
import {makeBoulderGeometry} from './BoulderGeometry';
import {stoneMaterial} from './StoneArt';

/** Low warm rock gardens mark the outer clearings without fencing in the paths. */
export function valleyLandmarkLayout(){
 const rocks:{x:number;z:number;size:number;variant:number;angle:number}[]=[];
 for(const [zone,c] of VALLEY_CLEARINGS.entries())for(let i=0;i<5;i++){
  const a=zone*1.7+.6+(i-2)*.15,r=c.radius*(.79+(i%2)*.16),x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r,size=i===2?2.8:1.0+(i%3)*.6;
  if(nearestRoutePoint(x,z).distance<size+11||nearestExplorationPath(x,z).distance<size+5||pondDistance(x,z)<1.65)continue;
  rocks.push({x,z,size,variant:i,angle:a});
 }
 return rocks;
}
export function addValleyLandmarks(scene:T.Scene,world:R.World){
 const layout=valleyLandmarkLayout(),dummy=new T.Object3D(),material=stoneMaterial();
 for(let variant=0;variant<5;variant++){
  const points=layout.filter(p=>p.variant===variant),geometry=makeBoulderGeometry(variant);
  const mesh=new T.InstancedMesh(geometry,material,points.length);mesh.name='valley-clearing-rocks-'+variant;mesh.castShadow=mesh.receiveShadow=true;
  points.forEach((p,i)=>{
   dummy.position.set(p.x,heightAt(p.x,p.z)+p.size*.48,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.size,p.size,p.size*.85);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   const transform=new T.Matrix4().compose(new T.Vector3(),dummy.quaternion,dummy.scale);
   const g=geometry.clone().applyMatrix4(transform),vertices=g.getAttribute('position').array as Float32Array;
   const collider=R.ColliderDesc.convexHull(vertices);if(!collider)throw new Error('Invalid valley rock hull');
   world.createCollider(collider.setTranslation(dummy.position.x,dummy.position.y,dummy.position.z).setFriction(.9));g.dispose();
  });scene.add(mesh);
 }
 return layout.length;
}
