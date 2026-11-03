import * as T from 'three';
import {shoreSandGLSL} from '../core/shore';
import {STONE_RELIEF_GLSL} from './StoneRelief';
/** Contact shading is part of the opaque ground, never a translucent disc/plane. */
export function makeGroundLighting(){
 const contacts=Array.from({length:11},()=>new T.Vector4(0,0,0,0));
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.groundContacts={value:contacts};
  shader.uniforms.beachColor={value:new T.Color('#e5c891')};
  shader.uniforms.mountainStone={value:new T.Color('#cbbca4')};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;').replace('#include <project_vertex>','contactWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;uniform vec4 groundContacts[11];uniform vec3 beachColor;uniform vec3 mountainStone;\n'+shoreSandGLSL+STONE_RELIEF_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
   // World-space exposed rock follows the actual slope. No extra surface or
   // collision layer: the same terrain triangles carry grass and stone.
   vec3 groundNormal=normalize(cross(dFdx(contactWorld),dFdy(contactWorld)));
   float mountainZone=smoothstep(124.,144.,length(contactWorld.xz));
   float exposed=(1.-smoothstep(.58,.85,abs(groundNormal.y)))*mountainZone;
   float strata=.5+.5*sin(contactWorld.y*.61+sin(contactWorld.x*.035+contactWorld.z*.04)*1.2);
   float seams=sin(contactWorld.x*.19+sin(contactWorld.z*.073)*2.+contactWorld.y*.055);
   float fracture=(1.-smoothstep(.015,.075,abs(seams)))*( .35+.65*strata);
   diffuseColor.rgb=mix(diffuseColor.rgb,mountainStone*(.89+.13*strata-.12*fracture),exposed);
   float mountainReliefHeight=0.;
   if(exposed>.02){vec3 plate=stoneRelief(contactWorld,groundNormal,contactWorld.xy);diffuseColor.rgb*=mix(1.,plate.y,exposed);mountainReliefHeight=plate.x*.12*exposed*(1.-smoothstep(.08,.5,max(length(dFdx(contactWorld)),length(dFdy(contactWorld)))));}
   float sand=shoreSand(contactWorld.xz);
   float sandMottle=sin(contactWorld.x*.65+sin(contactWorld.z*.42))*sin(contactWorld.z*.83);
   diffuseColor.rgb=mix(diffuseColor.rgb,beachColor*(1.+sandMottle*.045),sand);
   // Subtle broad mottling and fine grain; derivatives suppress distant shimmer.
   float grain=fract(sin(dot(floor(contactWorld.xz*38.),vec2(12.9898,78.233)))*43758.5453);
   float footprint=max(length(dFdx(contactWorld.xz)),length(dFdy(contactWorld.xz)));
   float detail=1.-smoothstep(.02,.10,footprint);
   float flecks=sin(contactWorld.x*.91+sin(contactWorld.z*.63))*sin(contactWorld.z*1.13+cos(contactWorld.x*.52));
   float broad=sin(contactWorld.x*1.7+sin(contactWorld.z*.8))*sin(contactWorld.z*2.1+sin(contactWorld.x*.6));
   diffuseColor.rgb*=.94+grain*.10*detail+flecks*.045+broad*.035;
   float contactShade=0.;
   for(int i=0;i<11;i++){
    vec4 c=groundContacts[i];
    if(c.w>0.){
     float gap=max(0.,distance(contactWorld,c.xyz)-c.w);
     contactShade=max(contactShade,exp(-gap*10.)*.30);
    }
   }
   diffuseColor.rgb*=1.-contactShade;
  `).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=stoneReliefNormal(-vViewPosition,normal,mountainReliefHeight);');
 };
 material.customProgramCacheKey=()=> 'valley-ground-stoneplates-v5';
 return {material,setContacts(positions:readonly T.Vector3[]){contacts.forEach((c,i)=>{const p=positions[i];if(p)c.set(p.x,p.y,p.z,1);else c.w=0;});}};
}
