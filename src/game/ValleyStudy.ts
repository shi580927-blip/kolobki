import * as T from 'three';
import {skinFrom} from '../core/skin';
import {heightAt} from '../core/terrain';
import {designForGame} from './RuntimeAppearance';
import {RuntimeVisual} from './RuntimeVisual';
import type {AnimationAtlas} from '../face/AnimatedAtlas';

/** Author-only static casting. No AI, physics, rewards or player storage writes. */
export function addValleyStudy(scene:T.Scene,atlas:AnimationAtlas,textures:T.Texture[],environment?:T.Texture){
 const wanted=['dots','hearts','cow','lightning','giraffe','none','diamonds','leopard','scales','shaggy'];
 const actors:RuntimeVisual[]=[],colors=new Set<string>();
 wanted.forEach((kind,i)=>{
  let seed=1;
  for(;seed<10000;seed++){const d=designForGame(skinFrom(seed));if(colors.has(d.base))continue;if(kind==='scales'||kind==='shaggy'){if(d.surface===kind)break;}else if(d.surface==='smooth'&&d.pattern===kind)break;}
  const skin=skinFrom(seed),design=designForGame(skin);colors.add(design.base);const actor=new RuntimeVisual(design,atlas,textures,skin.mood,environment);
  const x=(i%5-2)*3.2,z=6.5+Math.floor(i/5)*4.2+(i%3)*.65;
  actor.position.set(x,heightAt(x,z)+1,z);actor.face.update(0,Math.PI+(i%3-1)*.18);actor.updateDecorations();actor.name='valley-study-specimen-'+i;scene.add(actor);actors.push(actor);
 });
 return {actors,update(dt:number){actors.forEach((actor,i)=>{actor.face.update(dt,Math.PI+(i%3-1)*.18);actor.updateDecorations();});}};
}
