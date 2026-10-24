import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Texture} from 'three';
import {AnimationClock,ComboAnimationClock} from '../src/face/AnimationClock';
import {AnimatedAtlasRig,type AnimationAtlas} from '../src/face/AnimatedAtlas';
import approved from '../src/face/approved-layout.json';
const atlas:AnimationAtlas=JSON.parse(fs.readFileSync('public/assets/face/animated/atlas.json','utf8'));
test('13 states: 12 emotions plus knockout stay in atlas pages and approved layouts are unchanged',()=>{
 assert.equal(Object.keys(atlas.poses).length,13);
 for(const [name,pose] of Object.entries(atlas.poses))for(const p of pose.parts){const page=atlas.pages[p.page??pose.page];assert.ok(p.rect[0]>=0&&p.rect[1]>=0&&p.rect[0]+p.rect[2]<=page.width&&p.rect[1]+p.rect[3]<=page.height);assert.ok(p.layer===(p.channel==='brow'?30:p.channel==='eye'?10:5));if(name==='sly'||name==='happy'||name==='grumpy')assert.deepEqual(p.layout,approved.faces[name][p.id as keyof typeof approved.faces.sly]);}
});
test('clips hold once then return to idle; long frames do not stick',()=>{
 const clock=new AnimationClock();clock.play(atlas.clips.happy);clock.update(.1);assert.equal(clock.phase,'IN');clock.update(.2);assert.equal(clock.phase,'HOLD');clock.update(2);assert.equal(clock.phase,'OUT');clock.update(1);assert.equal(clock.phase,'IDLE');assert.equal(clock.weight,0);clock.update(10);assert.equal(clock.phase,'IDLE');
 clock.play(atlas.clips.fury);clock.update(20);assert.equal(clock.phase,'IDLE');
});
test('combo completes exactly three revolutions, stops in dizziness and recovers',()=>{
 const c=new ComboAnimationClock();c.play();c.update(.35);assert.equal(c.phase,'ORBIT');assert.ok(Math.abs(c.angle-Math.PI*3)<1e-8);c.update(.36);assert.equal(c.phase,'DIZZY');assert.equal(c.stop,true);assert.ok(Math.abs(c.angle-Math.PI*6)<1e-8);c.update(2.1);assert.equal(c.phase,'RECOVER');assert.equal(c.stop,false);c.update(.4);assert.equal(c.phase,'IDLE');
});
test('full blink hides ordinary eyes but never replaces KO crosses or dizzy spirals',()=>{
 const rig=new AnimatedAtlasRig(atlas,[new Texture(),new Texture(),new Texture()]);rig.play('unhinged');rig.update(.3);rig.forcedBlink=true;rig.update(0);
 const eyes=rig.poses.unhinged.children.filter(o=>o.name.startsWith('study-eye-'));assert.ok(eyes.every(e=>!e.visible));
 rig.play('knockout');rig.update(.3);assert.ok(rig.poses.knockout.children.filter(o=>o.name.startsWith('study-eye-')).every(e=>e.visible));rig.update(3);assert.equal(rig.expression,'sly');
});

test('small-pupil eye variants exist for all three conscious reactions, but never KO',()=>{
 for(const name of ['scared','shocked','dazed'])for(const part of atlas.poses[name].parts.filter(p=>p.channel==='eye')){
  assert.equal(part.page,2);assert.deepEqual(Object.keys(part.variants!),['center','left','right']);
  for(const r of Object.values(part.variants!)){const page=atlas.pages[part.page!];assert.ok(r[0]>=0&&r[1]>=0&&r[0]+r[2]<=page.width&&r[1]+r[3]<=page.height);}
 }
 assert.equal(atlas.poses.knockout.blink,false);
 assert.ok(atlas.poses.knockout.parts.every(p=>!p.variants));
});

test('conscious dazed gaze orbits inside fixed eye patches; stars disappear on recovery',()=>{
 const rig=new AnimatedAtlasRig(atlas,[new Texture(),new Texture(),new Texture()]);rig.play('dazed');rig.update(.3);
 const eye=rig.poses.dazed.children.find(o=>o.name==='study-eye-0') as any;
 const layout={...eye.userData.part.layout},first=eye.material.uniforms.gazeOffset.value.clone();
 assert.equal(rig.dazedStars.visible,true);assert.equal(rig.dazedStars.children.length,3);
 rig.update(.2);assert.ok(first.distanceTo(eye.material.uniforms.gazeOffset.value)>.01);assert.deepEqual(eye.userData.part.layout,layout);
 rig.update(10);assert.equal(rig.dazedStars.visible,false);rig.play('knockout');rig.update(.3);assert.equal(rig.dazedStars.visible,false);
});
