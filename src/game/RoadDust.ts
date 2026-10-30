import * as T from 'three';
import {nearestRoutePoint} from '../core/valleyRoute';
import {heightAt} from '../core/terrain';

type Puff={age:number;life:number;x:number;y:number;z:number;vx:number;vz:number;width:number;height:number;angle:number;spin:number;shade:number};
/** Bounded instanced ground-level cloud; emission follows distance travelled, not frame rate. */
export class RoadDust {
 private readonly max=120;
 private readonly particles:Puff[]=[];
 private readonly mesh:T.InstancedMesh;
 private readonly dummy=new T.Object3D();
 private readonly opacity=new Float32Array(this.max);
 private readonly shades=new Float32Array(this.max);
 private carry=0;
 private previous?:T.Vector3;
 private wasSupported=false;
 private airborneTime=0;
 private lastVertical=0;
 private lastV=new T.Vector2();
 constructor(scene:T.Scene){
  const geometry=new T.PlaneGeometry(1,1);
  geometry.setAttribute('dustOpacity',new T.InstancedBufferAttribute(this.opacity,1));
  geometry.setAttribute('dustShade',new T.InstancedBufferAttribute(this.shades,1));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`attribute float dustOpacity; attribute float dustShade; varying vec2 uvDust; varying float alphaDust; varying float shadeDust; void main(){uvDust=uv; alphaDust=dustOpacity; shadeDust=dustShade; vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.); vec2 offset=(instanceMatrix*vec4(position.xy,0.,0.)).xy; gl_Position=projectionMatrix*(center+vec4(offset,0.,0.));}`,fragmentShader:`varying vec2 uvDust; varying float alphaDust; varying float shadeDust; void main(){vec2 p=uvDust*2.-1.; float a=atan(p.y,p.x); float r=length(p); float edge=.76+.11*sin(a*5.+shadeDust*9.)+.08*sin(a*8.-shadeDust*5.); float shape=1.-smoothstep(edge-.26,edge+.10,r); float body=1.-smoothstep(.05,.95,r); vec3 color=mix(vec3(.48,.30,.16),vec3(.83,.66,.42),clamp(p.y*.28+shadeDust*.3+.40,0.,1.)); gl_FragColor=vec4(color,shape*(.68+.32*body)*alphaDust);}`});
  this.mesh=new T.InstancedMesh(geometry,material,this.max);this.mesh.count=0;this.mesh.frustumCulled=false;scene.add(this.mesh);
 }
 reset(){this.particles.length=0;this.mesh.count=0;this.carry=0;this.previous=undefined;this.wasSupported=false;this.airborneTime=0;this.lastVertical=0;this.lastV.set(0,0);}
 private spawn(x:number,z:number,vx:number,vz:number,strong:boolean,landing=false){
  if(this.particles.length>=this.max)return;
  const speed=Math.hypot(vx,vz),dx=speed>.2?vx/speed:0,dz=speed>.2?vz/speed:1,side=(Math.random()-.5)*(landing?1.7:1.25);
  const back=landing?.1:.45+Math.random()*.6;
  const px=x-dx*back+dz*side,pz=z-dz*back-dx*side;
  if(nearestRoutePoint(px,pz).distance>4.2)return;
  const scale=(strong?1.25:1)*(0.75+Math.random()*.5);
  this.particles.push({age:0,life:.52+Math.random()*.22,x:px,y:heightAt(px,pz)+.09,z:pz,vx:(landing?dz*side:-dx*.5)+(Math.random()-.5)*.3,vz:(landing?-dx*side:-dz*.5)+(Math.random()-.5)*.3,width:1.15*scale,height:.53*scale,angle:(Math.random()-.5)*.35,spin:(Math.random()-.5)*.6,shade:Math.random()});
 }
 step(dt:number,position:T.Vector3,velocity:{x:number;y:number;z:number},supported:boolean){
  const v=new T.Vector2(velocity.x,velocity.z),speed=v.length();
  const onRoad=nearestRoutePoint(position.x,position.z).distance<4.2;
  const acceleration=v.clone().sub(this.lastV).length()/dt;
  const landing=supported&&!this.wasSupported&&this.airborneTime>.1&&this.lastVertical<-.5;
  if(supported&&onRoad){
   if(landing)for(let i=0;i<10;i++)this.spawn(position.x,position.z,v.x,v.y,true,true);
   if(speed>1.1&&this.previous&&this.wasSupported){
    const dx=position.x-this.previous.x,dz=position.z-this.previous.z,dist=Math.hypot(dx,dz);
    // Ignore discontinuities such as teleport/reset; reset clears this history too.
    if(dist<2){const spacing=.22,strong=speed>10||acceleration>12;let distance=spacing-this.carry;
     while(distance<=dist){const t=distance/(dist||1),x=this.previous.x+dx*t,z=this.previous.z+dz*t;for(let i=0;i<2;i++)this.spawn(x,z,v.x,v.y,strong);distance+=spacing;}
     this.carry=(this.carry+dist)%spacing;
    }else this.carry=0;
   }else this.carry=0;
  }else this.carry=0;
  this.previous=position.clone();this.airborneTime=supported?0:this.airborneTime+dt;this.lastVertical=velocity.y;
  this.wasSupported=supported;this.lastV.copy(v);
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=.13*dt;p.angle+=p.spin*dt;}
 }
 render(){
  this.mesh.count=this.particles.length;
  this.particles.forEach((p,i)=>{const t=p.age/p.life,s=.75+t*.5;this.dummy.position.set(p.x,p.y+p.height*s*.37,p.z);this.dummy.rotation.set(0,0,p.angle);this.dummy.scale.set(p.width*s,p.height*s,1);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.opacity[i]=.78*Math.min(1,t*12)*Math.pow(1-t,.65);this.shades[i]=p.shade;});
  this.mesh.instanceMatrix.needsUpdate=true;(this.mesh.geometry.getAttribute('dustOpacity') as T.InstancedBufferAttribute).needsUpdate=true;(this.mesh.geometry.getAttribute('dustShade') as T.InstancedBufferAttribute).needsUpdate=true;
 }
 get count(){return this.particles.length;}
}
