import * as T from 'three';
import {POND} from '../core/terrain';
import {pondSubmersion} from './WaterPhysics';
/** Short paired wave crests from movement, never an autonomous repeating ring. */
export class WaterWake {
 private waves:{x:number;z:number;yaw:number;age:number}[]=[];
 private last=new Map<number,T.Vector2>();
 private mesh:T.InstancedMesh;
 private rings:T.InstancedMesh;
 private crowns:T.InstancedMesh;
 private drops:T.InstancedMesh;
 private entries=new Map<number,{wet:boolean;vy:number}>();
 private splashes:{x:number;z:number;age:number;strength:number}[]=[];
 private droplets:{x:number;y:number;z:number;vx:number;vy:number;vz:number;age:number;size:number}[]=[];
 private ringAlpha=new Float32Array(12);
 private dummy=new T.Object3D();
 private alpha=new Float32Array(64);
 constructor(scene:T.Scene,private onSplash?:(strength:number)=>void){
  const vertices:number[]=[],indices:number[]=[],sides:number[]=[];
  for(const side of [-1,1])for(let i=0;i<12;i++){
   const t=i/11,x=side*(.70+t*1.0),z=-.3-t*2.3-.18*Math.sin(t*Math.PI),n=vertices.length/3;
   vertices.push(x,0,z-.14*(1-t*.55),x,0,z+.14*(1-t*.55));sides.push(-1,1);if(i<11)indices.push(n,n+1,n+2,n+1,n+3,n+2);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('crestSide',new T.Float32BufferAttribute(sides,1));g.setIndex(indices);g.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.alpha,1));
  const m=new T.ShaderMaterial({uniforms:{pondShape:{value:new T.Vector4(POND.x,POND.z,POND.radius,POND.flare)}},transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`attribute float waveAlpha;attribute float crestSide;varying float foamSide; varying float a; varying vec3 p; void main(){a=waveAlpha;foamSide=crestSide;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform vec4 pondShape;varying float foamSide; varying float a; varying vec3 p; void main(){vec2 d=p.xz-pondShape.xy;float t=atan(d.y,d.x);float south=max(0.,sin(t));float r=pondShape.z*(.96+.045*sin(t*3.+.4)+.025*sin(t*5.-1.))*(1.+pondShape.w*south*south);if(length(d)>r)discard;float broken=.85+.15*sin(p.x*12.+p.y*7.+p.z*9.);vec3 color=mix(vec3(.84,.99,1.),vec3(.035,.36,.48),smoothstep(.55,.95,abs(foamSide)));gl_FragColor=vec4(color,a*broken);}`});
  Object.assign(m.defaultAttributeValues,{crestSide:[0]});
  this.mesh=new T.InstancedMesh(g,m,64);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.name='water-motion-wakes';scene.add(this.mesh);
  const ring=new T.RingGeometry(.93,1,32);ring.rotateX(-Math.PI/2);ring.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.ringAlpha,1));
  this.rings=new T.InstancedMesh(ring,m,12);this.rings.count=0;this.rings.frustumCulled=false;scene.add(this.rings);
  const crownVertices:number[]=[],crownIndices:number[]=[];
  for(let i=0;i<=32;i++){
   const a=i/32*Math.PI*2,crest=.18+.16*Math.sin(a*8)**2;
   crownVertices.push(Math.cos(a)*.66,0,Math.sin(a)*.66,Math.cos(a),crest,Math.sin(a));
   if(i<32){const n=i*2;crownIndices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const crown=new T.BufferGeometry();crown.setAttribute('position',new T.Float32BufferAttribute(crownVertices,3));crown.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.ringAlpha,1));crown.setIndex(crownIndices);
  this.crowns=new T.InstancedMesh(crown,m,12);this.crowns.count=0;this.crowns.frustumCulled=false;this.crowns.name='water-impact-crowns';scene.add(this.crowns);
  this.drops=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xc4f2f4,transparent:true,opacity:.8,depthWrite:false}),96);this.drops.count=0;this.drops.frustumCulled=false;scene.add(this.drops);
  // A transparent lake otherwise sorts over a low wake at some viewpoints.
  // Opaque bodies/shore still occlude the effects through the depth buffer.
  this.mesh.renderOrder=this.rings.renderOrder=this.crowns.renderOrder=this.drops.renderOrder=6;
 }
 reset(){this.waves=[];this.last.clear();this.mesh.count=0;this.entries.clear();this.splashes=[];this.droplets=[];this.rings.count=this.drops.count=this.crowns.count=0;}
 emit(id:number,p:{x:number;y:number;z:number},v:{x:number;y?:number;z:number}){
  const wet=pondSubmersion(p)>.015,previous=this.entries.get(id),fall=Math.max(-(v.y??0),-(previous?.vy??0));
  this.entries.set(id,{wet,vy:v.y??0});
  if(previous&&!previous.wet&&wet&&fall>1.8)this.splash(p.x,p.z,fall);
  const speed=Math.hypot(v.x,v.z);
  if(pondSubmersion(p)<.015||speed<.7){this.last.delete(id);return;}
  const old=this.last.get(id);
  if(old&&old.distanceTo(new T.Vector2(p.x,p.z))<.65)return;
  this.last.set(id,new T.Vector2(p.x,p.z));
  if(this.waves.length<64)this.waves.push({x:p.x,z:p.z,yaw:Math.atan2(v.x,v.z),age:0});
 }
 splash(x:number,z:number,fall:number){
  const strength=Math.min(1,fall/8);
  this.onSplash?.(strength);
  if(this.splashes.length<12)this.splashes.push({x,z,age:0,strength});
  for(let i=0;i<12&&this.droplets.length<96;i++){const a=i/12*Math.PI*2,speed=(.7+Math.random()*.7)*strength;this.droplets.push({x,y:POND.water+.04,z,vx:Math.cos(a)*speed,vy:1.2+strength*(1+Math.random()),vz:Math.sin(a)*speed,age:0,size:.045+Math.random()*.035});}
 }
 update(dt:number){
  for(const r of this.splashes)r.age+=dt;this.splashes=this.splashes.filter(r=>r.age<.8);this.rings.count=this.splashes.length;
  this.splashes.forEach((r,i)=>{this.dummy.position.set(r.x,POND.water+.025,r.z);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(.45+r.age*(1+r.strength));this.dummy.updateMatrix();this.rings.setMatrixAt(i,this.dummy.matrix);this.ringAlpha[i]=.65*(1-r.age/.8);});this.rings.instanceMatrix.needsUpdate=true;(this.rings.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
  this.crowns.count=this.splashes.length;
  this.splashes.forEach((r,i)=>{const scale=.72+r.age*.8;this.dummy.position.set(r.x,POND.water+.025,r.z);this.dummy.scale.set(scale,Math.sin(Math.min(1,r.age/.45)*Math.PI)*r.strength*2.4,scale);this.dummy.updateMatrix();this.crowns.setMatrixAt(i,this.dummy.matrix);});this.crowns.instanceMatrix.needsUpdate=true;(this.crowns.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
  for(const d of this.droplets){d.age+=dt;d.vy-=8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;}this.droplets=this.droplets.filter(d=>d.age<.8&&d.y>=POND.water);this.drops.count=this.droplets.length;
  this.droplets.forEach((d,i)=>{this.dummy.position.set(d.x,d.y,d.z);this.dummy.rotation.set(0,0,0);const size=d.size*(1-d.age/.8);this.dummy.scale.set(size,size*1.5,size);this.dummy.updateMatrix();this.drops.setMatrixAt(i,this.dummy.matrix);});this.drops.instanceMatrix.needsUpdate=true;
  for(const w of this.waves)w.age+=dt;this.waves=this.waves.filter(w=>w.age<1.5);this.mesh.count=this.waves.length;
  this.waves.forEach((w,i)=>{const t=w.age/1.5;this.dummy.position.set(w.x,POND.water+.018,w.z);this.dummy.rotation.set(0,w.yaw,0);this.dummy.scale.set(1+t*.9,1,1+t*.7);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.alpha[i]=.88*Math.min(1,t*10)*(1-t);});this.mesh.instanceMatrix.needsUpdate=true;(this.mesh.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
 }
 get splashCount(){return this.splashes.length;}
 get dropCount(){return this.droplets.length;}
 get count(){return this.waves.length;}
}
