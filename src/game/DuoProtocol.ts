import {Quaternion,Vector3} from 'three';

export const DUO_PROTOCOL=1,DUO_MAP='sunny-valley-71';
export type V3=[number,number,number];export type Q4=[number,number,number,number];
export interface Motion {p:V3;q:Q4;v:V3;h:number;w:number;s:number;paused:boolean}
export type DuoPacket=({t:'hello';key:string;seed:number}|{t:'welcome';seed:number})&{protocol:number;map:string;build:string}|({t:'state';n:number}&Motion)|{t:'reject';reason:'full'|'invite'|'version'};
const tuple=(v:unknown,n:number,limit:number):v is number[]=>Array.isArray(v)&&v.length===n&&v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=limit);
/** No arbitrary design, executable data, names, or unbounded coordinates from a peer. */
export function parseDuoPacket(value:unknown):DuoPacket|undefined{
 if(!value||typeof value!=='object')return;const d=value as Record<string,unknown>;
 if(d.t==='reject'&&['full','invite','version'].includes(String(d.reason)))return {t:'reject',reason:d.reason as 'full'|'invite'|'version'};
 if(d.t==='hello'||d.t==='welcome'){
  if(!Number.isInteger(d.protocol)||typeof d.map!=='string'||d.map.length>40||typeof d.build!=='string'||d.build.length>64||!Number.isInteger(d.seed)||(d.seed as number)<0||(d.seed as number)>0xffffffff)return;
  if(d.t==='hello'&&(typeof d.key!=='string'||!/^\w{32}$/.test(d.key)))return;
  return {t:d.t,protocol:d.protocol as number,map:d.map,build:d.build,seed:d.seed as number,...(d.t==='hello'?{key:d.key as string}:{})} as DuoPacket;
 }
 if(d.t!=='state'||!Number.isInteger(d.n)||(d.n as number)<0||(d.n as number)>0x7fffffff||!tuple(d.p,3,210)||d.p[1]<-35||d.p[1]>180||!tuple(d.q,4,1.1)||!tuple(d.v,3,80)||typeof d.h!=='number'||!Number.isFinite(d.h)||Math.abs(d.h)>100||typeof d.w!=='number'||typeof d.s!=='number'||!Number.isFinite(d.w+d.s)||d.w<0||d.w>1||d.s<0||d.s>1||typeof d.paused!=='boolean')return;
 const length=Math.hypot(...d.q);if(length<.5||length>1.5)return;
 return {t:'state',n:d.n as number,p:[...d.p] as V3,q:d.q.map(v=>v/length) as Q4,v:[...d.v] as V3,h:d.h,w:d.w,s:d.s,paused:d.paused};
}
export function readDuoInvite(hash:string){
 const p=new URLSearchParams(hash.replace(/^#/,'')),id=p.get('join'),key=p.get('key');
 return id&&/^[A-Za-z0-9_-]{1,100}$/.test(id)&&key&&/^[a-f0-9]{32}$/.test(key)?{id,key}:undefined;
}
/** Arrival-time interpolation: clocks on two devices never need to agree. */
export class RemoteMotion {
 private samples:({at:number;data:Extract<DuoPacket,{t:'state'}>})[]=[];
 clear(){this.samples=[];}
 push(data:Extract<DuoPacket,{t:'state'}>,at:number){
  const last=this.samples.at(-1);if(last&&data.n<=last.data.n)return false;
  if(last&&(at-last.at>1||new Vector3(...data.p).distanceTo(new Vector3(...last.data.p))>12))this.clear();
  this.samples.push({at,data});if(this.samples.length>8)this.samples.shift();return true;
 }
 sample(now:number):Motion|undefined{
  const last=this.samples.at(-1);if(!last||now-last.at>5)return;
  const time=now-.10;let a=this.samples[0],b=a;
  for(const item of this.samples){if(item.at<=time)a=item;else {b=item;break;}b=item;}
  const t=a===b?0:Math.max(0,Math.min(1,(time-a.at)/(b.at-a.at))),p=new Vector3(...a.data.p).lerp(new Vector3(...b.data.p),t),q=new Quaternion(...a.data.q).slerp(new Quaternion(...b.data.q),t);
  if(time>last.at&&!last.data.paused)p.addScaledVector(new Vector3(...last.data.v),Math.min(.15,time-last.at));
  const h=a.data.h+Math.atan2(Math.sin(b.data.h-a.data.h),Math.cos(b.data.h-a.data.h))*t;
  return {p:p.toArray() as V3,q:q.toArray() as Q4,v:b.data.v,h,w:b.data.w,s:b.data.s,paused:b.data.paused};
 }
}
