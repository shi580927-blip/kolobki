import * as T from 'three';
import {POND} from '../core/terrain';

/** Transparent atlas features render after water. Clip their actual world
 * surface below the lagoon so submerged eyes/mouth cannot float over it. */
export function clipFaceToWater(root:T.Object3D){
 const uniforms={waterPond:{value:new T.Vector4(POND.x,POND.z,POND.radius,POND.flare)},waterLevel:{value:POND.water}};
 const declaration='varying vec3 waterWorld;uniform vec4 waterPond;uniform float waterLevel;\n';
 const clip=`if(waterWorld.y<waterLevel){vec2 d=waterWorld.xz-waterPond.xy;float a=atan(d.y,d.x);float s=max(0.,sin(a));float r=waterPond.z*(.96+.045*sin(a*3.+.4)+.025*sin(a*5.-1.))*(1.+waterPond.w*s*s);if(length(d)<r)discard;}`;
 const seen=new Set<T.Material>();
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
  if(seen.has(m))continue;seen.add(m);
  if(m instanceof T.ShaderMaterial){
   Object.assign(m.uniforms,uniforms);
   m.vertexShader='varying vec3 waterWorld;\n'+m.vertexShader.replace(/void main\s*\(\)\s*\{/,'void main(){waterWorld=(modelMatrix*vec4(position,1.)).xyz;');
   m.fragmentShader=declaration+m.fragmentShader.replace(/void main\s*\(\)\s*\{/,'void main(){'+clip);
  }else if(m instanceof T.MeshBasicMaterial || m instanceof T.MeshStandardMaterial){
   const previous=m.onBeforeCompile;
   m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 waterWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nwaterWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+declaration).replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+clip);
   };m.customProgramCacheKey=()=> 'face-lagoon-clip-v1';
  }
  m.needsUpdate=true;
 }});
}
