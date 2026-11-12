import * as T from 'three';

/** Closed, overlapping water volumes: the fall keeps its thickness from the side. */
export function waterfallFlowGeometry(x:number,front:number,crest:number,bottom:number){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],streams=6,rows=36,sides=12;
 for(let k=0;k<streams;k++){
  const start=positions.length/3,offset=(k-(streams-1)/2)*.40;
  for(let j=0;j<=rows;j++){
   const t=j/rows,spread=1+.25*t,rx=(.255+.025*Math.sin(k*2.3))*(1+.15*t),rz=.22+.10*t+.025*Math.cos(k*1.7);
   const cx=x+offset*spread+.035*Math.sin(t*9+k*2),cy=crest-.065-(crest-.065-bottom)*t;
   const cz=front+1.40*t*t+.045*Math.sin(k*2.1);
   for(let i=0;i<=sides;i++){
    const a=i/sides*Math.PI*2,fold=1+.065*Math.sin(a*3+k+t*8);
    positions.push(cx+Math.cos(a)*rx*fold,cy,cz+Math.sin(a)*rz*fold);
    uv.push(i/sides,t+k*.17);
    if(j<rows&&i<sides){const q=start+j*(sides+1)+i;indices.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);}
   }
  }
  for(const row of [0,rows]){
   const ring=start+row*(sides+1),center=positions.length/3;
   positions.push(x+offset*(1+.25*row/rows)+.035*Math.sin(row/rows*9+k*2),crest-.065-(crest-.065-bottom)*row/rows,front+1.40*(row/rows)**2+.045*Math.sin(k*2.1));uv.push(.5,row/rows+k*.17);
   for(let i=0;i<sides;i++)if(row===0)indices.push(center,ring+i+1,ring+i);else indices.push(center,ring+i,ring+i+1);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 return g;
}
export function waterfallFlowMaterial(uniforms:{time:{value:number}}){
 return new T.ShaderMaterial({uniforms,depthWrite:true,side:T.FrontSide,vertexShader:`
 uniform float time;varying vec2 v;varying vec3 worldPoint;varying vec3 waterNormal;
 void main(){v=uv;vec3 p=position;
 float moving=sin(v.y*27.-time*4.8+v.x*6.28318);
 p.x+=normal.x*moving*.022;p.z+=normal.z*moving*.035;
 worldPoint=(modelMatrix*vec4(p,1.)).xyz;waterNormal=normalize(mat3(modelMatrix)*normal);
 gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}`,fragmentShader:`
 uniform float time;varying vec2 v;varying vec3 worldPoint;varying vec3 waterNormal;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
 float n=noise(vec2(v.x*9.,v.y*7.-time*1.6));
 float streak=pow(.5+.5*sin(v.x*44.+n*3.+sin(v.y*13.-time*3.1)),5.);
 vec3 normal=normalize(waterNormal+vec3(sin(v.y*38.-time*6.)*.055,0.,sin(v.x*21.+v.y*18.-time*4.)*.07));
 vec3 view=normalize(cameraPosition-worldPoint),light=normalize(vec3(-.45,.8,.35));
 float facing=max(0.,dot(normal,view)),fresnel=pow(1.-facing,3.);
 float sun=.62+.38*max(0.,dot(normal,light));
 float highlight=pow(max(0.,dot(normal,normalize(light+view))),38.);
 float cells=noise(vec2(v.x*5.3+1.,v.y*18.-time*3.0));
 float foam=smoothstep(.60,.85,n*.4+cells*.6+streak*.20);
 vec3 color=mix(vec3(.025,.37,.48),vec3(.78,.98,.98),.32+n*.34+foam*.28);
 color*=sun;color+=vec3(.38,.53,.54)*fresnel*.25+vec3(.7,.85,.84)*highlight*.18;
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
