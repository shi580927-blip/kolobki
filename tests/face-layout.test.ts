import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Mesh} from 'three';
import {StudyFaceRig} from '../src/face/StudyFaceRig';
import {readLayout,applyLayout,validateLayoutFile,scaleLayoutAboutCenter,type FaceLayoutFile} from '../src/face/FaceLayout';
test('editor layout roundtrip reproduces curved geometry and rejects malformed input',()=>{
 const faces={} as FaceLayoutFile['faces'];
 for(const exp of ['sly','happy','grumpy'] as const)faces[exp]=readLayout(new StudyFaceRig(new Texture(),exp));
 faces.happy['study-brow-0'].width*=1.4;faces.happy['study-mouth'].y+=.18;
 const file:FaceLayoutFile={format:'sharobesy-face-layout',version:1,atlas:'three-expressions',faces};
 const parsed=validateLayoutFile(JSON.parse(JSON.stringify(file)));
 const a=new StudyFaceRig(new Texture(),'happy'),b=new StudyFaceRig(new Texture(),'happy');
 applyLayout(a,faces.happy);applyLayout(b,parsed.faces.happy);
 assert.deepEqual(readLayout(a),readLayout(b));
 const pa=(a.getObjectByName('study-mouth') as Mesh).geometry.attributes.position;
 const pb=(b.getObjectByName('study-mouth') as Mesh).geometry.attributes.position;
 assert.deepEqual(pa.array,pb.array);
 assert.throws(()=>validateLayoutFile({format:'unknown'}));
 const bad=structuredClone(file);bad.faces.happy['study-mouth'].height=-1;
 assert.throws(()=>validateLayoutFile(bad));
});

test('skin-study face scales ten percent about its existing center with spherical reprojection',()=>{
 for(const exp of ['sly','happy','grumpy'] as const){const face=new StudyFaceRig(new Texture(),exp),original=readLayout(face),copy=structuredClone(original),small=scaleLayoutAboutCenter(original,.9);
 const bounds=(l:typeof original)=>{const points=Object.values(l).flatMap(p=>{const c=Math.cos(p.angle),s=Math.sin(p.angle);return[-1,1].flatMap(x=>[-1,1].map(y=>[p.x+x*p.width/2*c-y*p.height/2*s,p.y+x*p.width/2*s+y*p.height/2*c]));});const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return[(Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
 const a=bounds(original),b=bounds(small);assert.ok(Math.abs(a[0]-b[0])<1e-10&&Math.abs(a[1]-b[1])<1e-10);assert.ok(Math.abs(b[2]/a[2]-.9)<1e-10&&Math.abs(b[3]/a[3]-.9)<1e-10);assert.deepEqual(original,copy);
 applyLayout(face,small);for(const key of Object.keys(small)){const mesh=face.getObjectByName(key) as Mesh,p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);assert.ok(Math.abs(p.getZ(i)-Math.sqrt(Math.max(.001,1-x*x-y*y))-.025)<1e-6);}}
 face.update(.1,1);assert.ok(face.eyeParts.every(e=>!e.visible));
 }
 assert.throws(()=>scaleLayoutAboutCenter({} as any,NaN));
});
