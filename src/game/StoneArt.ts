import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

/** Bevel a sculpted convex core, retaining large planes instead of a triangulated sphere. */
export function roundedStone(core:T.Vector3[],bevel:number){
 const directions=[new T.Vector3(0,1,0),new T.Vector3(0,-1,0)];
 for(let y=-1;y<=1;y++)for(let i=0;i<12;i++){const a=i*Math.PI/6;directions.push(new T.Vector3(Math.cos(a),y*.8,Math.sin(a)).normalize());}
 const points=core.flatMap(p=>directions.map(d=>p.clone().addScaledVector(d,bevel)));
 const raw=new ConvexGeometry(points),g=toCreasedNormals(raw,Math.PI/2);raw.dispose();return g;
}
export function stoneColors(g:T.BufferGeometry,top?:number){
 g.computeBoundingBox();const bounds=g.boundingBox!,span=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),colors:number[]=[],coords:number[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),m=.5+.5*Math.sin(x*1.9+Math.sin(z*2.1)+y*.8);
  const c=new T.Color('#9f8e74').lerp(new T.Color('#dcd0b8'),m*.55+.25);
  // Warm feet and lighter upper planes give each stone a readable grounded mass.
  c.multiplyScalar(.84+.16*Math.max(0,n.getY(i)));
  if(top!==undefined&&(n.getY(i)>.72||y>top-.11+.035*Math.sin(x*7+z*5))){
   c.copy(new T.Color('#699c32').lerp(new T.Color('#a8ca50'),.3+.5*Math.max(0,n.getY(i))));
  }
  colors.push(c.r,c.g,c.b);coords.push((x-center.x)/span.x*2,(y-center.y)/span.y*2,(z-center.z)/span.z*2);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('stoneCoord',new T.Float32BufferAttribute(coords,3));return g;
}
export function stoneMaterial(){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 stoneCoord;varying vec3 stonePoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nstonePoint=stoneCoord;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 stonePoint;').replace('#include <color_fragment>',`#include <color_fragment>
   float mottling=sin(stonePoint.x*3.1+sin(stonePoint.z*2.7))*sin(stonePoint.y*3.8+stonePoint.z);
   diffuseColor.rgb*=.985+.025*mottling;
   float curve=.16+.10*sin(stonePoint.y*4.1+stonePoint.z);
   float crack=(1.-smoothstep(.003,.012,abs(stonePoint.x-curve)))*smoothstep(-.65,-.40,stonePoint.y)*(1.-smoothstep(.28,.55,stonePoint.y));
   float branch=(1.-smoothstep(.003,.010,abs(stonePoint.x-curve-(stonePoint.y+.05)*.55)))*smoothstep(-.05,.02,stonePoint.y)*(1.-smoothstep(.18,.27,stonePoint.y));
   diffuseColor.rgb*=1.-min(1.,crack+branch)*smoothstep(.55,.80,abs(stonePoint.z))*.25;
  `);
 };
 m.customProgramCacheKey=()=> 'valley-warm-stone-v1';return m;
}
