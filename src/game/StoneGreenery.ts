import * as T from 'three';
import {makeLeafGeometry} from './BerryArt';

/** A few broad leaves on real ledges. One instance batch, no grass cards or colliders. */
export function addStoneGreenery(stone:T.Mesh,candidates:readonly {x:number;z:number}[]){
 stone.updateMatrixWorld(true);
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),anchors:T.Vector3[]=[];
 for(const p of candidates){
  ray.set(new T.Vector3(p.x,120,p.z),down);
  const hit=ray.intersectObject(stone,false)[0];
  if(!hit||anchors.some(a=>a.distanceToSquared(hit.point)<36))continue;
  const normal=hit.face!.normal.clone().transformDirection(stone.matrixWorld);
  if(normal.y<.45)continue;
  anchors.push(hit.point.clone().addScaledVector(normal,.035));
 }
 const leaves=new T.InstancedMesh(makeLeafGeometry(6,2),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.85}),anchors.length*5);
 const dummy=new T.Object3D(),axis=new T.Vector3(0,0,1),inverse=stone.matrixWorld.clone().invert(),local=new T.Matrix4();
 anchors.forEach((p,i)=>{
  for(let j=0;j<5;j++){
   const a=j*2.39996+i*1.3,size=.45+((i*7+j*3)%5)*.055;
   dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),j===4?-.3:.12+j*.05,Math.sin(a)).normalize());
   dummy.scale.set(size*1.2,size,size);dummy.updateMatrix();local.multiplyMatrices(inverse,dummy.matrix);leaves.setMatrixAt(i*5+j,local);
  }
 });
 leaves.name=stone.name+'-ledge-leaves';leaves.receiveShadow=true;stone.add(leaves);return leaves;
}
