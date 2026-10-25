import type {Skin} from '../core/skin';
import {randomFrom} from '../core/skin';
import {defaultDesign,type SkinDesign} from '../skin/SkinDesign';
import type {AnimationAtlas} from '../face/AnimatedAtlas';
import {scaleLayoutAboutCenter,type FaceLayout} from '../face/FaceLayout';
/** Stable art mapping: keep the existing saved seed, base color and character. */
export function designForGame(skin:Skin):SkinDesign {
 const r=randomFrom(skin.seed^0x52a1),surfaceRoll=r(),surface=surfaceRoll<.70?'smooth':surfaceRoll<.82?'scales':surfaceRoll<.92?'segments':surfaceRoll<.96?'fuzz':'shaggy';
 const patternRoll=r(),glossRoll=r(),patternChoices=['dots','hearts','cow','giraffe','zebra','leopard','diamonds','lightning'] as const;
 const pattern=surface==='smooth'&&patternRoll<.60?patternChoices[Math.floor(r()*patternChoices.length)]:'none';
 const gloss=surface==='smooth'&&glossRoll<.70?.65+r()*.30:0;
 const growthCount=gloss===0&&r()<.10?Math.floor(r()*4)+1:0;
 return{...defaultDesign,seed:skin.seed,base:skin.color,accent:skin.accent,surface,pattern,furCount:24,furLength:.08,growthCount,gloss,surfaceAccent:r()<.7,regular:['dots','hearts','diamonds'].includes(pattern)&&r()<.5,density:.4,scale:1+r()*.35};
}
export function gameplayAtlas(source:AnimationAtlas):AnimationAtlas {const atlas=structuredClone(source);for(const pose of Object.values(atlas.poses)){const layout=Object.fromEntries(pose.parts.map(p=>[p.id,p.layout])) as FaceLayout,small=scaleLayoutAboutCenter(layout,.9);pose.parts.forEach(p=>p.layout=small[p.id as keyof FaceLayout]);}return atlas;}
