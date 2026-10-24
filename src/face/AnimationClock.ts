export interface ClipTiming{in:number;hold:number;out:number}
export type AnimationPhase='IDLE'|'IN'|'HOLD'|'OUT';
/** One-shot clip; leftovers are consumed correctly even across long frames. */
export class AnimationClock {
 phase:AnimationPhase='IDLE';weight=0;elapsed=0;private timing:ClipTiming={in:.2,hold:2,out:.3};
 play(timing:ClipTiming){this.timing=timing;this.elapsed=0;this.phase='IN';this.weight=0;}
 update(dt:number){if(!Number.isFinite(dt)||dt<0||this.phase==='IDLE')return;this.elapsed+=dt;const t=this.elapsed,c=this.timing;
 if(t<c.in){this.phase='IN';this.weight=t/c.in;}else if(t<c.in+c.hold){this.phase='HOLD';this.weight=1;}else if(t<c.in+c.hold+c.out){this.phase='OUT';this.weight=1-(t-c.in-c.hold)/c.out;}else{this.phase='IDLE';this.weight=0;}
 }
}
export class ComboAnimationClock {
 phase:'IDLE'|'ORBIT'|'DIZZY'|'RECOVER'='IDLE';elapsed=0;angle=0;stop=false;
 constructor(readonly orbit=.7,readonly turns=3,readonly dizzy=2.1,readonly recover=.35){}
 play(){this.elapsed=0;this.phase='ORBIT';this.angle=0;this.stop=false;}
 update(dt:number){if(!Number.isFinite(dt)||dt<0||this.phase==='IDLE')return;this.elapsed+=dt;const t=this.elapsed;
 if(t<this.orbit){this.phase='ORBIT';this.angle=t/this.orbit*Math.PI*2*this.turns;this.stop=false;}
 else if(t<this.orbit+this.dizzy){this.phase='DIZZY';this.angle=Math.PI*2*this.turns;this.stop=true;}
 else if(t<this.orbit+this.dizzy+this.recover){this.phase='RECOVER';this.angle=Math.PI*2*this.turns;this.stop=false;}
 else{this.phase='IDLE';this.angle=Math.PI*2*this.turns;this.stop=false;}
 }
}
