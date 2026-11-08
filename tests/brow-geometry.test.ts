import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SketchFace} from '../src/face/SketchFace';

test('changing eyebrow style redraws both 3D meshes without modifying the classic silhouette',()=>{
 const face=new SketchFace();
 const brows:T.Mesh[]=[];
 face.traverse(object=>{if(object instanceof T.Mesh&&object.name==='sculpted-brow')brows.push(object);});
 assert.equal(brows.length,2);
 const sample=()=>brows.map(mesh=>Array.from((mesh.geometry as T.BufferGeometry).attributes.position.array));
 const pose=()=>face.updatePose(.02,'neutral',0,false,'#bb3344');
 for(let i=0;i<80;i++)pose();
 const classic=sample();
 for(const style of ['elegant','rounded','bold_short'] as const){
   face.browStyle=style;pose();
   const variant=sample();
   for(let side=0;side<2;side++)assert.notDeepEqual(variant[side],classic[side],`${style} must update eyebrow ${side}`);
 }
 face.browStyle='classic';pose();
 assert.deepEqual(sample(),classic);
 face.dispose();
});

test('curious short brows leave a clear gap at the bridge and return to their normal sockets',()=>{
 const face=new SketchFace();
 const brows:T.Mesh[]=[];
 face.traverse(object=>{if(object instanceof T.Mesh&&object.name==='sculpted-brow')brows.push(object);});
 face.browStyle='bold_short';
 const settle=(expression:string)=>{for(let i=0;i<90;i++)face.updatePose(.02,expression,0,false,'#bb3344');};
 const innerEdge=(mesh:T.Mesh)=>{
   const coordinates=(mesh.geometry as T.BufferGeometry).attributes.position;
   let min=Infinity;
   for(let i=0;i<coordinates.count;i++)min=Math.min(min,Math.abs(coordinates.getX(i)));
   return min;
 };
 settle('neutral');
 const neutral=brows.map(innerEdge);
 settle('curious');
 const curious=brows.map(innerEdge);
 for(let side=0;side<2;side++)assert.ok(curious[side]>neutral[side]+.13,`curious brow ${side} should move away from bridge`);
 settle('neutral');
 assert.deepEqual(brows.map(innerEdge),neutral);
 face.dispose();
});
