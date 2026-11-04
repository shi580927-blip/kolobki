import * as T from 'three';

export type FacePose='base'|'sly'|'scared';
const sphere=new T.SphereGeometry(1,32,24);
const cap=new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
const paint=(color:number)=>new T.MeshStandardMaterial({color,roughness:.36});
const ink=paint(0x0b0b11),white=paint(0xfffaf4),amber=paint(0x995017),pupil=paint(0x100b0a);
const sparkle=new T.MeshBasicMaterial({color:0xffffff});
function oval(parent:T.Group,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
 const m=new T.Mesh(sphere,material);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;
}
function wedge(side:number){
 const s=new T.Shape();
 s.moveTo(-.31*side,-.045);s.quadraticCurveTo(-.345*side,-.05,-.32*side,.005);
 s.lineTo(.23*side,.18);s.quadraticCurveTo(.27*side,.19,.29*side,.15);
 s.lineTo(.33*side,.025);s.quadraticCurveTo(.33*side,.005,.28*side,.005);s.closePath();
 return new T.ExtrudeGeometry(s,{depth:.055,bevelEnabled:true,bevelThickness:.017,bevelSize:.018,bevelSegments:3,curveSegments:10});
}
const brows=[wedge(-1),wedge(1)];
const smile=new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(-.14,.016,0),new T.Vector3(0,-.072,.023),new T.Vector3(.14,.024,0)),18,.017,8,false);
const mouthInterior=paint(0x44101b),tongue=paint(0xf75668);
export class ModularFace extends T.Group{
 private lidMaterial=paint(0x316de0);
 private eyes=[-1,1].map((side,i)=>{
  const socket=new T.Group();socket.position.set(side*.405,.025,.884);socket.rotation.y=side*.32;this.add(socket);
  oval(socket,ink,0,0,0,.385,.415,.145);
  oval(socket,white,0,0,.014,.371,.397,.149);
  const gaze=new T.Group();socket.add(gaze);
  oval(gaze,amber,0,0,.151,.158,.188,.036);oval(gaze,pupil,0,.014,.185,.107,.143,.022);
  oval(gaze,sparkle,-.041,.086,.205,.038,.038,.014);
  const lids=new T.Group();lids.position.z=.015;lids.scale.set(.385,.413,.219);socket.add(lids);
  const upper=new T.Mesh(cap,this.lidMaterial),lower=new T.Mesh(cap,this.lidMaterial);lower.rotation.z=Math.PI;lids.add(upper,lower);
  const brow=new T.Mesh(brows[i],ink);socket.add(brow);
  return {side,socket,upper,lower,brow,gaze};
 });
 private line=new T.Mesh(smile,ink);
 private openMouth=new T.Group();
 private sly=0;private fear=0;
 constructor(){super();this.name='modular-face-v2';this.line.position.set(0,-.39,.929);this.add(this.line,this.openMouth);
  this.openMouth.position.set(0,-.40,.917);this.openMouth.rotation.x=.37;
  oval(this.openMouth,ink,0,0,0,.206,.168,.035);oval(this.openMouth,mouthInterior,0,0,.015,.19,.15,.033);
  oval(this.openMouth,tongue,0,-.073,.046,.12,.046,.013);
 }
 updatePose(dt:number,pose:FacePose,blink:number,short:boolean,base:string){
  const k=1-Math.exp(-dt*13);
  this.sly+=((pose==='sly'?1:0)-this.sly)*k;this.fear+=((pose==='scared'?1:0)-this.fear)*k;
  this.lidMaterial.color.set(base);
  for(const {side,upper,lower,brow,gaze} of this.eyes){
   const rest=.20+.42*this.sly-.18*this.fear;
   const closure=rest+(1-rest)*blink;
   upper.rotation.x=-(1-closure)*1.52;lower.rotation.x=(1-blink)*1.5;
   gaze.visible=blink<.995;gaze.position.set(-side*.075+this.sly*.062,.022+this.fear*.065,0);
   brow.position.set(0,.245+.13*this.fear+side*.033*this.sly,.145);
   brow.rotation.z=side*(.20-.75*this.fear+side*.13*this.sly);brow.scale.x=short?.79:1;
  }
  this.line.visible=this.fear<.48;this.line.rotation.z=this.sly*.19;
  this.openMouth.visible=!this.line.visible;this.openMouth.scale.setScalar(Math.max(.01,this.fear));
 }
 dispose(){this.lidMaterial.dispose();}
}
