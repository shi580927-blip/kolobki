import {randomFrom} from '../core/skin';
import type {SkinDesign} from './SkinDesign';
export function makeAnimalField(d:SkinDesign){const r=randomFrom(d.seed^0x718f),phase=r()*6.28;
 if(d.pattern==='cow'){const b=r()*6.28,c=r()*6.28,f=3.8/d.scale;return(x:number,y:number,z:number)=>Math.sin(x*f+phase)*Math.cos(y*f+b)+.7*Math.sin(z*f*1.1+c)+.3*Math.sin((x+y-z)*f*.6)>.95-d.density*.6?1:0;}
 if(d.pattern==='zebra')return(x:number,y:number,z:number)=>Math.abs(Math.sin((x*(3.3+d.density*2)+.32*Math.sin(y*5+z*4+phase)+.13*Math.sin(y*10-z*6))*Math.PI))<Math.min(.9,.52*d.scale+.06*Math.sin(y*7+z*5))?1:0;
 const count=Math.round(36+d.density*45),points=Array.from({length:count},(_,i)=>{const y=1-2*(i+.5)/count,a=i*2.399963+(r()-.5)*.7,z=Math.sqrt(1-y*y);return[Math.cos(a)*z,y,Math.sin(a)*z];});
 return(x:number,y:number,z:number)=>{let closest=-2,next=-2;for(const p of points){const dot=p[0]*x+p[1]*y+p[2]*z;if(dot>closest){next=closest;closest=dot;}else if(dot>next)next=dot;}return closest-next>.010/d.scale?1:0;};
}
