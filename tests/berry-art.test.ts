import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3,Mesh,InstancedMesh} from 'three';
import {BerryCollectibles} from '../src/game/BerryCollectibles';
import {berryPlacement} from '../src/game/BerryArt';
import {heightAt} from '../src/core/terrain';
import {EventBus} from '../src/core/events';

test('ground berries touch the meadow, plant berries have a stem and picking leaves the plant rooted',()=>{
 const scene=new Scene(),berries=new BerryCollectibles(scene,new EventBus());
 for(let i=0;i<12;i++){
  const p=berryPlacement(i),fruit=berries.items[i].mesh;assert.equal(fruit.position.y,p.centerY);
  if(!p.onPlant)assert.ok(p.centerY-.48-heightAt(p.x,p.z)<=.02&&p.centerY-.48-heightAt(p.x,p.z)>=-.06);
  const flesh=fruit.getObjectByName('raspberry-flesh') as InstancedMesh;assert.equal(flesh.count,15);
 }
 const leaves=scene.getObjectByName('berry-plant-leaves') as InstancedMesh,stems=scene.getObjectByName('berry-plant-stems') as Mesh;
 assert.equal(leaves.count,216);assert.ok(stems.geometry.getAttribute('position').count>0);
 const center=berries.items[0].mesh.position.clone();berries.checkSegment(center.clone().add(new Vector3(-2,0,0)),center.clone().add(new Vector3(2,0,0)));
 assert.equal(berries.count,1);assert.equal(berries.items[0].mesh.visible,false);assert.equal(leaves.visible,true);assert.equal(stems.visible,true);
 berries.reset();assert.equal(berries.items[0].mesh.visible,true);assert.equal(berries.count,0);
});
