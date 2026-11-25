import R from '@dimforge/rapier3d-compat';
import * as T from 'three';
import {EventBus} from '../core/events';
import {heightAt} from '../core/terrain';
import {PhysicsPlayer} from './PhysicsPlayer';
import {NpcSystem} from './NpcSystem';
import {TrainSystem,type TrainOptions} from './TrainSystem';
import {RouteMatch,MATCH_RULES} from './RouteMatch';
import {MEADOW_TRACK,VALLEY_TRACKS,type ValleyTrack} from '../core/valleyRoute';
import {MatchRouteVisual} from './MatchRouteVisual';

export class MatchSession {
 readonly rules=new RouteMatch(MEADOW_TRACK);readonly rivalTrain:TrainSystem;
 private route:MatchRouteVisual;private label:HTMLElement;private result:HTMLElement;
 private button:HTMLButtonElement;private finishEmitted=false;
 private entry:HTMLElement;private raceHud:HTMLElement;
 private recruit:number|undefined;private recruitTime=0;
 constructor(private world:R.World,scene:T.Scene,private player:PhysicsPlayer,private npcs:NpcSystem,private train:TrainSystem,private options:TrainOptions,private resetGame:()=>void,private events:EventBus){
  const actors=npcs.actors.slice(1).map(a=>({id:a.entry.id,physics:a.physics}));
  this.rivalTrain=new TrainSystem(world,npcs.actors[0].physics,actors,new EventBus(),{manageGroups:false,breakOnContact:false,canRecruit:id=>!train.has(id)&&!train.isJoining(id)});
  this.route=new MatchRouteVisual(scene,this.rules.track);
  this.label=document.createElement('div');this.label.id='match-status';this.label.setAttribute('role','status');document.querySelector('#hud')!.appendChild(this.label);
  this.raceHud=document.createElement('section');this.raceHud.id='race-hud';this.raceHud.hidden=true;
  this.raceHud.innerHTML='<header>⚑ ЗАЕЗД <small>Солнечная долина</small></header><div class="race-lap"></div><div class="race-clock"></div><aside class="race-standing"><strong class="race-place"></strong><div class="race-leaders"></div></aside>';
  document.querySelector('#hud')!.appendChild(this.raceHud);
  this.result=document.createElement('div');this.result.id='match-result';this.result.hidden=true;this.result.setAttribute('role','dialog');this.result.setAttribute('aria-modal','true');this.result.setAttribute('aria-labelledby','result-title');this.result.innerHTML='<div class="result-emblem" aria-hidden="true">★</div><h2 id="result-title"></h2><p class="result-subtitle"></p><div class="result-scores"><section><span>Твой результат</span><strong id="result-player"></strong><small>контрольных точек</small></section><section><span>Соперник</span><strong id="result-rival"></strong><small>контрольных точек</small></section></div><p class="result-time"></p>';document.querySelector('#hud')!.appendChild(this.result);
  this.entry=document.createElement('div');this.entry.id='match-entry';
  const heading=document.createElement('h2');heading.textContent='Матч с соперником';
  const instructions=document.createElement('p');instructions.textContent='Выберите трассу. Светящийся маршрут появится на время матча. Два круга, старт без запаса — собирайте поезд и предметы по дороге!';
  const choices=document.createElement('div');choices.id='track-choices';choices.setAttribute('aria-label','Трасса матча');
  const buttons:HTMLButtonElement[]=[];
  const choose=(track:ValleyTrack)=>{this.rules.select(track);buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(VALLEY_TRACKS[i].id===track.id)));};
  for(const track of VALLEY_TRACKS){
   const button=document.createElement('button');button.type='button';button.dataset.track=track.id;button.textContent=`${track.name} · ${track.halfWidth*2} м`;
   button.hidden=track.id!==MEADOW_TRACK.id;
   const detail=document.createElement('small');detail.textContent=track.skill;button.appendChild(detail);button.onclick=()=>choose(track);buttons.push(button);choices.appendChild(button);
  }
  choose(this.rules.track);
  const more=document.createElement('button');more.id='track-more';more.type='button';more.textContent='Другие трассы';more.setAttribute('aria-controls','track-choices');more.setAttribute('aria-expanded','false');
  more.onclick=()=>{buttons.forEach(b=>b.hidden=false);more.setAttribute('aria-expanded','true');more.hidden=true;};
  this.button=document.createElement('button');this.button.id='match-start';this.button.textContent='Начать матч';this.button.onclick=()=>this.start();
  const sandbox=document.createElement('button');sandbox.id='sandbox-choice';sandbox.textContent='Пока свободное катание';sandbox.onclick=()=>{this.entry.hidden=true;document.querySelector('#tools')!.appendChild(this.button);};
  this.entry.append(heading,instructions,choices,more,this.button,sandbox);document.querySelector('#hud')!.appendChild(this.entry);
  const replay=document.createElement('button');replay.id='result-replay';replay.textContent='Ещё раз';replay.onclick=()=>this.start();this.result.appendChild(replay);
  const home=document.createElement('button');home.id='result-home';home.textContent='В меню';home.onclick=()=>{this.exit();this.hideChoice();dispatchEvent(new Event('sharobesy-home'));};this.result.appendChild(home);
  const moment=document.createElement('button');moment.id='result-moment';moment.textContent='Сохранить момент';moment.onclick=()=>document.querySelector<HTMLButtonElement>('#snapshot')?.click();this.result.appendChild(moment);
  const exit=document.createElement('button');exit.id='match-exit';exit.textContent='В песочницу';exit.onclick=()=>{this.exit();this.hideChoice();};this.result.appendChild(exit);
 }
 get choosing(){return !this.entry.hidden;}
 hideChoice(){this.entry.hidden=true;}
 showChoice(){this.exit();this.entry.hidden=false;}
 get active(){return this.rules.phase!=='sandbox';}
 get running(){return this.rules.phase==='running';}
 get frozen(){return this.active&&!this.running;}
 controlled(id:number){return this.active&&(id===0||this.rivalTrain.has(id)||this.rivalTrain.isJoining(id));}
 internal(a:number,b:number){return this.active&&this.rivalTrain.isInternalContact(a,b);}
 private place(p:PhysicsPlayer,x:number,z:number){p.body.setTranslation({x,y:heightAt(x,z)+1.1,z},true);p.sync();p.previous.copy(p.current);}
 start(){
  this.exit();this.resetGame();
  this.options.manageGroups=false;this.options.breakOnContact=false;
  this.options.canRecruit=id=>id!==0&&!this.rivalTrain.has(id)&&!this.rivalTrain.isJoining(id);
  this.place(this.player,-4,0);this.place(this.npcs.actors[0].physics,4,0);
  [[-5,14],[5,14],[-6,26],[6,26]].forEach(([x,z],i)=>this.place(this.npcs.actors[i+1].physics,x,z));
  this.rules.start([this.player.current,this.npcs.actors[0].physics.current]);
  this.entry.hidden=true;document.querySelector('#tools')!.appendChild(this.button);
  this.recruit=undefined;this.recruitTime=0;this.finishEmitted=false;this.groups();this.render();
  this.events.emit('match_start',{format:'route-unprepared'});
 }
 exit(){
  this.rivalTrain.reset();this.rules.reset();
  this.options.manageGroups=true;this.options.breakOnContact=true;this.options.canRecruit=undefined;
  this.train.reset();this.route.update(this.rules);this.label.hidden=true;this.raceHud.hidden=true;document.querySelector('#hud')?.removeAttribute('data-racing');this.result.hidden=true;this.button.textContent='Начать матч';
  this.entry.hidden=false;this.entry.insertBefore(this.button,this.entry.querySelector('#sandbox-choice'));
 }
 preStep(dt:number){
  if(!this.active)return;
  this.rules.step(dt,[this.player.current,this.npcs.actors[0].physics.current]);
  if(this.rules.phase==='finished'&&!this.finishEmitted){this.finishEmitted=true;this.events.emit('match_finish',{winner:this.rules.winner!,progress:[...this.rules.progress]});}
  if(!this.running)return;
  const rival=this.npcs.actors[0].physics,p=rival.current;
  let target=this.rules.target(1);
  this.recruitTime-=dt;
  const free=this.npcs.actors.slice(1).filter(a=>!this.train.has(a.entry.id)&&!this.train.isJoining(a.entry.id)&&!this.rivalTrain.has(a.entry.id)&&!this.rivalTrain.isJoining(a.entry.id));
  if(this.rivalTrain.snapshot().joining===undefined&&this.recruitTime<=0){
   const near=free.filter(a=>Math.hypot(a.physics.current.x-p.x,a.physics.current.z-p.z)<11).sort((a,b)=>a.physics.current.distanceToSquared(p)-b.physics.current.distanceToSquared(p))[0];
   this.recruit=near?.entry.id;this.recruitTime=near?4:1;
  }
  const recruit=free.find(a=>a.entry.id===this.recruit);
  if(recruit&&this.rivalTrain.snapshot().joining===undefined)target=recruit.physics.current;
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz)||1,v=rival.body.linvel(),speed=recruit?Math.min(4.5,d*2):6.5;
  let ax=(dx/d*speed-v.x)*.28,az=(dz/d*speed-v.z)*.28;
  // Local obstacle steering only; never teleport the opponent to a gate.
  const hit=this.world.castRay(new R.Ray(p,{x:dx/d,y:0,z:dz/d}),3,true,R.QueryFilterFlags.EXCLUDE_DYNAMIC|R.QueryFilterFlags.EXCLUDE_KINEMATIC,undefined,rival.collider,rival.body,collider=>collider.shapeType()!==R.ShapeType.TriMesh);
  if(hit){const x=ax;ax=-az;az=x;}
  const n=Math.max(1,Math.hypot(ax,az));rival.step(dt,{x:-ax/n,z:-az/n,jump:false,dash:false},new T.Vector3(0,0,1));
 }
 stepTrain(dt:number){if(this.running)this.rivalTrain.step(dt);}
 afterStep(){if(this.running){this.rivalTrain.afterStep();this.groups();}}
 private groups(){
  const a=this.train.snapshot(),b=this.rivalTrain.snapshot();
  this.player.collider.setCollisionGroups(a.count||a.joining!==undefined?0x0002fffd:0x0001ffff);
  for(const actor of this.npcs.actors){const id=actor.entry.id;
   actor.physics.collider.setCollisionGroups(id===0||b.ids.includes(id)||b.joining===id?0x0004fffb:a.ids.includes(id)||a.joining===id?0x0002fffd:0x0001ffff);
  }
 }
 render(){
  if(!this.active)return;
  const s=this.rules.snapshot();this.label.hidden=false;this.route.update(this.rules);
  this.raceHud.hidden=s.phase==='finished';document.querySelector<HTMLElement>('#hud')!.dataset.racing=String(s.phase!=='finished');
  const berries=document.querySelector<HTMLElement>('#berry-count');if(berries)berries.dataset.raceBerries=berries.textContent?.split(' · ')[0]??'';
  const lap=(index:number)=>Math.min(s.laps,Math.floor(s.progress[index]/s.checkpoints)+1);
  const ahead=s.progress[0]===s.progress[1]?0:s.progress[0]>s.progress[1]?1:2;
  this.raceHud.querySelector('.race-place')!.textContent=ahead===0?'Старт на равных':ahead+'-е место';
  this.raceHud.querySelector('.race-lap')!.textContent=s.phase==='countdown'?'Старт через '+Math.ceil(s.countdown):'⚑ Круг '+lap(0)+' / '+s.laps;
  const seconds=Math.max(0,MATCH_RULES.duration-s.remaining);
  this.raceHud.querySelector('.race-clock')!.textContent='◷ '+Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toFixed(1).padStart(4,'0');
  const ranking=[{name:'Ты',progress:s.progress[0]},{name:'Соперник',progress:s.progress[1]}].sort((a,b)=>b.progress-a.progress);
  this.raceHud.querySelector('.race-leaders')!.textContent=ranking.map((r,i)=>(i+1)+'. '+r.name+' · '+r.progress+' точек').join('\n');
  const target=this.rules.target(0),distance=Math.ceil(Math.hypot(target.x-this.player.current.x,target.z-this.player.current.z));
  const status=s.phase==='countdown'?`${s.trackName} · Старт через ${Math.ceil(s.countdown)} · Следуйте светящейся дорожке`:
   `${s.trackName} · ${Math.floor(Math.ceil(s.remaining)/60)}:${(Math.ceil(s.remaining)%60).toString().padStart(2,'0')} · Круг ${lap(0)}/${s.laps} · Чекпоинт ${Math.min(s.progress[0],s.laps*s.checkpoints-1)%s.checkpoints+1}/${s.checkpoints}: ${distance} м · Соперник: ${s.progress[1]}/${s.laps*s.checkpoints}`;
  if(this.label.textContent!==status)this.label.textContent=status;
  this.button.textContent='Матч заново';
  if(s.phase==='finished'){
   this.result.hidden=false;
   this.result.dataset.outcome=s.winner??'draw';
   this.result.querySelector('#result-title')!.textContent=s.winner==='player'?'Победа!':s.winner==='rival'?'Хороший заезд!':'Ничья!';
   const complete=s.progress.some(p=>p>=s.laps*s.checkpoints);
   this.result.querySelector('.result-subtitle')!.textContent=s.trackName+' · '+(complete?'Маршрут завершён':'Время вышло');
   this.result.querySelector('#result-player')!.textContent=s.progress[0]+' / '+s.laps*s.checkpoints;
   this.result.querySelector('#result-rival')!.textContent=s.progress[1]+' / '+s.laps*s.checkpoints;
   const elapsed=Math.max(0,Math.ceil(MATCH_RULES.duration-s.remaining));
   this.result.querySelector('.result-time')!.textContent='Время заезда: '+Math.floor(elapsed/60)+':'+String(elapsed%60).padStart(2,'0')+' · Два круга';

  }
 }
 snapshot(){return {...this.rules.snapshot(),rivalId:0,rivalTrain:this.rivalTrain.snapshot(),contactBreaks:false,route:this.rules.track.points,visual:this.route.snapshot()};}
}
