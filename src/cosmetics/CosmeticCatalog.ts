/** Author-only cosmetic selections. No physics, inventory or skin persistence. */
export type MakeupId = 'lashes' | 'blush' | 'lips' | 'eyeshadow';
export type TattooId = 'battle' | 'lightning' | 'claw' | 'tribal' | 'star' | 'crown' | 'hearts';
export type AccessoryId = 'cap-forward' | 'cap-backward' | 'reading-glasses' | 'steampunk-goggles' | 'cat-ears' | 'viking-helmet' | 'zorro-mask';
export type Slot = 'headwear' | 'eyewear' | 'mask';
export interface AccessoryDefinition { readonly id: AccessoryId; readonly slot: Slot; readonly conflicts: readonly Slot[] }
export const MAKEUP: readonly MakeupId[] = ['lashes','blush','lips','eyeshadow'];
export const TATTOOS: readonly TattooId[] = ['battle','lightning','claw','tribal','star','crown','hearts'];
export const ACCESSORIES: readonly AccessoryDefinition[] = [
 {id:'cap-forward',slot:'headwear',conflicts:[]}, {id:'cap-backward',slot:'headwear',conflicts:[]},
 {id:'cat-ears',slot:'headwear',conflicts:[]}, {id:'viking-helmet',slot:'headwear',conflicts:[]},
 {id:'reading-glasses',slot:'eyewear',conflicts:['mask']}, {id:'steampunk-goggles',slot:'eyewear',conflicts:['mask']},
 {id:'zorro-mask',slot:'mask',conflicts:['eyewear']},
];
export interface TattooPlacement { id: TattooId; rearOffset?: number; color: string; u: number; v: number; scale: number; excludeFace: boolean }
export interface CosmeticSelection { version: 1; makeup: MakeupId[]; tattoo: TattooPlacement | null; accessories: AccessoryId[] }
export const emptySelection = ():CosmeticSelection => ({version:1,makeup:[],tattoo:null,accessories:[]});
/** Equirectangular longitude wraps at the UV seam; latitude does not. */
export function wrapU(u:number):number { if(!Number.isFinite(u)) throw new Error('Invalid UV'); return ((u%1)+1)%1; }
export function validateSelection(value:CosmeticSelection):string[] {
 const problems:string[]=[];
 if(value.version!==1)problems.push('Unsupported cosmetic version');
 const makeup=new Set<MakeupId>();
 for(const id of value.makeup){if(!MAKEUP.includes(id))problems.push('Unknown makeup: '+id);else if(makeup.has(id))problems.push('Duplicate makeup: '+id);makeup.add(id);}
 if(value.tattoo){const t=value.tattoo;if(t.rearOffset!==undefined&&(!Number.isFinite(t.rearOffset)||t.rearOffset<0||t.rearOffset>1))problems.push('Invalid rear offset');if(!TATTOOS.includes(t.id))problems.push('Unknown tattoo');if(!/^#[0-9a-f]{6}$/i.test(t.color))problems.push('Invalid tattoo color');if(!Number.isFinite(t.u)||!Number.isFinite(t.v)||t.v<0||t.v>1||!Number.isFinite(t.scale)||t.scale<=0||t.scale>1)problems.push('Invalid tattoo placement');}
 const occupied=new Set<Slot>();const selected:AccessoryDefinition[]=[];
 for(const id of value.accessories){const item=ACCESSORIES.find(x=>x.id===id);if(!item){problems.push('Unknown accessory: '+id);continue;}if(occupied.has(item.slot))problems.push('Slot occupied: '+item.slot);occupied.add(item.slot);selected.push(item);}
 for(const item of selected)for(const slot of item.conflicts)if(occupied.has(slot))problems.push(`${item.id} conflicts with ${slot}`);
 return problems;
}
