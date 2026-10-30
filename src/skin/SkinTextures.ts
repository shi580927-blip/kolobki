import * as T from 'three';
import {makeTigerField,sphereTexturePoint} from './TigerPattern';
import {makeAnimalField} from './AnimalPatterns';
import {connectedPatterns,motifLayout,type SkinDesign} from './SkinDesign';
const W=1024,H=512;
function canvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}
function texture(c:HTMLCanvasElement,color=false){const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;}
export function makePatternTexture(d:SkinDesign){const c=canvas(),g=c.getContext('2d')!;g.fillStyle=d.base;g.fillRect(0,0,W,H);g.fillStyle=d.accent;g.strokeStyle=d.accent;
 if(d.pattern==='none')return texture(c,true);
 if(d.pattern==='tiger'||d.pattern==='zebra'||d.pattern==='giraffe'||d.pattern==='cow'){const field=d.pattern==='tiger'?makeTigerField(d):makeAnimalField(d),pixels=g.createImageData(W,H),rgb=(color:string)=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),base=rgb(d.base),accent=rgb(d.accent);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let coverage=0;for(const offset of [[.25,.25],[.75,.75]]){const p=sphereTexturePoint((x+offset[0])/W,(y+offset[1])/H);coverage+=field(...p)*.5;}const index=(y*W+x)*4;for(let k=0;k<3;k++)pixels.data[index+k]=Math.round(base[k]*(1-coverage)+accent[k]*coverage);pixels.data[index+3]=255;}g.putImageData(pixels,0,0);return texture(c,true);}

 if(connectedPatterns.has(d.pattern)){
  // Integer repeats close the UV seam. Density means line/fill weight here.
  const cells=Math.max(4,Math.round(12/d.scale)),step=W/cells,weight=.05+d.density*.16;
  if(d.pattern==='checker'){const sy=H/Math.max(2,Math.round(cells/2));for(let y=0;y<H;y+=sy)for(let x=0;x<W;x+=step)if((Math.round(x/step)+Math.round(y/sy))%2===0)g.fillRect(x,y,step+.5,sy+.5);}
  else if(d.pattern==='hex'){const rad=step/Math.sqrt(3),dy=1.5*rad;g.lineWidth=step*weight*.45;for(let row=-1;row<H/dy+1;row++)for(let col=-1;col<=cells;col++){g.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,x=col*step+(row%2)*step/2+Math.cos(a)*rad,y=row*dy+Math.sin(a)*rad;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.stroke();}}
  else {const rows=Math.max(3,Math.round(7/d.scale)),sy=H/rows;g.lineWidth=sy*weight;g.lineJoin='round';for(let row=-1;row<=rows;row++){g.beginPath();for(let x=0;x<=W;x+=2){const t=x/W*cells,y=row*sy+(d.pattern==='waves'?Math.sin(t*Math.PI*2):2/Math.PI*Math.asin(Math.sin(t*Math.PI*2)))*sy*.23;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
  return texture(c,true);
 }
 for(const m of motifLayout(d)){const x=m.u*W,y=m.v*H,r=m.size*H;
  // Repeat clipped motifs across texture boundaries rather than leaving a seam.
  for(const ox of [-W,0,W])for(const oy of [-H,0,H]){g.save();g.translate(x+ox,y+oy);g.scale(1/Math.max(.4,Math.sin(m.v*Math.PI)),1);g.rotate(m.angle);g.lineWidth=r*.19;g.lineCap='round';g.lineJoin='round';g.beginPath();
   switch(d.pattern){
    case 'dots':g.ellipse(0,0,r,r,0,0,Math.PI*2);g.fill();break;
    case 'splats':{const n=7;for(let i=0;i<=60;i++){const a=i/60*Math.PI*2,rr=r*(.82+.20*Math.sin(a*n+m.variant*8)+.10*Math.cos(a*3));const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.closePath();g.fill();if(d.pattern==='splats')for(let j=0;j<3;j++){const a=j*2.2+m.variant*5;g.beginPath();g.arc(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5,r*.13,0,Math.PI*2);g.fill();}break;}
    case 'leopard':g.lineWidth=r*.34;for(let j=0;j<3;j++){g.beginPath();for(let i=0;i<=12;i++){const a=j*2.1+i/12*(1.3+m.variant*.35),rr=r*(.8+.13*Math.sin(a*3+m.variant*7)+.06*Math.sin(a*7));const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.stroke();}break;
    case 'hearts':g.moveTo(0,r);g.bezierCurveTo(-r*1.8,-r*.2,-r*.7,-r*1.5,0,-r*.55);g.bezierCurveTo(r*.7,-r*1.5,r*1.8,-r*.2,0,r);g.fill();break;
    case 'lightning':g.moveTo(r*.1,-r*1.35);g.lineTo(-r*.85,r*.13);g.lineTo(-r*.05,r*.02);g.lineTo(-r*.35,r*1.35);g.lineTo(r*.95,-r*.4);g.lineTo(r*.2,-r*.25);g.lineTo(r*.65,-r*1.35);g.closePath();g.fill();break;
    case 'diamonds':g.moveTo(0,-r);g.lineTo(r*.7,0);g.lineTo(0,r);g.lineTo(-r*.7,0);g.closePath();g.fill();break;
    case 'scribbles':g.moveTo(-r,r*.5);g.bezierCurveTo(-r*1.4,-r*1.2,r*.9,-r*1.4,r*.35,-r*.1);g.bezierCurveTo(-r*.3,r*.8,-r*.8,-r*.1,0,-r*.3);g.bezierCurveTo(r*.8,-r*.6,r*1.4,r*.7,r*.7,r);g.stroke();break;
   }g.restore();
  }
 }return texture(c,true);
}
