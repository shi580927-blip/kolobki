import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WORLD_SIZE,heightAt} from '../core/terrain';
import {stoneMaterial} from './StoneArt';

export const SEA_LEVEL=-10;
/** Scenic coastline beyond the existing playable boundary. Its first ring
 * coincides with the terrain edge; no gaps or floating square of land. */
export function islandCoastRadius(a:number){const square=WORLD_SIZE/2/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));return Math.max(square+18,300+24*Math.sin(a*3+.6)+14*Math.cos(a*7));}
export function islandCoastGeometry(){
 const p:number[]=[],colors:number[]=[],indices:number[]=[],segments=256,rings=7;
 for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),edge=WORLD_SIZE/2/Math.max(Math.abs(c),Math.abs(s)),outer=islandCoastRadius(a),t=j/rings;
  const r=edge+(outer-edge)*t,top=heightAt(c*edge,s*edge);
  const y=j===0?top:top*(1-t)*(1-t)+(SEA_LEVEL-1.4)*(1-(1-t)*(1-t))+.7*Math.sin(a*23)*Math.sin(t*Math.PI);
  p.push(c*r,y,s*r);
  const rock=new T.Color('#d4c0a1').lerp(new T.Color('#ebd4a5'),t),grass=new T.Color('#91b73c');
  const col=j===0?grass:j===1?rock.clone().lerp(grass,.12):rock;
  col.multiplyScalar(.91+.09*Math.sin(a*17+t*5)**2);colors.push(col.r,col.g,col.b);
  if(j<rings&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function addIslandHorizon(scene:T.Scene){
 const coast=new T.Mesh(islandCoastGeometry(),stoneMaterial());coast.name='valley-scenic-island-coast';coast.receiveShadow=true;scene.add(coast);
 const uniforms={time:{value:0}};
 const ocean=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 w;void main(){vec4 p=modelMatrix*vec4(position,1.);w=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`
 uniform float time;varying vec3 w;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
  vec2 p=w.xz;float a=atan(p.y,p.x),edge=200./max(abs(cos(a)),abs(sin(a))),shore=max(edge+18.,300.+24.*sin(a*3.+.6)+14.*cos(a*7.));
  float distanceToCoast=length(p)-shore;
  float n=noise(p*.15+vec2(time*.022,-time*.018)),fine=noise(p*.35+vec2(-time*.02,time*.015));
  vec3 color=mix(vec3(.02,.55,.61),vec3(.018,.27,.59),smoothstep(-4.,65.,distanceToCoast));
  color*=.94+.12*n;
  float crest=(1.-smoothstep(.012,.035,abs(n-.52)))*smoothstep(.55,.78,fine);
  float foam=(1.-smoothstep(-1.,3.8,distanceToCoast+n*2.))*smoothstep(.35,.7,fine);
  color=mix(color,vec3(.77,.96,.97),crest*.23+foam*.7);
  float horizon=smoothstep(450.,1100.,length(cameraPosition-w));color=mix(color,vec3(.45,.72,.85),horizon);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`}));
 ocean.rotation.x=-Math.PI/2;ocean.position.y=SEA_LEVEL;ocean.name='valley-scenic-ocean';scene.add(ocean);
 // Separate faceted peaks, with open sky between them instead of a band wall.
 const parts:T.BufferGeometry[]=[];
 for(let i=0;i<13;i++){
  const a=i/13*Math.PI*2+.15,r=660+45*Math.sin(i*2.3),height=70+(i%5)*16,width=210+(i%3)*25,depth=150+(i%4)*14;
  const g=new T.PlaneGeometry(width,depth,24,18);g.rotateX(-Math.PI/2);const p=g.getAttribute('position'),colors:number[]=[];
  for(let k=0;k<p.count;k++){
   const x=p.getX(k)/(width/2),z=p.getZ(k)/(depth/2);
   const peak=(cx:number,cz:number,rx:number,rz:number,h:number)=>h*Math.pow(Math.max(0,1-Math.hypot((x-cx)/rx,(z-cz)/rz)),1.3);
   const mass=Math.max(peak(-.13,.06,.78,.90,1),peak(.30,-.15,.57,.74,.76),peak(-.40,-.21,.50,.65,.65));
   const ridge=1+.13*Math.sin(x*13+z*9+i)+.07*Math.cos(z*17-x*8);
   const y=-24+height*mass*ridge;p.setY(k,y);
   const c=new T.Color('#78a0ba').lerp(new T.Color('#bfd3df'),Math.max(0,y)/height*.45);
   c.multiplyScalar(.93+.07*Math.sin(x*8+z*5+i));if(i%5===4&&y>height*.63)c.lerp(new T.Color('#e8edef'),.75);
   colors.push(c.r,c.g,c.b);
  }
  g.deleteAttribute('uv');g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.rotateY(a);g.translate(Math.cos(a)*r,0,Math.sin(a)*r);parts.push(g);
 }
 const g=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 const peaks=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,fog:false}));peaks.name='valley-distant-mountain-horizon';scene.add(peaks);
 const balloonParts:T.BufferGeometry[]=[];
 for(let i=0;i<3;i++){
  const a=[-.6,1.5,3.6][i],x=Math.cos(a)*260,z=Math.sin(a)*260,y=72+i*15;
  const profile=[new T.Vector2(.6,0),new T.Vector2(2.8,2.3),new T.Vector2(4.8,6),new T.Vector2(5.2,9),new T.Vector2(4.4,11.5),new T.Vector2(2.8,13),new T.Vector2(0,13.6)];
  const envelope=new T.LatheGeometry(profile,24).toNonIndexed(),pos=envelope.getAttribute('position'),colors:number[]=[];
  for(let k=0;k<pos.count;k++){
   const stripe=Math.floor((Math.atan2(pos.getZ(k),pos.getX(k))+Math.PI)*6/Math.PI),c=new T.Color(stripe%2===0?'#f5ce69':['#cb6686','#63a1a4','#a180bd'][i]);colors.push(c.r,c.g,c.b);
  }
  envelope.deleteAttribute('uv');envelope.setAttribute('color',new T.Float32BufferAttribute(colors,3));envelope.translate(x,y,z);balloonParts.push(envelope);
  const small=(geometry:T.BufferGeometry,color:string,px:number,py:number,pz:number)=>{
   const raw=geometry.index?geometry.toNonIndexed():geometry;geometry.dispose();raw.deleteAttribute('uv');const c=new T.Color(color),colors=new Float32Array(raw.getAttribute('position').count*3);for(let j=0;j<colors.length;j+=3)colors.set([c.r,c.g,c.b],j);raw.setAttribute('color',new T.BufferAttribute(colors,3));raw.translate(px,py,pz);balloonParts.push(raw);
  };
  small(new T.BoxGeometry(1.6,1.2,1.6),'#a47c49',x,y-2.3,z);
  for(const dx of [-.6,.6])for(const dz of [-.6,.6])small(new T.CylinderGeometry(.035,.035,2.6,4),'#765c40',x+dx,y-.8,z+dz);
 }
 const balloons=new T.Mesh(mergeGeometries(balloonParts),new T.MeshStandardMaterial({vertexColors:true,roughness:1}));balloonParts.forEach(g=>g.dispose());balloons.name='valley-scenic-balloons';scene.add(balloons);
 return {update(dt:number){uniforms.time.value+=dt;balloons.position.y=Math.sin(uniforms.time.value*.18)*.7;}};
}
