import * as T from 'three';
import {AnimatedAtlasRig,type AnimationAtlas} from '../face/AnimatedAtlas';
import {SkinSample} from '../skin/SkinSample';
import type {SkinDesign} from '../skin/SkinDesign';
import type {Mood} from '../face/FaceState';
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
 readonly rollingBody:T.Group;readonly face:RuntimeFace;private sample:SkinSample;
 constructor(readonly design:SkinDesign,atlas:AnimationAtlas,textures:T.Texture[],mood:Mood,environment?:T.Texture){super();this.sample=new SkinSample(textures[0],'sly',environment);this.sample.face.visible=false;this.sample.apply(design);this.rollingBody=this.sample.rollingBody;this.face=new RuntimeFace(atlas,textures,mood);this.add(this.sample,this.face);}
 updateDecorations(){this.sample.syncDecorations();this.rotation.z=this.face.rocking;}
}
