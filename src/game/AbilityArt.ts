import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AbilityKind} from './AbilityModel';
const mat=(color:number,roughness=.42)=>new T.MeshStandardMaterial({color,roughness});
function mesh(geometry:T.BufferGeometry,material:T.Material,parent:T.Group,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
export function abilityFruit(kind:AbilityKind){
 const cache=new Map<string,T.MeshStandardMaterial>();const mat=(color:number,roughness=.42)=>{const key=color+':'+roughness;if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({color,roughness}));return cache.get(key)!;};
 const root=new T.Group();root.name='ability-'+kind;
 if(kind==='pepper'){
  const path=new T.CatmullRomCurve3([new T.Vector3(-.52,-.16,0),new T.Vector3(-.3,-.05,0),new T.Vector3(.02,.05,0),new T.Vector3(.24,.22,0)]);
  const body=mesh(new T.TubeGeometry(path,16,.18,10,false),mat(0xe93526,.27),root);const positions=body.geometry.attributes.position;for(let i=0;i<positions.count;i++){const p=new T.Vector3().fromBufferAttribute(positions,i),t=Math.max(0,Math.min(1,(p.x+.7)/1));positions.setXYZ(i,p.x,p.y*(.25+t*.7),p.z*(.25+t*.8));}body.geometry.computeVertexNormals();
  mesh(new T.SphereGeometry(.18,12,8),mat(0xf64a26,.27),root,.24,.22,0);const stem=mesh(new T.CylinderGeometry(.045,.08,.28,8),mat(0x4f9130),root,.26,.44,0);stem.rotation.z=-.25;
 }else if(kind==='lemon'){
  const body=mesh(new T.SphereGeometry(.37,20,12),mat(0xf9cf2c,.53),root);body.scale.set(1.35,.83,.88);
  mesh(new T.SphereGeometry(.10,10,6),mat(0xe6b820),root,-.46,0,0);mesh(new T.SphereGeometry(.08,10,6),mat(0xe6b820),root,.46,0,0);
  const leaf=mesh(new T.SphereGeometry(.13,8,6),mat(0x519a35),root,.27,.34,0);leaf.scale.set(1.4,.3,.6);leaf.rotation.z=.4;
 }else{
  const red=mat(0x9f173b,.26);for(let row=0;row<3;row++){const count=row===1?7:5,y=(row-1)*.21,r=row===1?.28:.19;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;mesh(new T.SphereGeometry(.20,12,8),red,root,Math.cos(a)*r,y,Math.sin(a)*r);}}
  mesh(new T.CylinderGeometry(.17,.22,.15,10),mat(0x2c3043),root,0,.48,0);
  const path=new T.CatmullRomCurve3([new T.Vector3(0,.55,0),new T.Vector3(.05,.77,0),new T.Vector3(.22,.82,0)]);mesh(new T.TubeGeometry(path,8,.045,6,false),mat(0xc69142),root);
  mesh(new T.OctahedronGeometry(.13),new T.MeshBasicMaterial({color:0xffd544,toneMapped:false}),root,.24,.83,0);
 }
 root.updateMatrixWorld(true);const groups=new Map<T.Material,T.BufferGeometry[]>();root.traverse(o=>{if(o instanceof T.Mesh){const material=o.material as T.Material;if(!groups.has(material))groups.set(material,[]);groups.get(material)!.push(o.geometry.clone().applyMatrix4(o.matrixWorld));o.geometry.dispose();}});root.clear();for(const [material,parts] of groups){const geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));parts.forEach(g=>g.dispose());const batch=new T.Mesh(geometry,material);batch.castShadow=true;root.add(batch);}root.scale.setScalar(1.18);
 return root;
}
