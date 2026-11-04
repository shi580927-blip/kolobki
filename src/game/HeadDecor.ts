import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export type HeadKind='none'|'crown'|'horns'|'helmet';
import type {Outfit} from './Wardrobe';
export function decorForSeed(seed:number):Outfit {
 const mark=seed%4===0?(['stripes','star','bolt'] as const)[Math.floor(seed/4)%3]:'none';
 return {head:'none',mark};
}
const paints=new Map<string,T.Texture>();
function paintTexture(mark:string){
 let texture=paints.get(mark);
 if(!texture){
  texture=new T.TextureLoader().load(import.meta.env.BASE_URL+'assets/paint/'+mark+'.svg');
  texture.colorSpace=T.SRGBColorSpace;paints.set(mark,texture);
 }
 return texture;
}
/** Cosmetic frame follows the heading, never the rolling body. No physical shape. */
export class HeadDecor extends T.Group {
 readonly style:ReturnType<typeof decorForSeed>;
 constructor(seed:number,_base:string,outfit=decorForSeed(seed)){super();this.name='head-decor';this.style={...outfit};
  const add=(parts:T.BufferGeometry[],color:number,metal=false)=>{if(!parts.length)return;const geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));parts.forEach(g=>g.dispose());const material=new T.MeshStandardMaterial({color,roughness:metal?.38:.65,metalness:metal?.35:0});const mesh=new T.Mesh(geometry,material);if(!metal)material.side=T.DoubleSide;mesh.castShadow=true;this.add(mesh);};
  const metal:T.BufferGeometry[]=[],detail:T.BufferGeometry[]=[];
  if(this.style.head==='crown'){
   metal.push(new T.CylinderGeometry(.48,.52,.14,12,1,true).translate(0,1.01,0));
   metal.push(new T.TorusGeometry(.50,.045,6,24).rotateX(Math.PI/2).translate(0,1.02,0));
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.sin(a)*.44,z=Math.cos(a)*.44;metal.push(new T.ConeGeometry(.12,.32,5).translate(x,1.23,z));detail.push(new T.OctahedronGeometry(.078).translate(x,1.38,z));detail.push(new T.OctahedronGeometry(.075).translate(x*1.13,1.03,z*1.13));}
  }else if(this.style.head==='horns'){
   for(const sign of [-1,1]){const path=new T.CatmullRomCurve3([new T.Vector3(sign*.62,.82,.10),new T.Vector3(sign*.88,1.04,.09),new T.Vector3(sign*.85,1.27,.10)]);const g=new T.TubeGeometry(path,10,.12,7,false),p=g.attributes.position;for(let i=0;i<p.count;i++){const t=Math.floor(i/8)/10,center=path.getPointAt(t),point=new T.Vector3().fromBufferAttribute(p,i).sub(center).multiplyScalar(Math.max(.03,1-t)).add(center);p.setXYZ(i,point.x,point.y,point.z);}g.computeVertexNormals();metal.push(g);detail.push(new T.TorusGeometry(.13,.035,5,8).rotateY(Math.PI/2).rotateZ(sign*.55).translate(sign*.64,.86,.10));}
  }else if(this.style.head==='helmet'){
   metal.push(new T.SphereGeometry(1.10,20,9,0,Math.PI*2,0,Math.PI*.25));
   detail.push(new T.TorusGeometry(.778,.047,6,24).rotateX(Math.PI/2).translate(0,.778,0));
   for(let i=0;i<7;i++){const a=i*2*Math.PI/7;detail.push(new T.ConeGeometry(.095,.29,6).rotateZ(-Math.sin(a)*.48).rotateX(Math.cos(a)*.48).translate(Math.sin(a)*.59,1.02,Math.cos(a)*.59));}
   const crest=new T.CatmullRomCurve3([new T.Vector3(0,.99,-.48),new T.Vector3(0,1.13,0),new T.Vector3(0,.99,.48)]);detail.push(new T.TubeGeometry(crest,12,.035,6,false));
   for(const sign of [-1,1])detail.push(new T.SphereGeometry(.055,6,4).translate(sign*.5,.80,.42));
  }
  add(metal,this.style.head==='crown'?0xf2bc35:this.style.head==='horns'?0xe3d6af:0x70889b,true);add(detail,this.style.head==='crown'?0x8b48df:0xd6a249,true);
  const mark=this.style.mark;
  if(mark!=='none'){
   // A spherical patch follows the heading with the eyes. The UV seam stays behind the art.
   const geometry=new T.SphereGeometry(1.026,40,22,Math.PI/2-1.55,3.1,.14,2.77);
   const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.47,alphaTest:.08,transparent:true,depthWrite:false});
   if(typeof document!=='undefined'){
    material.map=paintTexture(mark);
   }
   const paint=new T.Mesh(geometry,material);paint.name='surface-paint';paint.castShadow=true;this.add(paint);
  }
 }
 update(heading:number){this.rotation.y=heading;}
 dispose(){this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}
