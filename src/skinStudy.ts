import {SketchFace} from './face/SketchFace';
import {BodyDecoration} from './cosmetics/BodyDecoration';
import type {TattooId,TattooPlacement} from './cosmetics/CosmeticCatalog';
import {NeutralStudyFace} from './face/NeutralStudyFace';
import {ControlFace} from './face/ControlFace';
import {ModularFace,type FacePose} from './face/ModularFace';
import {HeadDecor} from './game/HeadDecor';
import {GOODS,readOutfit} from './game/Wardrobe';
import {bootReady} from "./core/BootStatus";
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {skinFrom,isVividSeed} from './core/skin';
import {designForGame} from './game/RuntimeAppearance';
import {fit16by9} from './core/terrain';
import {SkinSample,SKIN_STUDY_FACE_SCALE} from './skin/SkinSample';
import {patterns,connectedPatterns,defaultDesign,validateDesign,type SkinDesign} from './skin/SkinDesign';
import type {StudyExpression} from './face/StudyFaceRig';
const storageKey='sharobesy.author.skin-study.v1';
export async function startSkinStudy(){
 const texture=await new T.TextureLoader().loadAsync(import.meta.env.BASE_URL+'assets/face/study/three-expressions.webp');texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
 const stage=document.querySelector<HTMLElement>('#stage')!,hud=document.querySelector<HTMLElement>('#hud')!;hud.innerHTML='';
 const css=document.createElement('style');css.textContent=`.skin-panel{position:absolute;right:16px;top:16px;width:410px;height:688px;overflow:auto;background:#183b40f2;border-radius:18px;padding:18px;pointer-events:auto;text-shadow:none;font-size:14px;color:#f3f7f4}.skin-panel h2{font-size:18px;margin:0 0 12px}.skin-panel h3{font-size:15px;margin:18px 0 10px;color:#b9e7de}.skin-panel label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:9px 0;min-height:27px}.skin-panel select{max-width:218px;padding:6px;border:1px solid #aaccc8;border-radius:6px;background:#f4f5ef;color:#163337}.skin-panel input[type=range]{width:145px}.skin-panel input[type=color]{width:55px;height:30px;padding:1px;border:0;background:none}.skin-panel button{font-size:12px;padding:8px 10px;border-radius:8px;margin:3px}.skin-panel .hint{font-size:12px;line-height:1.45;color:#c3d9d6}.skin-toolbar{position:absolute;left:25px;top:85px;display:flex;gap:6px;pointer-events:auto}.skin-toolbar button{font-size:12px;padding:9px 11px}.skin-title{position:absolute;left:26px;top:23px;color:#21464a;font-size:27px;font-weight:900;text-shadow:none}.skin-caption{position:absolute;left:28px;bottom:24px;max-width:770px;color:#21464a;text-shadow:none;font-size:13px}.skin-status{min-height:32px;color:#d1f0bd;font-size:12px;line-height:1.4}`;document.head.appendChild(css);
 const title=document.createElement('div');title.className='skin-title';title.textContent='ШАРОБЕСЫ · РЕДАКТОР ПЕРСОНАЖА';hud.appendChild(title);
 const panel=document.createElement('div');panel.className='skin-panel';panel.innerHTML='<h2>Авторские настройки</h2><p class="hint">15 узоров + однотонный корпус. Мордочка уменьшена на 10% вокруг своего центра. Игровой SkinSeed не меняется.</p>';hud.appendChild(panel);
 const toolbar=document.createElement('div');toolbar.className='skin-toolbar';hud.appendChild(toolbar);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.appendChild(renderer.domElement);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),glossEnvironment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 const scene=new T.Scene();scene.background=new T.Color('#d9e1df');const hemi=new T.HemisphereLight(0xfffaf1,0x6d9298,1.65);scene.add(hemi);const sun=new T.DirectionalLight(0xfff3e1,3);sun.position.set(-4,6,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.004;sun.shadow.bias=-.0001;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.14,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.65;floor.receiveShadow=true;scene.add(floor);
 const camera=new T.OrthographicCamera(-5.8,5.8,3.2625,-3.2625,.1,40);camera.position.set(0,.7,14);camera.lookAt(0,0,0);
 let outfit=readOutfit(null);
 let design={...defaultDesign};try{const saved=localStorage.getItem(storageKey);if(saved){const data=JSON.parse(saved);design=validateDesign(data);outfit=readOutfit(data.outfit);}}catch{/* Author storage is optional. */}
 if(design.surface!=='smooth')design.pattern='none';
 let sample:SkinSample,mini:SkinSample,expression:StudyExpression='sly',angle=0,rolling=false,shadow=false,closed=false,elapsed=0;
 const cosmetics=new URLSearchParams(location.search).has('cosmetics-study');
 const v5=cosmetics||new URLSearchParams(location.search).has('face-v5');
 const neutral=new URLSearchParams(location.search).has('neutral-study');
 const v4=v5||neutral||new URLSearchParams(location.search).has('face-v4');
 const v2=v4||new URLSearchParams(location.search).has('face-v2');
 let halfBlink=false,boost=false,details=true;
 let pose:string='base',short=false,reactionUntil=0;
 if(v2){design={...defaultDesign,base:'#202331',pattern:'none',growthCount:0,gloss:.24};outfit=readOutfit(null);}
 if(v4){design={...defaultDesign,base:'#ac4569',accent:'#52cacb',pattern:'none',growthCount:0,gloss:.32};title.textContent+=' · V4';}
 if(neutral){hemi.intensity=1.10;sun.intensity=2.1;renderer.toneMappingExposure=.88;design.base='#ad373e';design.gloss=.16;title.textContent='ШАРОБЕСЫ · БАЗОВЫЙ ПОРТРЕТ';}
 if(v5){design.base='#ad3239';design.gloss=.22;hemi.intensity=1.0;sun.intensity=2.5;sun.shadow.camera.left=-5;sun.shadow.camera.right=3;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.camera.updateProjectionMatrix();renderer.toneMappingExposure=.91;title.textContent='ШАРОБЕСЫ · ЭСКИЗЫ V5';pose='sly';}
 const modules=new Map<SkinSample,ModularFace|ControlFace|NeutralStudyFace|SketchFace>();
 const bodyDecorations=new Map<SkinSample,BodyDecoration>();
 let tattoo:TattooPlacement|null=null;
 const selectors=new Map<'head'|'mark',HTMLSelectElement>();
 function updateDecor(){
  for(const model of [sample,mini]){
   const old=model.getObjectByName('head-decor');
   if(old instanceof HeadDecor){model.remove(old);old.dispose();}
   model.add(new HeadDecor(design.seed,design.base,outfit));
  }
  for(const [slot,select] of selectors)select.value=outfit[slot];
 }
 function serialize(){return {...design,outfit:{...outfit}};}
 function rebuildFaces(){if(sample){scene.remove(sample,mini);for(const model of [sample,mini]){const old=model.getObjectByName('head-decor');if(old instanceof HeadDecor)old.dispose();bodyDecorations.get(model)?.dispose();bodyDecorations.delete(model);modules.get(model)?.dispose();modules.delete(model);model.dispose();}}sample=new SkinSample(texture,expression,glossEnvironment);sample.position.set(-1.72,.21,0);sample.scale.setScalar(1.8);scene.add(sample);mini=new SkinSample(texture,expression,glossEnvironment);mini.position.set(-4.8,-2.4,0);mini.scale.setScalar(.31);scene.add(mini);sample.apply(design);mini.apply(design);if(v2)for(const m of [sample,mini]){m.face.visible=false;const rig=v5?new SketchFace(glossEnvironment):neutral?new NeutralStudyFace(glossEnvironment):v4?new ControlFace(glossEnvironment):new ModularFace();m.add(rig);modules.set(m,rig);}if(cosmetics)for(const m of [sample,mini]){const layer=new BodyDecoration();m.rollingBody.add(layer);layer.setTattoo(tattoo);bodyDecorations.set(m,layer);}updateDecor();}
 rebuildFaces();
 if(cosmetics){title.textContent='ШАРОБЕСЫ · ПРИМЕРОЧНАЯ · ЧЕРНОВИК';const h=document.createElement('h3');h.textContent='Тест татуировок';panel.append(h);const select=document.createElement('select');for(const [id,label] of [['','Без тату'],['lightning','Молния'],['claw','Когти'],['tribal','Племенной узор'],['star','Звезда'],['crown','Корона'],['hearts','Сердечки']])select.add(new Option(label,id));const color=document.createElement('input');color.type='color';color.value='#ffd600';const u=document.createElement('input');u.type='range';u.min='0';u.max='1';u.step='.01';u.value='.25';const size=document.createElement('input');size.type='range';size.min='.08';size.max='.7';size.step='.01';size.value='.4';const update=()=>{tattoo=select.value?{id:select.value as TattooId,color:color.value,u:Number(u.value),v:.55,scale:Number(size.value),excludeFace:false}:null;for(const layer of bodyDecorations.values())layer.setTattoo(tattoo);};for(const [label,input] of [['Рисунок',select],['Цвет',color],['Положение по долготе',u],['Масштаб',size]] as const){const row=document.createElement('label');row.append(label,input);panel.append(row);input.addEventListener('input',update);}const note=document.createElement('p');note.className='hint';note.textContent='Черновик: маска исключения лица и остальные категории ещё не готовы.';panel.append(note);const exportButton=document.createElement('button');exportButton.textContent='Скачать JSON';exportButton.onclick=()=>{const data=JSON.stringify({version:1,makeup:[],tattoo,accessories:[]},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sharobesy-cosmetics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};panel.append(exportButton);}
 const fitting=document.createElement('fieldset');fitting.className='fitting';
 const legend=document.createElement('legend');legend.textContent='Примерочная';fitting.append(legend);
 for(const [slot,title] of [['head','Головное украшение'],['mark','Раскраска']] as const){
  const row=document.createElement('label'),select=document.createElement('select');
  row.append(title,select);select.add(new Option('Без '+(slot==='head'?'украшения':'раскраски'),'none'));
  for(const item of GOODS.filter(x=>x.slot===slot))select.add(new Option(item.name,item.id));
  selectors.set(slot,select);select.value=outfit[slot];
  select.onchange=()=>{outfit=readOutfit({...outfit,[slot]:select.value});updateDecor();};fitting.append(row);
 }
 panel.append(fitting);
 const controls=new Map<string,HTMLInputElement|HTMLSelectElement>();const outputs=new Map<string,HTMLOutputElement>();const connectedNote=document.createElement('p');connectedNote.className='hint';
 let status:HTMLDivElement;
 function refresh(){for(const [key,input] of controls){const value=design[key as keyof SkinDesign];if(input instanceof HTMLInputElement&&input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);const output=outputs.get(key);if(output)output.value=typeof value==='number'?String(Math.round(value*100)/100):String(value);}
  controls.get('pattern')!.disabled=design.surface!=='smooth';controls.get('regular')!.disabled=design.surface!=='smooth'||connectedPatterns.has(design.pattern)||['tiger','zebra','giraffe','cow','none'].includes(design.pattern);controls.get('gloss')!.disabled=design.surface!=='smooth'||design.growthCount>0;
  controls.get('surfaceAccent')!.disabled=design.surface==='smooth';
  controls.get('accent')!.disabled=!(design.surface==='smooth'&&design.pattern!=='none'||design.surface!=='smooth'&&design.surfaceAccent||design.growthCount>0&&design.growthAccent);
  const connected=connectedPatterns.has(design.pattern),disabled=connected||design.pattern==='none'||['tiger','zebra','giraffe','cow'].includes(design.pattern)||design.regular;for(const key of ['sizeScatter','positionScatter','rotationScatter'])controls.get(key)!.disabled=disabled;
  for(const key of ['scale','density'])controls.get(key)!.disabled=design.pattern==='none';
  for(const key of ['surfaceScale','relief'])controls.get(key)!.disabled=design.surface!=='scales'&&design.surface!=='segments';
  for(const key of ['furCount','furLength','furScatter'])controls.get(key)!.disabled=design.surface!=='fuzz'&&design.surface!=='shaggy';
  connectedNote.textContent=design.pattern==='zebra'||design.pattern==='giraffe'||design.pattern==='cow'?'Рисунок распределён по всей сфере без стягивания к макушке. Seed меняет рисунок; масштаб — ширину полос или промежутков.':design.regular?'Мотивы одного размера и направления, распределены по сфере с равномерной плотностью. Разброс отключён.':design.pattern==='tiger'?'Тигровый рисунок нанесён по всей сфере без схождения к полюсам. Масштаб регулирует ширину полос; плотность — их частоту. Seed меняет рисунок.':connected?'Для связанной сетки масштаб меняет ячейки/шаг, плотность — толщину линий (у клетки заполнение фиксировано). Случайный сдвиг отключён, чтобы сетка не рвалась.':'Масштаб не меняет количество отдельных мотивов. При крупном размере и высокой плотности они могут перекрываться.';
  controls.get('density')!.disabled=design.pattern==='none'||design.pattern==='checker';
 }
 function apply(){if(design.surface!=='smooth')design.pattern='none';sample.apply(design);mini.apply(design);updateDecor();refresh();}
 function heading(s:string){const h=document.createElement('h3');h.textContent=s;panel.appendChild(h);}
 function label(key:string,text:string,input:HTMLInputElement|HTMLSelectElement){const l=document.createElement('label');const span=document.createElement('span');span.textContent=text;input.id='skin-'+key;input.setAttribute('aria-label',text);l.htmlFor=input.id;l.append(span,input);panel.appendChild(l);controls.set(key,input);return l;}
 function select<K extends keyof SkinDesign>(key:K,text:string,choices:Record<string,string>){const s=document.createElement('select');for(const [value,name] of Object.entries(choices)){const o=document.createElement('option');o.value=value;o.textContent=name;s.appendChild(o);}s.onchange=()=>{(design as unknown as Record<string,unknown>)[key]=s.value;apply();};label(key,text,s);}
 function range(key:keyof SkinDesign,text:string,min:number,max:number,step:number){const i=document.createElement('input');i.type='range';i.min=String(min);i.max=String(max);i.step=String(step);const l=label(String(key),text,i),o=document.createElement('output');outputs.set(String(key),o);l.querySelector('span')!.append(' ',o);i.oninput=()=>{(design as unknown as Record<string,unknown>)[key]=Number(i.value);queueApply();};}
 let scheduled=false;function queueApply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply();});}
 for(const [key,name] of [['base','Цвет корпуса'],['accent','Второй цвет']] as const){const i=document.createElement('input');i.type='color';i.oninput=()=>{design[key]=i.value;queueApply();};label(key,name,i);}
 const surfaceAccent=document.createElement('input');surfaceAccent.type='checkbox';surfaceAccent.onchange=()=>{design.surfaceAccent=surfaceAccent.checked;apply();};label('surfaceAccent','Второй цвет меха и углублений',surfaceAccent);
 select('pattern','Узор',patterns);const regular=document.createElement('input');regular.type='checkbox';regular.onchange=()=>{design.regular=regular.checked;apply();};label('regular','Равномерный узор',regular);range('gloss','Глянцевый блеск',0,1,.05);const glossNote=document.createElement('p');glossNote.className='hint';glossNote.textContent='Блеск пока доступен у гладкого корпуса без наростов, с рисунком или без него.';panel.appendChild(glossNote);range('scale','Масштаб рисунка',.25,2.4,.05);range('density','Плотность',.1,1.5,.05);range('sizeScatter','Разброс размеров',0,.7,.05);range('positionScatter','Разброс положения',0,1,.05);range('rotationScatter','Разброс наклона',0,1,.05);panel.appendChild(connectedNote);
 heading('Объёмная поверхность');select('surface','Фактура',{smooth:'Гладкая',scales:'Чешуя',segments:'Сегменты',shaggy:'Короткий кудрявый мех'});range('surfaceScale','Размер фактуры',.5,2,.05);range('relief','Рельеф',.005,.1,.005);
 
 const surfaceNote=document.createElement('p');surfaceNote.className='hint';surfaceNote.textContent='Отдельные объёмные ячейки: часть глубже посажена и наклонена. Распределение по сфере без схождения к макушке. Второй цвет заполняет внутренние углубления; верх ячеек остаётся основного цвета. Выключите второй цвет для однотонной поверхности.';panel.appendChild(surfaceNote);
 heading('Короткий мягкий мех');range('furCount','Плотность ворса',1,160,1);range('furLength','Длина пушка',.05,.10,.01);range('furScatter','Разброс длины ворса',0,1,.05);const furNote=document.createElement('p');furNote.className='hint';furNote.textContent='Короткие ворсинки равномерно покрывают сферу; у кудрявого меха мягкий изгиб. Второй цвет занимает верхнюю часть ворса, с плавным переходом. У мордочки ворс временно уменьшается, чтобы лицо оставалось видно.';panel.appendChild(furNote);
 heading('Наросты');range('growthCount','Количество наростов',0,240,1);const presets=document.createElement('div');for(const [count,text] of [[0,'Нет'],[1,'Один'],[2,'Пара'],[12,'Несколько'],[80,'Много'],[240,'Весь шар']] as const){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{design.growthCount=count;apply();};presets.appendChild(b);}panel.appendChild(presets);
 select('growthShape','Форма',{soft:'Мягкие бугорки',spike:'Колючки'});range('growthSize','Размер наростов',.06,.12,.01);range('growthScatter','Разброс наростов',0,.7,.05);const accent=document.createElement('input');accent.type='checkbox';accent.onchange=()=>{design.growthAccent=accent.checked;apply();};label('growthAccent','Кончики наростов вторым цветом',accent);
 const growthNote=document.createElement('p');growthNote.className='hint';growthNote.textContent='Наросты вращаются с корпусом. Вблизи мордочки временно плавно уменьшаются, чтобы не закрывать глаза и рот; это пробное решение для просмотра.';panel.appendChild(growthNote);
 heading('Сохранить вариант');const seed=document.createElement('input');seed.type='number';seed.min='0';seed.max=String(0xffffffff);seed.style.width='140px';seed.onchange=()=>{const n=Number(seed.value);if(!Number.isInteger(n)||n<0||n>0xffffffff){seed.value=String(design.seed);return;}design.seed=n;apply();};label('seed','Seed рисунка',seed);
 function button(parent:HTMLElement,text:string,fn:()=>void){const b=document.createElement('button');b.textContent=text;b.onclick=fn;parent.appendChild(b);return b;}
 button(panel,'В игру с этим скином',()=>{try{localStorage.setItem(storageKey,JSON.stringify(serialize()));location.assign(import.meta.env.BASE_URL+'?skin-test');}catch{status.textContent='Не удалось сохранить вариант для игровой пробы. Скачайте JSON.';}});
 button(panel,'Случайный образец',()=>{const seed=crypto.getRandomValues(new Uint32Array(1))[0];design=designForGame(skinFrom(seed));apply();status.textContent='Новый авторский образец. Игровой персонаж не изменён.';});
 button(panel,'Яркий + мелкий узор',()=>{let seed=crypto.getRandomValues(new Uint32Array(1))[0];for(let attempt=0;attempt<1000;attempt++,seed=(seed+1)>>>0){const candidate=designForGame(skinFrom(seed));if(isVividSeed(seed)&&candidate.pattern!=='none'&&candidate.scale<=.6&&candidate.density<=.22){design=candidate;apply();status.textContent='Яркий авторский образец с мелким редким рисунком. Игровой персонаж не изменён.';break;}}});
 button(panel,'Другой разброс' ,()=>{design.seed=(design.seed+1)>>>0;apply();});
 button(panel,'Сохранить здесь',()=>{try{localStorage.setItem(storageKey,JSON.stringify(serialize()));status.textContent='Авторский вариант сохранён. Игровой скин не изменён.';}catch{status.textContent='Не удалось записать настройки. Скачайте JSON.';}});
 function download(blob:Blob,name:string){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 button(panel,'Снимок PNG',()=>{renderer.domElement.toBlob(blob=>{if(blob)download(blob,'sharobesy-skin-preview.png');});});
 button(panel,'Скачать JSON',()=>download(new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'}),'sharobesy-skin-design.json'));
 const upload=document.createElement('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;upload.onchange=async()=>{try{const file=upload.files?.[0];if(!file)return;const data=JSON.parse(await file.text());design=validateDesign(data);outfit=readOutfit(data.outfit);apply();status.textContent='Вариант загружен. Для сохранения после входа нажмите «Сохранить здесь».';}catch(e){status.textContent=e instanceof Error?e.message:'Ошибка JSON';}upload.value='';};panel.appendChild(upload);button(panel,'Загрузить JSON',()=>upload.click());button(panel,'Сброс образца',()=>{design={...defaultDesign};outfit=readOutfit(null);apply();status.textContent='Сброшен только образец. Сохранение не перезаписано.';});
 status=document.createElement('div');status.className='skin-status';status.setAttribute('role','status');panel.appendChild(status);
 button(toolbar,'↶ 30°',()=>{angle-=Math.PI/6;});button(toolbar,'↷ 30°',()=>{angle+=Math.PI/6;});
 button(toolbar,'Спереди / ¾',()=>{angle=angle===0?.55:0;});button(toolbar,'Свет / тень',()=>{shadow=!shadow;hemi.intensity=shadow?.65:1.65;sun.position.z=shadow?-7:7;});button(toolbar,'Качение',()=>{rolling=!rolling;});button(toolbar,'Моргание',()=>{closed=!closed;halfBlink=false;});
 const faceSelect=document.createElement('select');faceSelect.setAttribute('aria-label','Выражение лица');faceSelect.style.cssText='padding:7px;border-radius:8px';for(const [value,text] of [['sly','Хитрый'],['happy','Довольный'],['grumpy','Хмурый']]){const o=document.createElement('option');o.value=value;o.textContent=text;faceSelect.appendChild(o);}faceSelect.onchange=()=>{expression=faceSelect.value as StudyExpression;rebuildFaces();};toolbar.appendChild(faceSelect);
 if(v2){
  faceSelect.replaceChildren();for(const [key,name] of [['base','Базовое'],['sly','Хитрый'],['scared','Испуг'],['surprised','Удивление'],['happy','Радость'],['angry','Сердитый'],['sleepy','Сонный']])if(!v4||['base','surprised','happy','angry'].includes(key))faceSelect.add(new Option(name,key));
  if(v5){faceSelect.replaceChildren();for(const [key,label] of [['neutral','Нейтральный'],['frightened','Испуганный'],['surprised','Удивлённый'],['sly','Хитрый'],['dreamy','Мечтательный'],['curious','Любопытный'],['content','Довольный'],['smile','Радостный'],['angry','Злой — хмурится'],['angry_clenched','Злой — сжатые зубы'],['attack','Злой — атака'],['rage','В ярости'],['confident','Уверенный'],['focused','Сосредоточенный'],['tired','Усталый'],['sleeping','Спящий'],['stunned','Оглушённый']])faceSelect.add(new Option(label,key));button(toolbar,'Тени и складки',()=>{details=!details;reviewFrames=0;});button(panel,'Толчок',()=>{for(const rig of modules.values())if(rig instanceof SketchFace)rig.impact();});}
  if(neutral){faceSelect.hidden=true;}
  faceSelect.onchange=()=>{pose=faceSelect.value;reactionUntil=0;};
  button(panel,'Полуморгание',()=>{halfBlink=!halfBlink;closed=false;});
  button(toolbar,'Профиль',()=>{angle=Math.PI/2;});
  if(v4&&!neutral&&!v5){const toggle=button(toolbar,'Усиление',()=>{boost=!boost;reviewFrames=0;toggle.setAttribute('aria-pressed',String(boost));toggle.style.background=boost?'#81516a':'';});toggle.setAttribute('aria-pressed','false');}
  if(!v4)button(toolbar,'Короткие брови',()=>{short=!short;});
  if(!v4)button(toolbar,'Испуг → обратно',()=>{reactionUntil=performance.now()+1300;});
 }else button(panel,'Открыть мимику v2',()=>location.assign('?skin-study&face-v2'));
 const caption=document.createElement('div');caption.className='skin-caption';caption.textContent='Слева внизу — игровой размер (~68 px). Узор и наросты катятся с корпусом; лицо не переворачивается.\nЭто художественный образец, без изменения основного геймплея.';caption.style.whiteSpace='pre-line';hud.appendChild(caption);
 function resize(){const f=fit16by9(innerWidth,innerHeight);stage.style.width=f.width+'px';stage.style.height=f.height+'px';hud.style.transform=`scale(${f.scale})`;renderer.setSize(f.width,f.height,false);}addEventListener('resize',resize);resize();refresh();
 let reviewFrames=0,previousPose:string=pose,previousAngle=angle,lastBlink=0;
 if(v4)Object.defineProperty(window,"__FACE_REVIEW__",{get:()=>({ready:previousPose===pose && previousAngle===angle && reviewFrames>=25 && lastBlink===0,closed:closed && lastBlink===1})});
 let last=performance.now();function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;reviewFrames=pose===previousPose && angle===previousAngle?reviewFrames+1:0;previousPose=pose;previousAngle=angle;for(const s of [sample,mini]){s.rotation.y=angle;s.update(dt,rolling);const phase=(elapsed+1)%4,blink=closed?1:halfBlink?.5:phase<.15?phase/.15:phase<.25?1:phase<.4?1-(phase-.25)/.15:0;lastBlink=blink;const effectiveBlink=v5&&pose==='stunned'?0:v5&&pose==='sleeping'?1:blink;s.face.update(dt,effectiveBlink);const rig=modules.get(s);if(rig instanceof SketchFace)rig.updatePose(dt,now<reactionUntil?'frightened':pose,effectiveBlink,short,design.base,details);else rig?.updatePose(dt,now<reactionUntil?'scared':pose as FacePose,effectiveBlink,short,design.base,boost);}renderer.render(scene,camera);bootReady();requestAnimationFrame(frame);}requestAnimationFrame(frame);
 Object.defineProperty(window,'__SKIN_STUDY__',{get:()=>({design:{...design},outfit:{...outfit},expression,rolling,shadow,angle,faceScale:SKIN_STUDY_FACE_SCALE,bodyAngle:sample.rotationAngle,faceQuaternion:sample.face.quaternion.toArray(),growthInstances:sample.growthInstances,surfaceCells:sample.cellCount,furInstances:sample.furInstances,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,storageKey})});
}
