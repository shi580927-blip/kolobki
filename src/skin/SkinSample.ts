import * as T from 'three';
import {StudyFaceRig,type StudyExpression} from '../face/StudyFaceRig';
import {growthLayout,type SkinDesign} from './SkinDesign';
import {makePatternTexture} from './SkinTextures';
import {makeCellGeometry} from './SurfaceCells';
import {applyTipColors} from './TipColors';
import {FurTufts} from './FurTufts';
import {applyLayout,readLayout,scaleLayoutAboutCenter} from '../face/FaceLayout';
export const SKIN_STUDY_FACE_SCALE=.9;
export class SkinSample extends T.Group {
 readonly rollingBody=new T.Group();readonly face:StudyFaceRig;
 private fur:FurTufts|null=null;
 private cells:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>|null=null;
 private body:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;
 private growths:T.InstancedMesh<T.BufferGeometry,T.MeshStandardMaterial>|null=null;
 private layouts:ReturnType<typeof growthLayout>=[];
 private dummy=new T.Object3D();private dir=new T.Vector3();private worldDir=new T.Vector3();private axis=new T.Vector3(0,1,0);private q=new T.Quaternion();
 private angle=0;
 constructor(readonly faceTexture:T.Texture,expression:StudyExpression='sly',readonly glossEnvironment?:T.Texture){
  super();this.body=new T.Mesh(new T.SphereGeometry(1,80,56),new T.MeshPhysicalMaterial({roughness:.55,metalness:0}));this.body.castShadow=true;this.body.receiveShadow=true;this.rollingBody.add(this.body);this.add(this.rollingBody);this.face=new StudyFaceRig(faceTexture,expression);applyLayout(this.face,scaleLayoutAboutCenter(readLayout(this.face),SKIN_STUDY_FACE_SCALE));this.add(this.face);
 }
 apply(d:SkinDesign){const material=this.body.material;material.map?.dispose();material.map=d.surface==='smooth'?makePatternTexture(d):null;material.color.set(d.surface==='smooth'?'#ffffff':d.base);const gloss=d.surface==='smooth'&&d.growthCount===0?d.gloss:0;material.roughness=.62-gloss*.43;const physical=material as T.MeshPhysicalMaterial;physical.envMap=gloss>0?(this.glossEnvironment??null):null;physical.envMapIntensity=.65;physical.clearcoat=gloss;physical.clearcoatRoughness=.18;material.needsUpdate=true;
  if(this.cells){this.rollingBody.remove(this.cells);this.cells.geometry.dispose();this.cells.material.dispose();this.cells=null;}
  if(this.fur){this.rollingBody.remove(this.fur);this.fur.release();this.fur=null;}
  this.body.scale.setScalar(1);
  if(d.surface==='scales'||d.surface==='segments'){const geometry=makeCellGeometry(d),mat=new T.MeshStandardMaterial({color:d.base,roughness:.53});this.cells=new T.Mesh(geometry,mat);this.cells.castShadow=true;this.cells.receiveShadow=true;this.rollingBody.add(this.cells);this.body.scale.setScalar(geometry.userData.coreRadius);}
  if(d.surface==='fuzz'||d.surface==='shaggy'){this.fur=new FurTufts(d);this.rollingBody.add(this.fur);}
  if(this.growths){this.rollingBody.remove(this.growths);this.growths.geometry.dispose();this.growths.material.dispose();this.growths.dispose();this.growths=null;}
  this.layouts=growthLayout(d);
  if(this.layouts.length){const points=d.growthShape==='soft'?[new T.Vector2(0,0),new T.Vector2(.47,.03),new T.Vector2(.50,.17),new T.Vector2(.40,.47),new T.Vector2(.22,.80),new T.Vector2(.08,.96),new T.Vector2(0,1)]:[new T.Vector2(0,0),new T.Vector2(.42,.02),new T.Vector2(.40,.12),new T.Vector2(.20,.65),new T.Vector2(.045,.96),new T.Vector2(0,1)];
   const geo=new T.LatheGeometry(points,12);applyTipColors(geo,d.base,d.growthAccent?d.accent:d.base,i=>T.MathUtils.smoothstep(geo.attributes.position.getY(i),.5,.97));const mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.55,vertexColors:true});this.growths=new T.InstancedMesh(geo,mat,this.layouts.length);this.growths.castShadow=true;this.growths.frustumCulled=false;this.rollingBody.add(this.growths);
  }this.update(0,false);
 }
 update(dt:number,rolling:boolean){if(rolling)this.angle+=dt*.65;this.rollingBody.rotation.set(this.angle,0,this.angle*.22);this.syncDecorations();}
 syncDecorations(){this.q.copy(this.rollingBody.quaternion);this.fur?.updateTufts(this.q);
  if(this.growths){this.layouts.forEach((p,i)=>{this.dir.fromArray(p.direction);const world=this.worldDir.copy(this.dir).applyQuaternion(this.q);
   // A soft clearance around the independent face prevents organs being buried.
   const clearance=1-T.MathUtils.smoothstep(world.z,.54,.84)*(1-T.MathUtils.smoothstep(Math.abs(world.y),.63,.88));
   const size=p.size*clearance;this.dummy.position.copy(this.dir).multiplyScalar(.985);this.dummy.quaternion.setFromUnitVectors(this.axis,this.dir);this.dummy.scale.set(size*1.5,size,size*1.5);this.dummy.updateMatrix();this.growths!.setMatrixAt(i,this.dummy.matrix);
  });this.growths.instanceMatrix.needsUpdate=true;}
 }
 get furInstances(){return this.fur?.count??0;}
 get cellCount(){return this.cells?.geometry.userData.cells.length??0;}
 get rotationAngle(){return this.angle;}
 get growthInstances(){return this.growths?.count??0;}
 dispose(){this.fur?.release();if(this.cells){this.cells.geometry.dispose();this.cells.material.dispose();}this.body.geometry.dispose();this.body.material.map?.dispose();this.body.material.bumpMap?.dispose();this.body.material.dispose();if(this.growths){this.growths.geometry.dispose();this.growths.material.dispose();this.growths.dispose();}this.face.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}
