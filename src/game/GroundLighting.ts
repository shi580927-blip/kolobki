import * as T from 'three';
/** Contact shading is part of the opaque ground, never a translucent disc/plane. */
export function makeGroundLighting(){
 const contacts=Array.from({length:11},()=>new T.Vector4(0,0,0,0));
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.groundContacts={value:contacts};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;').replace('#include <project_vertex>','contactWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;uniform vec4 groundContacts[11];').replace('#include <color_fragment>',`#include <color_fragment>
   // Subtle broad mottling and fine grain; derivatives suppress distant shimmer.
   float grain=fract(sin(dot(floor(contactWorld.xz*38.),vec2(12.9898,78.233)))*43758.5453);
   float footprint=max(length(dFdx(contactWorld.xz)),length(dFdy(contactWorld.xz)));
   float detail=1.-smoothstep(.02,.10,footprint);
   float flecks=sin(contactWorld.x*.91+sin(contactWorld.z*.63))*sin(contactWorld.z*1.13+cos(contactWorld.x*.52));
   diffuseColor.rgb*=.95+grain*.09*detail+flecks*.035;
   float contactShade=0.;
   for(int i=0;i<11;i++){
    vec4 c=groundContacts[i];
    if(c.w>0.){
     float gap=max(0.,distance(contactWorld,c.xyz)-c.w);
     contactShade=max(contactShade,exp(-gap*10.)*.30);
    }
   }
   diffuseColor.rgb*=1.-contactShade;
  `);
 };
 material.customProgramCacheKey=()=> 'valley-ground-contact-v2';
 return {material,setContacts(positions:readonly T.Vector3[]){contacts.forEach((c,i)=>{const p=positions[i];if(p)c.set(p.x,p.y,p.z,1);else c.w=0;});}};
}
