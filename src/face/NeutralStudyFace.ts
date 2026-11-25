import * as T from 'three';
import {patch} from './ControlFace';

function makeEye(parent:T.Group,side:number) {
  const white=patch(parent,'eye-white','#fff5ed');
  const limbus=patch(parent,'iris-rim','#59303d');
  const iris=patch(parent,'iris','#ab5036');
  const pupil=patch(parent,'pupil','#201321');
  const highlight=patch(parent,'highlight','#fffaf1',20,5);
  const top=patch(parent,'upper-rim','#71303e');
  const bottom=patch(parent,'lower-rim','#af4a50');
  const brow=patch(parent,'brow','#342733',32,14);
  const center=side*.327, width=.305;
  function outline(t:number,blink:number) {
    const arch=Math.sqrt(Math.max(0,1-t*t));
    const line=.015+.026*t*side;
    return [line-.195*arch*(1-blink),line+(.139+.016*side)*arch**.56*(1-blink)];
  }
  function dome(x:number,y:number) {
    return .010+.094*Math.max(0,1-((x-center)/width)**2-((y-.015)/.23)**2);
  }
  brow.draw((u,v)=>{
    const a=2*Math.PI*v;
    const x=side*(.038+.59*u);
    const round=.17+.83*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.23);
    const mid=.181+.040*Math.sin(Math.PI*u)+.054*u+side*.013;
    return [x,mid+.067*round*Math.cos(a),.042+.045*round*Math.sin(a)];
  });
  return (blink:number,color:string)=>{
    const tint=new T.Color(color);
    top.mesh.material.color.copy(tint).multiplyScalar(.47);
    bottom.mesh.material.color.copy(tint).multiplyScalar(.84);
    white.draw((u,v)=>{
      const t=2*u-1,x=center+width*t,[lo,hi]=outline(t,blink),y=T.MathUtils.lerp(lo,hi,v);
      return [x,y,dome(x,y)];
    });
    for(const [rim,upper] of [[top,true],[bottom,false]] as const){
      rim.draw((u,v)=>{
        const t=2*u-1,x=center+width*t,[lo,hi]=outline(t,blink);
        const s=upper?v:1-v,span=Math.sqrt(Math.max(0,1-t*t));
        const edge=upper?hi:lo;
        const y=edge+(upper?1:-1)*s*span*(upper?.046:.025);
        return [x,y,T.MathUtils.lerp(dome(x,edge)+.005,.004,s)+.012*Math.sin(Math.PI*s)*span];
      });
    }
    for(const [layer,r,dx,dy,z] of [[limbus,.121,0,0,.004],[iris,.110,0,0,.006],[pupil,.083,0,.005,.009],[highlight,.024,-.026,.045,.012]] as const){
      layer.mesh.visible=blink<.995;
      layer.draw((u,v)=>{
        const a=2*Math.PI*u,x=center+.039-side*.012+dx+r*v*Math.cos(a);
        const [lo,hi]=outline((x-center)/width,blink);
        const y=T.MathUtils.clamp(.045+dy+r*v*Math.sin(a),lo,hi);
        return [x,y,dome(x,y)+z];
      });
    }
  };
}

export class NeutralStudyFace extends T.Group {
  private eyes=[makeEye(this,-1),makeEye(this,1)];
  private smile=patch(this,'smile','#47202a');
  private lip=patch(this,'lower-lip','#cf6366');
  private last='';
  constructor(environment:T.Texture){
    super();
    // The two curves share their corners. Only the lifted end opens into a dimple.
    for(const [part,isLip] of [[this.smile,false],[this.lip,true]] as const){
      part.draw((u,v)=>{
        const t=2*u-1,span=Math.sin(Math.PI*u)**.58;
        const y=-.345+.048*t*t+.027*t+.017*Math.max(0,t)**4;
        return [.274*t,y+span*(isLip?-.016-.018*v:(2*v-1)*.016),isLip?.009+.011*span*Math.sin(v*Math.PI):.012];
      });
    }
    this.traverse(obj=>{
      if(obj instanceof T.Mesh){
        obj.material.envMap=environment;
        obj.material.envMapIntensity=obj.name==='brow'?.35:.68;
        obj.material.roughness=obj.name==='brow'?.84:.48;
      }
    });
  }
  updatePose(_dt:number,_pose:string,blink:number,_short:boolean,color:string){
    const key=color+Math.round(blink*1000);
    if(key===this.last)return;
    this.last=key;
    for(const eye of this.eyes)eye(blink,color);
    this.lip.mesh.material.color.set(color).lerp(new T.Color('#de7c73'),.28);
  }
  dispose(){
    this.traverse(obj=>{if(obj instanceof T.Mesh){obj.geometry.dispose();obj.material.dispose();}});
  }
}
