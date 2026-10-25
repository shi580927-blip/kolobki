import {randomFrom} from '../core/skin';
export const patterns={none:'Без узора',dots:'01 · Пятнышки',cow:'02 · Коровьи',leopard:'03 · Леопардовые',tiger:'04 · Тигровые',hearts:'05 · Сердечки',diamonds:'06 · Ромбы',hex:'07 · Шестигранники',checker:'08 · Клетка',zigzag:'09 · Зигзаги',waves:'10 · Волны',splats:'11 · Кляксы',scribbles:'12 · Каракули',lightning:'13 · Молнии',zebra:'14 · Зебра',giraffe:'15 · Жираф'} as const;
export type Pattern=keyof typeof patterns;
export interface SkinDesign {version:1;seed:number;regular:boolean;gloss:number;base:string;accent:string;pattern:Pattern;scale:number;density:number;sizeScatter:number;positionScatter:number;rotationScatter:number;surface:'smooth'|'scales'|'segments'|'fuzz'|'shaggy';furCount:number;furLength:number;furScatter:number;surfaceScale:number;relief:number;growthCount:number;growthSize:number;growthScatter:number;growthShape:'soft'|'spike';growthAccent:boolean}
export const defaultDesign:SkinDesign={version:1,seed:4321,regular:false,gloss:0,base:'#28b8bd',accent:'#157b87',pattern:'none',scale:1,density:.55,sizeScatter:.25,positionScatter:.6,rotationScatter:.35,surface:'smooth',furCount:64,furLength:.16,furScatter:.65,surfaceScale:1,relief:.045,growthCount:0,growthSize:.16,growthScatter:.3,growthShape:'soft',growthAccent:false};
export const connectedPatterns=new Set<Pattern>(['hex','checker','zigzag','waves']);
export function validateDesign(value:unknown):SkinDesign {
 if(!value||typeof value!=='object')throw Error('Нужен JSON с настройками скина');
 const x=value as Record<string,unknown>,out={...defaultDesign};
 if(x.version!==1)throw Error('Неизвестная версия настроек');
 for(const key of ['base','accent'] as const){if(typeof x[key]!=='string'||!/^#[\da-f]{6}$/i.test(x[key] as string))throw Error('Некорректный цвет');out[key]=x[key] as string;}
 if(typeof x.pattern!=='string'||!Object.hasOwn(patterns,x.pattern))throw Error('Неизвестный узор');out.pattern=x.pattern as Pattern;
 if(!['smooth','scales','segments','fuzz','shaggy'].includes(String(x.surface)))throw Error('Неизвестная поверхность');out.surface=x.surface as SkinDesign['surface'];
 if(!['soft','spike'].includes(String(x.growthShape)))throw Error('Неизвестная форма наростов');out.growthShape=x.growthShape as SkinDesign['growthShape'];
 const ranges={seed:[0,0xffffffff],scale:[.4,2.4],density:[.1,1.5],sizeScatter:[0,.7],positionScatter:[0,1],rotationScatter:[0,1],surfaceScale:[.5,2],relief:[.005,.1],growthCount:[0,240],growthSize:[.06,.34],growthScatter:[0,.7]} as const;
 for(const [key,[min,max]] of Object.entries(ranges)){const v=x[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Недопустимый параметр: '+key);(out as unknown as Record<string,unknown>)[key]=v;}
 if(!Number.isInteger(out.seed)||!Number.isInteger(out.growthCount))throw Error('Seed и количество должны быть целыми');
 for(const [key,min,max] of [['furCount',1,160],['furLength',.05,.3],['furScatter',0,1]] as const){const value=x[key]===undefined?defaultDesign[key]:x[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(key==='furCount'&&!Number.isInteger(value)))throw Error('Недопустимый параметр: '+key);out[key]=value;}
 if(x.regular!==undefined&&typeof x.regular!=='boolean')throw Error('Некорректный равномерный режим');out.regular=(x.regular??false) as boolean;if(x.gloss!==undefined&&(typeof x.gloss!=='number'||!Number.isFinite(x.gloss)||x.gloss<0||x.gloss>1))throw Error('Некорректный блеск');out.gloss=(x.gloss??0) as number;
 if(typeof x.growthAccent!=='boolean')throw Error('Некорректный цвет наростов');out.growthAccent=x.growthAccent;return out;
}
/** Layout uses a fixed budget: scaling a motif never silently changes its count. */
export function motifLayout(d:SkinDesign){const r=randomFrom(d.seed),count=Math.round(115*d.density);
 return Array.from({length:count},(_,i)=>{const jitter=d.regular?0:d.positionScatter,y=1-2*(i+.5)/count,phi=i*2.399963229728653+(r()-.5)*jitter*.35,u=((phi/(Math.PI*2))%1+1)%1,v=Math.acos(y)/Math.PI;return{u,v,size:.042*d.scale*(d.regular?1:1+(r()*2-1)*d.sizeScatter),angle:d.regular?0:(r()*2-1)*Math.PI*d.rotationScatter,variant:d.regular?.5:r()};});
}
/** Stable nested spherical sequence: increasing count preserves existing growths. */
export function growthLayout(d:SkinDesign){const r=randomFrom(d.seed^0x6143);return Array.from({length:d.growthCount},(_,i)=>{const y=r()*1.9-.95,a=r()*Math.PI*2,z=Math.sqrt(1-y*y);return{direction:(i===0?[0,.94,.341174]:i===1?[-.80,.55,.239792]:[Math.cos(a)*z,y,Math.sin(a)*z]) as [number,number,number],size:d.growthSize*(1+(r()*2-1)*d.growthScatter)};});}
