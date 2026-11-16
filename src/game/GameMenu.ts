import {GOODS,Wardrobe} from './Wardrobe';
export class GameMenu {
 preview?:(id:string)=>string;
 private panel:HTMLElement;private title:HTMLElement;private body:HTMLElement;private actions:HTMLElement;private started=false;private settingsButtons:{button:HTMLButtonElement;original:HTMLButtonElement}[]=[];
 constructor(private openMatch:()=>void,private freeRide:()=>void,private changed:()=>void,private wardrobe:Wardrobe,private wear:()=>void,private brows?:{current:()=>string;select:(style:string)=>void}){
  this.panel=document.createElement('section');this.panel.id='game-menu';this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');this.panel.setAttribute('aria-labelledby','game-menu-title');
  this.title=document.createElement('h2');this.title.id='game-menu-title';this.body=document.createElement('p');this.actions=document.createElement('div');this.actions.className='menu-actions';this.panel.append(this.title,this.body,this.actions);document.querySelector('#hud')!.append(this.panel);
  const button=document.createElement('button');button.id='menu-open';button.textContent='Меню';button.onclick=()=>this.show();document.querySelector('#tools')!.prepend(button);
  addEventListener('keydown',e=>{if(e.code==='Escape'){if(this.open&&this.started)this.close();else this.show();}});this.show();
 }
 get open(){return !this.panel.hidden;}
 private action(text:string,fn:()=>void,id:string){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.onclick=fn;this.actions.append(b);return b;}
 update(){if(this.open)for(const {button,original} of this.settingsButtons)if(button.textContent!==original.textContent)button.textContent=original.textContent;}
 show(){this.panel.dataset.screen=this.started?'pause':'home';this.settingsButtons=[];this.panel.hidden=false;this.title.textContent=this.started?'Пауза':'Шаробесы';this.body.textContent='Солнечная долина · катись, собирай и безумствуй!';this.actions.replaceChildren();
  if(this.started)this.action('Продолжить',()=>this.close(),'menu-resume');
  this.action('▶ Играть',()=>this.modes(),'menu-play');
  this.action('Настройки',()=>this.settings(),'menu-settings');
  this.action('Как играть',()=>this.help(),'menu-help');this.action('Мой шаробес',()=>this.profile(),'menu-profile');if(!this.started){this.action('Карта',()=>this.map(),'menu-map');const tournament=this.action('Турнир · скоро',()=>{},'menu-tournament');tournament.disabled=true;}this.changed();dispatchEvent(new Event('sharobesy-controls-change'));
 }
 private map(){this.panel.dataset.screen='map';this.title.textContent='Карта мира';this.body.textContent='Выбери локацию';this.actions.replaceChildren();
  const board=document.createElement('div');board.className='world-map-board';this.actions.append(board);
  const locations=[['Солнечная долина','sunny',true],['Каменный каньон','canyon',false],['Острова','islands',false],['Зимняя бухта','winter',false],['Турнирная арена','arena',false]] as const;
  for(const [name,id,available] of locations){const pin=document.createElement('button');pin.className='world-map-pin';pin.dataset.location=id;pin.textContent=(available?'':'🔒 ')+name;pin.setAttribute('aria-pressed',String(available));pin.onclick=()=>this.mapDetails(name,available);board.append(pin);}
  const details=document.createElement('aside');details.className='world-map-details';details.setAttribute('aria-live','polite');this.actions.append(details);this.mapDetails('Солнечная долина',true);
  this.action('← Назад',()=>this.show(),'menu-back');
 }
 private mapDetails(name:string,available:boolean){const details=this.actions.querySelector('.world-map-details');if(!details)return;details.replaceChildren();const heading=document.createElement('h3');heading.textContent=name;const description=document.createElement('p');description.textContent=available?'Зелёные холмы, ягоды, водопад и простор для весёлых столкновений. Исследуй долину или устрой заезд с соперником.':'Эта локация ещё создаётся. Сейчас можно играть в Солнечной долине.';details.append(heading,description);
  if(available){for(const [label,id,action] of [['▶ Играть','map-match',()=>{this.started=true;this.close();this.openMatch();}],['Исследовать','map-explore',()=>{this.freeRide();this.started=true;this.close();}]] as const){const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=action;details.append(button);}}
  else {const back=document.createElement('button');back.textContent='К Солнечной долине';back.onclick=()=>this.mapDetails('Солнечная долина',true);details.append(back);}
  this.actions.querySelectorAll<HTMLButtonElement>('.world-map-pin').forEach(pin=>pin.setAttribute('aria-pressed',String(pin.textContent?.replace('🔒 ','')===name)));
 }
 private modes(){this.panel.dataset.screen='modes';this.title.textContent='Солнечная долина';this.body.textContent='Выбери, как провести время в долине';this.actions.replaceChildren();this.action('Свободное катание · без таймера',()=>{this.freeRide();this.started=true;this.close();},'menu-free');this.action('Матч с NPC · два круга',()=>{this.started=true;this.close();this.openMatch();},'menu-match');this.action('Назад',()=>this.show(),'menu-back');}
 private settings(){this.panel.dataset.screen='settings';this.title.textContent='Настройки';this.body.textContent='Звук, полный экран и удобная рука для джойстика.';this.actions.replaceChildren();for(const [id,text] of [['sound','Переключить звук'],['fullscreen','Во весь экран'],['control-hand','Сменить руку джойстика']]){const original=document.querySelector<HTMLButtonElement>('#'+id);const button=this.action(original?.textContent??text,()=>{original?.click();},'menu-'+id);if(original)this.settingsButtons.push({button,original});}if(this.brows)this.action('Персонаж · настройки лица · брови',()=>this.faceSettings(),'menu-face');this.action('Назад',()=>this.show(),'menu-back');}
 private faceSettings(){this.title.textContent='Брови';this.body.textContent='Четыре бесплатные формы. Выбор сохраняется отдельно от окраски персонажа.';this.actions.replaceChildren();for(const [id,label] of [['classic','Классические'],['elegant','Изящные'],['rounded','Мягкие округлые'],['bold_short','Короткие дерзкие']]){const button=this.action(label,()=>{this.brows?.select(id);this.faceSettings();},'menu-brow-'+id);button.classList.add('brow-choice');const preview=document.createElement('img');preview.src=import.meta.env.BASE_URL+'assets/brows/'+id+'.webp';preview.alt='';button.prepend(preview);button.setAttribute('aria-pressed',String(this.brows?.current()===id));}this.action('Назад',()=>this.settings(),'menu-back');}
 private help(){this.panel.dataset.screen='help';this.title.textContent='Первые шаги';this.body.textContent='Катись джойстиком или WASD. Прыжок — кнопка справа или пробел, таран — соседняя кнопка или Shift. Подбирай перчик, лимон и бомбочку. Листай предметы свайпом или Q/R, тапни картинку или E для применения. Мягкое касание шаробеса собирает поезд. Камеру вращай на полупрозрачной области экрана.';this.actions.replaceChildren();this.action('Понятно',()=>this.show(),'menu-back');}
 private profile(slot:'head'|'mark'='head'){this.panel.dataset.screen='profile';
  this.title.textContent='Мой шаробес';this.body.textContent='Монеты: '+this.wardrobe.coins+' · Каждая собранная ягода даёт 1 монету.';
  this.actions.replaceChildren();this.action(slot==='head'?'К раскраскам':'К головным уборам',()=>this.profile(slot==='head'?'mark':'head'),'wardrobe-tab');
  const preview=document.createElement('div');preview.className='wardrobe-stage';preview.setAttribute('aria-label','Просмотр персонажа');const base=document.createElement('div');base.className='wardrobe-podium';preview.append(base);this.actions.append(preview);for(const [direction,label] of [[-1,'↶'],[1,'↷']] as const){const turn=this.action(label,()=>dispatchEvent(new CustomEvent('sharobesy-fitting-turn',{detail:direction})),'fitting-turn-'+direction);turn.className='fitting-turn';turn.setAttribute('aria-label',direction<0?'Повернуть влево':'Повернуть вправо');}
  const skinButton=this.action('Черепушка · '+(this.wardrobe.skull?'Снять':'Надеть'),()=>{
   this.wardrobe.setSkull(!this.wardrobe.skull);this.wear();this.profile(slot);
  },'wear-skull');
  skinButton.setAttribute('aria-pressed',String(this.wardrobe.skull));skinButton.className='wardrobe-card';this.thumbnail(skinButton,'skull');
  for(const item of GOODS.filter(x=>x.slot===slot)){
   const owned=this.wardrobe.owned.has(item.id),worn=this.wardrobe.outfit[slot]===item.id;
   const button=this.action(item.name+' · '+(worn?'Снять':owned?'Надеть':item.price+' мон.'),()=>{this.wardrobe.choose(item);this.wear();this.profile(slot);},'wear-'+item.id);
   button.className='wardrobe-card';button.setAttribute('aria-pressed',String(worn));this.thumbnail(button,item.id);button.disabled=!owned&&this.wardrobe.coins<item.price;
  }
  this.action('Назад',()=>this.show(),'menu-back');
 }
 private thumbnail(button:HTMLButtonElement,id:string){const url=this.preview?.(id);if(url){const img=document.createElement('img');img.src=url;img.alt='';button.prepend(img);}}
 close(){this.panel.hidden=true;this.changed();dispatchEvent(new Event('sharobesy-controls-change'));}
}
