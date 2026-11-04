import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export type HeadKind='none'|'crown'|'horns'|'helmet';
import type {Outfit} from './Wardrobe';
export function decorForSeed(seed:number):Outfit {
 const mark=seed%4===0?(['stripes','star','bolt'] as const)[Math.floor(seed/4)%3]:'none';
 return {head:'none',mark};
}
/** Cosmetic frame follows the heading, never the rolling body. No physical shape. */
export class HeadDecor extends T.Group {
 readonly style:ReturnType<typeof decorForSeed>;
 constructor(seed:number,base:string,outfit=decorForSeed(seed)){super();this.name='head-decor';this.style={...outfit};
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
  const marks:T.BufferGeometry[]=[],edges:T.BufferGeometry[]=[];
  if(this.style.mark!=='none')for(const side of [-1,1]){
   const direction=new T.Vector3(side*.69,-.09,Math.sqrt(1-.69**2-.09**2)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),direction),matrix=new T.Matrix4().compose(direction.clone().multiplyScalar(1.022),q,new T.Vector3(1,1,1));
   if(this.style.mark==='stripes'||this.style.mark==='bolt'){
    const slash=this.style.mark==='stripes';
    const points=slash?[[-.20,.32],[-.05,.24],[.12,-.17],[.02,-.12],[-.12,.08]]:[[-.06,.44],[.19,.42],[.01,.12],[.19,.15],[-.18,-.40],[-.05,-.04],[-.19,-.02]];
    for(let k=0;k<(slash?3:1);k++){
     const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(side*(x+(slash?(k-1)*.17:0)),y)));
     shape.closePath();const g=new T.ShapeGeometry(shape),p=g.attributes.position;
     for(let i=0;i<p.count;i++){const v=new T.Vector3(p.getX(i),p.getY(i),0).applyMatrix4(matrix).normalize().multiplyScalar(1.055);p.setXYZ(i,v.x,v.y,v.z);}
     g.computeVertexNormals();marks.push(g);
    }
   }
   else{const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.055:.13;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();marks.push(new T.ShapeGeometry(shape).translate(0,-.03,.004).applyMatrix4(matrix));}
  }
  add(edges,0x492e45);const color=new T.Color(base);add(marks,this.style.mark==='bolt'?0xffaf13:this.style.mark==='star'?0xffdd64:color.r>.7&&color.g<.4?0xffe1ba:0xf45b64);
 }
 update(heading:number){this.rotation.y=heading;}
 dispose(){this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}
