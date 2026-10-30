/** Trial reaction tuning, not health, lives or a monetary reward model. */
export type ImpactSource='collision'|'landing';
export interface ImpactData {source:ImpactSource;closingSpeed:number;severity:number}
export function impactSeverity(speed:number,source:ImpactSource){
 const threshold=source==='landing'?11:5;
 return Math.max(0,speed-threshold)**2/20;
}
/** Several glancing blows decay away. An exceptional hit can trigger on its own.
 * Ordinary jumps/landings and internal train contacts never feed this meter. */
export class ImpactMeter {
 value=0;private last=0;
 reset(){this.value=0;this.last=0;}
 add(impact:ImpactData,time:number){
  this.value=Math.max(0,this.value-Math.max(0,time-this.last)*1.5);this.last=time;
  if(impact.source!=='collision')return false;
  this.value+=impact.severity;
  if(this.value<8)return false;
  this.value=0;return true;
 }
}
