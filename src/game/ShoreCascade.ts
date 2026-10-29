import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {POND,heightAt} from '../core/terrain';
import {roundedStone,stoneColors,stoneMaterial} from './StoneArt';
import {makeBoulderGeometry} from './BoulderGeometry';
import {makeLeafGeometry} from './BerryArt';
export const SHORE_CASCADE={x:POND.x-10,z:POND.z+10,width:7.9,depth:5.8,crest:5.8};
/** Authored bank composition: separate weathered masses frame a shallow spring channel. */
export function addShoreCascade(scene:T.Scene,world:R.World){
 const {x,z,crest}=SHORE_CASCADE;
 // Turn the spring toward the open lake: its impact is visible beside the bridge.
 const group=new T.Group();group.position.set(x-z,0,z+x);group.rotation.y=Math.PI/2;scene.add(group);
 const worldXZ=(px:number,pz:number)=>({x:x+(pz-z),z:z-(px-x)});
 const ground=(px:number,pz:number)=>{const q=worldXZ(px,pz);return heightAt(q.x,q.z);};
 const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);
 // dx,dz,width,depth,top,lean: an irregular outcrop, never a repeated block wall.
 const masses=[[-2.55,.5,3.3,3.6,4.65,-.25],[-2.25,.2,2.8,3.0,6.3,.26,4.20],[2.4,.65,3.3,3.5,4.25,.24],[2.10,.15,2.7,2.9,5.85,-.18,3.95],[-2.0,-1.8,2.9,2.9,6.6,-.36],[2.0,-1.6,2.65,3.0,6.05,.26],[0,-.15,2.5,4.1,5.66,-.06]];
 const pieces:T.BufferGeometry[]=[],dummy=new T.Object3D();
 for(let k=0;k<masses.length;k++){
  const [dx,dz,width,depth,top,lean]=masses[k],px=x+dx,pz=z+dz,base=masses[k][6]??(ground(px,pz)-.38);
  const points:T.Vector3[]=[];
  for(let j=0;j<3;j++)for(let i=0;i<7;i++){
   const a=i/7*Math.PI*2+.16+k*.09,t=j/2,r=(j===1?1:j===0?.84:.76)+.09*Math.sin(i*2.6+k);
   points.push(new T.Vector3(Math.cos(a)*(width/2-.13)*r*(1-.03*t)+lean*t,base+(top-base-.13)*t+(j===2?.045*Math.sin(i*2+k):0),Math.sin(a)*(depth/2-.13)*r*(1-.02*t)));
  }
  const g=stoneColors(roundedStone(points,.13),top-.04);g.translate(px,0,pz);pieces.push(g);
  // Each rounded mass gets its own fitted hull. Open water and entrances stay free.
  const gp=g.getAttribute('position'),local:number[]=[];
  for(let i=0;i<gp.count;i++)local.push(gp.getX(i)-px,gp.getY(i)-base,gp.getZ(i)-pz);
  const desc=R.ColliderDesc.convexHull(new Float32Array(local));if(desc){const q=worldXZ(px,pz);world.createCollider(desc.setTranslation(q.x,base,q.z).setRotation(turn).setFriction(.85));}
 }
 const joined=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
 const cliff=new T.Mesh(joined,stoneMaterial());cliff.name='shore-cascade-outcrop';cliff.castShadow=cliff.receiveShadow=true;group.add(cliff);
 // Boulders nest against the foot, instead of exposing a clean plinth seam.
 const foot=new T.InstancedMesh(makeBoulderGeometry(2),stoneMaterial(),6);foot.name='shore-cascade-foot-stones';foot.castShadow=foot.receiveShadow=true;
 for(let i=0;i<6;i++){const px=x+(i<3?-1:1)*(2.8+(i%3)*.42),pz=z+1.4-(i%3)*.65,s=.38+(i%3)*.14;dummy.position.set(px,ground(px,pz)+s*.35,pz);dummy.rotation.set(0,i*1.7,.1*Math.sin(i));dummy.scale.set(s*1.7,s*1.15,s*1.5);dummy.updateMatrix();foot.setMatrixAt(i,dummy.matrix);}group.add(foot);
 const uniforms={time:{value:0}};
 const fallMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;varying vec2 v;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
 // Interlaced streaks travel downward at different rates, within a sculpted sheet.
 float t=time;
 float bend=.035*sin(v.y*7.-t*.8)+.025*sin(v.y*14.-t*1.2);
 float n=noise(vec2(v.x*7.+bend*8.,v.y*3.5-t*1.05));
 float fine=noise(vec2(v.x*20.+bend*12.,v.y*5.-t*1.8));
 float ribbons=pow(.5+.5*sin((v.x+bend)*24.+n*3.),5.);
 float broken=smoothstep(.28,.8,fine)*ribbons;
 float edgeWidth=.025+.045*noise(vec2(v.y*8.-t*.55,0.4));
 float edge=smoothstep(0.,edgeWidth,v.x)*smoothstep(0.,edgeWidth,1.-v.x);
 float foam=smoothstep(.76,1.,v.y)*(.40+.35*fine);
 vec3 color=mix(vec3(.08,.52,.64),vec3(.75,.94,.95),clamp(.22+n*.35+broken*.65+foam,0.,1.));
 gl_FragColor=vec4(color,edge*mix(.88,.98,n));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const front=z+2.04,bottom=POND.water+.03;
 const flowGeometry=new T.BufferGeometry(),positions:number[]=[],uv:number[]=[],indices:number[]=[],rows=40,cols=10;
 for(let j=0;j<=rows;j++){
  const t=j/rows,fall=Math.max(0,(t-.25)/.75),y=t<.25?crest-.06+(.25-t)*.10:crest-.06-(crest-.06-bottom)*fall;
  const zz=t<.25?z-1.8+t/.25*3.84:front+1.40*fall*fall;
  const width=1.12+.36*fall+.08*Math.sin(t*9);
  for(let i=0;i<=cols;i++){const u=i/cols,bow=Math.sin(u*Math.PI);positions.push(x+(u-.5)*width*2+.07*Math.sin(t*7),y+.018*bow,zz+(.16*bow+.10*Math.sin(u*12+t*4))*fall);uv.push(u,t);if(j<rows&&i<cols){const a=j*(cols+1)+i;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}}
 }
 flowGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));flowGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));flowGeometry.setIndex(indices);flowGeometry.computeVertexNormals();
 const fall=new T.Mesh(flowGeometry,fallMaterial);fall.name='shore-cascade-water';group.add(fall);
 // Raised curved ribbons break up the flat sheet, batched in one mesh.
 const rp:number[]=[],ru:number[]=[],ri:number[]=[],ribbonCount=7,ribbonRows=32,ribbonCols=6;
 for(let k=0;k<ribbonCount;k++)for(let j=0;j<=ribbonRows;j++){
  const t=j/ribbonRows,u=(k+.5)/ribbonCount,spread=1.08+.35*t;
  const cx=x+(u-.5)*2*spread+.07*Math.sin(t*6+k*1.4);
  const y=crest-.08-(crest-.08-bottom)*t,cz=front+1.40*t*t+.14+.13*Math.sin(k*1.7);
  const width=(.13+.045*(k%3))*(.8+.3*t);
  for(let i=0;i<=ribbonCols;i++){
   const v=i/ribbonCols,bulge=Math.sin(v*Math.PI);
   rp.push(cx+(v-.5)*width*2,y,cz+bulge*(.12+.10*t));ru.push(v,t+k*.13);
   if(j<ribbonRows&&i<ribbonCols){const q=k*(ribbonRows+1)*(ribbonCols+1)+j*(ribbonCols+1)+i;ri.push(q,q+ribbonCols+1,q+1,q+1,q+ribbonCols+1,q+ribbonCols+2);}
  }
 }
 const ribbons=new T.BufferGeometry();ribbons.setAttribute('position',new T.Float32BufferAttribute(rp,3));ribbons.setAttribute('uv',new T.Float32BufferAttribute(ru,2));ribbons.setIndex(ri);ribbons.computeVertexNormals();
 const ribbonMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 v;void main(){float edge=pow(max(0.,sin(v.x*3.14159)),.55);float streak=.5+.5*sin(v.y*18.-time*4.+sin(v.y*7.)*.8);float shine=smoothstep(.35,.95,streak);vec3 c=mix(vec3(.23,.68,.76),vec3(.95,1.,1.),.65+shine*.3);gl_FragColor=vec4(c,edge*(.62+shine*.35));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const ribbonMesh=new T.Mesh(ribbons,ribbonMat);ribbonMesh.name='shore-cascade-raised-streams';group.add(ribbonMesh);
 // A low, irregular foam patch: dissipating cells rather than beads or a circular hoop.
 const impact=new T.Mesh(new T.PlaneGeometry(4.7,3.4,1,1),new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;varying vec2 v;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){vec2 p=v-.5;float n=noise(v*7.+vec2(0,time*.22));float area=1.-smoothstep(.16,.50,length(p*vec2(1.,1.18))+(n-.5)*.17);float cells=smoothstep(.32,.67,n);gl_FragColor=vec4(vec3(.78,.95,.90),area*(.35+cells*.55));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));impact.rotation.x=-Math.PI/2;impact.position.set(x,bottom+.01,front+1.6);impact.name='shore-cascade-foam';group.add(impact);
 const drops=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#c7efea',roughness:.25,transparent:true,opacity:.72,depthWrite:false}),28);drops.name='shore-cascade-spray';group.add(drops);
 // Shallow, irregular foam mounds mask the cut at the base of the fall.
 // They share one material and geometry and have no colliders.
 const foam=new T.InstancedMesh(new T.SphereGeometry(1,10,6),new T.MeshBasicMaterial({color:'#e3fffa',transparent:true,opacity:.86,depthWrite:false}),19);
 foam.name='shore-cascade-foam-clusters';group.add(foam);
 // Small trailing plants grow from the actual top rim, with the spring channel clear.
 const plants=new T.InstancedMesh(makeLeafGeometry(7,4),new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),72),axis=new T.Vector3(0,0,1);
 for(let i=0;i<12;i++){
  const side=i<6?-1:1,k=i%6,px=x+side*(2.15+.38*Math.sin(k*2.1)),pz=z+.7+Math.cos(k*2.4)*.58,py=side<0?6.25:5.78;
  for(let j=0;j<6;j++){const a=j*2.399+i;dummy.position.set(px,py,pz);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),.35+(j%3)*.4,Math.sin(a)).normalize());dummy.scale.setScalar(.28+(j%3)*.045);dummy.updateMatrix();plants.setMatrixAt(i*6+j,dummy.matrix);}
 }plants.name='shore-cascade-rim-plants';group.add(plants);
 let elapsed=0;
 return {update(dt:number){elapsed+=dt;uniforms.time.value=elapsed;for(let i=0;i<28;i++){const t=(elapsed*.8+i*.618)%1,a=i*2.39996,r=.15+t*1.1;dummy.position.set(x+Math.cos(a)*r,bottom+Math.sin(t*Math.PI)*(.25+(i%3)*.14),front+1.51+Math.sin(a)*r*.5);dummy.rotation.set(0,0,i);const s=(.035+(i%3)*.012)*(1-t);dummy.scale.set(s,s*1.5,s);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;
  for(let i=0;i<19;i++){const a=i*2.39996,r=Math.sqrt(i/19)*1.55,phase=elapsed*.9+i*1.7,s=.24+(i%4)*.035;dummy.position.set(x+Math.cos(a)*r,bottom+.04+Math.sin(phase)*.012,front+1.45+Math.sin(a)*r*.52);dummy.rotation.set(0,a,0);dummy.scale.set(s*1.4,.06+.02*(i%3),s*.72);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);}foam.instanceMatrix.needsUpdate=true;
 }};
}
