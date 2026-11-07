import * as T from 'three';
import {wrapU,type TattooId,type TattooPlacement} from './CosmeticCatalog';
/** Experimental UV overlay belongs under rollingBody, never under FaceRig. */
export class BodyDecoration extends T.Group {
 private readonly canvas=document.createElement('canvas');
 private readonly texture:T.CanvasTexture;
 private readonly mesh:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;
 private readonly faceInverse={value:new T.Matrix4()};
 private readonly maskEnabled={value:0};
 constructor(){super();this.name='body-decoration';this.canvas.width=1024;this.canvas.height=512;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.wrapS=T.RepeatWrapping;this.texture.anisotropy=4;this.mesh=new T.Mesh(new T.SphereGeometry(1.004,64,48),new T.MeshStandardMaterial({map:this.texture,transparent:true,depthWrite:false,roughness:.55,polygonOffset:true,polygonOffsetFactor:-1}));const mat=this.mesh.material;mat.onBeforeCompile=shader=>{shader.uniforms.cosmeticFaceInverse=this.faceInverse;shader.uniforms.cosmeticMaskEnabled=this.maskEnabled;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 cosmeticWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncosmeticWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 cosmeticWorld; uniform mat4 cosmeticFaceInverse; uniform float cosmeticMaskEnabled;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec3 f=(cosmeticFaceInverse*vec4(cosmeticWorld,1.0)).xyz; vec2 e1=(f.xy-vec2(-.36,.035))/vec2(.33,.34); vec2 e2=(f.xy-vec2(.36,.035))/vec2(.33,.34); vec2 m=(f.xy-vec2(0.,-.43))/vec2(.44,.18); if(cosmeticMaskEnabled>.5 && f.z>0. && (dot(e1,e1)<1. || dot(e2,e2)<1. || dot(m,m)<1.)) discard;');};mat.customProgramCacheKey=()=> 'body-face-exclusion-v1';this.add(this.mesh);this.mesh.visible=false;}
 setFaceFrame(face:T.Object3D){face.updateWorldMatrix(true,false);this.faceInverse.value.copy(face.matrixWorld).invert();}
 setTattoo(placement:TattooPlacement|null){const ctx=this.canvas.getContext('2d')!;ctx.clearRect(0,0,1024,512);this.mesh.visible=!!placement;if(!placement){this.texture.needsUpdate=true;return;}
  this.maskEnabled.value=placement.excludeFace?1:0;
  const x=wrapU(.25)*1024,y=(1-placement.v)*512,size=placement.scale*512;
  const mirrored=placement.id!=='claw';
  const spread=.17+.20*(placement.rearOffset??.45);
  const copies=mirrored?[{offset:-spread,flip:1},{offset:spread,flip:-1}]:[{offset:0,flip:1}];
  for(const copy of copies)for(const offset of [-1024,0,1024]){ctx.save();ctx.translate(x+copy.offset*1024+offset,y);ctx.scale(size*.82*copy.flip,size*.97);ctx.fillStyle=placement.color;ctx.strokeStyle=placement.color;ctx.lineCap='round';ctx.lineJoin='round';this.draw(ctx,placement.id);ctx.restore();}
  this.texture.needsUpdate=true;
 }
 private draw(c:CanvasRenderingContext2D,id:TattooId){
  const poly=(points:number[][])=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const ink=(path:string)=>c.fill(new Path2D(path));
  if(id==='lightning'){
    ink('M .43,-.73 L -.13,-.24 -.095,-.23 -.42,.12 -.105,.055 -.36,.7 .39,-.17 .06,-.105 Z');
    ink('M -.29,-.11 L -.49,.04 -.38,.015 Z');
  }
  if(id==='battle'){
    ink('M -.64,-.04 Q -.41,-.35 -.21,-.39 L -.24,-.32 Q .02,-.42 .22,-.37 L .16,-.33 Q .39,-.34 .55,-.24 Q .19,-.29 -.03,-.20 L .015,-.255 Q -.28,-.20 -.46,-.06 L -.41,-.15 Z');
    ink('M -.66,.22 Q -.4,-.08 -.23,-.11 L -.27,-.05 Q -.02,-.18 .18,-.15 L .12,-.10 Q .40,-.14 .62,-.02 Q .21,-.075 .015,.04 L .05,-.02 Q -.19,.03 -.34,.15 L -.31,.09 Z');
    ink('M -.56,.52 Q -.39,.27 -.24,.19 L -.26,.25 Q .01,.09 .22,.08 L .16,.135 Q .32,.10 .47,.13 Q .13,.22 -.04,.34 L -.02,.27 Q -.31,.37 -.56,.52 Z');
  }
  if(id==='claw')for(let i=-1;i<=1;i++)poly([[-.43+i*.2,-.38],[-.31+i*.2,-.40],[.16+i*.2,.38],[.10+i*.2,.42]]);
  if(id==='star'){const p:number[][]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.19:.46;p.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(p);}
  if(id==='crown')poly([[-.46,-.28],[-.30,.31],[.30,.31],[.46,-.28],[.20,-.08],[0,-.43],[-.20,-.08]]);
  if(id==='hearts')for(const x of [-.27,0,.27]){c.save();c.translate(x,0);c.scale(.55,.55);c.beginPath();c.moveTo(0,.40);c.bezierCurveTo(-.8,-.05,-.45,-.58,0,-.23);c.bezierCurveTo(.45,-.58,.8,-.05,0,.40);c.fill();c.restore();}
  if(id==='tribal'){
    ink('M -.60,.41 C -.40,.38 -.49,.00 -.22,-.08 C -.02,-.15 .14,-.01 .12,.16 C .09,.36 -.20,.37 -.20,.20 C -.20,.10 -.08,.06 -.04,.14 C -.12,.12 -.13,.22 -.055,.23 C .05,.24 .08,.07 -.05,.03 C -.26,-.05 -.37,.18 -.32,.36 Q -.44,.48 -.60,.41 Z');
    ink('M -.61,-.11 C -.44,-.18 -.50,-.53 -.19,-.55 C .01,-.56 .13,-.39 .05,-.25 C -.04,-.10 -.25,-.16 -.23,-.29 C -.22,-.37 -.13,-.40 -.08,-.34 C -.16,-.35 -.17,-.26 -.105,-.25 C .02,-.23 .01,-.42 -.14,-.44 C -.36,-.46 -.32,-.12 -.61,-.11 Z');
    ink('M -.28,.55 C -.16,.38 .16,.50 .29,.23 C .37,.05 .25,-.13 .12,-.18 C .38,-.15 .51,.06 .42,.29 C .30,.57 -.05,.47 -.28,.55 Z');
    ink('M .05,-.57 C .28,-.55 .20,-.32 .44,-.34 Q .57,-.35 .62,-.47 C .59,-.20 .41,-.18 .31,-.22 C .16,-.27 .22,-.46 .05,-.57 Z');
  }
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.texture.dispose();}
}
