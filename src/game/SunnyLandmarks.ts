import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SUNNY_BUILDINGS} from '../core/scenicLayout';
import {heightAt} from '../core/terrain';
import {nearestExplorationPath,VALLEY_CLEARINGS} from '../core/valleyExploration';
import {nearestDrivingLane} from '../core/valleyRoute';

/** Small reusable opaque colour batch; no external models, fonts or textures. */
export class ColourBatch{
 parts:T.BufferGeometry[]=[];
 add(geometry:T.BufferGeometry,color:string,position:T.Vector3,rotation=new T.Euler()){
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
  for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal')g.deleteAttribute(name);
  const c=new T.Color(color),count=g.getAttribute('position').count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)colors.set([c.r,c.g,c.b],i*3);
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.applyMatrix4(new T.Matrix4().compose(position,new T.Quaternion().setFromEuler(rotation),new T.Vector3(1,1,1)));this.parts.push(g);
 }
 box(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,rotation=new T.Euler()){this.add(new T.BoxGeometry(sx,sy,sz),color,new T.Vector3(x,y,z),rotation);}
 cylinder(x:number,y:number,z:number,top:number,bottom:number,h:number,color:string,sides=10){this.add(new T.CylinderGeometry(top,bottom,h,sides),color,new T.Vector3(x,y,z));}
 finish(){const g=mergeGeometries(this.parts);this.parts.forEach(p=>p.dispose());return g;}
}
function transformed(g:T.BufferGeometry,x:number,y:number,z:number,yaw:number){return g.applyMatrix4(new T.Matrix4().makeRotationY(yaw)).translate(x,y,z);}

export function addSunnyLandmarks(scene:T.Scene,world:R.World){
 const structures:T.BufferGeometry[]=[],sails:T.Mesh[]=[],timber='#946038',dark='#603e2e',ivory='#f2ddb0',red='#c75831',teal='#286b73';
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});
 for(const [index,p] of SUNNY_BUILDINGS.entries()){
  const b=new ColourBatch();let ground=heightAt(p.x,p.z),lowest=ground;
  for(const dx of [-2.8,2.8])for(const dz of [-2.4,2.4]){const y=heightAt(p.x+dx,p.z+dz);ground=Math.max(ground,y);lowest=Math.min(lowest,y);}
  const foundationDrop=ground-lowest;
  if(p.kind==='lighthouse'){
   b.cylinder(0,-foundationDrop/2,0,4.5,5.0,foundationDrop+1.0,'#cbb596',12);
   for(let i=0;i<6;i++)b.cylinder(0,1.2+i*2.1,0,2.1-i*.13,2.23-i*.13,2.12,i%2?ivory:red,12);
   b.cylinder(0,13.1,0,2.55,2.55,.38,dark,12);
   b.cylinder(0,14.55,0,1.7,1.7,2.55,'#f9d76a',8);
   b.cylinder(0,16.1,0,0,2.8,1.8,red,12);
   b.cylinder(0,17.45,0,.08,.08,1.0,dark,6);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*2.35,z=Math.sin(a)*2.35;b.box(x,13.75,z,.09,1.15,.09,dark);}
   for(let i=0;i<8;i++){const a=i*Math.PI/4;b.box(Math.cos(a)*1.72,14.55,Math.sin(a)*1.72,.10,2.5,.10,dark);}
   b.cylinder(0,14.3,0,2.45,2.45,.10,dark,12);
   b.box(0,2.2,2.2,1.15,2.4,.1,dark);b.box(0,5.7,2.0,.65,1.0,.12,teal);
  }else if(p.kind==='windmill'){
   b.cylinder(0,-foundationDrop/2,0,3.15,3.4,foundationDrop+.7,'#bca88b',8);
   b.cylinder(0,3.6,0,2.3,3.25,7.2,ivory,8);b.cylinder(0,8.7,0,0,3.1,3.3,red,8);
   b.box(0,1.3,3.0,1.2,2.6,.12,timber);b.box(-1.1,4.7,2.5,.8,1.2,.13,teal);
   const rotor=new ColourBatch();rotor.cylinder(0,0,0,.28,.28,.6,timber,8);
   for(let k=0;k<4;k++){
    const a=k*Math.PI/2;
    rotor.box(Math.sin(a)*2.95,Math.cos(a)*2.95,0,.20,5.9,.18,timber,new T.Euler(0,0,-a));
    for(let j=0;j<7;j++){
     const r=1.65+j*.55,dx=.55*Math.cos(a)+r*Math.sin(a),dy=-.55*Math.sin(a)+r*Math.cos(a);
     rotor.box(dx,dy,.02,1.35,.40,.10,j%2?'#f8df9b':'#fff0bd',new T.Euler(0,0,-a));
    }
   }
   const mesh=new T.Mesh(rotor.finish(),material);mesh.name='sunny-windmill-sails';mesh.castShadow=true;
   const pivot=new T.Vector3(0,6.9,2.6).applyAxisAngle(new T.Vector3(0,1,0),p.yaw);mesh.position.set(p.x+pivot.x,ground+pivot.y,p.z+pivot.z);mesh.rotation.y=p.yaw;scene.add(mesh);sails.push(mesh);
  }else{
   const roofColor=['#b95031','#bf7635','#477d7d'][index%3];
   b.box(0,.15-foundationDrop/2,0,6.6,.8+foundationDrop,5.5,'#b4a080');b.box(0,2.1,0,5.9,3.9,4.8,ivory);
   // A proper pitched roof with visible thickness, ridge and deep eaves.
   for(const side of [-1,1])b.box(side*1.63,4.9,0,3.85,.30,5.9,roofColor,new T.Euler(0,0,-side*.53));
   b.box(0,5.85,0,.35,.24,6.1,'#9a4329');b.box(1.5,6.0,-1.2,.65,2.0,.75,'#aa7751');
   b.box(0,1.5,2.43,1.25,2.7,.14,timber);
   for(const x of [-1.85,1.85]){
    b.box(x,2.55,2.45,.95,1.15,.14,teal);b.box(x,2.55,2.54,.08,1.25,.10,ivory);b.box(x,2.55,2.55,1.02,.08,.10,ivory);b.box(x,1.8,2.67,1.18,.20,.48,timber);
    for(const side of [-1,1])b.box(x+side*.67,2.55,2.50,.27,1.3,.12,'#815132');
   }
   b.box(0,.35,3.2,1.9,.30,1.25,'#d7c4a3');
  }
  // Broken garden rail, placed with the building, never across a route.
  for(let i=0;i<4;i++){const x=-5.6+i*2.5,z=-4.8,c=Math.cos(p.yaw),s=Math.sin(p.yaw),drop=Math.max(0,ground-heightAt(p.x+x*c+z*s,p.z-x*s+z*c));b.box(x,1-drop/2,z,.23,2.0+drop,.25,timber);}
  b.box(-1.85,.95,-4.8,7.8,.17,.18,'#c5914a');b.box(-1.85,1.6,-4.8,7.8,.17,.18,'#d5a45f');
  if(p.kind!=='lighthouse'){
   // A few supplies and a bench make each building a place, not a lone box.
   b.box(4.0,.55,-1.7,1.0,1.1,1.0,'#b9894e');
   b.box(4.0,.55,-2.9,1.0,1.1,1.0,'#c39558');b.box(4.0,1.6,-2.9,.92,1.0,.92,'#b9894e');
   for(const z of [-1.7,-2.9]){b.box(4.0,.55,z-.51,.85,.10,.05,dark);b.box(4.0,.55,z+.51,.85,.10,.05,dark);}
   b.cylinder(-4,.65,1.3,.58,.58,1.3,'#a67544',9);
   for(const y of [.22,1.04])b.cylinder(-4,y,1.3,.595,.595,.09,'#695e49',9);
   b.box(-4.1,.85,3.1,2.4,.18,.8,'#d1a269');
   for(const x of [-4.95,-3.25])b.box(x,.43,3.1,.22,.85,.6,timber);
   b.box(-4.1,1.48,3.5,2.4,.6,.14,'#bc8b52');
  }
  structures.push(transformed(b.finish(),p.x,ground,p.z,p.yaw));
 }
 const geometry=mergeGeometries(structures);structures.forEach(g=>g.dispose());
 const mesh=new T.Mesh(geometry,material);mesh.name='sunny-valley-landmark-buildings';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 const vertices=new Float32Array(geometry.getAttribute('position').array),indices=Uint32Array.from({length:vertices.length/3},(_,i)=>i);
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setFriction(.85));
 // Colour banners and arrow signs anchor the outer meadows without fencing them.
 const details=new ColourBatch();
 for(const [i,c] of VALLEY_CLEARINGS.entries()){
  const a=i*1.37+.3,x=c.x+Math.cos(a)*(c.radius+4),z=c.z+Math.sin(a)*(c.radius+4);
  if(nearestDrivingLane(x,z).clearance<6||nearestExplorationPath(x,z).distance<7)continue;
  const y=heightAt(x,z);
  details.cylinder(x,y+2,z,.07,.11,4,timber,6);
  const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(1.45,0);flag.lineTo(1.45,-1.65);flag.lineTo(.72,-1.35);flag.lineTo(0,-1.65);flag.closePath();
  details.add(new T.ExtrudeGeometry(flag,{depth:.05,bevelEnabled:false}),['#8940aa','#cf533c','#467c9a'][i%3],new T.Vector3(x,y+3.9,z));
  details.box(x+.72,y+3.95,z,1.65,.12,.14,'#c59b63');
  details.add(new T.OctahedronGeometry(.27,0),'#ffe29c',new T.Vector3(x+.7,y+3.1,z-.06));
  details.box(x,y+1.5,z,.20,1.8,.20,timber);details.box(x+.8,y+1.8,z,1.9,.38,.18,'#d5a163');
 }
 if(details.parts.length){const d=new T.Mesh(details.finish(),material);d.name='sunny-meadow-banners';d.castShadow=true;scene.add(d);}
 return {buildings:SUNNY_BUILDINGS.length,update(dt:number){for(const s of sails)s.rotateZ(-dt*.28);}};
}
