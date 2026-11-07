import * as T from 'three';
type Kind='star'|'dust'|'ring'|'flash';
type Style='impact'|'ram'|'lemon'|'bomb'|'domino';
interface Particle {p:T.Vector3;v:T.Vector3;life:number;total:number;size:number;radius:number;spin:number;color:T.Color}
interface Pool {mesh:T.InstancedMesh;alpha:T.InstancedBufferAttribute;particles:Particle[];limit:number}
const star=(points:number,outer:number,inner:number)=>{const shape=new T.Shape();for(let i=0;i<points*2;i++){const a=i*Math.PI/points+Math.PI/2,r=i%2?inner:outer;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new T.ShapeGeometry(shape);};
/** Four reusable draw calls, bounded particles, no geometry/material allocation per hit. */
export class Effects {
 private pools:Record<Kind,Pool>;private dummy=new T.Object3D();private rotation=new T.Quaternion();private axis=new T.Vector3(0,0,1);private trailTime=0;
 constructor(private scene:T.Scene,private camera?:T.Camera){
  const make=(geometry:T.BufferGeometry,limit:number):Pool=>{const alpha=new T.InstancedBufferAttribute(new Float32Array(limit),1);geometry.setAttribute('effectAlpha',alpha);const material=new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
   material.onBeforeCompile=shader=>{shader.vertexShader='attribute float effectAlpha; varying float vEffectAlpha;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEffectAlpha=effectAlpha;');shader.fragmentShader='varying float vEffectAlpha;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= vEffectAlpha;\n#include <opaque_fragment>');};
   const mesh=new T.InstancedMesh(geometry,material,limit);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.name='effects-pool';scene.add(mesh);return {mesh,alpha,limit,particles:[]};};
  this.pools={star:make(star(5,1,.43),64),dust:make(new T.IcosahedronGeometry(1,0),40),ring:make(new T.RingGeometry(.90,1,40),10),flash:make(star(10,1,.23),16)};
  (this.pools.ring.mesh.material as T.Material).blending=T.AdditiveBlending;(this.pools.flash.mesh.material as T.Material).blending=T.AdditiveBlending;
 }
 private add(kind:Kind,position:T.Vector3,velocity:T.Vector3,color:number,size:number,life:number,radius=0){const pool=this.pools[kind];if(pool.particles.length>=pool.limit)pool.particles.shift();pool.particles.push({p:position.clone(),v:velocity,life,total:life,size,radius,spin:Math.random()*Math.PI*2,color:new T.Color(color)});}
 burst(position:T.Vector3,style:Style='impact'){
  const color=style==='bomb'?0xffb94c:style==='lemon'?0xffef6b:style==='ram'?0xffa239:0xffda49;
  this.add('flash',position,new T.Vector3(),color,style==='bomb'?2.3:1.45,.16);this.add('flash',position,new T.Vector3(),0xffffff,.6,.10);
  const count=style==='bomb'?14:8;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=2.5+Math.random()*2;this.add('star',position,new T.Vector3(Math.cos(a)*r,1.8+Math.random()*2,Math.sin(a)*r),i%3?color:0xffffff,.17+Math.random()*.12,.38+Math.random()*.25);}
  const low=position.clone();low.y-=.65;
  for(let i=0;i<6;i++){const a=i*Math.PI/3;this.add('dust',low,new T.Vector3(Math.cos(a)*2,1+Math.random(),Math.sin(a)*2),0xe8d5b3,.19+Math.random()*.12,.45);}
  this.add('ring',low,new T.Vector3(),style==='bomb'?0xd6a2ff:color,1,.38,style==='bomb'?7:style==='lemon'?3:3.8);
 }
 sparkle(position:T.Vector3){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.add('star',position,new T.Vector3(Math.cos(a)*2.2,2+Math.random(),Math.sin(a)*2.2),i%2?0xffdf5e:0xffffff,.16,.5);}}
 power(kind:'pepper'|'lemon'|'bomb',position:T.Vector3){this.burst(position,kind==='pepper'?'ram':kind);}
 speedTrail(dt:number,position:T.Vector3,velocity:{x:number;y:number;z:number}){this.trailTime+=dt;if(this.trailTime<.1||Math.hypot(velocity.x,velocity.z)<6)return;this.trailTime=0;const p=position.clone().addScaledVector(new T.Vector3(velocity.x,0,velocity.z).normalize(),-1.05);this.add('flash',p,new T.Vector3(0,.2,0),0xff8c35,.45,.22);}
 reset(){for(const pool of Object.values(this.pools)){pool.particles=[];pool.mesh.count=0;}this.trailTime=0;}
 get count(){return Object.values(this.pools).reduce((n,p)=>n+p.particles.length,0);}
 update(dt:number){
  for(const [kind,pool] of Object.entries(this.pools)){
   for(let i=pool.particles.length-1;i>=0;i--){const p=pool.particles[i];p.life-=dt;if(p.life<=0){pool.particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);if(kind==='dust'||kind==='star')p.v.y-=dt*(kind==='dust'?6:7);}
   pool.particles.forEach((p,i)=>{const age=1-p.life/p.total;this.dummy.position.copy(p.p);
    if(kind==='ring'){this.dummy.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);this.dummy.scale.setScalar(.5+age*p.radius);}
    else{this.dummy.quaternion.copy(kind==='dust'?this.rotation:(this.camera?.quaternion??this.rotation));this.dummy.quaternion.multiply(new T.Quaternion().setFromAxisAngle(this.axis,p.spin+age));this.dummy.scale.setScalar(p.size*(kind==='flash'?1+age*.8:.8+Math.sin(age*Math.PI)*.5));}
    this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);pool.mesh.setColorAt(i,p.color);pool.alpha.setX(i,Math.pow(1-age,.7));
   });pool.mesh.count=pool.particles.length;pool.mesh.instanceMatrix.needsUpdate=true;pool.alpha.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
  }
 }
}
