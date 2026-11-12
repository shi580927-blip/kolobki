import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {STONE_RELIEF_GLSL} from './StoneRelief';

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
  const c=new T.Color('#b29e87').lerp(new T.Color('#ebd9be'),m*.45+.35);
  // Warm feet and lighter upper planes give each stone a readable grounded mass.
  c.multiplyScalar(.91+.09*Math.max(0,n.getY(i)));
  if(top!==undefined&&(n.getY(i)>.72||y>top-.11+.035*Math.sin(x*7+z*5))){
   c.copy(new T.Color('#5c9a2e').lerp(new T.Color('#b3cf4a'),.3+.5*Math.max(0,n.getY(i))));
  }
  colors.push(c.r,c.g,c.b);coords.push((x-center.x)/span.x*2,(y-center.y)/span.y*2,(z-center.z)/span.z*2);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('stoneCoord',new T.Float32BufferAttribute(coords,3));return g;
}
export function stoneMaterial(arches:readonly {x:number;y:number;z:number;rx:number;ry:number}[]=[]){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 m.onBeforeCompile=s=>{
  s.uniforms.stoneArchCount={value:arches.length};
  s.uniforms.stoneArch0={value:new T.Vector4(arches[0]?.x??0,arches[0]?.y??0,arches[0]?.z??0,arches[0]?.rx??1)};
  s.uniforms.stoneArch1={value:new T.Vector4(arches[1]?.x??0,arches[1]?.y??0,arches[1]?.z??0,arches[1]?.rx??1)};
  s.uniforms.stoneArchY={value:new T.Vector2(arches[0]?.ry??1,arches[1]?.ry??1)};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 stoneWorld;').replace('#include <project_vertex>',`vec4 stoneVertex=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    stoneVertex=instanceMatrix*stoneVertex;
   #endif
   stoneWorld=(modelMatrix*stoneVertex).xyz;
   #include <project_vertex>`);
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 stoneWorld;uniform float stoneArchCount;uniform vec4 stoneArch0;uniform vec4 stoneArch1;uniform vec2 stoneArchY;\n'+STONE_RELIEF_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 front=stoneWorld.xy;
   for(int i=0;i<2;i++){
    vec4 frame=i==0?stoneArch0:stoneArch1;float ry=i==0?stoneArchY.x:stoneArchY.y;
    if(float(i)<stoneArchCount&&abs(stoneWorld.z-frame.z)<8.&&abs(stoneWorld.x-frame.x)<frame.w*1.5&&stoneWorld.y>frame.y){
     vec2 q=vec2((stoneWorld.x-frame.x)/frame.w,(stoneWorld.y-frame.y)/ry);
     front=vec2(atan(q.x,q.y)*4.5,length(q)*4.5);
    }
   }
   vec3 stoneNormalWorld=normalize(cross(dFdx(stoneWorld),dFdy(stoneWorld)));
   vec3 plate=stoneRelief(stoneWorld,stoneNormalWorld,front);
   float bareStone=1.-smoothstep(.015,.11,diffuseColor.g-diffuseColor.r);
   diffuseColor.rgb*=mix(1.,plate.y,bareStone);
   float footprint=max(length(dFdx(stoneWorld)),length(dFdy(stoneWorld)));
   float stoneHeight=plate.x*.14*bareStone*(1.-smoothstep(.08,.5,footprint));
  `).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=stoneReliefNormal(-vViewPosition,normal,stoneHeight);');
 };
 m.customProgramCacheKey=()=> 'valley-stone-plates-v2';return m;
}
/** Open cliffs are natural rock; the cut-stone joints belong only on ruins and arches. */
export function naturalCliffMaterial(){return new T.MeshStandardMaterial({vertexColors:true,roughness:1});}
