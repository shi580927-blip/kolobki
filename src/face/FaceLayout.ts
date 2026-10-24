import * as T from 'three';
import type {StudyFaceRig,StudyExpression} from './StudyFaceRig';
export const PART_KEYS=['study-brow-0','study-brow-1','study-eye-0','study-eye-1','study-mouth'] as const;
export type PartKey=typeof PART_KEYS[number];
export interface PartLayout {x:number;y:number;width:number;height:number;angle:number}
export type FaceLayout=Record<PartKey,PartLayout>;
export interface FaceLayoutFile {format:'sharobesy-face-layout';version:1;atlas:'three-expressions';faces:Record<StudyExpression,FaceLayout>}
export function readLayout(face:StudyFaceRig):FaceLayout {
 return Object.fromEntries(PART_KEYS.map(k=>[k,{...face.getObjectByName(k)!.userData.layout}])) as FaceLayout;
}
export function validateLayoutFile(value:unknown):FaceLayoutFile {
 const f=value as FaceLayoutFile;
 if(!f||f.format!=='sharobesy-face-layout'||f.version!==1||f.atlas!=='three-expressions')throw Error('Нужен JSON из этого редактора.');
 const faces={} as FaceLayoutFile['faces'];
 for(const exp of ['sly','happy','grumpy'] as const){
  const layout={} as FaceLayout;
  for(const key of PART_KEYS){
   const p=f.faces?.[exp]?.[key];
   if(!p||!['x','y','width','height','angle'].every(k=>Number.isFinite(p[k as keyof PartLayout]))||Math.abs(p.x)>1.5||Math.abs(p.y)>1.5||p.width<.03||p.width>3||p.height<.03||p.height>3||Math.abs(p.angle)>Math.PI*2)throw Error('Некорректные размеры или координаты.');
   layout[key]={x:p.x,y:p.y,width:p.width,height:p.height,angle:p.angle};
  }faces[exp]=layout;
 }return {format:'sharobesy-face-layout',version:1,atlas:'three-expressions',faces};
}
export function applyLayout(face:StudyFaceRig,layout:FaceLayout){
 for(const key of PART_KEYS){
  const mesh=face.getObjectByName(key) as T.Mesh<T.BufferGeometry,T.ShaderMaterial>,p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,l=layout[key];
  const c=Math.cos(l.angle),s=Math.sin(l.angle);
  for(let i=0;i<p.count;i++){
   const u=(uv.getX(i)-.5)*l.width,v=(uv.getY(i)-.5)*l.height,x=l.x+u*c-v*s,y=l.y+u*s+v*c;
   p.setXYZ(i,x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+.025);
  }
  p.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.userData.layout={...l};
  if(key.startsWith('study-eye-')) {
   const lid=face.lids[Number(key.slice(-1))];
   if(lid) {
    const points=Array.from({length:21},(_,j)=>{
     const u=(j/20-.5)*l.width*.85,v=-l.height*.10-.035*Math.sin(j/20*Math.PI),
       x=l.x+u*c-v*s,y=l.y+u*s+v*c;
     return new T.Vector3(x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+.036);
    });
    lid.geometry.dispose();lid.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.014,6,false);
   }
  }
 }
}
