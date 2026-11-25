import {GOODS,Wardrobe,SHOP_TABS,goodsForCategory,type ShopCategory} from './Wardrobe';
export class GameMenu {
 preview?:(id:string)=>string;
 private panel:HTMLElement;private title:HTMLElement;private body:HTMLElement;private actions:HTMLElement;private started=false;private settingsButtons:{button:HTMLButtonElement;original:HTMLButtonElement}[]=[];
 constructor(private openMatch:()=>void,private freeRide:()=>void,private changed:()=>void,private wardrobe:Wardrobe,private wear:()=>void,private brows?:{current:()=>string;select:(style:string)=>void}){
  this.panel=document.createElement('section');this.panel.id='game-menu';this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');this.panel.setAttribute('aria-labelledby','game-menu-title');
  this.title=document.createElement('h2');this.title.id='game-menu-title';this.body=document.createElement('p');this.actions=document.createElement('div');this.actions.className='menu-actions';this.panel.append(this.title,this.body,this.actions);document.querySelector('#hud')!.append(this.panel);
  const button=document.createElement('button');button.id='menu-open';button.textContent='Меню';button.onclick=()=>this.show();document.querySelector('#tools')!.prepend(button);
  addEventListener('sharobesy-home',()=>{this.started=false;this.show();});
  addEventListener('keydown',e=>{if(e.code==='Escape'){if(this.open&&this.started)this.close();else this.show();}});this.show();
 }
 get open(){return !this.panel.hidden;}
 private action(text:string,fn:()=>void,id:string){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.onclick=fn;this.actions.append(b);return b;}
 update(){if(this.open)for(const {button,original} of this.settingsButtons)if(button.textContent!==original.textContent)button.textContent=original.textContent;}
 show(){this.panel.dataset.screen=this.started?'pause':'home';this.settingsButtons=[];this.panel.hidden=false;this.title.textContent=this.started?'Пауза':'Шаробесы';this.body.textContent='Солнечная долина · катись, собирай и безумствуй!';this.actions.replaceChildren();
  if(this.started)this.action('Продолжить',()=>this.close(),'menu-resume');
  this.action('▶ Играть',()=>this.modes(),'menu-play');
  this.action('Настройки',()=>this.settings(),'menu-settings');
  if(this.started)this.action('Как играть',()=>this.help(),'menu-help');else this.action('Магазин',()=>this.shop(),'menu-help');this.action('Мой шаробес',()=>this.profile(),'menu-profile');if(!this.started){this.action('Карта',()=>this.map(),'menu-map');const tournament=this.action('Турнир · скоро',()=>{},'menu-tournament');tournament.disabled=true;}this.changed();dispatchEvent(new Event('sharobesy-controls-change'));
 }
 private shop(slot:ShopCategory='all',selected:string='headphones'){
  this.panel.dataset.screen='shop';this.title.textContent='Магазин';this.body.textContent='Монеты: '+this.wardrobe.coins+' · Собирай ягоды в долине';this.actions.replaceChildren();
  const tabs=document.createElement('nav');tabs.className='shop-tabs';tabs.setAttribute('aria-label','Категории магазина');this.actions.append(tabs);
  const showcase=document.createElement('div');showcase.className='shop-showcase';const showTitle=document.createElement('h3');showTitle.textContent='Образ с характером';const showText=document.createElement('span');showText.textContent='Украшения для твоего шаробеса';showcase.append(showTitle,showText);for(const id of ['headphones','viking','knight']){const url=this.preview?.(id);if(url){const img=document.createElement('img');img.src=url;img.alt=GOODS.find(g=>g.id===id)?.name??'';showcase.append(img);}}this.actions.append(showcase);
  for(const [value,label] of SHOP_TABS){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-pressed',String(value===slot));button.onclick=()=>this.shop(value,goodsForCategory(value)[0].id);tabs.append(button);}
  const grid=document.createElement('div');grid.className='shop-grid';this.actions.append(grid);
  const goods=goodsForCategory(slot);const current=goods.find(g=>g.id===selected)??goods[0];
  for(const item of goods){const card=document.createElement('button');card.className='shop-card';card.dataset.item=item.id;card.setAttribute('aria-pressed',String(item.id===current.id));this.thumbnail(card,item.id);const name=document.createElement('strong');name.textContent=item.name;const price=document.createElement('span');price.textContent=this.wardrobe.owned.has(item.id)?'В коллекции':'● '+item.price+' монет';card.append(name,price);card.onclick=()=>this.shop(slot,item.id);grid.append(card);}
  const detail=document.createElement('aside');detail.className='shop-detail';detail.setAttribute('aria-live','polite');this.actions.append(detail);
  const image=this.preview?.(current.id);if(image){const img=document.createElement('img');img.src=image;img.alt='Предпросмотр: '+current.name;detail.append(img);}
  const title=document.createElement('h3');title.textContent=current.name;const description=document.createElement('p');description.textContent=current.category==='headwear'?'Головной убор для твоего шаробеса.':current.category==='glasses'?'Очки для твоего шаробеса.':current.category==='masks'?'Маска для твоего шаробеса.':current.category==='accessories'?'Украшение для твоего шаробеса.':'Рисунок на корпусе твоего шаробеса.';detail.append(title,description);
  const owned=this.wardrobe.owned.has(current.id),worn=this.wardrobe.outfit[current.slot]===current.id;
  const buy=document.createElement('button');buy.id='shop-buy';buy.textContent=worn?'Снять':owned?'Надеть':'Купить · '+current.price+' монет';buy.disabled=!owned&&this.wardrobe.coins<current.price;buy.onclick=()=>{this.wardrobe.choose(current);this.wear();this.shop(slot,current.id);};detail.append(buy);
  if(buy.disabled){const hint=document.createElement('p');hint.className='shop-hint';hint.textContent='Не хватает '+(current.price-this.wardrobe.coins)+' монет. Каждая собранная ягода даёт одну монету.';detail.append(hint);}
  this.action('← Назад',()=>this.show(),'menu-back');this.action('Мой гардероб',()=>this.profile(),'shop-wardrobe');
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
 private settings(){this.panel.dataset.screen='settings';this.title.textContent='Настройки';this.body.textContent='Звук, полный экран и удобная рука для джойстика.';this.actions.replaceChildren();for(const [id,text] of [['sound','Переключить звук'],['fullscreen','Во весь экран'],['control-hand','Сменить руку джойстика']]){const original=document.querySelector<HTMLButtonElement>('#'+id);const button=this.action(original?.textContent??text,()=>{original?.click();},'menu-'+id);if(original)this.settingsButtons.push({button,original});}if(this.brows)this.action('Персонаж · настройки лица · брови',()=>this.faceSettings(),'menu-face');this.action('Как играть',()=>this.help(),'menu-howto');this.action('Назад',()=>this.show(),'menu-back');}
 private faceSettings(){this.title.textContent='Брови';this.body.textContent='Четыре бесплатные формы. Выбор сохраняется отдельно от окраски персонажа.';this.actions.replaceChildren();for(const [id,label] of [['classic','Классические'],['elegant','Изящные'],['rounded','Мягкие округлые'],['bold_short','Короткие дерзкие']]){const button=this.action(label,()=>{this.brows?.select(id);this.faceSettings();},'menu-brow-'+id);button.classList.add('brow-choice');const preview=document.createElement('img');preview.src=import.meta.env.BASE_URL+'assets/brows/'+id+'.webp';preview.alt='';button.prepend(preview);button.setAttribute('aria-pressed',String(this.brows?.current()===id));}this.action('Назад',()=>this.settings(),'menu-back');}
 private help(){this.panel.dataset.screen='help';this.title.textContent='Первые шаги';this.body.textContent='Катись джойстиком или WASD. Прыжок — кнопка справа или пробел, таран — соседняя кнопка или Shift. Подбирай перчик, лимон и бомбочку. Листай предметы свайпом или Q/R, тапни картинку или E для применения. Мягкое касание шаробеса собирает поезд. Камеру вращай на полупрозрачной области экрана.';this.actions.replaceChildren();this.action('Понятно',()=>this.show(),'menu-back');}
 private profile(slot:'head'|'mark'='head'){this.panel.dataset.screen='profile';
  this.title.textContent='Примерка образа';this.body.textContent='● '+this.wardrobe.coins+' · Монеты';
  this.actions.replaceChildren();
  const tabs=document.createElement('nav');tabs.className='fitting-tabs';tabs.setAttribute('aria-label','Категории гардероба');this.actions.append(tabs);
  for(const [id,label] of [['head','♛ Украшения'],['mark','ϟ Рисунки']] as const){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(slot===id));b.onclick=()=>this.profile(id);tabs.append(b);}
  const summary=document.createElement('aside');summary.className='outfit-summary';const heading=document.createElement('h3');heading.textContent='МОЙ ОБРАЗ';summary.append(heading);
  for(const [label,id] of [['Украшение',this.wardrobe.outfit.head],['Рисунок',this.wardrobe.outfit.mark],['Скин',this.wardrobe.skull?'skull':undefined]]){const row=document.createElement('div');const name=id==='skull'?'Черепушка':GOODS.find(g=>g.id===id)?.name;const image=id&&this.preview?.(id);if(image){const img=document.createElement('img');img.src=image;img.alt='';row.append(img);}const text=document.createElement('span');const caption=document.createElement('small');caption.textContent=label??'';const value=document.createElement('strong');value.textContent=name??'Без украшения';text.append(caption,value);row.append(text);if(name){const check=document.createElement('b');check.textContent='✓';row.append(check);}summary.append(row);}this.actions.append(summary);
  const rail=document.createElement('div');rail.className='fitting-rail';rail.setAttribute('aria-label','Предметы коллекции');this.actions.append(rail);

  const preview=document.createElement('div');preview.className='wardrobe-stage';preview.setAttribute('aria-label','Просмотр персонажа');const base=document.createElement('div');base.className='wardrobe-podium';preview.append(base);this.actions.append(preview);for(const [direction,label] of [[-1,'↶'],[1,'↷']] as const){const turn=this.action(label,()=>dispatchEvent(new CustomEvent('sharobesy-fitting-turn',{detail:direction})),'fitting-turn-'+direction);turn.className='fitting-turn';turn.setAttribute('aria-label',direction<0?'Повернуть влево':'Повернуть вправо');}
  const skinButton=this.action('Черепушка · '+(this.wardrobe.skull?'Снять':'Надеть'),()=>{
   this.wardrobe.setSkull(!this.wardrobe.skull);this.wear();this.profile(slot);
  },'wear-skull');
  skinButton.setAttribute('aria-pressed',String(this.wardrobe.skull));skinButton.className='wardrobe-card';this.thumbnail(skinButton,'skull');rail.append(skinButton);
  for(const item of GOODS.filter(x=>x.slot===slot)){
   const owned=this.wardrobe.owned.has(item.id),worn=this.wardrobe.outfit[slot]===item.id;
   const button=this.action(item.name+' · '+(worn?'Снять':owned?'Надеть':item.price+' мон.'),()=>{this.wardrobe.choose(item);this.wear();this.profile(slot);},'wear-'+item.id);
   button.className='wardrobe-card';button.setAttribute('aria-pressed',String(worn));this.thumbnail(button,item.id);button.disabled=!owned&&this.wardrobe.coins<item.price;rail.append(button);
  }
  this.action('← Назад',()=>this.show(),'menu-back');this.action('Магазин →',()=>this.shop(),'fitting-shop');
 }
 private thumbnail(button:HTMLButtonElement,id:string){const url=this.preview?.(id);if(url){const img=document.createElement('img');img.src=url;img.alt='';button.prepend(img);}}
 close(){this.panel.hidden=true;this.changed();dispatchEvent(new Event('sharobesy-controls-change'));}
}
