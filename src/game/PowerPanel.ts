import {ABILITIES,ABILITY_KINDS,AbilityInventory,type AbilityKind} from './AbilityModel';
const icons:Record<AbilityKind,string>={
 pepper:'<path d="M61 16Q80 28 61 50Q40 73 13 67Q31 53 33 32Q38 15 55 20" fill="#f54e32" stroke="#a72632" stroke-width="3"/><path d="M53 22Q42 10 57 8Q69 8 65 20" fill="none" stroke="#69b338" stroke-width="8" stroke-linecap="round"/>',
 lemon:'<ellipse cx="44" cy="42" rx="32" ry="24" transform="rotate(-26 44 42)" fill="#ffdb36" stroke="#dda52a" stroke-width="3"/><path d="M19 49L12 52M69 28L77 25" stroke="#f1c328" stroke-width="10" stroke-linecap="round"/><path d="M36 29Q49 19 57 26" fill="none" stroke="#fff5ad" stroke-width="5" stroke-linecap="round"/>',
 bomb:'<g fill="#af2854" stroke="#771b47" stroke-width="2"><circle cx="29" cy="43" r="17"/><circle cx="49" cy="43" r="18"/><circle cx="39" cy="58" r="16"/></g><path d="M37 26L39 17L51 18L51 30" fill="#313749"/><path d="M47 18Q45 4 61 8" fill="none" stroke="#d99e4e" stroke-width="5"/><path d="M66 1L68 8L77 8L70 13L72 21L64 16L58 21L59 13L53 8L62 8Z" fill="#ffe36d"/>'};
export class PowerPanel {
 private root:HTMLElement;private button:HTMLButtonElement;private name:HTMLElement;private detail:HTMLElement;private pending=false;private signature='';
 constructor(private inventory:AbilityInventory,private allowed:()=>boolean){
  this.root=document.createElement('section');this.root.id='power-panel';this.root.setAttribute('aria-label','Предметы и способности');
  const prev=document.createElement('button');prev.id='power-prev';prev.textContent='‹';prev.setAttribute('aria-label','Предыдущая ягода');prev.onclick=()=>inventory.cycle(-1);
  const next=document.createElement('button');next.id='power-next';next.textContent='›';next.setAttribute('aria-label','Следующая ягода');next.onclick=()=>inventory.cycle(1);
  this.button=document.createElement('button');this.button.id='power-use';this.name=document.createElement('strong');this.name.id='power-name';this.detail=document.createElement('small');this.detail.id='power-detail';
  this.root.append(this.name,prev,this.button,next,this.detail);document.querySelector('#hud')!.append(this.root);
  let pointer:{id:number;x:number;y:number}|undefined;
  this.button.onpointerdown=e=>{if(!this.allowed())return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.button.setPointerCapture(e.pointerId);};
  this.button.onpointerup=e=>{if(pointer?.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=undefined;if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.2)inventory.cycle(dx<0?1:-1);else if(Math.hypot(dx,dy)<12&&this.allowed())this.pending=true;};
  this.button.onpointercancel=this.button.onlostpointercapture=()=>{pointer=undefined;};this.button.onclick=e=>{if(e.detail===0&&this.allowed())this.pending=true;};
  addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||!this.allowed()||(e.target instanceof Element&&e.target.closest('input,textarea,select')))return;if(e.code==='KeyQ')inventory.cycle(-1);if(e.code==='KeyR')inventory.cycle(1);if(e.code==='KeyE'){e.preventDefault();this.pending=true;}});
  addEventListener('sharobesy-controls-change',()=>{this.pending=false;pointer=undefined;});this.update();
 }
 takeRequest(){const request=this.pending;this.pending=false;return request;}
 update(){const i=this.inventory,kind=i.selected,definition=ABILITIES[kind],cooldown=Math.ceil(i.cooldown*10)/10,signature=JSON.stringify([kind,i.charges,cooldown]);if(signature===this.signature)return;this.signature=signature;
  this.name.textContent=definition.name;this.button.innerHTML='<svg viewBox="0 0 88 82" aria-hidden="true">'+icons[kind]+'</svg><span>×'+i.charges[kind]+'</span>';
  this.button.setAttribute('aria-label',definition.name+', зарядов '+i.charges[kind]+'. Применить');this.button.setAttribute('aria-disabled',String(!i.canUse()));this.root.dataset.kind=kind;
  this.detail.textContent=cooldown>0?'Восстановление · '+cooldown.toFixed(1)+' с':i.charges[kind]?definition.action+' · тап / E':'Подберите в долине · свайп: выбор';
 }
}
