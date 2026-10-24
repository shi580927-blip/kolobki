import * as T from "three";
import {fit16by9} from "./core/terrain";
import {randomFrom} from "./core/skin";
import {FaceState} from "./face/FaceState";
import {StudyFaceRig,type StudyExpression} from "./face/StudyFaceRig";
/** Read-only acceptance sample, separate from the current game and saved skin. */
export async function startFaceStudy(){
 const texture=await new T.TextureLoader().loadAsync(import.meta.env.BASE_URL+'assets/face/study/three-expressions.webp');
 texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
 const stage=document.querySelector<HTMLElement>('#stage')!,hud=document.querySelector<HTMLElement>('#hud')!;
 hud.innerHTML='<div class="brand">ОБРАЗЕЦ ЛИЦА <small>ТРИ ВЫРАЖЕНИЯ · ХУДОЖЕСТВЕННАЯ ПРОВЕРКА</small></div>';
 const controls=document.createElement('div');controls.style.cssText='position:absolute;right:20px;top:24px;pointer-events:auto;display:flex;gap:8px';hud.appendChild(controls);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;stage.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#c5cece');
 const hemi=new T.HemisphereLight(0xfff9ee,0x42666a,2);scene.add(hemi);
 const sun=new T.DirectionalLight(0xfff4e3,2);sun.position.set(-4,6,8);scene.add(sun);
 const camera=new T.OrthographicCamera(-5.8,5.8,3.2625,-3.2625,.1,30);camera.position.z=14;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d')!;c.fillStyle='#23bfc4';c.fillRect(0,0,1024,512);c.fillStyle='#20a9b1';const r=randomFrom(4321);
 for(let i=0;i<230;i++){const x=r()*1024,y=r()*512,rad=5+r()*10;c.beginPath();c.ellipse(x,y,rad,rad*(.7+r()*.45),r()*3,0,Math.PI*2);c.fill();}
 const bodyTexture=new T.CanvasTexture(canvas);bodyTexture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshStandardMaterial({map:bodyTexture,roughness:.67,emissive:'#14878a',emissiveIntensity:.1});
 const groups:T.Group[]=[],bodies:T.Mesh[]=[],faces:StudyFaceRig[]=[],states:FaceState[]=[];
 const expressions:StudyExpression[]=['sly','happy','grumpy'];
 expressions.forEach((expression,i)=>{
  const root=new T.Group();root.position.set((i-1)*3.6,.45,0);root.scale.setScalar(1.34);scene.add(root);groups.push(root);
  const body=new T.Mesh(new T.SphereGeometry(1,64,40),material);root.add(body);bodies.push(body);
  const face=new StudyFaceRig(texture,expression);root.add(face);faces.push(face);states.push(new FaceState('sly',()=>.8));
  const mini=new T.Group();mini.position.set((i-1)*3.6,-2.05,0);mini.scale.setScalar(.36);scene.add(mini);groups.push(mini);
  const miniBody=new T.Mesh(body.geometry,material);mini.add(miniBody);bodies.push(miniBody);
  const miniFace=new StudyFaceRig(texture,expression);mini.add(miniFace);faces.push(miniFace);states.push(new FaceState('sly',()=>.8));
  const label=document.createElement('div');label.textContent=['Хитрый','Довольный','Нахмуренный'][i];label.style.cssText=`position:absolute;left:${i*397+63}px;top:526px;width:360px;text-align:center;color:#233d41;font-weight:bold`;hud.appendChild(label);
 });
 let angle=0,shadow=false,rolling=false,closed=false;
 function button(label:string,action:()=>void){const b=document.createElement('button');b.textContent=label;b.onclick=action;controls.appendChild(b);}
 button('Спереди / ¾',()=>{angle=angle===0?.55:0;});button('Свет / тень',()=>{shadow=!shadow;hemi.intensity=shadow?.3:2;sun.position.z=shadow?-8:8;});button('Качение',()=>{rolling=!rolling;});button('Моргание',()=>{closed=!closed;});button('Реакция',()=>faces.forEach(f=>f.impact()));
 const note=document.createElement('div');note.textContent='Внизу — уменьшенный образец (~80 px). «Реакция» — тест анимации, не физическое столкновение.';note.style.cssText='position:absolute;left:30px;bottom:14px;color:#233d41;font-size:14px';hud.appendChild(note);
 function resize(){const f=fit16by9(innerWidth,innerHeight);stage.style.width=f.width+'px';stage.style.height=f.height+'px';hud.style.transform=`scale(${f.scale})`;renderer.setSize(f.width,f.height,false);}addEventListener('resize',resize);resize();
 let last=performance.now();function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;groups.forEach(g=>g.rotation.y=angle);bodies.forEach(b=>{if(rolling)b.rotation.x+=dt*.7;});states.forEach((s,i)=>{s.update(dt);faces[i].update(dt,closed?1:s.blink);});renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
 Object.defineProperty(window,'__FACE_STUDY__',{get:()=>({expressions,angle,shadow,rolling,closed,eyes:faces.map(f=>f.eyeParts.map(e=>e.visible))})});
}
