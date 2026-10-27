import * as T from 'three';
import {POND} from '../core/terrain';
import {pondSubmersion} from './WaterPhysics';
/** Short paired wave crests from movement, never an autonomous repeating ring. */
export class WaterWake {
 private waves:{x:number;z:number;yaw:number;age:number}[]=[];
 private last=new Map<number,T.Vector2>();
 private mesh:T.InstancedMesh;
 private dummy=new T.Object3D();
 private alpha=new Float32Array(64);
 constructor(scene:T.Scene){
  const vertices:number[]=[],indices:number[]=[];
  for(const side of [-1,1])for(let i=0;i<12;i++){
   const t=i/11,x=side*(.38+t*.95),z=-.1-t*.9-.18*Math.sin(t*Math.PI),n=vertices.length/3;
   vertices.push(x,0,z-.025,x,0,z+.025);if(i<11)indices.push(n,n+1,n+2,n+1,n+3,n+2);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('waveAlpha',new T.InstancedBufferAttribute(this.alpha,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`attribute float waveAlpha; varying float a; varying vec3 p; void main(){a=waveAlpha;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying float a; varying vec3 p; void main(){vec2 d=p.xz-vec2(-18.,22.);float t=atan(d.y,d.x);float r=5.6*(.91+.07*sin(t*3.+.4)+.035*sin(t*5.-1.));if(length(d)>r)discard;gl_FragColor=vec4(.79,.96,.93,a);}`});
  this.mesh=new T.InstancedMesh(g,m,64);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.name='water-motion-wakes';scene.add(this.mesh);
 }
 reset(){this.waves=[];this.last.clear();this.mesh.count=0;}
 emit(id:number,p:{x:number;y:number;z:number},v:{x:number;z:number}){
  const speed=Math.hypot(v.x,v.z);
  if(pondSubmersion(p)<.015||speed<.7){this.last.delete(id);return;}
  const old=this.last.get(id);
  if(old&&old.distanceTo(new T.Vector2(p.x,p.z))<.65)return;
  this.last.set(id,new T.Vector2(p.x,p.z));
  if(this.waves.length<64)this.waves.push({x:p.x,z:p.z,yaw:Math.atan2(v.x,v.z),age:0});
 }
 update(dt:number){
  for(const w of this.waves)w.age+=dt;this.waves=this.waves.filter(w=>w.age<.85);this.mesh.count=this.waves.length;
  this.waves.forEach((w,i)=>{const t=w.age/.85;this.dummy.position.set(w.x,POND.water+.018,w.z);this.dummy.rotation.set(0,w.yaw,0);this.dummy.scale.set(1+t*.7,1,1+t*.45);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.alpha[i]=.55*Math.min(1,t*10)*(1-t);});this.mesh.instanceMatrix.needsUpdate=true;(this.mesh.geometry.getAttribute('waveAlpha') as T.InstancedBufferAttribute).needsUpdate=true;
 }
 get count(){return this.waves.length;}
}
