import R from '@dimforge/rapier3d-compat';
import * as T from 'three';
import {EventBus} from '../core/events';
import {heightAt} from '../core/terrain';
import {PhysicsPlayer} from './PhysicsPlayer';
import {NpcSystem} from './NpcSystem';
import {TrainSystem,type TrainOptions} from './TrainSystem';
import {RouteMatch,MATCH_ROUTE} from './RouteMatch';
import {MatchRouteVisual} from './MatchRouteVisual';

export class MatchSession {
 readonly rules=new RouteMatch();readonly rivalTrain:TrainSystem;
 private route:MatchRouteVisual;private label:HTMLElement;private result:HTMLElement;
 private button:HTMLButtonElement;private finishEmitted=false;
 private entry:HTMLElement;
 private recruit:number|undefined;private recruitTime=0;
 constructor(private world:R.World,scene:T.Scene,private player:PhysicsPlayer,private npcs:NpcSystem,private train:TrainSystem,private options:TrainOptions,private resetGame:()=>void,private events:EventBus){
  const actors=npcs.actors.slice(1).map(a=>({id:a.entry.id,physics:a.physics}));
  this.rivalTrain=new TrainSystem(world,npcs.actors[0].physics,actors,new EventBus(),{manageGroups:false,breakOnContact:false,canRecruit:id=>!train.has(id)&&!train.isJoining(id)});
  this.route=new MatchRouteVisual(scene);
  this.label=document.createElement('div');this.label.id='match-status';this.label.setAttribute('role','status');document.querySelector('#hud')!.appendChild(this.label);
  this.result=document.createElement('div');this.result.id='match-result';this.result.hidden=true;document.querySelector('#hud')!.appendChild(this.result);
  this.entry=document.createElement('div');this.entry.id='match-entry';
  const heading=document.createElement('h2');heading.textContent='Матч с соперником';
  const instructions=document.createElement('p');instructions.textContent='Два круга по жёлтым точкам. Все начинают одиночными — собирайте поезд по дороге!';
  this.button=document.createElement('button');this.button.id='match-start';this.button.textContent='Начать матч';this.button.onclick=()=>this.start();
  const sandbox=document.createElement('button');sandbox.id='sandbox-choice';sandbox.textContent='Пока свободное катание';sandbox.onclick=()=>{this.entry.hidden=true;document.querySelector('#tools')!.appendChild(this.button);};
  this.entry.append(heading,instructions,this.button,sandbox);document.querySelector('#hud')!.appendChild(this.entry);
  const exit=document.createElement('button');exit.id='match-exit';exit.textContent='В песочницу';exit.onclick=()=>this.exit();this.result.appendChild(exit);
 }
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
  this.train.reset();this.route.update(this.rules);this.label.hidden=true;this.result.hidden=true;this.button.textContent='Начать матч';
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
  const hit=this.world.castRay(new R.Ray(p,{x:dx/d,y:0,z:dz/d}),3,true,R.QueryFilterFlags.EXCLUDE_DYNAMIC|R.QueryFilterFlags.EXCLUDE_KINEMATIC,undefined,rival.collider,rival.body);
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
  const lap=(index:number)=>Math.min(s.laps,Math.floor(s.progress[index]/s.checkpoints)+1);
  const target=this.rules.target(0),distance=Math.ceil(Math.hypot(target.x-this.player.current.x,target.z-this.player.current.z));
  const status=s.phase==='countdown'?`Старт через ${Math.ceil(s.countdown)} · Езжайте к жёлтой точке впереди · Собирайте поезд по дороге`:
   `${Math.floor(Math.ceil(s.remaining)/60)}:${(Math.ceil(s.remaining)%60).toString().padStart(2,'0')} · Круг ${lap(0)}/${s.laps} · Жёлтая точка ${Math.min(s.progress[0],s.laps*s.checkpoints-1)%s.checkpoints+1}/${s.checkpoints}: ${distance} м · Соперник: ${s.progress[1]}/${s.laps*s.checkpoints} · Его вагоны: ${this.rivalTrain.count}`;
  if(this.label.textContent!==status)this.label.textContent=status;
  this.button.textContent='Матч заново';
  if(s.phase==='finished'){
   this.result.hidden=false;
   let title=this.result.querySelector('p');if(!title){title=document.createElement('p');this.result.prepend(title);}
   const complete=s.progress.some(p=>p>=s.laps*s.checkpoints);
   title.textContent=(complete?'Маршрут завершён. ':'Время вышло. ')+(s.winner==='player'?'Вы победили!':s.winner==='rival'?'Соперник победил!':'Ничья!')+` Вы: ${s.progress[0]} точек · Соперник: ${s.progress[1]}. Награды в этой пробе не начисляются.`;
  }
 }
 snapshot(){return {...this.rules.snapshot(),rivalId:0,rivalTrain:this.rivalTrain.snapshot(),contactBreaks:false,route:MATCH_ROUTE};}
}
