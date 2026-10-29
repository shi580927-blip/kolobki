import * as T from 'three';
import {POND} from '../core/terrain';
import {pondSubmersion} from './WaterPhysics';
/** Short paired wave crests from movement, never an autonomous repeating ring. */
export class WaterWake {
 private waves:{x:number;z:number;yaw:number;age:number}[]=[];
 private last=new Map<number,T.Vector2>();
 private mesh:T.InstancedMesh;
 private rings:T.InstancedMesh;
 private drops:T.InstancedMesh;
 private entries=new Map<number,{wet:boolean;vy:number}>();
 private splashes:{x:number;z:number;age:number;strength:number}[]=[];
 private droplets:{x:number;y:number;z:number;vx:number;vy:number;vz:number;age:number;size:number}[]=[];
 private ringAlpha=new Float32Array(12);
 private dummy=new T.Object3D();
 private alpha=new Float32Array(64);
 constructor(scene:T.Scene){
  const vertices:number[]=[],indices:number[]=[];
  for(const side of [-1,1])for(let i=0;i<12;i++){
   const t=i/11,x=side*(.38+t*.95),z=-.1-t*.9-.18*Math.sin(t*Math.PI),n=vertices.length/3;
   vertices.push(x,0,z-.025,x,0,z+.025);if(i<11)indices.push(n,n+1,n+2,n+1,n+3,n+2);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.alpha,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`attribute float waveAlpha; varying float a; varying vec3 p; void main(){a=waveAlpha;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying float a; varying vec3 p; void main(){vec2 d=p.xz-vec2(-18.,22.);float t=atan(d.y,d.x);float south=max(0.,sin(t));float r=5.6*(.96+.045*sin(t*3.+.4)+.025*sin(t*5.-1.))*(1.+2.7*south*south);if(length(d)>r)discard;gl_FragColor=vec4(.79,.96,.93,a);}`});
  this.mesh=new T.InstancedMesh(g,m,64);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.name='water-motion-wakes';scene.add(this.mesh);
  const ring=new T.RingGeometry(.93,1,32);ring.rotateX(-Math.PI/2);ring.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.ringAlpha,1));
  this.rings=new T.InstancedMesh(ring,m,12);this.rings.count=0;this.rings.frustumCulled=false;scene.add(this.rings);
  this.drops=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xc4f2f4,transparent:true,opacity:.8,depthWrite:false}),96);this.drops.count=0;this.drops.frustumCulled=false;scene.add(this.drops);
 }
 reset(){this.waves=[];this.last.clear();this.mesh.count=0;this.entries.clear();this.splashes=[];this.droplets=[];this.rings.count=this.drops.count=0;}
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
 private splash(x:number,z:number,fall:number){
  const strength=Math.min(1,fall/8);
  if(this.splashes.length<12)this.splashes.push({x,z,age:0,strength});
  for(let i=0;i<12&&this.droplets.length<96;i++){const a=i/12*Math.PI*2,speed=(.7+Math.random()*.7)*strength;this.droplets.push({x,y:POND.water+.04,z,vx:Math.cos(a)*speed,vy:1.2+strength*(1+Math.random()),vz:Math.sin(a)*speed,age:0,size:.045+Math.random()*.035});}
 }
 update(dt:number){
  for(const r of this.splashes)r.age+=dt;this.splashes=this.splashes.filter(r=>r.age<.8);this.rings.count=this.splashes.length;
  this.splashes.forEach((r,i)=>{this.dummy.position.set(r.x,POND.water+.025,r.z);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(.45+r.age*(1+r.strength));this.dummy.updateMatrix();this.rings.setMatrixAt(i,this.dummy.matrix);this.ringAlpha[i]=.65*(1-r.age/.8);});this.rings.instanceMatrix.needsUpdate=true;(this.rings.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
  for(const d of this.droplets){d.age+=dt;d.vy-=8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;}this.droplets=this.droplets.filter(d=>d.age<.8&&d.y>=POND.water);this.drops.count=this.droplets.length;
  this.droplets.forEach((d,i)=>{this.dummy.position.set(d.x,d.y,d.z);this.dummy.rotation.set(0,0,0);const size=d.size*(1-d.age/.8);this.dummy.scale.set(size,size*1.5,size);this.dummy.updateMatrix();this.drops.setMatrixAt(i,this.dummy.matrix);});this.drops.instanceMatrix.needsUpdate=true;
  for(const w of this.waves)w.age+=dt;this.waves=this.waves.filter(w=>w.age<.85);this.mesh.count=this.waves.length;
  this.waves.forEach((w,i)=>{const t=w.age/.85;this.dummy.position.set(w.x,POND.water+.018,w.z);this.dummy.rotation.set(0,w.yaw,0);this.dummy.scale.set(1+t*.7,1,1+t*.45);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.alpha[i]=.55*Math.min(1,t*10)*(1-t);});this.mesh.instanceMatrix.needsUpdate=true;(this.mesh.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
 }
 get splashCount(){return this.splashes.length;}
 get dropCount(){return this.droplets.length;}
 get count(){return this.waves.length;}
}
