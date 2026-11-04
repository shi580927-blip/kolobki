import * as T from 'three';

export type FacePose='base'|'sly'|'scared';
const sphere=new T.SphereGeometry(1,64,40);
const cap=new T.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2);
const paint=(color:number)=>new T.MeshStandardMaterial({color,roughness:.36});
const ink=paint(0x0b0b11),white=paint(0xfffaf4),amber=paint(0x853a2d),pupil=paint(0x100b0a);
const sparkle=new T.MeshBasicMaterial({color:0xffffff});
function oval(parent:T.Group,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
 const m=new T.Mesh(sphere,material);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;
}
function wedge(side:number){
 // Closely spaced cross-sections let the middle flex while both ends stay anchored.
 const positions:number[]=[],arched:number[]=[],indices:number[]=[];
 const steps=32,ring=16;
 for(let i=0;i<=steps;i++){
  const t=i/steps,x=-.415+.75*t;
  const width=(.032+.064*t)*Math.min(1,Math.sqrt(Math.min(t,1-t)*40));
  for(let j=0;j<=ring;j++){
   const angle=2*Math.PI*j/ring;
   const y=-.025+.115*t+width*Math.cos(angle);
   const z=.018+.035*Math.sin(angle)*(width/.096)-.38*x*x;
   positions.push(side*x,y,z);
   arched.push(side*x,y+.15*Math.sin(Math.PI*t),z);
   if(i<steps&&j<ring){
    const a=i*(ring+1)+j,b=a+ring+1;
    indices.push(...(side>0?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));
   }
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.morphAttributes.position=[new T.Float32BufferAttribute(arched,3)];
 return geometry;
}
function eyePatch(radiusX:number,radiusY:number,offsetX=0,offsetY=0){
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<=8;i++)for(let j=0;j<=48;j++){
  const angle=2*Math.PI*j/48;
  const x=offsetX+radiusX*i/8*Math.cos(angle),y=offsetY+radiusY*i/8*Math.sin(angle);
  positions.push(x,y,Math.sqrt(1-x*x-y*y));
  if(i<8&&j<48){const a=i*49+j;indices.push(a,a+49,a+1,a+1,a+49,a+50);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();return g;
}
const irisPatch=eyePatch(.318,.38),pupilPatch=eyePatch(.222,.272,0,.01),glintPatch=eyePatch(.055,.06,-.076,.123);
const brows=[wedge(-1),wedge(1)];
const smile=new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(-.23,.034,-.018),new T.Vector3(0,-.085,.003),new T.Vector3(.23,.043,-.018)),18,.017,8,false);
const mouthInterior=paint(0x44101b),tongue=paint(0xf75668);
export class ModularFace extends T.Group{
 private lidMaterial=paint(0x316de0);
 private eyes=[-1,1].map((side,i)=>{
  const socket=new T.Group();socket.position.set(side*.378,.025,.811);socket.rotation.y=side*.39;this.add(socket);
  oval(socket,white,0,0,.012,.375,.336,.192).receiveShadow=true;
  // Rotate the markings on nested ellipsoids so the eyeball cannot cut their rims.
  const eyeFrame=new T.Group();eyeFrame.position.z=.012;eyeFrame.scale.set(.375,.336,.192);socket.add(eyeFrame);
  const gaze=new T.Group();eyeFrame.add(gaze);
  for(const [geometry,material,radius] of [[irisPatch,amber,1.012],[pupilPatch,pupil,1.019],[glintPatch,sparkle,1.026]] as const){
   const patch=new T.Mesh(geometry,material);patch.receiveShadow=true;patch.scale.setScalar(radius);gaze.add(patch);
  }
  const lids=new T.Group();lids.position.z=.012;lids.scale.set(.392,.352,.219);socket.add(lids);
  const upper=new T.Mesh(cap,this.lidMaterial),lower=new T.Mesh(cap,this.lidMaterial);upper.receiveShadow=lower.receiveShadow=true;lower.rotation.z=Math.PI;lids.add(upper,lower);
  const brow=new T.Mesh(brows[i],ink);brow.castShadow=true;socket.add(brow);
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
   const rest=.26+.29*this.sly-.20*this.fear;
   const closure=rest+(1-rest)*blink;
   upper.rotation.order="ZXY";upper.rotation.z=side*(.34-.24*this.fear)*(1-blink);upper.rotation.x=-(1-closure)*1.12;lower.rotation.x=(1-blink)*1.5;
   gaze.rotation.set(.12-this.fear*.19,-side*.35+this.sly*.11,0);
   brow.position.set(-side*.047,.202+.15*this.fear+side*.045*this.sly,.257);
   brow.rotation.z=side*(.30-.65*this.fear+side*.13*this.sly);brow.scale.x=short?.79:1;
   brow.morphTargetInfluences![0]=this.fear+.72*side*this.sly;
  }
  this.line.visible=this.fear<.48;this.line.rotation.z=this.sly*.19;
  this.openMouth.visible=!this.line.visible;this.openMouth.scale.setScalar(Math.max(.01,this.fear));
 }
 dispose(){this.lidMaterial.dispose();}
}
