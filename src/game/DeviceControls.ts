import {ImpactAudio} from './ImpactAudio';
type FullscreenDocument=Document&{webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>void|Promise<void>};
type FullscreenElement=HTMLElement&{webkitRequestFullscreen?:()=>void|Promise<void>};
export function addDeviceControls(audio:ImpactAudio){
 const panel=document.createElement('div');panel.id='device-tools';
 const sound=document.createElement('button');sound.id='sound';sound.onclick=()=>{void audio.toggle();};
 const updateSound=()=>{sound.textContent=audio.enabled?'Звук: вкл':audio.snapshot().muted?'Звук: выкл':'Включить звук';sound.setAttribute('aria-pressed',String(audio.enabled));};
 audio.onChange=updateSound;updateSound();
 const full=document.createElement('button');full.id='fullscreen';full.textContent='Во весь экран';
 const doc=document as FullscreenDocument,root=document.documentElement as FullscreenElement;
 const isFull=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
 const hint=document.createElement('div');hint.id='device-hint';hint.hidden=true;hint.setAttribute('role','status');
 const message=document.createElement('p'),close=document.createElement('button');close.textContent='Понятно';close.onclick=()=>{hint.hidden=true;};hint.append(message,close);
 const updateFull=()=>{full.textContent=isFull()?'Выйти из экрана':'Во весь экран';full.setAttribute('aria-pressed',String(isFull()));requestAnimationFrame(()=>dispatchEvent(new Event('resize')));};
 document.addEventListener('fullscreenchange',updateFull);document.addEventListener('webkitfullscreenchange',updateFull);
 full.onclick=()=>{
  // Invoke synchronously from click: waiting for audio first loses activation.
  try{
   const operation=isFull()?(doc.exitFullscreen?doc.exitFullscreen():doc.webkitExitFullscreen?.()):root.requestFullscreen?root.requestFullscreen():root.webkitRequestFullscreen?root.webkitRequestFullscreen():null;
   if(operation===null){showHint();return;}
   void Promise.resolve(operation).then(updateFull).catch(showHint);
  }catch{showHint();}
 };
 function showHint(){message.textContent='Браузер не разрешил полный экран. На телефоне попробуйте открыть игру из значка: меню браузера / «Поделиться» → «Добавить на главный экран». Затем запустите игру оттуда и поверните телефон горизонтально.';hint.hidden=false;}
 const hand=document.createElement('button');hand.id='control-hand';
 const hud=document.querySelector<HTMLElement>('#hud')!;
 let right=false;try{right=localStorage.getItem('sharobesy.controls.hand.v1')==='right';}catch{/* Private storage is optional. */}
 const updateHand=()=>{hud.dataset.stickHand=right?'right':'left';hand.textContent=right?'Джойстик: справа':'Джойстик: слева';hand.setAttribute('aria-pressed',String(right));};
 hand.onclick=()=>{dispatchEvent(new Event('sharobesy-controls-change'));right=!right;try{localStorage.setItem('sharobesy.controls.hand.v1',right?'right':'left');}catch{/* Keep the current session preference. */}updateHand();};
 updateHand();panel.append(sound,full,hand);hud.append(panel,hint);
}
