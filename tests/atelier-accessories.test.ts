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
  if(['cap','viking','zorro'].includes(kind)){
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
