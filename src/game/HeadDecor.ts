import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {AtelierAccessories,atelierAccessories} from '../cosmetics/AtelierAccessories';
export type HeadKind=Outfit['head'];
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
 constructor(seed:number,_base:string,outfit=decorForSeed(seed),environment?:T.Texture){super();this.name='head-decor';this.style={...outfit};
  if(this.style.head!=='none'&&this.style.head in atelierAccessories)this.add(new AtelierAccessories(this.style.head as keyof typeof atelierAccessories,environment));
  const add=(parts:T.BufferGeometry[],color:number,metal=false)=>{if(!parts.length)return;const geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));parts.forEach(g=>g.dispose());const material=new T.MeshStandardMaterial({color,roughness:metal?.38:.65,metalness:metal?.35:0});const mesh=new T.Mesh(geometry,material);if(!metal)material.side=T.DoubleSide;mesh.castShadow=true;this.add(mesh);};
  const metal:T.BufferGeometry[]=[],detail:T.BufferGeometry[]=[];
  if(this.style.head==='crown'){
   metal.push(new T.CylinderGeometry(.48,.52,.14,12,1,true).translate(0,1.01,0));
   metal.push(new T.TorusGeometry(.50,.045,6,24).rotateX(Math.PI/2).translate(0,1.02,0));
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.sin(a)*.44,z=Math.cos(a)*.44;metal.push(new T.ConeGeometry(.12,.32,5).translate(x,1.23,z));detail.push(new T.OctahedronGeometry(.078).translate(x,1.38,z));detail.push(new T.OctahedronGeometry(.075).translate(x*1.13,1.03,z*1.13));}
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
 dispose(){const materials=new Set<T.Material>();this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});materials.forEach(m=>m.dispose());}
}
