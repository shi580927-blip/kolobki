import * as T from 'three';
import {DuoTransport} from './DuoTransport';
import {readDuoInvite,type Motion,type V3,type Q4} from './DuoProtocol';
import type {PhysicsPlayer} from './PhysicsPlayer';
import type {RuntimeVisual} from './RuntimeVisual';

export class DuoSession {
 readonly transport:DuoTransport;private panel:HTMLElement;private status:HTMLElement;private description:HTMLElement;
 private start:HTMLButtonElement;private copy:HTMLButtonElement;private inviteBox:HTMLInputElement;private roomButton:HTMLButtonElement;
 private remoteRoot=new T.Group();private remote?:RuntimeVisual;private remoteSeed?:number;private invite=readDuoInvite(location.hash);
 constructor(scene:T.Scene,private player:PhysicsPlayer,seed:number,private build:string,private makeVisual:(seed:number)=>RuntimeVisual){
  this.remoteRoot.name='duo-human-player';this.remoteRoot.visible=false;scene.add(this.remoteRoot);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const context=canvas.getContext('2d')!;context.fillStyle='#45336ad9';context.beginPath();context.roundRect(4,4,248,56,22);context.fill();context.font='bold 36px Arial';context.textAlign='center';context.fillStyle='#f7f3dc';context.fillText('Друг',128,46);
  const tag=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));tag.position.y=2;tag.scale.set(2.5,.625,1);this.remoteRoot.add(tag);
  this.transport=new DuoTransport(build,seed,()=>{
   const v=player.body.linvel();return {p:player.current.toArray() as V3,q:player.rotation.toArray() as Q4,v:document.hidden?[0,0,0]:[v.x,v.y,v.z],h:player.heading,w:player.coating.wetness,s:player.coating.sand,paused:document.hidden};
  },()=>this.changed());
  const hud=document.querySelector('#hud')!,tools=document.querySelector('#tools')!;
  this.status=document.createElement('div');this.status.id='duo-status';hud.appendChild(this.status);
  this.panel=document.createElement('section');this.panel.id='duo-panel';this.panel.setAttribute('aria-label','Совместное катание');
  const title=document.createElement('h2');title.textContent='Покататься вдвоём';this.description=document.createElement('p');
  this.start=document.createElement('button');this.start.id='duo-start';this.start.textContent=this.invite?'Войти к другу':'Создать комнату';this.start.onclick=()=>void this.transport.start(this.invite);
  this.inviteBox=document.createElement('input');this.inviteBox.id='duo-invite';this.inviteBox.readOnly=true;this.inviteBox.setAttribute('aria-label','Приглашение другу');
  this.copy=document.createElement('button');this.copy.id='duo-copy';this.copy.textContent='Скопировать приглашение';this.copy.onclick=()=>void this.copyLink();
  const close=document.createElement('button');close.id='duo-close';close.textContent='Продолжить кататься';close.onclick=()=>this.panel.hidden=true;
  const leave=document.createElement('button');leave.id='duo-leave';leave.textContent='Выйти из комнаты';leave.onclick=()=>{this.transport.leave();this.panel.hidden=false;};
  const solo=document.createElement('a');solo.id='duo-solo';solo.textContent='Одиночная игра';const url=new URL(location.href);url.searchParams.delete('duo');url.hash='';solo.href=url.href;
  const note=document.createElement('small');note.textContent='Тест на двоих: движение и прыжки. Толчки, общий поезд и сетевые гонки добавим отдельно.';
  this.panel.append(title,this.description,this.start,this.inviteBox,this.copy,close,leave,solo,note);hud.appendChild(this.panel);
  this.roomButton=document.createElement('button');this.roomButton.id='duo-room';this.roomButton.textContent='Комната · 1/2';this.roomButton.onclick=()=>this.panel.hidden=!this.panel.hidden;tools.appendChild(this.roomButton);
  this.changed();if(this.invite)void this.transport.start(this.invite);
  addEventListener('pagehide',()=>this.transport.leave());
 }
 private changed(){
  const t=this.transport,connected=t.status==='connected';
  if(connected&&t.peerSeed!==undefined&&this.remoteSeed!==t.peerSeed){
   if(this.remote){this.remoteRoot.remove(this.remote);this.remote.dispose();}
   this.remote=this.makeVisual(t.peerSeed);this.remoteSeed=t.peerSeed;this.remoteRoot.add(this.remote);
  }
  this.remoteRoot.visible=connected;this.roomButton.textContent=`Комната · ${connected?2:1}/2`;
  this.status.textContent=connected?'Совместное катание · 2/2':t.status==='waiting'?'Совместное катание · ждём друга':'Совместное катание · 1/2';
  this.description.textContent=t.message||(this.invite?'Откройте комнату по приглашению друга.':'Создайте комнату и отправьте ссылку второму игроку.');
  const link=t.invitation();this.inviteBox.hidden=this.copy.hidden=!link;
  if(link){const url=new URL(location.href);url.searchParams.set('duo','1');url.searchParams.set('v',this.build);url.hash=new URLSearchParams({join:link.id,key:link.key}).toString();this.inviteBox.value=url.href;}
  this.start.hidden=['opening','connecting','waiting','connected'].includes(t.status);this.start.textContent=t.status==='idle'?(this.invite?'Войти к другу':'Создать комнату'):'Попробовать ещё раз';
  if(connected)this.panel.hidden=true;else if(['closed','error'].includes(t.status))this.panel.hidden=false;
 }
 private async copyLink(){
  try{await navigator.clipboard.writeText(this.inviteBox.value);this.copy.textContent='Приглашение скопировано';}
  catch{this.inviteBox.focus();this.inviteBox.select();this.copy.textContent='Выделено — скопируйте ссылку';}
 }
 update(dt:number):Motion|undefined{
  const sample=this.transport.motion.sample(performance.now()/1000);this.remoteRoot.visible=this.transport.status==='connected'&&!!sample;
  if(this.transport.status==='connected')this.status.textContent=sample?(sample.paused?'Совместное катание · друг отошёл':'Совместное катание · 2/2'):'Ожидаем данные друга…';
  if(!sample||!this.remote)return;
  this.remoteRoot.position.fromArray(sample.p);this.remote.rollingBody.quaternion.fromArray(sample.q);this.remote.face.update(dt,sample.h);this.remote.updateDecorations();this.remote.updateSand(sample.s,sample.w);return sample;
 }
 get remotePosition(){return this.remoteRoot.visible?this.remoteRoot.position:undefined;}
 snapshot(){return {...this.transport.snapshot(),remoteVisible:this.remoteRoot.visible,remoteRolling:this.remote?.rollingBody.quaternion.toArray(),remoteFaceHeading:this.remote?.face.rotation.y};}
}
