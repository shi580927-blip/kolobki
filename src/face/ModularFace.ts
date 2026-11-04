import * as T from 'three';

export type FacePose='base'|'sly'|'scared';
const sphere=new T.SphereGeometry(1,64,40);
const cap=new T.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2);
const paint=(color:number)=>new T.MeshStandardMaterial({color,roughness:.36});
const ink=paint(0x0b0b11),white=paint(0xfffaf4),amber=paint(0x982e24),pupil=paint(0x100b0a);
const sparkle=new T.MeshBasicMaterial({color:0xffffff});
function oval(parent:T.Group,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
 const m=new T.Mesh(sphere,material);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;
}
function wedge(side:number){
 const s=new T.Shape();
 s.moveTo(-.31*side,-.045);s.quadraticCurveTo(-.345*side,-.05,-.32*side,.005);
 s.lineTo(.23*side,.18);s.quadraticCurveTo(.27*side,.19,.29*side,.15);
 s.lineTo(.33*side,.025);s.quadraticCurveTo(.33*side,.005,.28*side,.005);s.closePath();
 const geometry=new T.ExtrudeGeometry(s,{depth:.055,bevelEnabled:true,bevelThickness:.017,bevelSize:.018,bevelSegments:3,curveSegments:10});
 // Turn the outer tip back around the temple.
 const vertices=geometry.attributes.position;
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i);vertices.setZ(i,vertices.getZ(i)-.38*x*x);}
 geometry.computeVertexNormals();return geometry;
}
const brows=[wedge(-1),wedge(1)];
const smile=new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(-.23,.034,-.018),new T.Vector3(0,-.085,.003),new T.Vector3(.23,.043,-.018)),18,.017,8,false);
const mouthInterior=paint(0x44101b),tongue=paint(0xf75668);
export class ModularFace extends T.Group{
 private lidMaterial=paint(0x316de0);
 private eyes=[-1,1].map((side,i)=>{
  const socket=new T.Group();socket.position.set(side*.378,.025,.811);socket.rotation.y=side*.39;this.add(socket);
  oval(socket,white,0,0,.012,.375,.336,.192);
  const gaze=new T.Group();socket.add(gaze);
  oval(gaze,amber,0,0,.197,.135,.143,.013);oval(gaze,pupil,0,.004,.208,.094,.109,.009);
  oval(gaze,sparkle,-.031,.059,.218,.028,.028,.006);
  const lids=new T.Group();lids.position.z=.013;lids.scale.set(.38,.342,.218);socket.add(lids);
  const upper=new T.Mesh(cap,this.lidMaterial),lower=new T.Mesh(cap,this.lidMaterial);lower.rotation.z=Math.PI;lids.add(upper,lower);
  const brow=new T.Mesh(brows[i],ink);socket.add(brow);
  return {side,socket,upper,lower,brow,gaze};
 });
 private line=new T.Mesh(smile,ink);
 private openMouth=new T.Group();
 private sly=0;private fear=0;
 constructor(){super();this.name='modular-face-v2';this.line.position.set(0,-.34,.954);this.add(this.line,this.openMouth);
  this.openMouth.position.set(0,-.35,.942);this.openMouth.rotation.x=.37;
  oval(this.openMouth,ink,0,0,0,.206,.168,.035);oval(this.openMouth,mouthInterior,0,0,.015,.19,.15,.033);
  oval(this.openMouth,tongue,0,-.073,.046,.12,.046,.013);
 }
 updatePose(dt:number,pose:FacePose,blink:number,short:boolean,base:string){
  const k=1-Math.exp(-dt*13);
  this.sly+=((pose==='sly'?1:0)-this.sly)*k;this.fear+=((pose==='scared'?1:0)-this.fear)*k;
  this.lidMaterial.color.set(base);this.lidMaterial.roughness=.67;
  for(const {side,upper,lower,brow,gaze} of this.eyes){
   const rest=.37+.29*this.sly-.20*this.fear;
   const closure=rest+(1-rest)*blink;
   upper.rotation.order="ZXY";upper.rotation.z=side*(.48-.36*this.fear)*(1-blink);upper.rotation.x=-(1-closure)*1.12;lower.rotation.x=(1-blink)*1.5;
   gaze.visible=blink<.995;gaze.position.set(-side*.114+this.sly*.062,.022+this.fear*.065,0);
   brow.position.set(0,.128+.15*this.fear+side*.045*this.sly,.247);
   brow.rotation.z=side*(.38-.75*this.fear+side*.13*this.sly);brow.scale.x=short?.79:1;
  }
  this.line.visible=this.fear<.48;this.line.rotation.z=this.sly*.19;
  this.openMouth.visible=!this.line.visible;this.openMouth.scale.setScalar(Math.max(.01,this.fear));
 }
 dispose(){this.lidMaterial.dispose();}
}
