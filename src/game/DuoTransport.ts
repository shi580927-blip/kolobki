import type {DataConnection,Peer} from 'peerjs';
import {DUO_MAP,DUO_PROTOCOL,parseDuoPacket,RemoteMotion,type DuoPacket,type Motion} from './DuoProtocol';

export type DuoStatus='idle'|'opening'|'waiting'|'connecting'|'connected'|'closed'|'error';
export interface DuoInvite {id:string;key:string}
/** Two browser-owned rolling bodies. Cloud signaling is used only after opt-in. */
export class DuoTransport {
 readonly motion=new RemoteMotion();status:DuoStatus='idle';message='';role:'host'|'guest'='host';peerSeed?:number;
 id='';private key='';private peer?:Peer;private connection?:DataConnection;private accepted=false;
 private epoch=0;private sequence=0;private sent=0;private received=0;
 private timer?:ReturnType<typeof setTimeout>;private pump?:ReturnType<typeof setInterval>;
 constructor(private build:string,private seed:number,private capture:()=>Motion,private changed:()=>void){}
 private state(status:DuoStatus,message=''){this.status=status;this.message=message;this.changed();}
 private clearTimers(){clearTimeout(this.timer);clearInterval(this.pump);this.timer=this.pump=undefined;}
 leave(){
  this.epoch++;this.clearTimers();const peer=this.peer,c=this.connection;this.peer=undefined;this.connection=undefined;this.accepted=false;this.peerSeed=undefined;this.id=this.key='';this.motion.clear();c?.close();peer?.destroy();this.state('idle');
 }
 invitation():DuoInvite|undefined{return this.role==='host'&&this.id?{id:this.id,key:this.key}:undefined;}
 async start(invite?:DuoInvite){
  this.leave();this.role=invite?'guest':'host';const epoch=this.epoch;this.sequence=this.sent=this.received=0;
  if(typeof RTCPeerConnection==='undefined'){this.state('error','Этот браузер не поддерживает совместное катание.');return;}
  this.key=invite?.key??Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  this.state('opening','Соединяемся…');
  try{
   const {default:PeerClient}=await import('peerjs');if(epoch!==this.epoch)return;
   const peer=this.peer=new PeerClient({debug:0,secure:true});
   this.timer=setTimeout(()=>{if(epoch===this.epoch&&this.status==='opening')this.fail('Сервер связи не ответил. Попробуйте ещё раз.');},25000);
   peer.on('open',id=>{
    if(epoch!==this.epoch)return;clearTimeout(this.timer);this.id=id;
    if(invite){this.state('connecting','Ищем друга…');this.bind(peer.connect(invite.id,{reliable:true,serialization:'json',label:'sharobesy-duo-1'}),epoch);}
    else this.state('waiting','Комната создана. Отправьте приглашение другу.');
   });
   peer.on('connection',connection=>{
    if(epoch!==this.epoch){connection.close();return;}
    if(this.role!=='host'||this.connection){connection.on('open',()=>{connection.send({t:'reject',reason:'full'});setTimeout(()=>connection.close(),150);});return;}
    this.bind(connection,epoch);
   });
   peer.on('error',error=>{
    if(epoch!==this.epoch)return;
    if(this.accepted)return; // An established DataChannel survives signaling loss.
    this.fail(error.type==='peer-unavailable'?'Друг не в комнате. Попросите новое приглашение.':'Не удалось установить связь. Проверьте интернет и повторите вход.');
   });
   peer.on('disconnected',()=>{if(epoch===this.epoch&&!peer.destroyed){try{peer.reconnect();}catch{if(!this.accepted)this.fail('Связь прервалась. Повторите вход.');}}});
  }catch{if(epoch===this.epoch)this.fail('Не удалось загрузить подключение. Попробуйте ещё раз.');}
 }
 private fail(message:string){this.leave();this.state('error',message);}
 private bind(c:DataConnection,epoch:number){
  this.connection=c;this.accepted=false;this.motion.clear();
  this.timer=setTimeout(()=>{if(epoch===this.epoch&&!this.accepted)this.fail('Устройства не соединились. Попробуйте другую сеть или повторите вход.');},25000);
  c.on('open',()=>{
   if(epoch!==this.epoch)return;
   if(this.role==='guest')c.send({t:'hello',protocol:DUO_PROTOCOL,map:DUO_MAP,build:this.build,seed:this.seed,key:this.key});
  });
  c.on('data',raw=>{if(epoch!==this.epoch||this.connection!==c)return;const data=parseDuoPacket(raw);if(!data)return;this.receive(c,data);});
  c.on('error',()=>{if(epoch===this.epoch&&this.connection===c)this.closed();});
  c.on('close',()=>{if(epoch===this.epoch&&this.connection===c)this.closed();});
 }
 private reject(c:DataConnection,reason:'invite'|'version'){
  c.send({t:'reject',reason});setTimeout(()=>c.close(),150);
 }
 private receive(c:DataConnection,data:DuoPacket){
  if(data.t==='reject'){this.fail(data.reason==='full'?'В комнате уже двое.':data.reason==='version'?'Версии игры отличаются. Откройте свежее приглашение.':'Приглашение не подходит. Попросите новую ссылку.');return;}
  if(data.t==='hello'&&this.role==='host'&&!this.accepted){
   if(data.key!==this.key){this.reject(c,'invite');return;}
   if(data.protocol!==DUO_PROTOCOL||data.map!==DUO_MAP||data.build!==this.build){this.reject(c,'version');return;}
   c.send({t:'welcome',protocol:DUO_PROTOCOL,map:DUO_MAP,build:this.build,seed:this.seed});this.connected(data.seed);return;
  }
  if(data.t==='welcome'&&this.role==='guest'&&!this.accepted){
   if(data.protocol!==DUO_PROTOCOL||data.map!==DUO_MAP||data.build!==this.build){this.fail('Версии игры отличаются. Обновите страницу.');return;}
   this.connected(data.seed);return;
  }
  if(data.t==='state'&&this.accepted&&this.motion.push(data,performance.now()/1000))this.received++;
 }
 private connected(seed:number){
  clearTimeout(this.timer);this.accepted=true;this.peerSeed=seed;this.sequence=0;this.state('connected','Вы вдвоём в долине');
  this.send();this.pump=setInterval(()=>this.send(),1000/15);
 }
 private send(){
  const c=this.connection;if(!this.accepted||!c?.open||c.dataChannel.bufferedAmount>16384)return;
  try{c.send({t:'state',n:this.sequence++,...this.capture()});this.sent++;}catch{this.closed();}
 }
 private closed(){
  this.clearTimers();const c=this.connection;this.connection=undefined;c?.close();this.accepted=false;this.peerSeed=undefined;this.motion.clear();
  this.state(this.role==='host'&&this.peer?.open?'waiting':'closed',this.role==='host'?'Друг вышел. Можно пригласить снова.':'Друг вышел или связь прервалась. Повторите вход.');
 }
 snapshot(){const sample=this.motion.sample(performance.now()/1000);return {status:this.status,role:this.role,players:this.status==='connected'?2:1,remoteSeed:this.peerSeed,received:this.received,sent:this.sent,remote:sample?.p,paused:sample?.paused??false};}
}
