import assert from 'node:assert/strict';
import {FaceAnimationController,CLIPS} from '../src/face/FaceAnimationController.mjs';
for(const name of Object.keys(CLIPS)){
 const poses=[];
 const face=new FaceAnimationController({random:()=>0.5,onChange:p=>poses.push({...p})});
 face.play(name);
 for(let i=0;i<45;i++) face.update(60);
 assert.equal(face.state,'idle',name+' returned to idle');
 assert.equal(face.col,0,name+' returned to neutral frame');
 assert(poses.some(p=>p.state==='hold'),name+' held expression');
 assert(poses.some(p=>p.state==='out'),name+' played release');
}
const face=new FaceAnimationController({random:()=>0});
face.update(1799);
assert.equal(face.state,'idle','no instant blink loop');
face.update(1);
assert.equal(face.state,'in','starts blink after interval');
console.log('PASS: expression events, hold, release, randomized blink interval');