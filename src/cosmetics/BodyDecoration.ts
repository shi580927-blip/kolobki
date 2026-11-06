import * as T from 'three';
import {wrapU,type TattooId,type TattooPlacement} from './CosmeticCatalog';
/** Experimental UV overlay belongs under rollingBody, never under FaceRig. */
export class BodyDecoration extends T.Group {
 private readonly canvas=document.createElement('canvas');
 private readonly texture:T.CanvasTexture;
 private readonly mesh:T.Mesh<T.SphereGeometry,T.MeshStandardMaterial>;
 constructor(){super();this.name='body-decoration';this.canvas.width=1024;this.canvas.height=512;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.wrapS=T.RepeatWrapping;this.texture.anisotropy=4;this.mesh=new T.Mesh(new T.SphereGeometry(1.004,64,48),new T.MeshStandardMaterial({map:this.texture,transparent:true,depthWrite:false,roughness:.55,polygonOffset:true,polygonOffsetFactor:-1}));this.add(this.mesh);this.mesh.visible=false;}
 setTattoo(placement:TattooPlacement|null){const ctx=this.canvas.getContext('2d')!;ctx.clearRect(0,0,1024,512);this.mesh.visible=!!placement;if(!placement){this.texture.needsUpdate=true;return;}
  const x=wrapU(placement.u)*1024,y=(1-placement.v)*512,size=placement.scale*512;
  for(const offset of [-1024,0,1024]){ctx.save();ctx.translate(x+offset,y);ctx.scale(size,size);ctx.fillStyle=placement.color;ctx.strokeStyle=placement.color;ctx.lineCap='round';ctx.lineJoin='round';this.draw(ctx,placement.id);ctx.restore();}
  this.texture.needsUpdate=true;
 }
 private draw(c:CanvasRenderingContext2D,id:TattooId){
  const poly=(points:number[][])=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  if(id==='lightning')poly([[.10,-.50],[-.35,.05],[-.06,.05],[-.20,.49],[.36,-.12],[.05,-.12]]);
  if(id==='claw')for(let i=-1;i<=1;i++)poly([[-.43+i*.2,-.38],[-.31+i*.2,-.40],[.16+i*.2,.38],[.10+i*.2,.42]]);
  if(id==='star'){const p:number[][]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.19:.46;p.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(p);}
  if(id==='crown')poly([[-.46,-.28],[-.30,.31],[.30,.31],[.46,-.28],[.20,-.08],[0,-.43],[-.20,-.08]]);
  if(id==='hearts')for(const x of [-.27,0,.27]){c.save();c.translate(x,0);c.scale(.55,.55);c.beginPath();c.moveTo(0,.40);c.bezierCurveTo(-.8,-.05,-.45,-.58,0,-.23);c.bezierCurveTo(.45,-.58,.8,-.05,0,.40);c.fill();c.restore();}
  if(id==='tribal'){c.lineWidth=.10;for(const side of [-1,1]){c.beginPath();c.moveTo(0,.32);c.bezierCurveTo(side*.54,.22,side*.48,-.36,side*.11,-.30);c.bezierCurveTo(-side*.04,-.27,side*.02,-.03,side*.18,-.09);c.stroke();}}
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.texture.dispose();}
}
