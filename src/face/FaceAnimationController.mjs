/** No SDK or platform dependency. Faces are separate from rolling sphere skin. */
export const CLIPS = Object.freeze({
  blink:{row:0, in:[[0,65],[1,45],[2,35],[3,38],[4,25]], hold:75, out:[[5,32],[6,42],[7,65]]},
  joy:  {row:1, in:[[0,120],[1,65],[2,65],[3,60],[4,60],[5,60],[6,60],[7,70]], hold:550, out:[[6,65],[5,65],[4,65],[3,70],[2,70],[1,70],[0,110]]},
  rage: {row:2, in:[[0,130],[1,65],[2,65],[3,65],[4,65],[5,65],[6,65],[7,65]], hold:950, out:[[6,60],[5,60],[4,65],[3,65],[2,70],[1,70],[0,130]]},
  dizzy:{row:3, in:[[0,125],[1,70],[2,70],[3,70],[4,70],[5,70],[6,70],[7,70]], hold:700, out:[[6,60],[5,60],[4,60],[3,60],[2,60],[1,60],[0,130]]}
});
export class FaceAnimationController {
  constructor({random=Math.random,onChange=()=>{}}={}){
    this.random=random;this.onChange=onChange;
    this.state='idle';this.name='blink';this.col=0;this.step=0;
    this.msLeft=0;this.holdMs=0;this.nextBlinkMs=this.blinkDelay();
    this.onChange(this.pose());
  }
  blinkDelay(){return 1800+Math.round(this.random()*3000);}
  pose(){return{name:this.name,row:CLIPS[this.name].row,col:this.col,state:this.state,atlasX:this.col*256,atlasY:CLIPS[this.name].row*256};}
  play(name,{holdMs}={}){
    if(!(name in CLIPS))throw new Error('Unknown face animation: '+name);
    this.name=name;this.state='in';this.step=0;this.holdMs=holdMs??CLIPS[name].hold;
    [this.col,this.msLeft]=CLIPS[name].in[0];this.onChange(this.pose());
  }
  holdCurrent(extraMs=0){if(this.state==='hold')this.msLeft+=Math.max(0,extraMs);}
  update(deltaMs){
    if(!Number.isFinite(deltaMs)||deltaMs<0)return;
    let remaining=Math.min(deltaMs,5000);
    for(let guard=0;guard<120;guard++){
      if(this.state==='idle'){
        if(remaining<this.nextBlinkMs){this.nextBlinkMs-=remaining;break;}
        remaining-=this.nextBlinkMs;this.play('blink');
      }
      if(remaining<this.msLeft){this.msLeft-=remaining;break;}
      remaining-=this.msLeft;this.advance();
    }
  }
  advance(){
    const clip=CLIPS[this.name];
    if(this.state==='in'){
      if(this.step+1<clip.in.length){this.step++;[this.col,this.msLeft]=clip.in[this.step];}
      else {this.state='hold';this.msLeft=this.holdMs;this.col=clip.in.at(-1)[0];}
    }else if(this.state==='hold'){
      this.state='out';this.step=0;[this.col,this.msLeft]=clip.out[0];
    }else if(this.state==='out'){
      if(this.step+1<clip.out.length){this.step++;[this.col,this.msLeft]=clip.out[this.step];}
      else {this.state='idle';this.name='blink';this.col=0;this.msLeft=0;this.nextBlinkMs=this.blinkDelay();}
    }
    this.onChange(this.pose());
  }
}