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
  const x=wrapU(placement.u)*1024,y=(1-placement.v)*512,size=placement.scale*512;
  const mirrored=['battle','lightning','tribal','star','hearts'].includes(placement.id);
  const copies=mirrored?[{offset:-.155,flip:1},{offset:.155,flip:-1}]:[{offset:0,flip:1}];
  for(const copy of copies)for(const offset of [-1024,0,1024]){ctx.save();ctx.translate(x+copy.offset*1024+offset,y);ctx.scale(Math.min(size,205)*copy.flip*(mirrored?.62:1),Math.min(size,205)*(mirrored?.88:1));ctx.fillStyle=placement.color;ctx.strokeStyle=placement.color;ctx.lineCap='round';ctx.lineJoin='round';this.draw(ctx,placement.id);ctx.restore();}
  this.texture.needsUpdate=true;
 }
 private draw(c:CanvasRenderingContext2D,id:TattooId){
  const poly=(points:number[][])=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  if(id==='lightning')poly([[.24,-.50],[-.26,.05],[-.015,.02],[-.24,.50],[.35,-.13],[.09,-.08]]);
  if(id==='battle')for(let i=0;i<3;i++){const y=(i-1)*.27;poly([[-.50,y+.08],[-.31,y-.04],[-.18,y-.02],[-.06,y-.10],[.09,y-.08],[.32,y-.12],[.5,y-.06],[.24,y+.02],[.16,y+.06],[.03,y+.03],[-.19,y+.11],[-.24,y+.09]]);}
  if(id==='claw')for(let i=-1;i<=1;i++)poly([[-.43+i*.2,-.38],[-.31+i*.2,-.40],[.16+i*.2,.38],[.10+i*.2,.42]]);
  if(id==='star'){const p:number[][]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.19:.46;p.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(p);}
  if(id==='crown')poly([[-.46,-.28],[-.30,.31],[.30,.31],[.46,-.28],[.20,-.08],[0,-.43],[-.20,-.08]]);
  if(id==='hearts')for(const x of [-.27,0,.27]){c.save();c.translate(x,0);c.scale(.55,.55);c.beginPath();c.moveTo(0,.40);c.bezierCurveTo(-.8,-.05,-.45,-.58,0,-.23);c.bezierCurveTo(.45,-.58,.8,-.05,0,.40);c.fill();c.restore();}
  if(id==='tribal'){const curl=(x:number,y:number,r:number)=>{c.beginPath();for(let i=0;i<=64;i++){const t=i/64,a=t*2.05*Math.PI,rad=r*(1-t*.91);const px=x+rad*Math.cos(a),py=y+rad*Math.sin(a);if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.lineWidth=r*.30;c.stroke();};curl(-.12,-.18,.30);curl(.13,.19,.27);c.beginPath();c.moveTo(-.43,.44);c.bezierCurveTo(-.47,.06,.22,.01,.46,-.44);c.bezierCurveTo(.36,.03,-.24,.14,-.43,.44);c.fill();}
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.texture.dispose();}
}
