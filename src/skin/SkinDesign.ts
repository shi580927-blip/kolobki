import {randomFrom} from '../core/skin';
export const patterns={none:'Без узора',dots:'01 · Пятнышки',cow:'02 · Коровьи',leopard:'03 · Леопардовые',tiger:'04 · Тигровые',hearts:'05 · Сердечки',diamonds:'06 · Ромбы',hex:'07 · Шестигранники',checker:'08 · Клетка',zigzag:'09 · Зигзаги',waves:'10 · Волны',splats:'11 · Кляксы',scribbles:'12 · Каракули'} as const;
export type Pattern=keyof typeof patterns;
export interface SkinDesign {version:1;seed:number;base:string;accent:string;pattern:Pattern;scale:number;density:number;sizeScatter:number;positionScatter:number;rotationScatter:number;surface:'smooth'|'scales'|'segments';surfaceScale:number;relief:number;growthCount:number;growthSize:number;growthScatter:number;growthShape:'soft'|'spike';growthAccent:boolean}
export const defaultDesign:SkinDesign={version:1,seed:4321,base:'#28b8bd',accent:'#157b87',pattern:'none',scale:1,density:.55,sizeScatter:.25,positionScatter:.6,rotationScatter:.35,surface:'smooth',surfaceScale:1,relief:.045,growthCount:0,growthSize:.16,growthScatter:.3,growthShape:'soft',growthAccent:false};
export const connectedPatterns=new Set<Pattern>(['hex','checker','zigzag','waves']);
export function validateDesign(value:unknown):SkinDesign {
 if(!value||typeof value!=='object')throw Error('Нужен JSON с настройками скина');
 const x=value as Record<string,unknown>,out={...defaultDesign};
 if(x.version!==1)throw Error('Неизвестная версия настроек');
 for(const key of ['base','accent'] as const){if(typeof x[key]!=='string'||!/^#[\da-f]{6}$/i.test(x[key] as string))throw Error('Некорректный цвет');out[key]=x[key] as string;}
 if(typeof x.pattern!=='string'||!Object.hasOwn(patterns,x.pattern))throw Error('Неизвестный узор');out.pattern=x.pattern as Pattern;
 if(!['smooth','scales','segments'].includes(String(x.surface)))throw Error('Неизвестная поверхность');out.surface=x.surface as SkinDesign['surface'];
 if(!['soft','spike'].includes(String(x.growthShape)))throw Error('Неизвестная форма наростов');out.growthShape=x.growthShape as SkinDesign['growthShape'];
 const ranges={seed:[0,0xffffffff],scale:[.4,2.4],density:[.1,1.5],sizeScatter:[0,.7],positionScatter:[0,1],rotationScatter:[0,1],surfaceScale:[.5,2],relief:[.005,.1],growthCount:[0,240],growthSize:[.06,.34],growthScatter:[0,.7]} as const;
 for(const [key,[min,max]] of Object.entries(ranges)){const v=x[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Недопустимый параметр: '+key);(out as unknown as Record<string,unknown>)[key]=v;}
 if(!Number.isInteger(out.seed)||!Number.isInteger(out.growthCount))throw Error('Seed и количество должны быть целыми');
 if(typeof x.growthAccent!=='boolean')throw Error('Некорректный цвет наростов');out.growthAccent=x.growthAccent;return out;
}
/** Layout uses a fixed budget: scaling a motif never silently changes its count. */
export function motifLayout(d:SkinDesign){const r=randomFrom(d.seed),count=Math.round(115*d.density),cols=Math.ceil(Math.sqrt(count*2)),rows=Math.ceil(count/cols);
 return Array.from({length:count},(_,i)=>{const jitter=d.positionScatter;return{u:((i%cols+.5+(r()-.5)*jitter)/cols+1)%1,v:Math.max(.035,Math.min(.965,(Math.floor(i/cols)+.5+(r()-.5)*jitter)/rows)),size:.042*d.scale*(1+(r()*2-1)*d.sizeScatter),angle:(r()*2-1)*Math.PI*d.rotationScatter,variant:r()};});
}
/** Stable nested spherical sequence: increasing count preserves existing growths. */
export function growthLayout(d:SkinDesign){const r=randomFrom(d.seed^0x6143);return Array.from({length:d.growthCount},(_,i)=>{const y=r()*1.9-.95,a=r()*Math.PI*2,z=Math.sqrt(1-y*y);return{direction:(i===0?[0,.94,.341174]:i===1?[-.80,.55,.239792]:[Math.cos(a)*z,y,Math.sin(a)*z]) as [number,number,number],size:d.growthSize*(1+(r()*2-1)*d.growthScatter)};});}
