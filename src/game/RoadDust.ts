import * as T from 'three';
import {nearestRoutePoint} from '../core/valleyRoute';
import {heightAt} from '../core/terrain';

type Puff={age:number;life:number;x:number;y:number;z:number;vx:number;vz:number;size:number;angle:number;spin:number};
/** Small, bounded pool of camera-facing, soft dust puffs; no texture download. */
export class RoadDust {
 private readonly max=48;
 private readonly particles:Puff[]=[];
 private readonly mesh:T.InstancedMesh;
 private readonly dummy=new T.Object3D();
 private readonly opacity=new Float32Array(this.max);
 private carry=0;
 private wasSupported=false;
 private airborneTime=0;
 private lastVertical=0;
 private lastV=new T.Vector2();
 constructor(scene:T.Scene){
  const geometry=new T.PlaneGeometry(1,1);
  geometry.setAttribute('dustOpacity',new T.InstancedBufferAttribute(this.opacity,1));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute float dustOpacity; varying vec2 uvDust; varying float alphaDust; void main(){uvDust=uv; alphaDust=dustOpacity; vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.); vec2 offset=(instanceMatrix*vec4(position.xy,0.,0.)).xy; gl_Position=projectionMatrix*(center+vec4(offset,0.,0.));}`,fragmentShader:`varying vec2 uvDust; varying float alphaDust; void main(){ vec2 p=uvDust*2.-1.; float r=length(p); float shape=1.-smoothstep(.35,1.,r); float soft=shape*shape*alphaDust; gl_FragColor=vec4(.73,.52,.31,soft); }`});
  this.mesh=new T.InstancedMesh(geometry,material,this.max);this.mesh.count=0;this.mesh.frustumCulled=false;scene.add(this.mesh);
 }
 reset(){this.particles.length=0;this.mesh.count=0;this.carry=0;this.wasSupported=false;this.airborneTime=0;this.lastVertical=0;this.lastV.set(0,0);}
 private spawn(x:number,z:number,vx:number,vz:number,strong:boolean,landing=false){
  if(this.particles.length>=this.max)return;
  const speed=Math.hypot(vx,vz),dx=speed>0.2?vx/speed:0,dz=speed>0.2?vz/speed:1,side=(Math.random()-.5)*(landing?1.5:.65);
  const px=x-dx*(landing?.1:.85)+dz*side,pz=z-dz*(landing?.1:.85)-dx*side;
  if(nearestRoutePoint(px,pz).distance>4.2)return;
  const angle=Math.random()*Math.PI*2;
  this.particles.push({age:0,life:.55+Math.random()*.35,x:px,y:heightAt(px,pz)+.12,z:pz,vx:(landing?dz*side: -dx*.5)+(Math.random()-.5)*.35,vz:(landing?-dx*side: -dz*.5)+(Math.random()-.5)*.35,size:(strong?.65:.43)*(0.8+Math.random()*.4),angle,spin:(Math.random()-.5)*1.5});
 }
 step(dt:number,position:T.Vector3,velocity:{x:number;y:number;z:number},supported:boolean){
  const v=new T.Vector2(velocity.x,velocity.z),speed=v.length();
  const onRoad=nearestRoutePoint(position.x,position.z).distance<4.2;
  const acceleration=v.clone().sub(this.lastV).length()/dt;
  const landing=supported&&!this.wasSupported&&this.airborneTime>.1&&this.lastVertical<-.5;
  if(supported&&onRoad){
   if(landing)for(let i=0;i<5;i++)this.spawn(position.x,position.z,v.x,v.y,true,true);
   if(speed>1.1){const strong=speed>10||acceleration>12;this.carry+=dt*(strong?13:7);while(this.carry>=1){this.spawn(position.x,position.z,v.x,v.y,strong);this.carry--;}}
   else this.carry=0;
  }else this.carry=0;
  this.airborneTime=supported?0:this.airborneTime+dt;this.lastVertical=velocity.y;
  this.wasSupported=supported;this.lastV.copy(v);
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=.22*dt;p.angle+=p.spin*dt;}
 }
 render(){
  this.mesh.count=this.particles.length;
  this.particles.forEach((p,i)=>{const t=p.age/p.life,s=p.size*(.65+t*.65);this.dummy.position.set(p.x,p.y+s*.35,p.z);this.dummy.rotation.set(0,0,p.angle);this.dummy.scale.setScalar(s);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.opacity[i]=.62*Math.min(1,t*8)*(1-t);});
  this.mesh.instanceMatrix.needsUpdate=true;(this.mesh.geometry.getAttribute('dustOpacity') as T.InstancedBufferAttribute).needsUpdate=true;
 }
 get count(){return this.particles.length;}
}
