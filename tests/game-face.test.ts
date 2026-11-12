import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Group,Quaternion,Vector3} from 'three';
import {GameFaceRig} from '../src/face/GameFaceRig';
import {FaceState} from '../src/face/FaceState';
import {readLayout} from '../src/face/FaceLayout';
import approved from '../src/face/approved-layout.json';
test('game face preserves approved geometry and returns to its persistent base after reactions and stun',()=>{
 for(const mood of ['sly','grumpy','worried'] as const){
  const state=new FaceState(mood,()=>.5),face=new GameFaceRig(state,new Texture());
  const base=face.expression();
  for(const exp of ['sly','happy','grumpy'] as const)assert.deepEqual(readLayout(face.poses[exp]),approved.faces[exp]);
  state.react('joy');state.update(.2);face.update(.2,.4);assert.equal(face.expression(),'happy');
  state.update(1.2);face.update(1.2,.4);assert.equal(face.expression(),base);
  state.react('rage');state.update(.2);face.update(.2,.4);assert.equal(face.expression(),'grumpy');
  state.blink=1;face.update(0,.4);assert.ok(face.eyes.every(e=>!e.visible));
  state.knockOut(.75);face.impact();face.update(.1,.4);assert.equal(face.expression(),'stunned');assert.ok(face.eyes.every(e=>!e.visible));
  assert.ok(Object.values(face.stunMarks).some(g=>g.visible));
  state.update(1);face.update(1,.4);assert.equal(face.expression(),base);assert.equal(face.rotation.y,.4);assert.equal(face.rotation.z,0);assert.equal(state.baseMood,mood);
 }
});
test('new game face stays independent of rolling body, and HUD uses same expression state',()=>{
 const state=new FaceState('sly'),face=new GameFaceRig(state,new Texture()),hud=new GameFaceRig(state,new Texture()),body=new Group(),root=new Group();root.add(face,body);
 face.update(0,.8);const before=face.getWorldQuaternion(new Quaternion());body.rotateOnAxis(new Vector3(1,0,0),2);root.updateMatrixWorld(true);assert.ok(before.angleTo(face.getWorldQuaternion(new Quaternion()))<1e-7);
 state.react('joy');state.update(.2);face.update(.2,.8);hud.update(.2,0);assert.equal(face.expression(),hud.expression());
});
