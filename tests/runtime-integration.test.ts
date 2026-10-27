import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3,Texture,Quaternion,Matrix4,InstancedMesh,MathUtils} from 'three';
import {designForGame,gameplayAtlas} from '../src/game/RuntimeAppearance';
import {skinFrom,isVividSeed} from '../src/core/skin';
import {BerryCollectibles} from '../src/game/BerryCollectibles';
import {RuntimeFace,RuntimeVisual} from '../src/game/RuntimeVisual';
import {FurTufts} from '../src/skin/FurTufts';
import {defaultDesign,growthLayout} from '../src/skin/SkinDesign';
import {EventBus} from '../src/core/events';
import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('public/assets/face/animated/atlas.json','utf8'));
test('runtime appearance preserves saved identity and is deterministic with bounded fur',()=>{const skin=skinFrom(4321),d=designForGame(skin);assert.deepEqual(d,designForGame(skin));assert.equal(d.seed,skin.seed);assert.equal(d.base,skin.color);assert.equal(d.accent,skin.accent);assert.ok(d.furCount<=24);});
test('ordinary berries collect once across a dash, reset and ignore high passes',()=>{const scene=new Scene(),bus=new EventBus(),berries=new BerryCollectibles(scene,bus),events:number[]=[];bus.on('berry_pickup',e=>events.push(e.count));const position=berries.items[0].mesh.position;berries.checkSegment(position.clone().add(new Vector3(-5,0,0)),position.clone().add(new Vector3(5,0,0)));assert.equal(berries.count,1);berries.checkSegment(position,position);assert.equal(berries.count,1);assert.deepEqual(events,[1]);assert.equal(berries.items[0].mesh.visible,false);berries.reset();berries.checkSegment(position.clone().add(new Vector3(0,8,0)),position.clone().add(new Vector3(1,8,0)));assert.equal(berries.count,0);assert.equal(berries.items[0].mesh.visible,true);});
test('runtime face uses compact current art, conscious impact and vertical combo then restores its character',()=>{const atlas=gameplayAtlas(source),face=new RuntimeFace(atlas,[new Texture(),new Texture(),new Texture()],'worried');assert.equal(face.expression(),'scared');assert.equal(atlas.poses.sly.parts[0].layout.width/source.poses.sly.parts[0].layout.width,.9);face.impact();face.update(.3,.7);assert.equal(face.expression(),'dazed');face.combo();face.update(.3,.7);assert.equal(face.expression(),'unhinged');assert.equal(face.rig.poses.unhinged.rotation.y,0);face.update(.5,.7);assert.equal(face.immobilized,true);assert.equal(face.expression(),'dizzy');face.update(3,.7);assert.equal(face.immobilized,false);assert.equal(face.expression(),'scared');assert.equal(face.rotation.y,.7);});

test('fur shell clearance tracks actual FaceRig heading and vertical combo instead of old +Z',()=>{
 for(const surface of ['fuzz','shaggy'] as const){
  const visual=new RuntimeVisual({...defaultDesign,surface,furCount:160,furLength:.3},gameplayAtlas(source),[new Texture(),new Texture(),new Texture()],'sly');let fur:FurTufts|undefined;visual.traverse(o=>{if(o instanceof FurTufts)fur=o;});assert.ok(fur);
  visual.rollingBody.quaternion.setFromAxisAngle(new Vector3(1,0,0),.8);
  for(const orbit of [false,true]){if(orbit)visual.face.combo();visual.face.update(.13,1.8);visual.updateDecorations();
   const orientation=visual.face.quaternion.clone().multiply(visual.face.rig.poses[visual.face.expression()].quaternion),relative=orientation.invert().multiply(visual.rollingBody.quaternion);
   const normal=new Vector3(0,0,1).applyQuaternion(relative),shaderNormal=new Vector3(0,0,1).applyMatrix3(fur.coatUniforms.faceFrame.value);assert.ok(normal.distanceTo(shaderNormal)<1e-6);assert.ok(fur.coatUniforms.height.value<=.12);
  }
 }
});

test('dense soft bumps and spikes follow face clearance rather than a fixed bald patch',()=>{
 for(const growthShape of ['soft','spike'] as const){
  const design={...defaultDesign,surface:'segments' as const,growthShape,growthCount:240,growthSize:.34},visual=new RuntimeVisual(design,gameplayAtlas(source),[new Texture(),new Texture(),new Texture()],'sly');
  let growths:InstancedMesh|undefined;visual.rollingBody.traverse(o=>{if(o instanceof InstancedMesh)growths=o;});assert.ok(growths);assert.equal(growths.count,240);
  const layout=growthLayout(visual.design),matrix=new Matrix4(),scale=new Vector3(),position=new Vector3(),rotation=new Quaternion();
  visual.rollingBody.quaternion.setFromAxisAngle(new Vector3(1,0,0),.9);
  for(const orbit of [false,true]){
   if(orbit)visual.face.combo();visual.face.update(.11,2.4);visual.updateDecorations();
   const relative=visual.face.quaternion.clone().multiply(visual.face.rig.poses[visual.face.expression()].quaternion).invert().multiply(visual.rollingBody.quaternion);
   let empty=0,full=0;
   layout.forEach((part,i)=>{const point=new Vector3().fromArray(part.direction).applyQuaternion(relative);
    const clear=1-MathUtils.smoothstep(point.z,.54,.84)*(1-MathUtils.smoothstep(Math.abs(point.y),.63,.88));
    growths!.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);assert.ok(Math.abs(scale.y-part.size*clear)<1e-6);
    if(clear<.01)empty++;if(clear>.99)full++;
   });assert.ok(empty>0&&full>0);
  }
 }
});

test('seeded appearance pool includes frequent patterns and real eligible gloss',()=>{
 let patterned=0,glossy=0,smooth=0,vivid=0,smallSparse=0;const colors=new Set<string>();
 for(let seed=0;seed<10000;seed++){const skin=skinFrom(seed),d=designForGame(skin);colors.add(d.base);if(isVividSeed(seed))vivid++;if(d.pattern!=='none'&&d.scale<=.6&&d.density<=.22)smallSparse++;assert.deepEqual(d,designForGame(skin));if(d.surface==='smooth')smooth++;if(d.pattern!=='none'){patterned++;assert.equal(d.surface,'smooth');}if(d.gloss>0){glossy++;assert.equal(d.surface,'smooth');assert.equal(d.growthCount,0);assert.ok(d.gloss>=.65&&d.gloss<=.95);}}
 assert.equal(colors.size,24);assert.ok(vivid>6500&&vivid<7500);assert.ok(smallSparse>1800&&smallSparse<2500);assert.ok(patterned>3500&&patterned<5000);assert.ok(glossy>4200&&glossy<5500);assert.ok(smooth>6500&&smooth<7500);
});


test('retired straight fur keeps old author seed and colours while showing the curly coat',()=>{
 const old={...defaultDesign,surface:'fuzz' as const,seed:12345,base:'#123456',accent:'#abcdef'};
 const visual=new RuntimeVisual(old,gameplayAtlas(source),[new Texture(),new Texture(),new Texture()],'sly');
 assert.equal(visual.design.surface,'shaggy');assert.equal(visual.design.seed,old.seed);assert.equal(visual.design.base,old.base);assert.equal(visual.design.accent,old.accent);
 for(let seed=0;seed<1000;seed++)assert.notEqual(designForGame(skinFrom(seed)).surface,'fuzz');
});
