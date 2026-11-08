import * as T from 'three';
import {wrapU,type TattooId,type TattooPlacement} from './CosmeticCatalog';
/** Experimental UV overlay follows the face heading, independently of the physical roll. */
export class BodyDecoration extends T.Group {
 private readonly canvas=document.createElement('canvas');
 private readonly texture:T.CanvasTexture;
 private readonly mesh:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;
 private readonly faceInverse={value:new T.Matrix4()};
 private readonly maskEnabled={value:0};
 constructor(){super();this.name='body-decoration';this.canvas.width=1024;this.canvas.height=1024;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.wrapS=T.RepeatWrapping;this.texture.anisotropy=4;this.mesh=new T.Mesh(new T.SphereGeometry(1.004,64,48),new T.MeshStandardMaterial({map:this.texture,transparent:true,depthWrite:false,roughness:.55,polygonOffset:true,polygonOffsetFactor:-1}));const mat=this.mesh.material;mat.onBeforeCompile=shader=>{shader.uniforms.cosmeticFaceInverse=this.faceInverse;shader.uniforms.cosmeticMaskEnabled=this.maskEnabled;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 cosmeticWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncosmeticWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 cosmeticWorld; uniform mat4 cosmeticFaceInverse; uniform float cosmeticMaskEnabled;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec3 f=(cosmeticFaceInverse*vec4(cosmeticWorld,1.0)).xyz; vec2 e1=(f.xy-vec2(-.36,.035))/vec2(.33,.34); vec2 e2=(f.xy-vec2(.36,.035))/vec2(.33,.34); vec2 m=(f.xy-vec2(0.,-.43))/vec2(.44,.18); if(cosmeticMaskEnabled>.5 && f.z>0. && (dot(e1,e1)<1. || dot(e2,e2)<1. || dot(m,m)<1.)) discard;');};mat.customProgramCacheKey=()=> 'body-face-exclusion-v1';this.add(this.mesh);this.mesh.visible=false;}
 setFaceFrame(face:T.Object3D){face.updateWorldMatrix(true,false);this.faceInverse.value.copy(face.matrixWorld).invert();}
 setTattoo(placement:TattooPlacement|null){const ctx=this.canvas.getContext('2d')!;ctx.clearRect(0,0,1024,1024);this.mesh.visible=!!placement;if(!placement){this.texture.needsUpdate=true;return;}
  this.maskEnabled.value=placement.excludeFace?1:0;
  const x=wrapU(.25)*1024,y=(placement.id==='star'||placement.id==='blush'?.61:1-placement.v)*1024,size=placement.scale*1024;
  const mirrored=placement.id!=='claw'&&placement.id!=='rune'&&placement.id!=='lightning';
  const spread=placement.id==='star'||placement.id==='blush'?.095:.105+.08*(placement.rearOffset??.45);
  const copies=mirrored?[{offset:-spread,flip:1},{offset:spread,flip:-1}]:[{offset:placement.id==='rune'||placement.id==='lightning'?-spread:0,flip:1}];
  for(const copy of copies)for(const offset of [-1024,0,1024]){ctx.save();ctx.translate(x+copy.offset*1024+offset,y);ctx.scale(size*.41*copy.flip,size*.97);ctx.fillStyle=placement.color;ctx.strokeStyle=placement.color;ctx.lineCap='round';ctx.lineJoin='round';this.draw(ctx,placement.id);ctx.restore();}
  this.texture.needsUpdate=true;
 }
 private draw(c:CanvasRenderingContext2D,id:TattooId){
  const poly=(points:number[][])=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const ink=(path:string)=>c.fill(new Path2D(path));
  if(id==='lightning'){
    const bolt=new Path2D('M .43,-.73 L -.13,-.24 -.095,-.23 -.42,.12 -.105,.055 -.36,.7 .39,-.17 .06,-.105 Z');
    const paint=c.fillStyle;
    c.save();c.shadowColor='#ff971c';c.shadowBlur=26;c.strokeStyle='#ef660d';c.lineWidth=.065;c.stroke(bolt);c.restore();
    c.strokeStyle='#ffc942';c.lineWidth=.035;c.stroke(bolt);c.fillStyle=paint;c.fill(bolt);
    c.beginPath();c.moveTo(-.10,-.24);c.lineTo(-.36,-.34);c.lineTo(-.47,-.22);c.moveTo(-.12,.12);c.lineTo(.13,.28);c.lineTo(.31,.18);c.moveTo(-.31,.47);c.lineTo(-.50,.55);c.lineTo(-.54,.69);c.strokeStyle='#ffbe38';c.lineWidth=.020;c.stroke();
  }
  if(id==='battle'){
    c.save();c.translate(.018,.045);c.fillStyle='#9b2441';
    c.fill(new Path2D('M -.66,-.04 Q -.38,-.39 -.19,-.39 L -.30,-.26 Q .19,-.43 .60,-.23 Q .16,-.25 -.27,-.06 Z M -.67,.22 Q -.34,-.13 -.18,-.13 L -.28,-.02 Q .23,-.20 .64,-.02 Q .14,.02 -.29,.19 Z M -.56,.52 Q -.27,.15 .13,.08 L .48,.13 Q .09,.23 -.27,.45 Z'));c.restore();
    ink('M -.64,-.04 Q -.41,-.35 -.21,-.39 L -.24,-.32 Q .02,-.42 .22,-.37 L .16,-.33 Q .39,-.34 .55,-.24 Q .19,-.29 -.03,-.20 L .015,-.255 Q -.28,-.20 -.46,-.06 L -.41,-.15 Z');
    ink('M -.66,.22 Q -.4,-.08 -.23,-.11 L -.27,-.05 Q -.02,-.18 .18,-.15 L .12,-.10 Q .40,-.14 .62,-.02 Q .21,-.075 .015,.04 L .05,-.02 Q -.19,.03 -.34,.15 L -.31,.09 Z');
    ink('M -.56,.52 Q -.39,.27 -.24,.19 L -.26,.25 Q .01,.09 .22,.08 L .16,.135 Q .32,.10 .47,.13 Q .13,.22 -.04,.34 L -.02,.27 Q -.31,.37 -.56,.52 Z');
    for(let i=0;i<21;i++){const x=-.59+(i*37%117)/100,y=-.38+(i*47%91)/100,r=.004+(i%4)*.003;c.beginPath();c.ellipse(x,y,r*(i%3+1),r,(-.2+i*.11),0,Math.PI*2);c.fill();}
    c.save();c.strokeStyle='#ffffff';c.lineWidth=.011;c.beginPath();c.moveTo(-.54,-.08);c.quadraticCurveTo(-.15,-.32,.20,-.34);c.moveTo(-.55,.17);c.quadraticCurveTo(-.10,-.08,.30,-.11);c.stroke();c.restore();
  }
  if(id==='claw')for(let i=-1;i<=1;i++)poly([[-.43+i*.2,-.38],[-.31+i*.2,-.40],[.16+i*.2,.38],[.10+i*.2,.42]]);
  if(id==='star'){
    const star=(x:number,y:number,r:number)=>{const p:number[][]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}poly(p);};
    c.save();c.shadowColor='#ffe02e';c.shadowBlur=.13;c.fillStyle='#c95118';star(0,0,.24);c.fillStyle='#ffe02e';star(0,0,.21);c.shadowBlur=0;c.fillStyle='#fff69b';star(-.04,-.05,.055);for(const [x,y,r] of [[-.35,-.12,.035],[.32,.08,.03],[.28,-.22,.02]] as const)star(x,y,r);c.restore();
  }
  if(id==='blush'){
    c.save();const glow=c.createRadialGradient(0,0,.01,0,0,.45);glow.addColorStop(0,'#ff8cad88');glow.addColorStop(1,'#ff8cad00');c.fillStyle=glow;c.beginPath();c.ellipse(0,0,.46,.27,0,0,Math.PI*2);c.fill();c.rotate(-.35);
    for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*.14-.06,.10);c.quadraticCurveTo(i*.14+.01,-.01,i*.14+.08,-.10);c.lineWidth=.035;c.strokeStyle='#ffd3de99';c.stroke();}c.restore();
  }
  if(id==='rune'){
    c.save();c.strokeStyle='#551027';c.lineWidth=.027;
    const veins=[[-.10,-.18,-.56,-.43],[-.17,.18,-.61,.49],[.17,.10,.59,.32],[.10,-.28,.47,-.59]];
    for(const [x,y,a,b] of veins){c.beginPath();c.moveTo(x,y);c.lineTo((x+a)*.5,y*.73);c.lineTo(a,b);c.stroke();}
    c.shadowColor='#ffad46';c.shadowBlur=.14;c.strokeStyle='#f8483c';c.lineWidth=.065;c.stroke(new Path2D('M 0,-.75 L .30,-.12 L 0,.64 L -.30,-.12 Z M 0,-.43 L .15,-.09 L 0,.25 L -.15,-.09 Z'));
    c.strokeStyle='#fff3bd';c.lineWidth=.035;c.stroke(new Path2D('M 0,-.75 L .30,-.12 L 0,.64 L -.30,-.12 Z M 0,-.43 L .15,-.09 L 0,.25 L -.15,-.09 Z'));c.restore();
  }
  if(id==='flame'){
    const outer=new Path2D('M -.65,1.15 C -.55,.38 -.35,.32 -.43,.06 C -.24,.24 -.20,.13 -.16,-.10 C -.13,-.26 .02,-.38 .12,-.73 C .04,-.39 .22,-.30 .16,-.07 C .34,-.21 .37,-.30 .36,-.50 C .57,-.19 .40,.02 .58,.15 C .72,.39 .54,.58 .62,1.15 Z');
    c.save();c.shadowColor='#ff8b24';c.shadowBlur=.18;c.fillStyle='#a51831';c.fill(outer);c.fillStyle='#ff8b24';c.fill(outer);c.shadowBlur=0;
    c.fillStyle='#fff05d';c.fill(new Path2D('M -.49,1.15 C -.39,.36 -.18,.39 -.21,.13 C -.04,.20 .04,.04 .07,-.38 C .08,-.09 .26,-.05 .23,.21 C .43,.05 .42,-.07 .44,-.12 C .48,.23 .32,.43 .46,1.15 Z'));
    c.fillStyle='#fff6b1';c.fill(new Path2D('M -.24,1.15 C -.17,.42 .02,.46 .04,.19 C .12,.42 .19,.42 .24,1.15 Z'));c.restore();
  }
  if(id==='crown')poly([[-.46,-.28],[-.30,.31],[.30,.31],[.46,-.28],[.20,-.08],[0,-.43],[-.20,-.08]]);
  if(id==='hearts')for(const x of [-.27,0,.27]){c.save();c.translate(x,0);c.scale(.55,.55);c.beginPath();c.moveTo(0,.40);c.bezierCurveTo(-.8,-.05,-.45,-.58,0,-.23);c.bezierCurveTo(.45,-.58,.8,-.05,0,.40);c.fill();c.restore();}
  if(id==='tribal'){
    ink('M -.60,.41 C -.40,.38 -.49,.00 -.22,-.08 C -.02,-.15 .14,-.01 .12,.16 C .09,.36 -.20,.37 -.20,.20 C -.20,.10 -.08,.06 -.04,.14 C -.12,.12 -.13,.22 -.055,.23 C .05,.24 .08,.07 -.05,.03 C -.26,-.05 -.37,.18 -.32,.36 Q -.44,.48 -.60,.41 Z');
    ink('M -.61,-.11 C -.44,-.18 -.50,-.53 -.19,-.55 C .01,-.56 .13,-.39 .05,-.25 C -.04,-.10 -.25,-.16 -.23,-.29 C -.22,-.37 -.13,-.40 -.08,-.34 C -.16,-.35 -.17,-.26 -.105,-.25 C .02,-.23 .01,-.42 -.14,-.44 C -.36,-.46 -.32,-.12 -.61,-.11 Z');
    ink('M -.28,.55 C -.16,.38 .16,.50 .29,.23 C .37,.05 .25,-.13 .12,-.18 C .38,-.15 .51,.06 .42,.29 C .30,.57 -.05,.47 -.28,.55 Z');
    ink('M .05,-.57 C .28,-.55 .20,-.32 .44,-.34 Q .57,-.35 .62,-.47 C .59,-.20 .41,-.18 .31,-.22 C .16,-.27 .22,-.46 .05,-.57 Z');
    ink('M -.45,-.37 C -.35,-.62 -.02,-.71 .18,-.52 C .27,-.42 .23,-.25 .12,-.23 C .20,-.34 .17,-.44 .07,-.50 C -.12,-.61 -.32,-.43 -.45,-.37 Z');
    ink('M -.56,.16 C -.36,.04 -.27,-.18 -.03,-.18 C .13,-.18 .24,-.07 .25,.06 C .14,-.07 .02,-.08 -.13,.02 C -.26,.11 -.38,.29 -.56,.16 Z');
    ink('M -.08,.46 C .11,.60 .34,.55 .48,.37 Q .53,.30 .55,.18 C .62,.46 .40,.67 .19,.65 Q .04,.61 -.08,.46 Z');
    for(const [x,y,r] of [[-.53,-.58,.018],[-.41,-.64,.011],[.38,-.58,.018],[.53,-.10,.013],[-.48,.56,.014],[.54,.53,.012]] as const){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  }
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.texture.dispose();}
}
