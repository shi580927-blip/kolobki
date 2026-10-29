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
export function addPondWater(scene:T.Scene){
 const uniforms={time:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`attribute float waterDepth;varying float depth;varying vec3 w;void main(){w=position;depth=waterDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;varying float depth;varying vec3 w;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float surface(vec2 p){return noise(p*.65+vec2(time*.08,-time*.045))*.72+noise(p*1.7-vec2(time*.06,time*.04))*.28;}
 void main(){
 if(depth<.002)discard;
 vec2 p=w.xz;float h=surface(p),hx=surface(p+vec2(.04,0)),hz=surface(p+vec2(0,.04));
 vec3 n=normalize(vec3((h-hx)*3.8,1.,(h-hz)*3.8));
 vec3 view=normalize(cameraPosition-w),light=normalize(vec3(-25.,45.,20.)),halfV=normalize(view+light);
 float fresnel=pow(1.-max(0.,dot(view,n)),3.);
 float spec=pow(max(0.,dot(n,halfV)),180.);
 float d=smoothstep(.025,.32,depth);
 vec3 color=mix(vec3(.025,.65,.48),vec3(.002,.28,.48),d);
 color=mix(color,vec3(.62,.85,.88),fresnel*.12);
 color+=vec3(.96,.98,.89)*spec*.22;
 // Soft, sparse sun glints: isolated patches, without crossing wave lines.
 float glints=pow(noise(p*2.1+vec2(time*.12,-time*.08)),16.);
 color+=vec3(.55,.85,.79)*glints*.7;
 // Broad underwater light variations stay soft rather than forming a visible grid.
 color+=vec3(.035,.10,.09)*(noise(p*.72+vec2(time*.035,0.))-.5);
 // A thin irregular shore wash, not a repeated grid or travelling circular pattern.
 float wash=.032+.016*sin(time*.85+noise(p*.7)*6.);
 float edge=(1.-smoothstep(.008,wash+noise(p*2.)*.018,depth))*.68;
 color=mix(color,vec3(.83,.95,.85),edge);
 gl_FragColor=vec4(color,mix(.40,.98,d)+fresnel*.10);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const water=new T.Mesh(pondWaterGeometry(),mat);water.name='pond-water';scene.add(water);
 return {update(dt:number){uniforms.time.value+=dt;}};
}
