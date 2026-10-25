import * as T from 'three';
import {StudyFaceRig,type StudyExpression} from '../face/StudyFaceRig';
import {growthLayout,type SkinDesign} from './SkinDesign';
import {makePatternTexture,makeSurfaceTexture} from './SkinTextures';
export class SkinSample extends T.Group {
 readonly rollingBody=new T.Group();readonly face:StudyFaceRig;
 private body:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;
 private growths:T.InstancedMesh<T.BufferGeometry,T.MeshStandardMaterial>|null=null;
 private layouts:ReturnType<typeof growthLayout>=[];
 private dummy=new T.Object3D();private dir=new T.Vector3();private worldDir=new T.Vector3();private axis=new T.Vector3(0,1,0);private q=new T.Quaternion();
 private angle=0;
 constructor(readonly faceTexture:T.Texture,expression:StudyExpression='sly'){
  super();this.body=new T.Mesh(new T.SphereGeometry(1,192,128),new T.MeshStandardMaterial({roughness:.55,metalness:0}));this.body.castShadow=true;this.body.receiveShadow=true;this.rollingBody.add(this.body);this.add(this.rollingBody);this.face=new StudyFaceRig(faceTexture,expression);this.add(this.face);
 }
 apply(d:SkinDesign){const material=this.body.material;material.map?.dispose();material.bumpMap?.dispose();material.map=makePatternTexture(d);material.bumpMap=d.surface==='smooth'?null:makeSurfaceTexture(d);material.bumpScale=d.relief*4;material.displacementMap=material.bumpMap;material.displacementScale=d.surface==='smooth'?0:d.relief;material.displacementBias=d.surface==='smooth'?0:-d.relief;material.needsUpdate=true;
  if(this.growths){this.rollingBody.remove(this.growths);this.growths.geometry.dispose();this.growths.material.dispose();this.growths.dispose();this.growths=null;}
  this.layouts=growthLayout(d);
  if(this.layouts.length){const points=d.growthShape==='soft'?[new T.Vector2(0,0),new T.Vector2(.47,.03),new T.Vector2(.50,.17),new T.Vector2(.40,.47),new T.Vector2(.22,.80),new T.Vector2(.08,.96),new T.Vector2(0,1)]:[new T.Vector2(0,0),new T.Vector2(.42,.02),new T.Vector2(.40,.12),new T.Vector2(.20,.65),new T.Vector2(.045,.96),new T.Vector2(0,1)];
   const geo=new T.LatheGeometry(points,12),mat=new T.MeshStandardMaterial({color:d.growthAccent?d.accent:d.base,roughness:.55});this.growths=new T.InstancedMesh(geo,mat,this.layouts.length);this.growths.castShadow=true;this.growths.frustumCulled=false;this.rollingBody.add(this.growths);
  }this.update(0,false);
 }
 update(dt:number,rolling:boolean){if(rolling)this.angle+=dt*.65;this.rollingBody.rotation.set(this.angle,0,this.angle*.22);this.q.copy(this.rollingBody.quaternion);
  if(this.growths){this.layouts.forEach((p,i)=>{this.dir.fromArray(p.direction);const world=this.worldDir.copy(this.dir).applyQuaternion(this.q);
   // A soft clearance around the independent face prevents organs being buried.
   const clearance=1-T.MathUtils.smoothstep(world.z,.54,.84)*(1-T.MathUtils.smoothstep(Math.abs(world.y),.63,.88));
   const size=p.size*clearance;this.dummy.position.copy(this.dir).multiplyScalar(.985);this.dummy.quaternion.setFromUnitVectors(this.axis,this.dir);this.dummy.scale.set(size*1.5,size,size*1.5);this.dummy.updateMatrix();this.growths!.setMatrixAt(i,this.dummy.matrix);
  });this.growths.instanceMatrix.needsUpdate=true;}
 }
 get rotationAngle(){return this.angle;}
 get growthInstances(){return this.growths?.count??0;}
 dispose(){this.body.geometry.dispose();this.body.material.map?.dispose();this.body.material.bumpMap?.dispose();this.body.material.dispose();if(this.growths){this.growths.geometry.dispose();this.growths.material.dispose();this.growths.dispose();}this.face.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}
