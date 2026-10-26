declare global {
 interface Window {
  __SHAROBESY_BOOT__?: {progress(message:string):void;ready():void;fail(message?:string):void};
 }
}
export function bootProgress(message:string){window.__SHAROBESY_BOOT__?.progress(message);}
let ready=false;
export function bootReady(){if(!ready){ready=true;window.__SHAROBESY_BOOT__?.ready();}}
export function bootFail(message?:string){window.__SHAROBESY_BOOT__?.fail(message);}
