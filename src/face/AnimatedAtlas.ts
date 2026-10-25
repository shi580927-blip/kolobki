import * as T from 'three';
import type {PartLayout} from './FaceLayout';
import {AnimationClock,ComboAnimationClock,type ClipTiming} from './AnimationClock';
export interface AtlasPart{id:string;rect:number[];layout:PartLayout;layer:number;channel:string;page?:number;variants?:Record<string,number[]>}
export interface AtlasPose{label:string;page:number;parts:AtlasPart[];blink:boolean}
export interface AnimationAtlas{version:string;pages:{image:string;width:number;height:number}[];poses:Record<string,AtlasPose>;clips:Record<string,ClipTiming>;blink:{close:number;closed:number;open:number;pause:number[]};combo:{axis:'x';orbitSeconds:number;turns:number;trailCopies:number;dizzySeconds:number;recoverSeconds:number;stopDuringDizzy:boolean}}
export async function loadAnimationAtlas(){
 const base=import.meta.env.BASE_URL+'assets/face/animated/';const response=await fetch(base+'atlas.json');if(!response.ok)throw Error('Animation atlas unavailable');const data:AnimationAtlas=await response.json();
 const textures=await Promise.all(data.pages.map(async page=>{const t=await new T.TextureLoader().loadAsync(base+page.image);t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=false;return t;}));return{data,textures};
}
type Feature=T.Mesh<T.BufferGeometry,T.ShaderMaterial>;
export class AnimatedAtlasRig extends T.Group {
 readonly clock=new AnimationClock();readonly combo:ComboAnimationClock;readonly poses:Record<string,T.Group>={};
 private readonly parts:Record<string,Feature[]>={};private readonly lids:Record<string,T.Group>={};private trails:T.Group[]=[];readonly dazedStars=new T.Group();
 target='neutral';base='sly';time=0;forcedBlink=false;gaze:'auto'|'center'|'left'|'right'='auto';private blinkStart=-1;private nextBlink=2.6;
 constructor(readonly atlas:AnimationAtlas,textures:T.Texture[]){super();this.combo=new ComboAnimationClock(atlas.combo.orbitSeconds,atlas.combo.turns,atlas.combo.dizzySeconds,atlas.combo.recoverSeconds);
 for(const [name,pose] of Object.entries(atlas.poses)){
  const group=new T.Group();this.poses[name]=group;this.parts[name]=[];this.add(group);
  for(const part of pose.parts){const page=atlas.pages[part.page??pose.page],r=part.rect;
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{map:{value:textures[part.page??pose.page]},rect:{value:new T.Vector4(r[0]/page.width,1-(r[1]+r[3])/page.height,r[2]/page.width,r[3]/page.height)},gazeOffset:{value:new T.Vector2()},opacity:{value:1},open:{value:1},kind:{value:part.channel==='brow'?1:part.channel==='eye'?2:0},separate:{value:0},trim:{value:name==='proud'&&part.channel==='brow'?(part.id==='study-brow-0'?2:3):name==='unhinged'&&part.id==='study-brow-0'?1:0}},vertexShader:'varying vec2 vUv;varying vec2 surfaceXY;void main(){vUv=uv;surfaceXY=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D map;uniform vec4 rect;uniform vec2 gazeOffset;uniform float opacity;uniform float open;uniform float kind;uniform float separate;uniform float trim;varying vec2 vUv;varying vec2 surfaceXY;
   void main(){if(trim>.5&&trim<1.5&&vUv.x>.92&&vUv.y<.50)discard;if(trim>1.5&&trim<2.5&&vUv.x>.94&&vUv.y<.33)discard;if(trim>2.5&&vUv.x<.05&&vUv.y>.68)discard;if(length(surfaceXY)>.99||open<.015||vUv.y>open)discard;vec2 eyeUv=vUv-gazeOffset*(1.-smoothstep(.20,.46,distance(vUv,vec2(.5))));vec2 tc=rect.xy+eyeUv*rect.zw;vec4 c=texture2D(map,tc);vec2 edge=vec2(1./${page.width}.,1./${page.height}.);float a=min(c.a,min(texture2D(map,tc+edge).a,texture2D(map,tc-edge).a));if(a<.94)discard;
   if(separate>.5&&kind>.5&&kind<1.5&&c.r<c.g*1.23)discard;
   if(separate>.5&&kind>1.5&&vUv.y>.72&&c.r>c.g*1.5&&c.g<.3)discard;
   gl_FragColor=vec4(c.rgb,opacity);
   #include <colorspace_fragment>
   }`});
   const mesh=new T.Mesh(new T.PlaneGeometry(1,1,24,20),material);mesh.name=part.id;mesh.renderOrder=part.layer;mesh.userData.part=part;group.add(mesh);this.parts[name].push(mesh);this.project(mesh,0,0,1,1,0);
  }
  const lids=new T.Group();lids.visible=false;this.lids[name]=lids;group.add(lids);
  for(const eye of pose.parts.filter(p=>p.channel==='eye')){const l=eye.layout,c=Math.cos(l.angle),s=Math.sin(l.angle);const points=Array.from({length:21},(_,i)=>{const u=(i/20-.5)*l.width*.82,v=-l.height*.1-.025*Math.sin(i/20*Math.PI),x=l.x+u*c-v*s,y=l.y+u*s+v*c;return new T.Vector3(x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+.04);});const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.014,5,false),new T.MeshBasicMaterial({color:0x263e40,transparent:true,depthWrite:false}));line.renderOrder=20;lids.add(line);}
 }
 // Ghosts are the same independent features, without a body or backing surface.
 for(let i=0;i<atlas.combo.trailCopies;i++){const trail=this.poses.unhinged.clone(true);trail.traverse(o=>{if(o instanceof T.Mesh){o.material=o.material.clone();if(o.material instanceof T.ShaderMaterial)o.material.uniforms.opacity.value=.22/(i+1);else o.material.opacity=.22/(i+1);}});this.trails.push(trail);this.add(trail);trail.visible=false;}
 // Provisional stars are geometry, independent of the face atlas and its silhouette.
 const starShape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.045:.10;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
 const starGeometry=new T.ShapeGeometry(starShape);
 for(let i=0;i<3;i++){const star=new T.Mesh(starGeometry,new T.MeshBasicMaterial({color:0xffd54a,side:T.DoubleSide,transparent:true,depthWrite:false}));star.renderOrder=35;this.dazedStars.add(star);}this.dazedStars.name='dazed-stars';this.add(this.dazedStars);
 this.update(0);
 }
 play(name:string){if(!this.atlas.poses[name])throw Error('Unknown expression');this.target=name;this.clock.play(this.atlas.clips[name]);}
 playCombo(){this.clock.phase='IDLE';this.combo.play();}
 private project(mesh:Feature,dx:number,dy:number,sx:number,sy:number,angle:number){const l=(mesh.userData.part as AtlasPart).layout,p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,c=Math.cos(l.angle+angle),s=Math.sin(l.angle+angle);for(let i=0;i<p.count;i++){const u=(uv.getX(i)-.5)*l.width*sx,v=(uv.getY(i)-.5)*l.height*sy,x=l.x+dx+u*c-v*s,y=l.y+dy+u*s+v*c;p.setXYZ(i,x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+.025);}p.needsUpdate=true;mesh.geometry.computeBoundingSphere();}
 get blink(){if(this.forcedBlink)return 1;if(this.blinkStart<0)return 0;const t=this.time-this.blinkStart,b=this.atlas.blink;return t<b.close?t/b.close:t<b.close+b.closed?1:Math.max(0,1-(t-b.close-b.closed)/b.open);}
 get expression(){return this.combo.phase==='ORBIT'?'unhinged':this.combo.phase==='DIZZY'?'dizzy':this.clock.phase==='IDLE'?this.base:this.target;}
 update(dt:number){this.time+=dt;this.clock.update(dt);this.combo.update(dt);
 if(this.time>=this.nextBlink&&this.blinkStart<0)this.blinkStart=this.time;
 if(this.blinkStart>=0&&this.time-this.blinkStart>=.4){this.blinkStart=-1;this.nextBlink=this.time+2+((Math.sin(this.time*7)+1)/2)*4;}
 const combo=this.combo.phase!=='IDLE',name=this.expression,w=this.clock.weight;
 const recover=this.combo.phase==='RECOVER'?T.MathUtils.clamp((this.combo.elapsed-this.combo.orbit-this.combo.dizzy)/this.combo.recover,0,1):0;
 for(const [key,group] of Object.entries(this.poses)){
  const opacity=combo?(this.combo.phase==='RECOVER'?(key===this.base?recover:key==='dizzy'?1-recover:0):key===name?1:0):(this.target===this.base&&key===this.base?1:key===this.target&&this.clock.phase!=='IDLE'?w:key===this.base?1-w:0);
  group.visible=opacity>.005;if(!group.visible)continue;group.rotation.set(0,0,0);
  const blink=this.atlas.poses[key].blink&&this.combo.phase!=='ORBIT'?this.blink:0;
  for(const part of this.parts[key]){const source=part.userData.part as AtlasPart,kind=source.channel;
   if(source.variants){const direction=key==='shocked'||key==='scared'||key==='dazed'?'center':this.gaze==='auto'?(['center','left','center','right'] as const)[Math.floor(this.time/1.3)%4]:this.gaze;const r=source.variants[direction],page=this.atlas.pages[source.page!];part.material.uniforms.rect.value.set(r[0]/page.width,1-(r[1]+r[3])/page.height,r[2]/page.width,r[3]/page.height);}
   part.material.uniforms.gazeOffset.value.set(key==='dazed'&&kind==='eye'?Math.cos(this.time*5)*.035:0,key==='dazed'&&kind==='eye'?Math.sin(this.time*5)*.025:0);
   part.material.uniforms.opacity.value=opacity;part.material.uniforms.open.value=kind==='eye'?1-blink:1;part.visible=!(kind==='eye'&&blink>=.985);
   const micro=this.clock.phase==='HOLD'&&key===this.target?Math.sin(this.time*3.1)*.006:0;
   const clip=this.atlas.clips[key] as ClipTiming&{tracks?:Record<string,number[]>};
   const active=key===this.target&&this.clock.phase!=='IDLE';
   const progress=active?Math.min(1,this.clock.elapsed/(clip.in+clip.hold+clip.out)):0;
   const sample=(track:string,fallback:number)=>{const v=clip.tracks?.[track];if(!active||!v)return fallback;const t=progress*2;return t<=1?T.MathUtils.lerp(v[0],v[1],t):T.MathUtils.lerp(v[1],v[2],t-1);};
   const pulse=kind==='eye'?sample('eyeSquash',1)+micro:kind==='mouth'?sample('mouthPulse',1)+micro*.8:1;
   this.project(part,0,kind==='brow'?sample('browLift',0)+micro:0,kind==='mouth'?pulse:1,pulse,kind==='brow'?micro*.4:0);
  }
  this.lids[key].visible=blink>.82;this.lids[key].traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshBasicMaterial).opacity=opacity;});
  if(this.combo.phase==='ORBIT'){group.rotation.x=this.combo.angle;group.rotation.z=Math.sin(this.combo.angle)*.12;}
 }
 const dazedOpacity=this.poses.dazed.visible?(this.parts.dazed[0].material.uniforms.opacity.value as number):0;
 this.dazedStars.visible=dazedOpacity>.005;
 this.dazedStars.children.forEach((star,i)=>{const a=this.time*2+i*Math.PI*2/3;star.position.set(Math.cos(a)*.8,1.08+Math.sin(a)*.12,.45+Math.sin(a)*.35);star.rotation.z=-this.time*1.5+i;(star as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>).material.opacity=dazedOpacity;});
 this.trails.forEach((g,i)=>{g.visible=this.combo.phase==='ORBIT';g.rotation.set(this.combo.angle-(i+1)*.32,0,Math.sin(this.combo.angle-(i+1)*.32)*.12);});
 }
}
