import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3,Texture,Quaternion,Matrix4,InstancedMesh,MathUtils} from 'three';
import {designForGame,gameplayAtlas} from '../src/game/RuntimeAppearance';
import {skinFrom} from '../src/core/skin';
import {BerryCollectibles} from '../src/game/BerryCollectibles';
import {RuntimeFace,RuntimeVisual} from '../src/game/RuntimeVisual';
import {FurTufts,furLayout} from '../src/skin/FurTufts';
import {defaultDesign,growthLayout} from '../src/skin/SkinDesign';
import {EventBus} from '../src/core/events';
import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('public/assets/face/animated/atlas.json','utf8'));
test('runtime appearance preserves saved identity and is deterministic with bounded fur',()=>{const skin=skinFrom(4321),d=designForGame(skin);assert.deepEqual(d,designForGame(skin));assert.equal(d.seed,skin.seed);assert.equal(d.base,skin.color);assert.equal(d.accent,skin.accent);assert.ok(d.furCount<=24);});
test('ordinary berries collect once across a dash, reset and ignore high passes',()=>{const scene=new Scene(),bus=new EventBus(),berries=new BerryCollectibles(scene,bus),events:number[]=[];bus.on('berry_pickup',e=>events.push(e.count));const position=berries.items[0].mesh.position;berries.checkSegment(position.clone().add(new Vector3(-5,0,0)),position.clone().add(new Vector3(5,0,0)));assert.equal(berries.count,1);berries.checkSegment(position,position);assert.equal(berries.count,1);assert.deepEqual(events,[1]);assert.equal(berries.items[0].mesh.visible,false);berries.reset();berries.checkSegment(position.clone().add(new Vector3(0,8,0)),position.clone().add(new Vector3(1,8,0)));assert.equal(berries.count,0);assert.equal(berries.items[0].mesh.visible,true);});
test('runtime face uses compact current art, conscious impact and vertical combo then restores its character',()=>{const atlas=gameplayAtlas(source),face=new RuntimeFace(atlas,[new Texture(),new Texture(),new Texture()],'worried');assert.equal(face.expression(),'scared');assert.equal(atlas.poses.sly.parts[0].layout.width/source.poses.sly.parts[0].layout.width,.9);face.impact();face.update(.3,.7);assert.equal(face.expression(),'dazed');face.combo();face.update(.3,.7);assert.equal(face.expression(),'unhinged');assert.equal(face.rig.poses.unhinged.rotation.y,0);face.update(.5,.7);assert.equal(face.immobilized,true);assert.equal(face.expression(),'dizzy');face.update(3,.7);assert.equal(face.immobilized,false);assert.equal(face.expression(),'scared');assert.equal(face.rotation.y,.7);});

test('dense fur clearance follows moving FaceRig and combo orbit, independently of body roll',()=>{
 for(const surface of ['fuzz','shaggy'] as const){
  const design={...defaultDesign,surface,furCount:160,furLength:.3},visual=new RuntimeVisual(design,gameplayAtlas(source),[new Texture(),new Texture(),new Texture()],'sly');
  let fur:FurTufts|undefined;visual.traverse(o=>{if(o instanceof FurTufts)fur=o;});assert.ok(fur);
  const layout=furLayout(design),matrix=new Matrix4(),scale=new Vector3(),position=new Vector3(),rotation=new Quaternion();
  visual.rollingBody.quaternion.setFromAxisAngle(new Vector3(1,0,0),.8);
  for(const combo of [false,true]){
   if(combo)visual.face.combo();
   visual.face.update(.13,1.8);visual.updateDecorations();
   const orientation=visual.face.quaternion.clone().multiply(visual.face.rig.poses[visual.face.expression()].quaternion);
   const relative=orientation.invert().multiply(visual.rollingBody.quaternion);
   let differsFromOldFrame=0;
   layout.forEach((tuft,i)=>{
    const direction=new Vector3().fromArray(tuft.direction).normalize().applyQuaternion(relative);
    const smooth=(x:number,a:number,b:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    const clear=1-smooth(direction.z,.48,.8)*(1-smooth(Math.abs(direction.y),.58,.86));
    fur!.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    assert.ok(Math.abs(scale.y-Math.min(.12,visual.design.furLength*(surface==='fuzz'?.48:1.5)*tuft.size)*clear)<1e-6);
    const old=new Vector3().fromArray(tuft.direction).normalize().applyQuaternion(visual.rollingBody.quaternion);
    if(clear<.05&&old.z<0)differsFromOldFrame++;
   });
   if(!combo)assert.ok(differsFromOldFrame>0,'clear patch moves away from old front');
  }
 }
});

test('dense soft bumps and spikes follow face clearance rather than a fixed bald patch',()=>{
 for(const growthShape of ['soft','spike'] as const){
  const design={...defaultDesign,surface:'segments' as const,growthShape,growthCount:240,growthSize:.34},visual=new RuntimeVisual(design,gameplayAtlas(source),[new Texture(),new Texture(),new Texture()],'sly');
  let growths:InstancedMesh|undefined;visual.traverse(o=>{if(o instanceof InstancedMesh)growths=o;});assert.ok(growths);assert.equal(growths.count,240);
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
