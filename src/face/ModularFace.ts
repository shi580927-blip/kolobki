import * as T from 'three';

export type FacePose='base'|'sly'|'scared'|'surprised'|'happy'|'angry'|'sleepy';
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
 private weights={sly:0,scared:0,surprised:0,happy:0,angry:0,sleepy:0};
 private worriedMouth=new T.Group();
 constructor(){super();this.name='modular-face-v2';this.line.position.set(0,-.34,.954);this.add(this.line,this.openMouth);
  this.add(this.worriedMouth);
  this.worriedMouth.position.set(0,-.32,.956);
  const worried=oval(this.worriedMouth,mouthInterior,0,0,0,.22,.12,.027);
  worried.geometry=sphere.clone();
  const points=worried.geometry.attributes.position;
  for(let i=0;i<points.count;i++){const x=points.getX(i);points.setY(i,points.getY(i)-1.4*x*x);}
  worried.geometry.computeVertexNormals();
  this.openMouth.position.set(0,-.35,.942);this.openMouth.rotation.x=.37;
  oval(this.openMouth,ink,0,0,0,.206,.168,.035);oval(this.openMouth,mouthInterior,0,0,.015,.19,.15,.033);
  oval(this.openMouth,tongue,0,-.073,.046,.12,.046,.013);
 }
 updatePose(dt:number,pose:FacePose,blink:number,short:boolean,base:string){
  const k=1-Math.exp(-dt*13);
  for(const key of Object.keys(this.weights) as (keyof typeof this.weights)[]){
   this.weights[key]+=((pose===key?1:0)-this.weights[key])*k;
  }
  const {sly,scared,surprised,happy,angry,sleepy}=this.weights;
  this.lidMaterial.color.set(base);this.lidMaterial.roughness=.67;
  for(const {side,upper,lower,brow,gaze} of this.eyes){
   const rest=.26+.29*sly-.19*scared-.24*surprised+.24*angry+.56*sleepy;
   const closure=rest+(1-rest)*blink;
   upper.rotation.order="ZXY";upper.rotation.z=side*(.34-.34*(scared+surprised+sleepy))*(1-blink);
   upper.rotation.x=-(1-closure)*1.12;lower.rotation.x=(1-blink)*(1.5-.42*happy-.18*scared);
   gaze.rotation.set(.12-.46*scared-.08*surprised+.18*sleepy,-side*.35+sly*.11,0);
   brow.position.set(-side*.04,.205+.12*scared+.21*surprised+.07*happy-.07*angry+side*.045*sly,.257);
   brow.rotation.z=side*(.30-1.02*scared-.31*surprised+.12*angry-.34*sleepy+side*.13*sly);
   brow.scale.set(short?.65:.81,1.24,1);
   brow.morphTargetInfluences![0]=.10*scared+.85*surprised+.72*side*sly+.45*happy;
  }
  this.worriedMouth.visible=scared>.35;
  this.worriedMouth.scale.set(scared,scared,1);
  const opening=happy+surprised;
  this.openMouth.visible=opening>.35;
  this.openMouth.scale.set(.72*surprised+1.22*happy,1.05*surprised+.80*happy,1);
  this.line.visible=!this.worriedMouth.visible&&!this.openMouth.visible;
  this.line.scale.set(1-.28*sleepy,1-1.72*angry-.86*sleepy,1);
  this.line.rotation.z=sly*.19;
 }
 dispose(){(this.worriedMouth.children[0] as T.Mesh).geometry.dispose();this.lidMaterial.dispose();}
}
