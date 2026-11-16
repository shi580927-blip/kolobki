import * as T from 'three';
type Kind='star'|'dust'|'ring'|'flash'|'streak';
type Style='impact'|'ram'|'lemon'|'bomb'|'domino';
interface Particle {p:T.Vector3;v:T.Vector3;life:number;total:number;size:number;radius:number;spin:number;color:T.Color}
interface Pool {mesh:T.InstancedMesh;alpha:T.InstancedBufferAttribute;particles:Particle[];limit:number}
const star=(points:number,outer:number,inner:number)=>{const shape=new T.Shape();for(let i=0;i<points*2;i++){const a=i*Math.PI/points+Math.PI/2,r=i%2?inner:outer;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new T.ShapeGeometry(shape);};
/** Five reusable draw calls, bounded particles, no geometry/material allocation per hit. */
export class Effects {
 private pools:Record<Kind,Pool>;private dummy=new T.Object3D();private rotation=new T.Quaternion();private axis=new T.Vector3(0,0,1);private trailTime=0;
 constructor(private scene:T.Scene,private camera?:T.Camera){
  const make=(geometry:T.BufferGeometry,limit:number):Pool=>{const alpha=new T.InstancedBufferAttribute(new Float32Array(limit),1);geometry.setAttribute('effectAlpha',alpha);const material=new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
   material.onBeforeCompile=shader=>{shader.vertexShader='attribute float effectAlpha; varying float vEffectAlpha;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEffectAlpha=effectAlpha;');shader.fragmentShader='varying float vEffectAlpha;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= vEffectAlpha;\n#include <opaque_fragment>');};
   const mesh=new T.InstancedMesh(geometry,material,limit);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.name='effects-pool';scene.add(mesh);return {mesh,alpha,limit,particles:[]};};
  this.pools={star:make(star(5,1,.43),96),dust:make(new T.IcosahedronGeometry(1,1),64),ring:make(new T.RingGeometry(.92,1,48),14),flash:make(star(10,1,.23),16),streak:make(new T.PlaneGeometry(1,.12),48)};
  (this.pools.ring.mesh.material as T.Material).blending=T.AdditiveBlending;(this.pools.flash.mesh.material as T.Material).blending=T.AdditiveBlending;
 }
 private add(kind:Kind,position:T.Vector3,velocity:T.Vector3,color:number,size:number,life:number,radius=0){const pool=this.pools[kind];if(pool.particles.length>=pool.limit)pool.particles.shift();pool.particles.push({p:position.clone(),v:velocity,life,total:life,size,radius,spin:Math.random()*Math.PI*2,color:new T.Color(color)});}
 burst(position:T.Vector3,style:Style='impact',level=1){
  const tier=Math.min(3,Math.max(1,level));
  const color=style==='bomb'?0xffb94c:style==='lemon'?0xffef6b:style==='ram'?0xffa239:0xffda49;
  this.add('flash',position,new T.Vector3(),color,style==='bomb'?2.8:1.8+tier*.2,.14);this.add('flash',position,new T.Vector3(),0xffffff,.85,.085);
  const count=style==='bomb'?20:10+tier*2;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=3.5+Math.random()*2.5;this.add('star',position,new T.Vector3(Math.cos(a)*r,1.8+Math.random()*2,Math.sin(a)*r),[color,0xffffff,0xff74d1,0x80eaff][i%4],.27+Math.random()*.22,.5+Math.random()*.3);}
  const low=position.clone();low.y-=.65;
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;this.add('dust',low,new T.Vector3(Math.cos(a)*2,1+Math.random(),Math.sin(a)*2),0xf0d6af,.25+Math.random()*.2,.65);}
  this.add('ring',low,new T.Vector3(),style==='bomb'?0xd6a2ff:color,1,.48,style==='bomb'?7:style==='lemon'?4:4.8);
  if(tier>1)this.add('ring',low,new T.Vector3(0,.08,0),0xce84ff,1,.65,5+tier);
  for(let i=0;i<8+tier*2;i++){const a=i/(8+tier*2)*Math.PI*2;this.add('streak',position,new T.Vector3(Math.cos(a)*7,(Math.random()-.3)*4,Math.sin(a)*7),i%2?0xffed75:0xffffff,.75,.22+Math.random()*.12);}
 }
 sparkle(position:T.Vector3){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.add('star',position,new T.Vector3(Math.cos(a)*2.2,2+Math.random(),Math.sin(a)*2.2),i%2?0xffdf5e:0xffffff,.16,.5);}}
 power(kind:'pepper'|'lemon'|'bomb',position:T.Vector3){this.burst(position,kind==='pepper'?'ram':kind);}
 speedTrail(dt:number,position:T.Vector3,velocity:{x:number;y:number;z:number}){this.trailTime+=dt;if(this.trailTime<.1||Math.hypot(velocity.x,velocity.z)<6)return;this.trailTime=0;const p=position.clone().addScaledVector(new T.Vector3(velocity.x,0,velocity.z).normalize(),-1.05);this.add('flash',p,new T.Vector3(0,.2,0),0xff8c35,.45,.22);}
 reset(){for(const pool of Object.values(this.pools)){pool.particles=[];pool.mesh.count=0;}this.trailTime=0;}
 get count(){return Object.values(this.pools).reduce((n,p)=>n+p.particles.length,0);}
 update(dt:number){
  for(const [kind,pool] of Object.entries(this.pools)){
   for(let i=pool.particles.length-1;i>=0;i--){const p=pool.particles[i];p.life-=dt;if(p.life<=0){pool.particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);if(kind==='dust'||kind==='star')p.v.y-=dt*(kind==='dust'?3.5:7);}
   pool.particles.forEach((p,i)=>{const age=1-p.life/p.total;this.dummy.position.copy(p.p);
    if(kind==='ring'){this.dummy.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);this.dummy.scale.setScalar(.5+age*p.radius);}
    else{this.dummy.quaternion.copy(kind==='dust'?this.rotation:(this.camera?.quaternion??this.rotation));this.dummy.quaternion.multiply(new T.Quaternion().setFromAxisAngle(this.axis,p.spin+age));this.dummy.scale.setScalar(p.size*(kind==='flash'?1+age*.8:kind==='dust'?1+age*1.7:kind==='streak'?1+age*2:.8+Math.sin(age*Math.PI)*.5));}
    this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);pool.mesh.setColorAt(i,p.color);pool.alpha.setX(i,Math.pow(1-age,.7));
   });pool.mesh.count=pool.particles.length;pool.mesh.instanceMatrix.needsUpdate=true;pool.alpha.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
  }
 }
}
