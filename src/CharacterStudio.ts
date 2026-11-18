import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SkinSample} from './skin/SkinSample';
import {patterns,validateDesign,type SkinDesign,type Pattern} from './skin/SkinDesign';
import {designForGame} from './game/RuntimeAppearance';
import {skinFrom} from './core/skin';
import {fit16by9} from './core/terrain';
import {SketchFace} from './face/SketchFace';
import {BodyDecoration} from './cosmetics/BodyDecoration';
import {HeadDecor,type HeadKind} from './game/HeadDecor';
import {readOutfit,type Outfit} from './game/Wardrobe';
import {bootReady} from './core/BootStatus';
import background from './assets/fitting-clearing.webp';
import './characterStudio.css';
type Makeup='blush'|'freckles'|'liner';
interface Look {design:SkinDesign;outfit:Outfit;skull:boolean;makeup:Makeup[];pose:string;brow:SketchFace['browStyle']}
const KEY='sharobesy.author.character-studio.v1';
const clone=<V>(v:V):V=>structuredClone(v);
const colors=['#29c7bf','#f24858','#ffd34a','#2199ef','#ab55e7','#f36cae','#91d640','#f4943b','#f4e9db','#45404d'];
export async function startCharacterStudio(){
 const hud=document.querySelector<HTMLElement>('#hud')!,stage=document.querySelector<HTMLElement>('#stage')!;
 const seed=Number(localStorage.getItem('sharobesy.skin.v1'))||4321;
 const initial:Look={design:designForGame(skinFrom(seed)),outfit:readOutfit(null),skull:false,makeup:[],pose:'neutral',brow:'classic'};
 try{const old=JSON.parse(localStorage.getItem('sharobesy.author.skin-study.v1')||'null');if(old){initial.design=validateDesign(old);initial.outfit=readOutfit(old.outfit);}}catch{}
 try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){initial.design=validateDesign(old.design);initial.outfit=readOutfit(old.outfit);initial.skull=!!old.skull;initial.makeup=(old.makeup??[]).filter((x:string)=>['blush','freckles','liner'].includes(x));initial.pose=['neutral','smile','sly','angry','curious','surprised'].includes(old.pose)?old.pose:'neutral';if(['classic','elegant','rounded','bold_short'].includes(old.brow))initial.brow=old.brow;}}catch{}
 let look=clone(initial),saved=clone(initial),angle=0,tab='Цвет';
 hud.replaceChildren();const root=document.createElement('section');root.id='character-studio';root.style.backgroundImage=`url(${background})`;root.setAttribute('aria-label','Авторский редактор персонажа');hud.append(root);
 root.innerHTML=`<div class="studio-logo" aria-label="Шаробесы">ШАРОБЕСЫ</div><div class="studio-mode">Мастерская образов <span>Авторский просмотр</span></div><h1>Редактор персонажа</h1><nav class="studio-tabs" aria-label="Разделы редактора"></nav><section class="studio-left studio-panel"></section><div class="studio-view" aria-label="Живой 3D-персонаж"></div><div class="studio-podium"><span>⟳</span></div><section class="studio-right studio-panel"></section><aside class="studio-presets studio-panel"><h2>★ Образы</h2><small>Пресеты</small><div></div></aside><footer><button id="studio-back">← Назад</button><button id="studio-reset">⟳ Сбросить</button><button id="studio-save">✓ Сохранить</button></footer><div class="studio-toast" role="status" aria-live="polite"></div>`;
 const view=root.querySelector<HTMLElement>('.studio-view')!;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1.5);renderer.setSize(470,405,false);renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.02;renderer.setClearColor(0,0);view.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.8,1.8,1.55,-1.55,.1,20);camera.position.set(0,.3,5);camera.lookAt(0,.15,0);
 scene.add(new T.HemisphereLight(0xf0f7ff,0x68865a,1.75));const sun=new T.DirectionalLight(0xfff3df,2.25);sun.position.set(-3,5,7);scene.add(sun);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 const texture=await new T.TextureLoader().loadAsync(import.meta.env.BASE_URL+'assets/face/study/three-expressions.webp');texture.colorSpace=T.SRGBColorSpace;
 let body!:SkinSample,face!:SketchFace,head!:HeadDecor,layers:BodyDecoration[]=[];
 const model=new T.Group();model.scale.setScalar(1.08);scene.add(model);
 function rebuild(){
  if(body){model.remove(body,face,head,...layers);body.dispose();face.dispose();head.dispose();layers.forEach(l=>l.dispose());}
  body=new SkinSample(texture,'sly',environment);body.face.visible=false;body.apply(look.design);model.add(body);
  face=new SketchFace(environment);face.browStyle=look.brow;face.eyeMakeup.liner=look.makeup.includes('liner');face.paintedLids=look.skull||look.makeup.length>0;model.add(face);
  head=new HeadDecor(look.design.seed,look.design.base,look.outfit);model.add(head);
  layers=[new BodyDecoration(),new BodyDecoration(),new BodyDecoration()];model.add(...layers);
  layers[0].setTattoo(look.skull?{id:'skull',color:'#ffffff',u:.25,v:.5,scale:1,excludeFace:false}:null);layers[0].setPartialSkull(look.skull);
  for(const [i,id,color] of [[1,'blush','#ff8cad'],[2,'freckles','#965840']] as const)layers[i].setTattoo(look.makeup.includes(id)?{id,color,u:.25,v:.55,scale:.4,excludeFace:false}:null);
  layers.forEach((l,i)=>{l.children[0].renderOrder=i+1;});
 }
 function announce(text:string){root.querySelector('.studio-toast')!.textContent=text;}
 const left=root.querySelector<HTMLElement>('.studio-left')!,right=root.querySelector<HTMLElement>('.studio-right')!;
 function button(parent:Element,label:string,active:boolean,action:()=>void,visual?:HTMLElement){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(active));if(visual)b.append(visual);else b.textContent=label;b.onclick=()=>{action();rebuild();panels();announce('Изменения в предпросмотре');};parent.append(b);return b;}
 function section(parent:Element,label:string){const s=document.createElement('section'),h=document.createElement('h2');h.textContent=label;s.append(h);parent.append(s);return s;}
 function grid(parent:Element){const d=document.createElement('div');d.className='studio-grid';parent.append(d);return d;}
 function swatch(color:string){const span=document.createElement('span');span.className='studio-swatch';span.style.backgroundColor=color;return span;}
 function orb(pattern:Pattern){const span=swatch(look.design.base);span.classList.add('studio-orb');span.dataset.pattern=pattern;const symbols:Partial<Record<Pattern,string>>={hearts:'♥ ♥',dots:'● ●',diamonds:'◆ ◆',hex:'⬡',checker:'▦',lightning:'ϟ',splats:'✿',scribbles:'〰',cow:'●',leopard:'◉',tiger:'≋',zebra:'≋',giraffe:'⬡',zigzag:'⌁',waves:'≈'};span.textContent=symbols[pattern]??'';span.style.color=look.design.accent;return span;}
 function panels(){
  const nav=root.querySelector('.studio-tabs')!;nav.replaceChildren();
  for(const [name,icon] of [['Цвет','◕'],['Узор','≋'],['Макияж','◉'],['Тату','ϟ'],['Украшения','♛'],['Эмоция','☻'],['След','✦'],['Случайный образ','⚄']]){const b=document.createElement('button');const symbol=document.createElement('span');symbol.className='studio-tab-icon';symbol.textContent=icon;const caption=document.createElement('span');caption.textContent=name;b.append(symbol,caption);b.setAttribute('aria-pressed',String(tab===name));b.onclick=()=>{tab=name;if(name==='Случайный образ'){look.design=designForGame(skinFrom(crypto.getRandomValues(new Uint32Array(1))[0]));rebuild();announce('Новый авторский образец');}panels();};nav.append(b);}
  left.replaceChildren();right.replaceChildren();
  const color=section(left,'Цвет корпуса'),palette=grid(color);palette.classList.add('studio-palette');
  colors.forEach(c=>button(palette,'Цвет '+c,look.design.base===c,()=>{look.design.base=c;},swatch(c)));
  const accent=document.createElement('label');accent.className='studio-ink';accent.textContent='Цвет узора';const ink=document.createElement('input');ink.type='color';ink.value=look.design.accent;ink.setAttribute('aria-label','Цвет узора');ink.oninput=()=>{look.design.accent=ink.value;rebuild();panels();};accent.append(ink);color.append(accent);
  const pattern=section(left,'Узор'),pg=grid(pattern);pg.classList.add('studio-patterns');
  for(const [id,name]of Object.entries(patterns)){button(pg,name.replace(/^\d+ · /,''),look.design.pattern===id,()=>{look.design.surface='smooth';look.design.pattern=id as Pattern;},orb(id as Pattern));}
  const makeup=section(right,'◉ Макияж'),mg=grid(makeup);mg.classList.add('studio-options');
  button(mg,'Без макияжа',look.makeup.length===0,()=>{look.makeup=[];});for(const [id,label,icon]of [['liner','Стрелки','⌁'],['blush','Румянец','❥'],['freckles','Веснушки','∴']] as const){const b=button(mg,label,look.makeup.includes(id),()=>{look.makeup=look.makeup.includes(id)?look.makeup.filter(x=>x!==id):[...look.makeup,id];});b.textContent=icon;}
  const tattoo=section(right,'ϟ Скин и тату'),tg=grid(tattoo);tg.classList.add('studio-options');
  button(tg,'Без рисунка',!look.skull&&look.outfit.mark==='none',()=>{look.skull=false;look.outfit.mark='none';});
  button(tg,'Черепушка',look.skull,()=>{look.skull=!look.skull;}).textContent='☠';
  for(const [id,name,icon]of [['stripes','Шрамы','╱╱'],['star','Звёзды','★'],['bolt','Молния','ϟ']] as const){button(tg,name,look.outfit.mark===id,()=>{look.outfit.mark=id;}).textContent=icon;}
  const equipment=section(right,'♛ Украшения'),eg=grid(equipment);eg.classList.add('studio-options');
  for(const [id,name,icon]of [['none','Без украшения','∅'],['crown','Корона','♛'],['helmet','Шлем','⛑'],['horns','Рожки','♈']] as const){button(eg,name,look.outfit.head===id,()=>{look.outfit.head=id as HeadKind;}).textContent=icon;}
  if(tab==='Эмоция'){const g=grid(section(right,'Выражение лица'));for(const [id,label]of [['neutral','Спокойный'],['smile','Радостный'],['sly','Хитрый'],['angry','Злой'],['curious','Любопытный'],['surprised','Удивлённый']])button(g,label,look.pose===id,()=>{look.pose=id;});}
  if(tab==='Цвет'||tab==='Узор'){const g=grid(section(right,'Фактура корпуса'));g.classList.add('studio-surfaces');for(const [id,name]of [['smooth','Гладкий'],['scales','Чешуя'],['segments','Сегменты'],['shaggy','Короткий мех']] as const)button(g,name,look.design.surface===id,()=>{look.design.surface=id;if(id!=='smooth')look.design.pattern='none';});}
  if(tab==='След'){const note=document.createElement('p');note.className='studio-note';note.textContent='Следы будут подключены отдельным этапом.';right.append(note);}
  right.querySelectorAll('section').forEach(s=>s.classList.toggle('studio-emphasis',s.querySelector('h2')?.textContent?.toLocaleLowerCase().includes(tab.toLocaleLowerCase())??false));
 }
 rebuild();panels();
 const poses=root.querySelector('.studio-presets>div')!;
 for(const [i,presetSeed]of [seed,620,731,940].entries()){
  const design=i===0?clone(initial.design):designForGame(skinFrom(presetSeed));const draft:Look={...clone(initial),design,skull:false,makeup:[],outfit:{head:i===1?'crown':i===2?'helmet':'none',mark:'none'}};
  const original=look;look=draft;rebuild();face.updatePose(0,'neutral',0,false,look.design.base,true);renderer.render(scene,camera);const img=document.createElement('img');img.src=renderer.domElement.toDataURL('image/png');img.alt='';look=original;
  const b=document.createElement('button');b.setAttribute('aria-label',i===0?'Исходный образ':'Пресет '+i);b.append(img);const caption=document.createElement('small');caption.textContent=i===0?'Исходный':'Образ '+i;b.append(caption);b.onclick=()=>{look=clone(draft);angle=0;rebuild();panels();announce('Пресет применён в предпросмотре');};poses.append(b);
 }
 rebuild();
 for(const [direction,label]of [[-1,'‹'],[1,'›']] as const){const b=document.createElement('button');b.className='studio-turn '+(direction<0?'left':'right');b.textContent=label;b.setAttribute('aria-label',direction<0?'Повернуть влево':'Повернуть вправо');b.onclick=()=>{angle+=direction*Math.PI/6;};root.append(b);}
 root.querySelector<HTMLButtonElement>('#studio-reset')!.onclick=()=>{look=clone(saved);angle=0;rebuild();panels();announce('Восстановлен сохранённый авторский образ');};
 root.querySelector<HTMLButtonElement>('#studio-save')!.onclick=()=>{try{localStorage.setItem(KEY,JSON.stringify(look));localStorage.setItem('sharobesy.author.skin-study.v1',JSON.stringify({...look.design,outfit:look.outfit}));saved=clone(look);announce('Авторский образ сохранён');}catch{announce('Не удалось сохранить: хранилище недоступно');}};
 root.querySelector<HTMLButtonElement>('#studio-back')!.onclick=()=>{location.assign(import.meta.env.BASE_URL);};
 const resize=()=>{const f=fit16by9(innerWidth,innerHeight);stage.style.width=f.width+'px';stage.style.height=f.height+'px';hud.style.transform=`scale(${f.scale})`;};addEventListener('resize',resize);resize();
 let last=performance.now(),time=0;function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;model.rotation.y=angle;const t=time%4.7,blink=t<.38?Math.sin(t/.38*Math.PI):0;face.updatePose(dt,look.pose,blink,false,look.design.base,true);layers.forEach(l=>l.setFaceFrame(face));renderer.render(scene,camera);bootReady();requestAnimationFrame(frame);}requestAnimationFrame(frame);
 Object.defineProperty(window,'__CHARACTER_STUDIO__',{get:()=>({look:clone(look),angle,storageKey:KEY,saved:JSON.stringify(look)===JSON.stringify(saved),width:1280,height:720})});
}
