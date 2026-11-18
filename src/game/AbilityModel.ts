export const ABILITY_KINDS=['pepper','lemon','bomb'] as const;
export type AbilityKind=typeof ABILITY_KINDS[number];
/** Trial tuning: temporary actions, never permanent growth or currency. */
export const ABILITIES={pepper:{name:'Огненный перчик',action:'Разгон и таран',cooldown:4,color:0xff6531},lemon:{name:'Лимонная кислинка',action:'Высокий прыжок',cooldown:3,color:0xffdc38},bomb:{name:'Бомбочка-ягодка',action:'Оттолкнуть соперников',cooldown:5,color:0xc659f5}} as const;
export class AbilityInventory {
 readonly charges:Record<AbilityKind,number>={pepper:0,lemon:0,bomb:0};selected:AbilityKind='pepper';cooldown=0;
 add(kind:AbilityKind){if(this.charges[kind]>=3)return false;this.charges[kind]++;if(this.charges[this.selected]===0)this.selected=kind;return true;}
 select(kind:AbilityKind){this.selected=kind;}
 cycle(offset:number){this.selected=ABILITY_KINDS[(ABILITY_KINDS.indexOf(this.selected)+offset+3)%3];}
 canUse(kind=this.selected){return this.cooldown<=0&&this.charges[kind]>0;}
 spend(kind:AbilityKind){if(!this.canUse(kind))return false;this.charges[kind]--;this.cooldown=ABILITIES[kind].cooldown;return true;}
 step(dt:number){this.cooldown=Math.max(0,this.cooldown-dt);}
 reset(){for(const kind of ABILITY_KINDS)this.charges[kind]=0;this.selected='pepper';this.cooldown=0;}
 snapshot(){return {selected:this.selected,charges:{...this.charges},cooldown:this.cooldown};}
}
export type PhysicalCombo='ram'|'air-hit'|'domino'|'blast';
export const COMBO_LABELS:Record<PhysicalCombo,string>={ram:'Разгонный таран!', 'air-hit':'Удар с высоты!',domino:'Домино!',blast:'Взрывная волна!'};
/** Follows real collisions after a deliberate action. No generated impulses here. */
export class ComboChain {
 private active=new Map<number,{at:number;seen:Set<number>}>();private pairs=new Map<string,number>();
 reset(){this.active.clear();this.pairs.clear();}
 prime(id:number,now:number){this.active.set(id,{at:now,seen:new Set([id])});}
 contact(a:number,b:number,closing:number,now:number){
  for(const [id,value] of this.active)if(now-value.at>1.1)this.active.delete(id);
  for(const [pair,at] of this.pairs)if(now-at>1.1)this.pairs.delete(pair);
  if(a===b||closing<4.5||!Number.isFinite(closing))return 0;
  const key=[a,b].sort((x,y)=>x-y).join(':');if(this.pairs.has(key))return 0;
  const origin=this.active.get(a)??this.active.get(b),target=this.active.has(a)?b:a;
  if(!origin||origin.seen.has(target)||origin.seen.size>=4)return 0;
  origin.seen.add(target);this.pairs.set(key,now);this.active.set(target,origin);return origin.seen.size;
 }
}
