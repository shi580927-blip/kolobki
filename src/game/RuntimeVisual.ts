import * as T from 'three';
import {HeadDecor} from './HeadDecor';
import {SandCoat} from './SandCoat';
import {AnimatedAtlasRig,type AnimationAtlas} from '../face/AnimatedAtlas';
import {SkinSample} from '../skin/SkinSample';
import {limitProtrusions,type SkinDesign} from '../skin/SkinDesign';
import type {Mood} from '../face/FaceState';
import {clipFaceToWater} from './WaterFaceClip';
export class RuntimeFace extends T.Group {
 readonly rig:AnimatedAtlasRig;
 constructor(atlas:AnimationAtlas,textures:T.Texture[],mood:Mood){super();this.rig=new AnimatedAtlasRig(atlas,textures);this.rig.base=mood==='grumpy'?'grumpy':mood==='worried'?'scared':'sly';this.add(this.rig);this.rig.update(0);}
 expression(){return this.rig.expression;}
 get eyes(){const pose=this.rig.poses[this.rig.expression];return pose.children.filter(o=>o.name.startsWith('study-eye-'));}
 play(name:string){if(this.rig.combo.phase==='IDLE')this.rig.play(name);}
 impact(){this.play('dazed');}
 combo(){if(this.rig.combo.phase==='IDLE')this.rig.playCombo();}
 update(dt:number,heading:number){this.rotation.y=heading;this.rig.update(dt);}
 get immobilized(){return this.rig.combo.stop;}
 get rocking(){const c=this.rig.combo;if(c.phase==='DIZZY')return Math.sin(this.rig.time*8)*.075;if(c.phase==='RECOVER')return Math.sin(this.rig.time*8)*.075*(1-T.MathUtils.clamp((c.elapsed-c.orbit-c.dizzy)/c.recover,0,1));return 0;}
}
export class RuntimeVisual extends T.Group {
 readonly sandCoat=new SandCoat();decorations:HeadDecor;
 readonly rollingBody:T.Group;readonly face:RuntimeFace;private sample:SkinSample;private clearanceOrientation=new T.Quaternion();
 constructor(readonly design:SkinDesign,atlas:AnimationAtlas,textures:T.Texture[],mood:Mood,environment?:T.Texture){super();this.decorations=new HeadDecor(design.seed,design.base);this.add(this.decorations);this.design=limitProtrusions(design);design=this.design;this.sample=new SkinSample(textures[0],'sly',environment);this.sample.face.visible=false;this.sample.apply(design);this.rollingBody=this.sample.rollingBody;this.face=new RuntimeFace(atlas,textures,mood);this.add(this.sample,this.face,this.sandCoat);clipFaceToWater(this.face);}
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
  this.decorations.dispose();this.sample.dispose();this.face.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  this.sandCoat.geometry.dispose();(this.sandCoat.material as T.Material).dispose();
 }
}
