import * as T from 'three';
import {shoreSandGLSL} from '../core/shore';
/** Contact shading is part of the opaque ground, never a translucent disc/plane. */
export function makeGroundLighting(){
 const contacts=Array.from({length:11},()=>new T.Vector4(0,0,0,0));
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.groundContacts={value:contacts};
  shader.uniforms.beachColor={value:new T.Color('#e5c891')};
  shader.uniforms.mountainStone={value:new T.Color('#cbbca4')};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;').replace('#include <project_vertex>','contactWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 contactWorld;uniform vec4 groundContacts[11];uniform vec3 beachColor;uniform vec3 mountainStone;\n'+shoreSandGLSL).replace('#include <color_fragment>',`#include <color_fragment>
   // World-space exposed rock follows the actual slope. No extra surface or
   // collision layer: the same terrain triangles carry grass and stone.
   vec3 groundNormal=normalize(cross(dFdx(contactWorld),dFdy(contactWorld)));
   float cliffZone=1.-smoothstep(11.,23.,length(contactWorld.xz-vec2(-77.,34.)));
   // The rock belongs to the same terrain triangles and collider as the hill.
   // Gentle approaches stay grassy; only the steep edge exposes stone.
   float exposed=(1.-smoothstep(.38,.65,abs(groundNormal.y)))*cliffZone;
   float strata=.5+.5*sin(contactWorld.y*.31+sin(contactWorld.x*.055+contactWorld.z*.043)*1.1);
   float stoneGrain=sin(dot(contactWorld,vec3(.73,.31,.59)))*sin(dot(contactWorld,vec3(.42,-.53,.81)));
   // Uneven four-to-five-sided plates in world space, without separate blocks.
   vec3 n=abs(groundNormal);vec2 cliffUV=mix(contactWorld.zy,contactWorld.xy,step(n.x,n.z))*.38;
   vec2 cell=floor(cliffUV),f=fract(cliffUV);
   float uneven=.055*sin(cell.x*7.1+cell.y*4.3+f.y*9.)+.035*sin(cell.y*9.7+f.x*12.);
   vec2 sides=min(f,1.-f);
   float corner=(f.x+f.y-.17-uneven)*.707;
   float joint=min(min(sides.x+uneven,sides.y-uneven),corner);
   float bevel=smoothstep(.025,.15,joint);
   float cellTint=.5+.5*sin(dot(cell,vec2(12.7,7.3)));
   vec3 cliffColor=mountainStone*(.81+.12*strata+.09*cellTint+.045*stoneGrain)*mix(.72,1.,bevel);
   diffuseColor.rgb=mix(diffuseColor.rgb,cliffColor,exposed);
   float sand=shoreSand(contactWorld.xz);
   float sandMottle=sin(contactWorld.x*.65+sin(contactWorld.z*.42))*sin(contactWorld.z*.83);
   diffuseColor.rgb=mix(diffuseColor.rgb,beachColor*(1.+sandMottle*.045),sand);
   // Subtle broad mottling and fine grain; derivatives suppress distant shimmer.
   vec3 surface=contactWorld*38.;
   float grainX=fract(sin(dot(floor(surface.yz),vec2(12.9898,78.233)))*43758.5453);
   float grainY=fract(sin(dot(floor(surface.xz),vec2(12.9898,78.233)))*43758.5453);
   float grainZ=fract(sin(dot(floor(surface.xy),vec2(12.9898,78.233)))*43758.5453);
   vec3 weights=abs(groundNormal);weights/=max(.001,weights.x+weights.y+weights.z);
   float grain=dot(vec3(grainX,grainY,grainZ),weights);
   float footprint=max(length(dFdx(contactWorld)),length(dFdy(contactWorld)));
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
  `);
 };
 material.customProgramCacheKey=()=> 'valley-ground-meadow-v8';
 return {material,setContacts(positions:readonly T.Vector3[]){contacts.forEach((c,i)=>{const p=positions[i];if(p)c.set(p.x,p.y,p.z,1);else c.w=0;});}};
}
