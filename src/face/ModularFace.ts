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
  const t=i/steps,x=-.445+.88*t;
  const width=(.040+.064*t)*Math.min(1,Math.sqrt(Math.min(t,1-t)*40));
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
const mouthInterior=paint(0x280e16),tongue=paint(0xf75668);
// Pose the source mesh in face coordinates, then wrap its silhouette onto the globe.
class SurfaceDetail {
 smile=0;
 private output:T.Mesh;
 private point=new T.Vector3();
 constructor(private rig:T.Group,private source:T.Mesh,private brow:boolean,private eyeSocket?:T.Group){
  const geometry=source.geometry.clone();geometry.morphAttributes={};
  this.output=new T.Mesh(geometry,source.material);this.output.castShadow=brow;
  this.output.frustumCulled=false;rig.add(this.output);source.visible=false;
 }
 update(visible:boolean){
  this.output.visible=visible;if(!visible)return;
  const mesh=this.source;
  mesh.updateMatrix();const transform=mesh.matrix.clone();
  for(let parent=mesh.parent;parent&&parent!==this.rig;parent=parent.parent){
   parent.updateMatrix();transform.premultiply(parent.matrix);
  }
  const src=mesh.geometry.attributes.position,dst=this.output.geometry.attributes.position;
  const target=mesh.geometry.morphAttributes.position?.[0],weight=mesh.morphTargetInfluences?.[0]??0;
  for(let i=0;i<src.count;i++){
   const p=this.point.fromBufferAttribute(src,i);
   if(target)p.y+=(target.getY(i)-p.y)*weight;
   let eyeDepth=0;
   if(this.eyeSocket){
    // Height of the spherical cap in socket coordinates; the rim sinks into the body.
    const m=transform.elements;
    const z=m[2]*p.x+m[6]*p.y+m[10]*p.z+m[14];
    const x=m[0]*p.x+m[4]*p.y+m[8]*p.z+m[12];
    eyeDepth=Math.sin(this.eyeSocket.rotation.y)*(x-this.eyeSocket.position.x)
       +Math.cos(this.eyeSocket.rotation.y)*(z-this.eyeSocket.position.z);
   }
   p.applyMatrix4(transform);
   if(this.smile && !this.eyeSocket && !this.brow)p.y+=this.smile*1.35*p.x*p.x;
   // Relief is measured radially in units of a 75 mm sphere radius.
   let relief=this.eyeSocket ? (eyeDepth-.010)*.122 : this.brow ? .046+.016*Math.sin(2*Math.PI*(i%17)/16)
     : .014+.55*(mesh.position.z*Number(mesh.parent!==this.rig)+src.getZ(i)*mesh.scale.z);
   if(mesh.name==='mouth-cavity'){
    // A raised rounded rim surrounds a recessed floor; both follow the globe.
    const front=Math.max(0,src.getZ(i));
    relief=.005+.027*Math.exp(-18*(front-.27)**2);
   }
   dst.setXYZ(i,p.x,p.y,Math.sqrt(Math.max(.001,(1+relief)**2-p.x*p.x-p.y*p.y)));
  }
  dst.needsUpdate=true;this.output.geometry.computeVertexNormals();
 }
 dispose(){this.output.geometry.dispose();}
}
export class ModularFace extends T.Group{
 private lidMaterial=paint(0x316de0);
 private eyes=[-1,1].map((side,i)=>{
  const socket=new T.Group();socket.position.set(side*.397,.025,.743);socket.rotation.y=side*.39;this.add(socket);
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
 private eyeDetails:SurfaceDetail[]=[];
 private lastEyes="";
 private line=new T.Mesh(smile,ink);
 private openMouth=new T.Group();
 private details:{detail:SurfaceDetail;group:T.Object3D|null}[]=[];
 private lastShape="";
 private weights={sly:0,scared:0,surprised:0,happy:0,angry:0,sleepy:0};
 private worriedMouth=new T.Group();
 constructor(){super();this.name='modular-face-v2';this.line.position.set(0,-.41,.954);this.add(this.line,this.openMouth);
  this.add(this.worriedMouth);
  this.worriedMouth.position.set(0,-.42,.956);
  const worried=oval(this.worriedMouth,mouthInterior,0,0,0,.22,.12,.027);
  worried.name='mouth-cavity';worried.geometry=sphere.clone();
  const points=worried.geometry.attributes.position;
  for(let i=0;i<points.count;i++){const x=points.getX(i);points.setY(i,points.getY(i)-1.4*x*x);}
  worried.geometry.computeVertexNormals();
  // Teeth and lower lip follow the arched opening of the frightened mouth.
  for(const side of [-1,1]) oval(this.worriedMouth,white,side*.041,.061,.048,.041,.027,.009);
  for(const x of [-.08,0,.08]) oval(this.worriedMouth,white,x,-.071-x*x*3,.045,.043,.025,.009);
  oval(this.openMouth,white,0,.092,.053,.135,.035,.014);
  this.openMouth.position.set(0,-.43,.942);this.openMouth.rotation.x=.37;
  oval(this.openMouth,ink,0,0,0,.206,.168,.035);oval(this.openMouth,mouthInterior,0,0,.015,.19,.15,.033).name='mouth-cavity';
  oval(this.openMouth,tongue,0,-.073,.046,.12,.046,.013);
  for(const {socket,brow} of this.eyes)socket.traverse(child=>{
   if(child instanceof T.Mesh && child!==brow)this.eyeDetails.push(new SurfaceDetail(this,child,false,socket));
  });
  for(const eye of this.eyes)this.details.push({detail:new SurfaceDetail(this,eye.brow,true),group:null});
  this.details.push({detail:new SurfaceDetail(this,this.line,false),group:this.line});
  for(const group of [this.openMouth,this.worriedMouth])for(const child of group.children)
   this.details.push({detail:new SurfaceDetail(this,child as T.Mesh,false),group});

 }
 updatePose(dt:number,pose:FacePose,blink:number,short:boolean,base:string){
  const k=1-Math.exp(-dt*13);
  for(const key of Object.keys(this.weights) as (keyof typeof this.weights)[]){
   this.weights[key]+=((pose===key?1:0)-this.weights[key])*k;
  }
  const {sly,scared,surprised,happy,angry,sleepy}=this.weights;
  this.lidMaterial.color.set(base);this.lidMaterial.roughness=.67;
  for(const {side,upper,lower,brow,gaze} of this.eyes){
   const rest=.26+.29*sly-.24*scared-.24*surprised+.44*angry+.40*happy+.56*sleepy;
   const closure=rest+(1-rest)*blink;
   upper.rotation.order="ZXY";upper.rotation.z=side*(.34-.34*(scared+surprised+sleepy))*(1-blink);
   upper.rotation.x=-(1-closure)*1.12;lower.rotation.x=(1-blink)*(1.5-1.32*happy-.63*scared-.48*sly-.28*angry);
   gaze.rotation.set(.12-.29*scared-.08*surprised+.18*sleepy,-side*(.35+.22*scared)+sly*.33+scared*.06+sleepy*.16,0);
   brow.position.set(side*(-.062+.055*(happy+surprised)-.025*angry),.185+.15*scared+.21*surprised+.21*happy-.025*angry+side*.028*sly,.257);
   brow.rotation.z=side*(.42-1.02*scared-.50*surprised-.56*happy+.10*angry-.34*sleepy-.23*sly+side*.05*sly);
   brow.scale.set(short?.81:1.05,1.24,1);
   brow.morphTargetInfluences![0]=-.26*scared+.85*surprised+.17*side*sly+.83*happy;
  }
  const tension=angry+.52*scared;
  this.worriedMouth.visible=tension>.35;
  this.worriedMouth.scale.set(1.06*tension,.53*angry+1.5*scared,1);
  const opening=happy+surprised+.5*scared;
  this.openMouth.visible=opening>.35 && !this.worriedMouth.visible;
  this.openMouth.scale.set(.72*surprised+1.45*happy,1.05*surprised+.80*happy,1);
  this.line.visible=!this.worriedMouth.visible&&!this.openMouth.visible;
  this.line.scale.set(.51+.10*sly-.08*sleepy,1-1.72*angry-.86*sleepy,1);
  this.line.rotation.z=sly*.31-sleepy*.11;
  for(const {detail} of this.details)detail.smile=happy;
  const shape=[short,...Object.values(this.weights).map(w=>Math.round(w*1000))].join(',');
  if(shape!==this.lastShape){
   for(const {detail,group} of this.details)detail.update(group?.visible??true);
   this.lastShape=shape;
  }
  const eyes=shape+Math.round(blink*1000);
  if(eyes!==this.lastEyes){for(const detail of this.eyeDetails)detail.update(true);this.lastEyes=eyes;}
  this.line.visible=false;
 }
 dispose(){for(const detail of this.eyeDetails)detail.dispose();for(const {detail} of this.details)detail.dispose();(this.worriedMouth.children[0] as T.Mesh).geometry.dispose();this.lidMaterial.dispose();}
}
