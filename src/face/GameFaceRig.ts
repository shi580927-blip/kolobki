import * as T from 'three';
import {StudyFaceRig,type StudyExpression} from './StudyFaceRig';
import {FaceState} from './FaceState';
import type {Expression} from './FaceRig';
import {readLayout} from './FaceLayout';
export async function loadGameFaceTexture(){
 const texture=await new T.TextureLoader().loadAsync(import.meta.env.BASE_URL+'assets/face/study/three-expressions.webp');
 texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;return texture;
}
/** Approved sprite poses share the original gameplay state, never the rolling-body quaternion. */
export class GameFaceRig extends T.Group {
 readonly poses:Record<StudyExpression,StudyFaceRig>;
 readonly stunMarks:Record<StudyExpression,T.Group>;
 reviewExpression:Expression|null=null;
 private unhinged=0;
 constructor(readonly state:FaceState,texture:T.Texture){
  super();this.poses={} as Record<StudyExpression,StudyFaceRig>;this.stunMarks={} as Record<StudyExpression,T.Group>;
  for(const exp of ['sly','happy','grumpy'] as const){
   const pose=new StudyFaceRig(texture,exp);this.poses[exp]=pose;this.add(pose);
   const marks=new T.Group(),layout=readLayout(pose);
   for(let i=0;i<2;i++){
    const l=layout[i===0?'study-eye-0':'study-eye-1'];
    const surface=(x:number,y:number,z:number)=>new T.Vector3(x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+z);
    const white=new T.CircleGeometry(1,32),p=white.attributes.position;
    for(let j=0;j<p.count;j++){const v=surface(l.x+p.getX(j)*l.width*.31,l.y+p.getY(j)*l.height*.32,.027);p.setXYZ(j,v.x,v.y,v.z);}
    const disc=new T.Mesh(white,new T.MeshBasicMaterial({color:0xfff5de,transparent:true,depthWrite:false}));disc.renderOrder=10;marks.add(disc);
    for(const sign of [-1,1]){
     const points=Array.from({length:13},(_,j)=>{const t=j/12-.5;return surface(l.x+t*l.width*.43,l.y+sign*t*l.height*.44,.04);});
     const cross=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.018,6,false),new T.MeshBasicMaterial({color:0x2c1816,transparent:true,depthWrite:false}));cross.renderOrder=20;marks.add(cross);
    }
   }
   pose.add(marks);marks.visible=false;this.stunMarks[exp]=marks;
  }
  this.update(0,0);
 }
 private base():StudyExpression{return this.state.baseMood==='grumpy'?'grumpy':this.state.baseMood==='worried'?'happy':'sly';}
 expression():StudyExpression|'stunned'{
  if(this.state.stun>0)return 'stunned';
  if(this.state.reaction&&this.state.weight>.2)return this.state.reaction==='rage'?'grumpy':'happy';
  return this.base();
 }
 get eyes(){return this.poses[this.currentPose()].eyeParts;}
 private currentPose():StudyExpression{const e=this.expression();return e==='stunned'?this.base():e;}
 impact(){this.unhinged=.85;}
 update(dt:number,heading:number){
  this.unhinged=Math.max(0,this.unhinged-dt);
  const t=this.state.time,u=this.unhinged;
  this.rotation.set(u?Math.sin(t*29)*u*.35:0,heading+(u?Math.sin(t*22)*u*.75:0),u?Math.sin(t*35)*u*.5:0);
  const current=this.currentPose(),stunned=this.state.stun>0;
  for(const exp of ['sly','happy','grumpy'] as const){
   const pose=this.poses[exp];pose.visible=exp===current;if(!pose.visible)continue;
   pose.update(dt,stunned?0:this.state.blink);this.stunMarks[exp].visible=stunned;
   if(stunned){pose.eyeParts.forEach(e=>e.visible=false);pose.lids.forEach(l=>l.visible=false);}
  }
 }
}
