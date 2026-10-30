/** Local synthesized effects. Mobile browsers must resume audio inside a gesture. */
export class ImpactAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted=false;
  private failed=false;
  private tones=0;
  onChange=()=>{};
  constructor() {
    const unlock=(event:Event)=>{
      if(event.target instanceof Element&&event.target.closest('#sound'))return;
      if(!this.muted)void this.unlock();
    };
    // A touch pointerdown alone may not grant activation. Keep release/click
    // listeners, including after background interruption or a failed first try.
    for(const name of ['pointerdown','pointerup','touchend','click','keydown'])
      addEventListener(name,unlock,{capture:true,passive:true});
  }
  get enabled(){return !this.muted&&this.context?.state==='running';}
  snapshot(){return {state:this.context?.state??'locked',muted:this.muted,failed:this.failed,tones:this.tones};}
  async unlock(){
    try{
      if(!this.context||this.context.state==='closed'){
        const Constructor=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if(!Constructor)throw new Error('Audio unavailable');
        this.context=new Constructor();this.master=this.context.createGain();this.master.connect(this.context.destination);
        this.context.onstatechange=()=>this.onChange();
      }
      if(this.master)this.master.gain.value=this.muted?0:1;
      if(this.context.state!=='running')await this.context.resume();
      this.failed=false;this.onChange();return this.enabled;
    }catch{this.failed=true;this.onChange();return false;}
  }
  async toggle(){
    if(this.enabled){this.muted=true;if(this.master)this.master.gain.value=0;this.onChange();return;}
    this.muted=false;if(await this.unlock())this.collect();
  }
  private tone(frequency:number,end:number,duration:number,volume:number,type:OscillatorType='sine',offset=0){
    const c=this.context;if(!this.enabled||!c||!this.master)return;
    const t=c.currentTime+offset,gain=c.createGain(),osc=c.createOscillator();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.connect(gain).connect(this.master);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+duration+.01);this.tones++;
  }
  play(){this.tone(150,45,.2,.18,'triangle');}
  collect(){this.tone(740,740,.15,.075);this.tone(1110,1110,.15,.075,'sine',.075);}
  jump(){this.tone(220,480,.12,.06);}
  dash(){this.tone(180,70,.14,.08,'triangle');}
}
