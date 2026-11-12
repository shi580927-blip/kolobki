import {BodyDecoration} from '../cosmetics/BodyDecoration';
import * as T from 'three';
import {HeadDecor} from './HeadDecor';
import {SandCoat} from './SandCoat';
import {AnimatedAtlasRig,type AnimationAtlas} from '../face/AnimatedAtlas';
import {SkinSample} from '../skin/SkinSample';
import {limitProtrusions,type SkinDesign} from '../skin/SkinDesign';
import type {Mood} from '../face/FaceState';
import {clipFaceToWater} from './WaterFaceClip';
import {SketchFace} from '../face/SketchFace';
export class RuntimeFace extends T.Group {
 readonly rig:AnimatedAtlasRig;
 experimentalFace?:SketchFace;
 constructor(atlas:AnimationAtlas,textures:T.Texture[],mood:Mood,private readonly color='#cc3333',private readonly environment?:T.Texture,private readonly experimental=false){super();this.rig=new AnimatedAtlasRig(atlas,textures);this.rig.base=mood==='grumpy'?'grumpy':mood==='worried'?'scared':'sly';this.add(this.rig);this.rig.update(0);if(experimental){this.experimentalFace=new SketchFace(environment);this.add(this.experimentalFace);this.rig.visible=false;}}
 setSkull(enabled:boolean){
  if(enabled&&!this.experimentalFace){
   this.experimentalFace=new SketchFace(this.environment);
   clipFaceToWater(this.experimentalFace);
   this.add(this.experimentalFace);
  }
  if(this.experimentalFace){
   this.experimentalFace.visible=enabled||this.experimental;
   this.experimentalFace.paintedLids=enabled;
   this.rig.visible=!this.experimentalFace.visible;
  }
 }
 expression(){return this.rig.expression;}
 get eyes(){const pose=this.rig.poses[this.rig.expression];return pose.children.filter(o=>o.name.startsWith('study-eye-'));}
 play(name:string){if(this.rig.combo.phase==='IDLE')this.rig.play(name);}
 impact(){this.experimentalFace?.impact();this.play('dazed');}
 combo(){if(this.rig.combo.phase==='IDLE')this.rig.playCombo();}
 update(dt:number,heading:number){this.rotation.y=heading;this.rig.update(dt);if(this.experimentalFace?.visible){const names:Record<string,string>={neutral:'neutral',sly:'neutral',grumpy:'angry',fury:'attack',happy:'smile',scared:'frightened',shocked:'surprised',proud:'content',dizzy:'stunned',knockout:'stunned',unhinged:'frightened',sleepy:'sleeping',dazed:'stunned'};const expression=this.rig.expression,pose=names[expression]??'neutral';const blink=pose==='stunned'?0:pose==='sleeping'?1:this.rig.blink;this.experimentalFace.updatePose(dt,pose,blink,false,this.color,true);this.experimentalFace.rotation.x=this.rig.combo.phase==='ORBIT'?this.rig.combo.angle:0;}}
 get immobilized(){return this.rig.combo.stop;}
 get rocking(){const c=this.rig.combo;if(c.phase==='DIZZY')return Math.sin(this.rig.time*8)*.075;if(c.phase==='RECOVER')return Math.sin(this.rig.time*8)*.075*(1-T.MathUtils.clamp((c.elapsed-c.orbit-c.dizzy)/c.recover,0,1));return 0;}
}
export class RuntimeVisual extends T.Group {
 readonly sandCoat=new SandCoat();decorations:HeadDecor;
 readonly rollingBody:T.Group;readonly face:RuntimeFace;private sample:SkinSample;private clearanceOrientation=new T.Quaternion();
 constructor(readonly design:SkinDesign,atlas:AnimationAtlas,textures:T.Texture[],mood:Mood,environment?:T.Texture,experimentalFace=false){super();this.decorations=new HeadDecor(design.seed,design.base);this.add(this.decorations);this.design=limitProtrusions(design);design=this.design;this.sample=new SkinSample(textures[0],'sly',environment);this.sample.face.visible=false;this.sample.apply(design);this.rollingBody=this.sample.rollingBody;this.face=new RuntimeFace(atlas,textures,mood,design.base,environment,experimentalFace);this.add(this.sample,this.face,this.sandCoat);clipFaceToWater(this.face);}
 private skullPaint?:BodyDecoration;
 setSkull(enabled:boolean){
  this.face.setSkull(enabled);
  if(enabled&&!this.skullPaint){
   this.skullPaint=new BodyDecoration();
   this.skullPaint.setTattoo({id:'skull',color:'#ffffff',u:.25,v:.5,scale:1,excludeFace:false});
   this.face.add(this.skullPaint);
  }
  if(this.skullPaint)this.skullPaint.visible=enabled;
 }
 setOutfit(outfit:HeadDecor['style']){
  this.remove(this.decorations);this.decorations.dispose();
  this.decorations=new HeadDecor(this.design.seed,this.design.base,outfit);this.add(this.decorations);this.updateDecorations();
 }
 updateSand(sand:number,wetness:number){this.sandCoat.update(sand,this.rollingBody.quaternion,this.clearanceOrientation,wetness);}
 updateDecorations(){
  this.decorations.update(this.face.rotation.y);
  const pose=this.face.rig.poses[this.face.expression()];
  this.clearanceOrientation.copy(this.face.quaternion).multiply(this.face.rig.quaternion).multiply(pose.quaternion);
  this.sample.syncDecorations(this.clearanceOrientation);this.rotation.z=this.face.rocking;
 }
 dispose(){
  if(this.skullPaint){this.face.remove(this.skullPaint);this.skullPaint.dispose();}
  this.decorations.dispose();this.sample.dispose();this.face.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  this.sandCoat.geometry.dispose();(this.sandCoat.material as T.Material).dispose();
 }
}
