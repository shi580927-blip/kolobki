import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {POND,heightAt} from '../core/terrain';

/** A single solid bank outcrop, with a decorative spring returning to the existing pond. */
export const SHORE_CASCADE={x:POND.x,z:POND.z-7.8,width:5.6,depth:4.2,crest:5.8};
export function addShoreCascade(scene:T.Scene,world:R.World){
 const {x,z,crest}=SHORE_CASCADE,ground=heightAt(x,z)-.35;
 const points:T.Vector3[]=[];
 // The uneven rim is shared by rock and turf: no separate green lid hovering above it.
 const rim:T.Vector3[]=[];
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,r=1+.09*Math.sin(i*2.7);
  points.push(new T.Vector3(x+Math.cos(a)*3.15*r,ground,z+Math.sin(a)*2.5*r));
  rim.push(new T.Vector3(x+Math.cos(a)*2.65*r,crest-.10*Math.abs(Math.sin(i*1.7)),z+Math.sin(a)*2.0*r));
 }
 points.push(...rim);
 const hull=new ConvexGeometry(points),p=hull.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){
  const face=Math.floor(i/3)*3,isTop=hull.getAttribute('normal').getY(face)>.75;
  const h=p.getY(i),v=T.MathUtils.clamp((h-ground)/(crest-ground),0,1);
  const c=new T.Color('#958775').lerp(new T.Color('#e2d2b2'),v*.85);
  if(isTop)c.copy(new T.Color('#91c64c').lerp(new T.Color('#b0d85b'),.5+.5*Math.sin(p.getX(i)+p.getZ(i))));
  const tint=.97+.035*Math.sin(p.getX(i)*2.1+p.getZ(i)*1.8);c.multiplyScalar(tint);colors.push(c.r,c.g,c.b);
 }
 hull.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const rock=new T.Mesh(hull,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));rock.name='shore-cascade-outcrop';rock.castShadow=rock.receiveShadow=true;scene.add(rock);
 const collider=R.ColliderDesc.convexHull(new Float32Array(points.flatMap(v=>[v.x-x,v.y-ground,v.z-z])));
 if(collider)world.createCollider(collider.setTranslation(x,ground,z).setFriction(.85));
 // One curved ribbon follows the lip, falls, and meets the pond. No moving rectangle sprites.
 const curtain=new T.BufferGeometry(),pos:number[]=[],uv:number[]=[],indices:number[]=[];
 const front=z+2.03,bottom=POND.water+.025;
 const rows=24;
 for(let j=0;j<=rows;j++){
  const t=j/rows,y=crest+.045-(crest-bottom)*t,zz=front+1.35*t*t,w=.70+.32*t+.045*Math.sin(t*11);
  for(const side of [-1,1]){pos.push(x+side*w,y,zz);uv.push((side+1)/2,t);}
  if(j<rows){const a=j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 curtain.setAttribute('position',new T.Float32BufferAttribute(pos,3));curtain.setAttribute('uv',new T.Float32BufferAttribute(uv,2));curtain.setIndex(indices);curtain.computeVertexNormals();
 const uniforms={time:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 v;void main(){float edge=smoothstep(0.,.12,v.x)*smoothstep(0.,.12,1.-v.x);float lanes=.5+.5*sin(v.x*37.+sin(v.y*5.-time*3.)*.5);float flow=.5+.5*sin(v.y*31.-time*5.+v.x*9.);float light=.25+lanes*.28+flow*.10;vec3 c=mix(vec3(.19,.68,.76),vec3(.89,.98,1.),light);float foam=smoothstep(.84,1.,v.y);gl_FragColor=vec4(mix(c,vec3(.87,.97,.96),foam*.8),edge*(.76+lanes*.17));}`});
 const fall=new T.Mesh(curtain,mat);fall.name='shore-cascade-water';scene.add(fall);
 // Static upper spring, hidden behind the lip rather than a new swimmable lake.
 const source=new T.Mesh(new T.CircleGeometry(.85,24),new T.MeshStandardMaterial({color:'#73d2ce',roughness:.28,transparent:true,opacity:.9}));source.rotation.x=-Math.PI/2;source.scale.set(1,1.45,1);source.position.set(x,crest+.04,z+1.1);source.name='shore-cascade-spring';scene.add(source);
 const foam=new T.InstancedMesh(new T.SphereGeometry(1,8,5),new T.MeshStandardMaterial({color:'#d7f6ef',roughness:.9,transparent:true,opacity:.72,depthWrite:false}),10),d=new T.Object3D();foam.name='shore-cascade-foam';scene.add(foam);
 let elapsed=0;
 return {update(dt:number){elapsed+=dt;uniforms.time.value=elapsed;for(let i=0;i<10;i++){const a=i*2.39996,r=.25+(i%3)*.19;d.position.set(x+Math.cos(a)*r,bottom+.015,front+1.42+Math.sin(a)*r*.6);d.scale.set(.24+.035*Math.sin(elapsed*2+i),.035,.16);d.updateMatrix();foam.setMatrixAt(i,d.matrix);}foam.instanceMatrix.needsUpdate=true;}};
}
