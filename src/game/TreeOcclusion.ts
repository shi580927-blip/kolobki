import {MeshStandardMaterial,Vector3} from 'three';
/** Screen-door cutaway preserves opaque depth sorting and the existing instancing budget. */
export function treeOcclusion(materials:MeshStandardMaterial[]){
 const start={value:new Vector3()},end={value:new Vector3()};
 for(const material of materials){
  material.onBeforeCompile=shader=>{
   shader.uniforms.treeViewStart=start;shader.uniforms.treeViewEnd=end;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 treeWorld;').replace('#include <project_vertex>',`vec4 treePoint=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    treePoint=instanceMatrix*treePoint;
   #endif
   treeWorld=(modelMatrix*treePoint).xyz;
   #include <project_vertex>`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 treeWorld;\nuniform vec3 treeViewStart;\nuniform vec3 treeViewEnd;').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    vec3 treeRay=treeViewEnd-treeViewStart;
    float treeLength=dot(treeRay,treeRay);
    float treeT=dot(treeWorld-treeViewStart,treeRay)/max(.001,treeLength);
    if(treeLength>1.&&treeT>.03&&treeT<1.){
      float treeDistance=length(treeWorld-treeViewStart-treeRay*treeT);
      float visibility=1.-(1.-smoothstep(.85,1.65,treeDistance))*.98;
      float pattern=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
      if(pattern>visibility)discard;
    }`);
  };
  material.customProgramCacheKey=()=> 'tree-view-cutaway-v1';
 }
 return (hero:Vector3,camera:Vector3)=>{start.value.copy(hero).y+=.7;end.value.copy(camera);};
}
