import * as T from 'three';
import {fit16by9} from './core/terrain';
import {randomFrom} from './core/skin';
import {loadAnimationAtlas,AnimatedAtlasRig} from './face/AnimatedAtlas';
/** Authoring preview. New emotion-to-gameplay rules are deliberately not inferred here. */
export async function startFaceAnimations(){
 const {data,textures}=await loadAnimationAtlas(),stage=document.querySelector<HTMLElement>('#stage')!,hud=document.querySelector<HTMLElement>('#hud')!;hud.innerHTML='';hud.style.textShadow='none';
 const heading=document.createElement('div');heading.style.cssText='position:absolute;left:25px;top:22px;color:#22484b;font-size:23px;font-weight:bold';heading.textContent='АТЛАС МИМИКИ · ЭМОЦИИ И KO';hud.appendChild(heading);
 const panel=document.createElement('div');panel.style.cssText='position:absolute;right:16px;top:16px;width:355px;padding:16px;background:#173c40f5;border-radius:16px;pointer-events:auto;color:white;font-size:14px;max-height:688px;overflow:auto';hud.appendChild(panel);
 const tip=document.createElement('p');tip.textContent='Выбери эмоцию: вход → удержание → возврат к базовому характеру.';tip.style.cssText='margin:0 0 12px;line-height:1.4';panel.appendChild(tip);
 const buttons=document.createElement('div');buttons.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px';panel.appendChild(buttons);
 function button(label:string,fn:()=>void,parent:HTMLElement=buttons){const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:10px 6px;font-size:13px;border-radius:9px';b.onclick=fn;parent.appendChild(b);return b;}
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;stage.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#c5cece');const hemi=new T.HemisphereLight(0xfff9ee,0x42666a,2);scene.add(hemi);const sun=new T.DirectionalLight(0xfff4e3,2);sun.position.set(-4,6,8);scene.add(sun);
 const camera=new T.OrthographicCamera(-6.4,6.4,3.6,-3.6,.1,30);camera.position.z=14;const root=new T.Group();root.position.set(-1.8,-.1,0);root.scale.setScalar(2.25);scene.add(root);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d')!;c.fillStyle='#23bfc4';c.fillRect(0,0,1024,512);c.fillStyle='#20a9b1';const r=randomFrom(4321);for(let i=0;i<230;i++){const x=r()*1024,y=r()*512,rad=5+r()*10;c.beginPath();c.ellipse(x,y,rad,rad*(.7+r()*.45),r()*3,0,Math.PI*2);c.fill();}const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const body=new T.Mesh(new T.SphereGeometry(1,64,40),new T.MeshStandardMaterial({map,roughness:.67,emissive:'#14878a',emissiveIntensity:.1}));root.add(body);
 const rig=new AnimatedAtlasRig(data,textures);root.add(rig);
 let yaw=0,shadow=false,rolling=false,auto=false,lastAuto=0;
 for(const [name,pose] of Object.entries(data.poses))button(pose.label,()=>{auto=false;rig.combo.phase='IDLE';rig.play(name);});
 const controls=document.createElement('div');controls.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px';panel.appendChild(controls);
 button('Комбо → 3 круга',()=>{auto=false;rig.playCombo();},controls);button('Моргание',()=>rig.forcedBlink=!rig.forcedBlink,controls);
 button('Спереди / ¾',()=>yaw=yaw===0?.55:0,controls);button('Свет / тень',()=>{shadow=!shadow;hemi.intensity=shadow?.3:2;sun.position.z=shadow?-8:8;},controls);
 button('Качение',()=>rolling=!rolling,controls);button('Автопросмотр',()=>{auto=!auto;lastAuto=rig.time-10;},controls);
 const select=document.createElement('select');select.style.cssText='margin:12px 0;width:100%;padding:9px';select.setAttribute('aria-label','Базовый характер');for(const [value,text] of [['sly','База: хитрый'],['grumpy','База: хмурый'],['happy','База: довольный']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);}select.onchange=()=>rig.base=select.value;panel.appendChild(select);
 const gaze=document.createElement('select');gaze.setAttribute('aria-label','Направление взгляда');gaze.style.cssText='width:100%;padding:8px;margin-bottom:8px';for(const [value,text] of [['auto','Малые зрачки: взгляд меняется'],['center','Малые зрачки: прямо'],['left','Малые зрачки: влево'],['right','Малые зрачки: вправо']]){const o=document.createElement('option');o.value=value;o.textContent=text;gaze.appendChild(o);}gaze.onchange=()=>rig.gaze=gaze.value as typeof rig.gaze;panel.appendChild(gaze);
 const status=document.createElement('div');status.style.cssText='font-size:14px;line-height:1.6;min-height:80px;font-variant-numeric:tabular-nums';panel.appendChild(status);
 const links=document.createElement('div');links.innerHTML='<a href="./assets/face/animated/atlas.json" download style="color:#b4eee2">Скачать JSON атласа и таймингов</a><br><a href="./assets/face/animated/expressions-nine.webp" download style="color:#b4eee2">Страница новых деталей WebP</a>';links.style.cssText='line-height:1.8;font-size:13px;margin-top:10px';panel.appendChild(links);
 const note=document.createElement('p');note.textContent='Проверка анимаций на сфере. Новые события и остановка игрока ещё не подключены к основной игре.';note.style.cssText='font-size:12px;line-height:1.4;color:#c3dcda';panel.appendChild(note);
 const caption=document.createElement('div');caption.style.cssText='position:absolute;left:25px;bottom:24px;color:#22484b;font-size:16px';hud.appendChild(caption);
 function resize(){const f=fit16by9(innerWidth,innerHeight);stage.style.width=f.width+'px';stage.style.height=f.height+'px';hud.style.transform=`scale(${f.scale})`;renderer.setSize(f.width,f.height,false);}addEventListener('resize',resize);resize();
 let last=performance.now(),index=0;const names=Object.keys(data.poses);
 function frame(now:number){const dt=Math.min(.1,(now-last)/1000);last=now;rig.update(dt);root.rotation.y=yaw;const rock=rig.combo.stop?1:rig.combo.phase==='RECOVER'?1-Math.min(1,(rig.combo.elapsed-rig.combo.orbit-rig.combo.dizzy)/rig.combo.recover):0;root.rotation.z=Math.sin(rig.time*9)*.045*rock;
 if(rolling&&!rig.combo.stop&&rig.expression!=='knockout')body.rotation.x+=dt*.8;
 if(auto&&rig.clock.phase==='IDLE'&&rig.time-lastAuto>1){rig.play(names[index++%names.length]);lastAuto=rig.time;}
 const phase=rig.combo.phase==='IDLE'?rig.clock.phase:rig.combo.phase;status.textContent=`${data.poses[rig.expression].label} · ${phase}\nУдержание: ${data.clips[rig.target].hold.toFixed(1)} с${rig.expression==='knockout'?' · рот временный':''}\n${rig.combo.stop?'Шар остановлен и качается':'База: '+data.poses[rig.base].label}`;status.style.whiteSpace='pre-line';caption.textContent=rig.combo.phase==='ORBIT'?'Срыв лица: 3 оборота со следом':rig.combo.stop?'Головокружение: остановка и покачивание':data.poses[rig.expression].label;renderer.render(scene,camera);requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
 Object.defineProperty(window,'__FACE_ANIMATIONS__',{get:()=>({poses:names,expression:rig.expression,phase:rig.clock.phase,weight:rig.clock.weight,comboPhase:rig.combo.phase,comboAngle:rig.combo.angle,turns:rig.combo.turns,stopped:rig.combo.stop,blink:rig.blink,visibleEyes:Object.values(rig.poses).filter(g=>g.visible).flatMap(g=>g.children.filter(o=>o.name.startsWith('study-eye-')).map(o=>o.visible)),bodyRotation:body.rotation.x,base:rig.base,gaze:rig.gaze})});
}
