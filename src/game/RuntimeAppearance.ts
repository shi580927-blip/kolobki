import type {Skin} from '../core/skin';
import {randomFrom} from '../core/skin';
import {defaultDesign,type SkinDesign} from '../skin/SkinDesign';
import type {AnimationAtlas} from '../face/AnimatedAtlas';
import {scaleLayoutAboutCenter,type FaceLayout} from '../face/FaceLayout';
/** Stable art mapping: keep the existing saved seed, base color and character. */
export function designForGame(skin:Skin):SkinDesign {const r=randomFrom(skin.seed^0x52a1),surfaceRoll=r(),surface=surfaceRoll<.68?'smooth':surfaceRoll<.80?'scales':surfaceRoll<.9?'segments':surfaceRoll<.96?'fuzz':'shaggy';
 const pattern=surface==='smooth'&&r()>.65?(['dots','hearts','cow','giraffe','zebra','leopard','lightning'] as const)[Math.floor(r()*7)]:'none';
 return{...defaultDesign,seed:skin.seed,base:skin.color,accent:skin.accent,surface,pattern,furCount:24,furLength:.08,growthCount:r()<.12?Math.floor(r()*5)+1:0,gloss:surface==='smooth'&&r()<.25?.45:0};
}
export function gameplayAtlas(source:AnimationAtlas):AnimationAtlas {const atlas=structuredClone(source);for(const pose of Object.values(atlas.poses)){const layout=Object.fromEntries(pose.parts.map(p=>[p.id,p.layout])) as FaceLayout,small=scaleLayoutAboutCenter(layout,.9);pose.parts.forEach(p=>p.layout=small[p.id as keyof FaceLayout]);}return atlas;}
