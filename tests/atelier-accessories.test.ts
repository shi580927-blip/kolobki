import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {AtelierAccessories,atelierAccessories} from '../src/cosmetics/AtelierAccessories';
import {atelierLooks} from '../src/cosmetics/AtelierLooks';
import {validateDesign} from '../src/skin/SkinDesign';

test('accessory prototypes have finite surfaces, bounded geometry and share the face frame',()=>{
 const env=new T.Texture();
 for(const kind of Object.keys(atelierAccessories) as (keyof typeof atelierAccessories)[]){
  const rig=new AtelierAccessories(kind,env);let vertices=0;
  rig.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.attributes.position;vertices+=p.count;for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),kind+' contains non-finite vertices');}});
  if(kind!=='none')assert.ok(vertices>300,kind+' must contain modeled surfaces');
  assert.ok(vertices<80000,kind+' geometry exceeds the author prototype budget');
  assert.deepEqual(rig.quaternion.toArray(),[0,0,0,1]);
  const bounds=new T.Box3().setFromObject(rig);
  if(kind!=='none'){assert.ok(bounds.max.y<1.7);assert.ok(bounds.min.x>-1.4&&bounds.max.x<1.4);}
  if(['cap','viking','knight'].includes(kind)){
   let contact=Infinity;const point=new T.Vector3();
   rig.updateMatrixWorld(true);
   rig.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)contact=Math.min(contact,point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).length());}});
   assert.ok(contact<=1.005,kind+' floats above the unit sphere: minimum radius '+contact);
  }
  rig.dispose();
 }
 env.dispose();
});
test('curated bold looks retain the canonical saved-design format',()=>{
 for(const look of atelierLooks){assert.deepEqual(validateDesign(look.design),look.design);assert.ok(look.design.gloss>=.6);assert.equal(look.design.surface,'smooth');}
});
test('headwear has a tall independent crown instead of a thin spherical coating',()=>{
 const env=new T.Texture();
 for(const [kind,name]of [['cap','cap-crown'],['viking','helmet-shell'],['knight','knight-crown']] as const){
  const rig=new AtelierAccessories(kind,env),crown=rig.getObjectByName(name);
  assert.ok(crown,kind+' needs a separate crown');
  const box=new T.Box3().setFromObject(crown);
  assert.ok(box.max.y-box.min.y>=.60,kind+' crown is too shallow');
  assert.ok(box.max.y>=1.30,kind+' crown must rise above the native sphere');
  const bounds=new T.Box3().setFromObject(rig);assert.ok(Math.abs(bounds.min.x+bounds.max.x)<.015,kind+' silhouette must be symmetric');
  rig.dispose();
 }
 env.dispose();
});
test('optical rims remain circular and planar after fitting to the character',()=>{
 const env=new T.Texture();
 for(const kind of ['roundGlasses','goggles'] as const){
  const rig=new AtelierAccessories(kind,env);let count=0;
  rig.traverse(o=>{if(!(o instanceof T.Mesh)||o.name!=='optical-rim')return;count++;
   const g=o.geometry as T.TorusGeometry,{radialSegments:r,tubularSegments:t}=g.parameters,p=g.attributes.position,centres:T.Vector3[]=[];
   for(let i=0;i<t;i++){const centre=new T.Vector3();for(let j=0;j<r;j++)centre.add(new T.Vector3().fromBufferAttribute(p,j*(t+1)+i));centres.push(centre.divideScalar(r));}
   const centre=centres.reduce((sum,v)=>sum.add(v),new T.Vector3()).divideScalar(t),radius=centres[0].distanceTo(centre);
   const plane=new T.Plane().setFromCoplanarPoints(centres[0],centres[Math.floor(t/4)],centres[Math.floor(t/2)]);
   for(const v of centres){assert.ok(Math.abs(v.distanceTo(centre)-radius)<1e-5,kind+' rim is distorted');assert.ok(Math.abs(plane.distanceToPoint(v))<1e-5,kind+' rim is warped');}
  });
  assert.equal(count,2);rig.dispose();
 }
 env.dispose();
});

test('glasses, ninja wrap and knight visor clear the actual V5 eyebrow meshes',async()=>{
 const {SketchFace}=await import('../src/face/SketchFace');const env=new T.Texture();
 for(const kind of ['roundGlasses','goggles','ninja','knight'] as const){
  const rig=new AtelierAccessories(kind,env);rig.updateMatrixWorld(true);
  const surfaces:T.Mesh[]=[];rig.traverse(o=>{if(o instanceof T.Mesh&&['optical-rim','ninja-face-wrap','knight-visor'].includes(o.name))surfaces.push(o);});
  let overlaps=0;const ray=new T.Raycaster(),v=new T.Vector3();
  for(const style of ['classic','elegant','rounded','bold_short'] as const)for(const pose of ['neutral','sly','angry','curious','surprised','smile']){
   const face=new SketchFace(env);face.browStyle=style;face.updatePose(0,pose,0,false,'#29c7bf',true);face.updateMatrixWorld(true);
   face.traverse(o=>{if(!(o instanceof T.Mesh)||!o.visible||!['sculpted-brow','brow-inner-cap','brow-outer-cap'].includes(o.name))return;
    const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=12){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);ray.set(new T.Vector3(v.x,v.y,3),new T.Vector3(0,0,-1));const hits=ray.intersectObjects(surfaces,false);if(hits.length){overlaps++;assert.ok(hits[0].point.z>v.z+.02,kind+' intersects '+style+' brows in '+pose);}}
   });face.dispose();
  }
  if(kind==='roundGlasses'||kind==='ninja'||kind==='knight')assert.ok(overlaps>0,'clearance check must exercise overlapping silhouettes');rig.dispose();
 }
 env.dispose();
});
