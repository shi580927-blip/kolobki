import * as T from 'three';
import {randomFrom} from '../core/skin';
import {limitProtrusions,DETAIL_LIMITS,type SkinDesign} from './SkinDesign';
export const FUR_LAYERS=8;
/** A few fine shells form a continuous short coat instead of separate spikes. */
export function makeFurGeometry(_seed:number,_curly=false){
 const geometry=new T.SphereGeometry(1,48,32);
 geometry.setAttribute('coatLayer',new T.InstancedBufferAttribute(Float32Array.from({length:FUR_LAYERS},(_,i)=>(i+1)/FUR_LAYERS),1));return geometry;
}
export function makeFurUndercoat(seed:number){
 const r=randomFrom(seed^0x3975),data=new Uint8Array(128*64*4);
 for(let i=0;i<data.length;i+=4){const value=105+Math.floor(r()*95);data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;}
 const texture=new T.DataTexture(data,128,64);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(8,4);texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}
export class FurTufts extends T.InstancedMesh<T.BufferGeometry,T.MeshStandardMaterial>{
 readonly coatUniforms:{faceFrame:{value:T.Matrix3};height:{value:number};density:{value:number};curl:{value:number};seed:{value:number};scatter:{value:number}};
 constructor(readonly design:SkinDesign){
  design=limitProtrusions(design);
  const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.95,transparent:true,depthWrite:false,alphaTest:.015});
  super(makeFurGeometry(design.seed),material,FUR_LAYERS);
  this.coatUniforms={faceFrame:{value:new T.Matrix3()},height:{value:Math.min(DETAIL_LIMITS.furHeight,design.furLength*(design.surface==='fuzz'?.65:1))},density:{value:design.furCount/160},curl:{value:design.surface==='shaggy'?1:0},seed:{value:(design.seed%997)/997*11},scatter:{value:design.furScatter}};
  const base=new T.Color(design.base),accent=new T.Color(design.surfaceAccent?design.accent:design.base),color=new T.Color();
  for(let i=0;i<FUR_LAYERS;i++){this.setMatrixAt(i,new T.Matrix4());this.setColorAt(i,color.copy(base).lerp(accent,T.MathUtils.smoothstep((i+1)/FUR_LAYERS,.15,.8)));}
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{coatFaceFrame:this.coatUniforms.faceFrame,coatHeight:this.coatUniforms.height,coatDensity:this.coatUniforms.density,coatCurl:this.coatUniforms.curl,coatSeed:this.coatUniforms.seed,coatScatter:this.coatUniforms.scatter});
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    attribute float coatLayer;uniform mat3 coatFaceFrame;uniform float coatHeight;uniform float coatScatter;
    varying vec3 vCoatPosition;varying float vCoatLayer;varying float vCoatClear;`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 direction=normalize(position);vec3 faceDirection=coatFaceFrame*direction;
    float clearance=1.-smoothstep(.48,.8,faceDirection.z)*(1.-smoothstep(.58,.86,abs(faceDirection.y)));
    float lengthVariation=1.-coatScatter*.10*(1.+sin(dot(direction,vec3(17.,29.,13.))));
    transformed=direction*(1.+coatLayer*coatHeight*clearance*lengthVariation);
    vCoatPosition=direction;vCoatLayer=coatLayer;vCoatClear=clearance;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 vCoatPosition;varying float vCoatLayer;varying float vCoatClear;
    uniform float coatDensity;uniform float coatCurl;uniform float coatSeed;
    float coatHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float coatNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(coatHash(i),coatHash(i+vec3(1,0,0)),f.x),mix(coatHash(i+vec3(0,1,0)),coatHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(coatHash(i+vec3(0,0,1)),coatHash(i+vec3(1,0,1)),f.x),mix(coatHash(i+vec3(0,1,1)),coatHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
    .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 strandPosition=vCoatPosition*145.+vec3(coatSeed);
    strandPosition+=coatCurl*.35*vec3(sin(vCoatLayer*6.),cos(vCoatLayer*6.),0.);
    float grain=coatNoise(strandPosition);
    float footprint=max(length(dFdx(strandPosition)),length(dFdy(strandPosition)));
    grain=mix(grain,coatNoise(strandPosition*.35),smoothstep(.7,2.,footprint));
    float threshold=mix(.06,.82,vCoatLayer)-coatDensity*.10;
    diffuseColor.a*=smoothstep(threshold,threshold+.12,grain)*.48*vCoatClear;`);
  };
  material.customProgramCacheKey=()=> 'sharobesy-short-coat-v1';
  this.castShadow=false;this.receiveShadow=false;this.frustumCulled=false;this.updateTufts(new T.Quaternion());
 }
 updateTufts(faceRelativeBodyRotation:T.Quaternion){this.coatUniforms.faceFrame.value.setFromMatrix4(new T.Matrix4().makeRotationFromQuaternion(faceRelativeBodyRotation));}
 release(){this.geometry.dispose();this.material.dispose();this.dispose();}
}
