import {VALLEY_ROUTE,HILL_TRACK,type ValleyTrack} from '../core/valleyRoute';
/** First test format: everyone starts alone. Checkpoints, not train size,
 * decide this race. No permanent currency or rewards in the prototype. */
export const MATCH_RULES={laps:2,duration:180,radius:6};
export const MATCH_ROUTE=VALLEY_ROUTE;
type Point={x:number;z:number};
export type MatchPhase='sandbox'|'countdown'|'running'|'finished';
export class RouteMatch {
 constructor(public track:ValleyTrack=HILL_TRACK){}
 select(track:ValleyTrack){if(this.phase!=='sandbox')throw new Error('Finish or exit the match before selecting another track');this.track=track;}
 phase:MatchPhase='sandbox';remaining=MATCH_RULES.duration;countdown=3;
 progress=[0,0];winner:'player'|'rival'|'draw'|undefined;
 private previous:Point[]=[];
 start(positions:Point[]){this.phase='countdown';this.remaining=MATCH_RULES.duration;this.countdown=3;this.progress=[0,0];this.winner=undefined;this.previous=positions.map(p=>({...p}));}
 reset(){this.phase='sandbox';this.progress=[0,0];this.winner=undefined;this.previous=[];}
 target(index:number){return this.track.points[this.progress[index]%this.track.points.length];}
 snapshot(){return {phase:this.phase,remaining:this.remaining,countdown:this.countdown,progress:[...this.progress],laps:MATCH_RULES.laps,checkpoints:this.track.points.length,width:this.track.halfWidth*2,trackId:this.track.id,trackName:this.track.name,skill:this.track.skill,winner:this.winner,targets:[this.target(0),this.target(1)]};}
 step(dt:number,positions:Point[]){
  if(this.phase==='countdown'){this.countdown=Math.max(0,this.countdown-dt);this.previous=positions.map(p=>({...p}));if(this.countdown===0)this.phase='running';return;}
  if(this.phase!=='running')return;
  this.remaining=Math.max(0,this.remaining-dt);
  const arrivals:number[]=[];
  positions.forEach((p,i)=>{
   const target=this.target(i),a=this.previous[i]??p,dx=p.x-a.x,dz=p.z-a.z,length=dx*dx+dz*dz;
   const t=length?Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.z-a.z)*dz)/length)):0;
   // Swept test avoids missing a gate during a dash. One ordered gate per tick.
   if(Math.hypot(a.x+dx*t-target.x,a.z+dz*t-target.z)<=Math.max(MATCH_RULES.radius,this.track.halfWidth)){
    this.progress[i]++;if(this.progress[i]>=this.track.points.length*MATCH_RULES.laps)arrivals.push(i);
   }
  });
  this.previous=positions.map(p=>({...p}));
  if(arrivals.length){this.winner=arrivals.length>1?'draw':arrivals[0]===0?'player':'rival';this.phase='finished';}
  else if(this.remaining===0){this.winner=this.progress[0]===this.progress[1]?'draw':this.progress[0]>this.progress[1]?'player':'rival';this.phase='finished';}
 }
}
