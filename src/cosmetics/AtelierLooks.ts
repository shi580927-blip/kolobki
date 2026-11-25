import {defaultDesign,type SkinDesign} from '../skin/SkinDesign';
import type {AtelierAccessory} from './AtelierAccessories';
export type SkullTreatment='original'|'native-color'|'open-mask';
/** Deliberate colour pairs and broad motifs. Never fed into the player's seed generator. */
export const atelierLooks:{name:string;design:SkinDesign;accessory:AtelierAccessory;skull:boolean}[]=[
 {name:'Алый хищник',design:{...defaultDesign,seed:7413,base:'#ef2949',accent:'#211c31',pattern:'tiger',surface:'smooth',gloss:.72,scale:2.1,density:.32},accessory:'headphones',skull:false},
 {name:'Лаймовый бунт',design:{...defaultDesign,seed:2816,base:'#a5e824',accent:'#242635',pattern:'cow',surface:'smooth',gloss:.62,scale:1.8,density:.35},accessory:'horns',skull:false},
 {name:'Северный разряд',design:{...defaultDesign,seed:5931,base:'#118ee9',accent:'#e8f5ff',pattern:'tiger',surface:'smooth',gloss:.72,scale:1.9,density:.36},accessory:'viking',skull:false},
 {name:'Черепушка · маска',design:{...defaultDesign,seed:8293,base:'#8e49e9',accent:'#2a204a',pattern:'tiger',surface:'smooth',gloss:.65,scale:2.2,density:.28},accessory:'roundGlasses',skull:true}
];
