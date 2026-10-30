import * as T from 'three';
import {POND,heightAt,pondRadius} from '../core/terrain';
/** Subdivided in world X/Z so depth, shore contour and physical water share coordinates. */
export function pondWaterGeometry(){
 const pos:number[]=[POND.x,POND.water,POND.z],depth:number[]=[POND.water-heightAt(POND.x,POND.z)],index:number[]=[],rings=32,segments=128;
 for(let j=1;j<=rings;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,r=pondRadius(a)*j/rings,x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r;
  pos.push(x,POND.water,z);depth.push(POND.water-heightAt(x,z));
  const k=1+(j-1)*(segments+1)+i;
  if(i<segments){if(j===1)index.push(0,k+1,k);if(j<rings)index.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('waterDepth',new T.Float32BufferAttribute(depth,1));g.setIndex(index);g.computeVertexNormals();return g;
}
/** Normal field with independent smooth noise in alpha; generated once, two shared samples. */
export function waterNormalTexture(size=128){
 const bytes=new Uint8Array(size*size*4),tau=Math.PI*2;
 const height=(x:number,y:number)=>Math.sin(tau*(x*3+y*2))*.40+Math.sin(tau*(x*5-y*3)+1.7)*.20+Math.cos(tau*(x*2-y*5)+.4)*.16+Math.sin(tau*(x*7+y*4)+2.1)*.07;
 const fract=(n:number)=>n-Math.floor(n);
 const noise=(x:number,y:number,grid:number)=>{
  const px=x*grid,py=y*grid,ix=Math.floor(px),iy=Math.floor(py),fx=fract(px),fy=fract(py),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const hash=(i:number,j:number)=>fract(Math.sin(((i%grid+grid)%grid)*127.1+((j%grid+grid)%grid)*311.7+19.3)*43758.5453);
  const a=hash(ix,iy)*(1-u)+hash(ix+1,iy)*u,b=hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u;
  return a*(1-v)+b*v;
 };
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  const x=i/size,y=j/size,dx=(height(x+1/size,y)-height(x-1/size,y))*1.2,dy=(height(x,y+1/size)-height(x,y-1/size))*1.2;
  const n=new T.Vector3(-dx,-dy,1).normalize(),k=(j*size+i)*4;
  bytes[k]=Math.round((n.x*.5+.5)*255);bytes[k+1]=Math.round((n.y*.5+.5)*255);bytes[k+2]=Math.round((n.z*.5+.5)*255);bytes[k+3]=Math.round((noise(x,y,16)*.72+noise(x,y,32)*.28)*255);
 }
 const texture=new T.DataTexture(bytes,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function addPondWater(scene:T.Scene){
 const uniforms={time:{value:0},normalField:{value:waterNormalTexture()}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`attribute float waterDepth;varying float depth;varying vec3 w;void main(){w=position;depth=waterDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;uniform sampler2D normalField;varying float depth;varying vec3 w;
 void main(){
 if(depth<.002)discard;
 vec2 p=w.xz;
 vec4 fieldA=texture2D(normalField,p*vec2(.085,.22)+vec2(time*.003,-time*.006));
 vec4 fieldB=texture2D(normalField,vec2(p.y,-p.x)*vec2(.21,.17)+vec2(-time*.004,time*.005));
 vec3 a=fieldA.xyz*2.-1.,b=fieldB.xyz*2.-1.;
 float shallow=smoothstep(.015,.20,depth);
 vec3 n=normalize(vec3((a.x+b.x)*shallow*.055,1.,(a.y+b.y)*shallow*.055));
 vec3 view=normalize(cameraPosition-w);
 float facing=clamp(dot(view,n),0.,1.);
 float fresnel=.025+.975*pow(1.-facing,5.);
 vec3 reflected=reflect(-view,n);
 // Lightweight sky reflection, no additional rendering of the whole scene.
 vec3 sky=mix(vec3(.43,.69,.76),vec3(.16,.43,.68),smoothstep(0.,.85,reflected.y));

 float d=smoothstep(.035,.34,depth);
 vec3 water=mix(vec3(.045,.56,.46),vec3(.002,.28,.56),d);
 vec3 color=mix(water,sky,fresnel*.32);
 // Thin, irregular isocontours, broken by a separately moving field.
 float aa=max(.008,fwidth(fieldA.a)*.8);
 float crest=(1.-smoothstep(.008,.008+aa,abs(fieldA.a-.52)))*smoothstep(.60,.75,fieldB.a);
 color*=.97+.06*fieldA.a;
 color=mix(color,vec3(.72,.96,.98),crest*.40*shallow);
 float shoreBreak=fieldB.a;
 float edge=(1.-smoothstep(.004,.055,depth))*smoothstep(.38,.75,shoreBreak)*.60;
 color=mix(color,vec3(.78,.94,.88),edge);
 float absorption=smoothstep(.06,.32,depth);
 float alpha=clamp(max(.08+absorption*.88+fresnel*.10,edge*.85),0.,.98);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const water=new T.Mesh(pondWaterGeometry(),mat);water.name='pond-water';scene.add(water);
 return {update(dt:number){uniforms.time.value+=dt;}};
}
