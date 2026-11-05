import * as T from 'three';
import {patch} from './ControlFace';
import {contours,cubic,type Pose,type Curve} from './V5Contours';

const mix=T.MathUtils.lerp;
const inner=.045,outer=.73;
function eyeRelief(u:number,v:number) {
  return .009+.052*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.58)*(1-.75*(2*v-1)**2);
}
function eye(parent:T.Group, side:number) {
  const white=patch(parent,'sclera','#fff5f1',36,16);
  const rings=[patch(parent,'iris-edge','#321522'),patch(parent,'iris','#70251e'),patch(parent,'pupil','#080609'),patch(parent,'glint','#ffffff')];
  const upper=patch(parent,'upper-lid','#cc5552'),lower=patch(parent,'lower-lid','#bb413a');
  const brow=patch(parent,'sculpted-brow','#302436',36,16);
  const eyeliner=patch(parent,'upper-eyeliner','#121014',36,6);
  const browCaps=[patch(parent,'brow-inner-cap','#302436',12,8),patch(parent,'brow-outer-cap','#302436',12,8)];
  const corner=patch(parent,'smile-dimple','#763036',20,8);
  const furrow=patch(parent,'forehead-fold','#bb3c41',16,6);
  brow.mesh.material.roughness=.82;
  white.mesh.receiveShadow=true;
  const positions=white.mesh.geometry.attributes.position;
  const ambient=new T.BufferAttribute(new Float32Array(positions.count*3).fill(1),3);
  white.mesh.geometry.setAttribute('color',ambient);
  white.mesh.material.vertexColors=true;
  let shaded:boolean|undefined;
  let lastShape='';
  upper.mesh.receiveShadow=true;
  return (p:Pose,blink:number,color:string,detail:boolean,gaze:number,poseKey:string)=>{
    const bounds=(u:number)=>{
      const shift=side*p.browLift*Math.sin(Math.PI*u)*.90;
      const top=cubic(p.upper,u)+shift,bot=cubic(p.lower,u),line=mix(bot,top,.42);
      return [mix(bot,line,blink),mix(top,line,blink)];
    };
    // Vertical tangents soften the two corners of the eye opening.
    const xAt=(u:number)=>side*mix(inner,outer,(1-Math.cos(Math.PI*u))*.5);
    if(shaded!==detail){
      shaded=detail;
      for(let i=0;i<ambient.count;i++){
        const v=white.mesh.geometry.attributes.uv.getY(i);
        const shade=detail?.21*v**4:0;
        ambient.setXYZ(i,1-shade,1-1.25*shade,1-1.1*shade);
      }
      ambient.needsUpdate=true;
    }
    const shapeKey=poseKey+':'+Math.round(blink*240)+color+detail;
    const changed=shapeKey!==lastShape;
    if(changed)eyeliner.draw((u,v)=>{
      const [,hi]=bounds(u);
      const width=.014*Math.sin(Math.PI*u)**.35;
      return [xAt(u),hi+width*(v-.5),eyeRelief(u,1)+.011];
    });
    if(changed)white.draw((u,v)=>{
      const [lo,hi]=bounds(u);
      return [xAt(u),mix(lo,hi,v),eyeRelief(u,v)];
    });
    rings.forEach((part,i)=>{
      part.mesh.visible=blink<.985;
      part.draw((u,v)=>{
        const angle=u*Math.PI*2,r=[.129,.115,.081,.024][i];
        const x=side*.40+(p.irisX<0?side*p.irisX:p.irisX)+gaze+(i===3?-.030:0)+r*v*Math.cos(angle);
        const fraction=T.MathUtils.clamp((side*x-inner)/(outer-inner),0,1);
        const ex=Math.acos(1-2*fraction)/Math.PI;
        const [lo,hi]=bounds(ex);
        const y=T.MathUtils.clamp(p.irisY+(i===3?.046:0)+r*v*Math.sin(angle),lo,hi);
        return [x,y,eyeRelief(ex,(y-lo)/Math.max(.00001,hi-lo))+.004+i*.0025];
      });
    });
    if(!changed)return;
    lastShape=shapeKey;
    for(const [lid,isTop] of [[upper,true],[lower,false]] as const){
      const tone=new T.Color(color);
      const luminance=.2126*tone.r+.7152*tone.g+.0722*tone.b;
      lid.mesh.material.color.copy(tone).multiplyScalar(isTop ? mix(.75,.49,luminance) : mix(.82,.52,luminance));
      lid.draw((u,v)=>{
        const [lo,hi]=bounds(u),s=isTop?v:1-v;
        const span=Math.sin(Math.PI*u)**.64;
        const y=(isTop?hi:lo)+(isTop?1:-1)*span*s*(isTop?.061:.034);
        return [xAt(u),y,mix(eyeRelief(u,isTop?1:0)+.004,.003,s)+.008*Math.sin(s*Math.PI)*span];
      });
    }
    // Loft the drawn upper/lower silhouettes into a bevelled solid with softly rounded ends.
    brow.mesh.castShadow=detail;
    brow.draw((u,v)=>{
      const a=v*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const round=.91+.09*Math.min(1,u/.045,(1-u)/.045);
      const mid=(cubic(p.browTop,u)+cubic(p.browBottom,u))/2+side*p.browLift;
      const height=(cubic(p.browTop,u)-cubic(p.browBottom,u))/2;
      const bevel=.018*Math.abs(c)**4*(1-2*u);
      return [side*mix(.032,.85,u+bevel),mid+height*round*Math.sign(c)*Math.abs(c)**.52,
        .079+round*.060*Math.sign(s)*Math.abs(s)**.56];
    });
    browCaps.forEach((cap,index)=>{
      const endpoint=index===0?0:1;
      const mid=(cubic(p.browTop,endpoint)+cubic(p.browBottom,endpoint))/2+side*p.browLift;
      const height=(cubic(p.browTop,endpoint)-cubic(p.browBottom,endpoint))/2*.91;
      cap.mesh.material.roughness=.82;
      cap.draw((u,v)=>{
        const angle=2*Math.PI*u,r=v;
        const c=Math.cos(angle),z=Math.sin(angle);
        const bevel=.018*Math.abs(c)**4*(1-2*endpoint);
        return [side*mix(.032,.85,endpoint+bevel),mid+height*r*Math.sign(c)*Math.abs(c)**.52,
          .079+.91*.060*r*Math.sign(z)*Math.abs(z)**.56];
      });
    });
    corner.mesh.visible=detail&&p.cheek>.03;
    const tint=new T.Color(color), light=.2126*tint.r+.7152*tint.g+.0722*tint.b;
    corner.mesh.material.color.copy(tint).multiplyScalar(mix(.48,.28,light));
    corner.draw((u,v)=>{
      const a=u*Math.PI*2,r=v;
      const x=side*(p.mouthWidth-.012+.038*r*Math.cos(a));
      const y=cubic(p.lipTop,side<0?.04:.96)+.015*r*Math.sin(a);
      return [x,y,.004+.008*(1-r*r)];
    });
    furrow.mesh.visible=detail&&p.tension>.30;
    furrow.mesh.material.color.set(color);
    furrow.draw((u,v)=>[side*(.029+.068*u+(v-.5)*.036),.10+.16*u,
      -.004+.044*p.tension*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)]);
  };
}

export class SketchFace extends T.Group {
  private eyes=[eye(this,-1),eye(this,1)];
  private lip=patch(this,'lip-rim','#9d373a',48,8);
  private mouth=patch(this,'mouth','#391825',40,12);
  private teeth=Array.from({length:4},(_,i)=>patch(this,'upper-tooth-'+i,'#fff1df',18,12));
  private tongue=patch(this,'tongue','#e57976');
  private pose=structuredClone(contours.sly);
  private time=0;
  private recoil=0;
  private settled='';
  private lastMouth='';
  private lastDraw='';
  constructor(env:T.Texture) {
    super();
    this.traverse(o=>{if(o instanceof T.Mesh){o.material.envMap=env;o.material.envMapIntensity=o.name==='sculpted-brow'?.30:.70;}});
  }
  impact(){this.recoil=1;}
  updatePose(dt:number,name:string,blink:number,_short:boolean,color:string,detail=true){
    this.time+=dt;
    this.recoil=Math.max(0,this.recoil-3*dt);
    this.rotation.z=.11*this.recoil*Math.sin((1-this.recoil)*9);
    const target=contours[name]??contours.sly,p=this.pose,k=1-Math.exp(-16*dt);
    let distance=0;
    if(this.settled!==name)for(const key of Object.keys(target) as (keyof Pose)[]){
      const value=target[key];
      if(typeof value==='number'){
        const scalar=key as Exclude<keyof Pose,'upper'|'lower'|'browTop'|'browBottom'|'lipTop'|'lipBottom'>;
        distance=Math.max(distance,Math.abs(p[scalar]-value));
        p[scalar]=mix(p[scalar],value,k);
      }else{
        const curve=p[key] as Curve;
        value.forEach((n,i)=>{distance=Math.max(distance,Math.abs(n-curve[i]));curve[i]=mix(curve[i],n,k);});
      }
    }
    if(this.settled!==name && distance<.0005){this.pose=structuredClone(target);this.settled=name;}
    else if(distance>=.0005)this.settled='';
    const poseKey=this.settled||String(this.time);
    const gaze=.012*Math.sin(this.time*1.7+Math.sin(this.time*.81));
    const drawKey=[poseKey,Math.round(blink*240),Math.round(gaze*250),color,detail].join(':');
    if(drawKey===this.lastDraw)return;
    this.lastDraw=drawKey;
    for(const draw of this.eyes)draw(p,blink,color,detail,gaze,poseKey);
    if(this.lastMouth===poseKey+color)return;
    this.lastMouth=poseKey+color;
    const mouthY=(u:number,v:number)=>mix(cubic(p.lipBottom,u),cubic(p.lipTop,u),v);
    this.mouth.draw((u,v)=>[(2*u-1)*p.mouthWidth,mouthY(u,v),.014+.009*(2*v-1)**2]);
    this.lip.mesh.material.color.set('#171419');
    this.lip.draw((u,v)=>{
      const a=2*Math.PI*u,t=(1+Math.cos(a))/2;
      return [(2*t-1)*(p.mouthWidth+.008*v),mouthY(t,Math.sin(a)>=0?1:0)+Math.sin(a)*.012*v,
        .023+.020*Math.sin(Math.PI*v)-.022*v];
    });
    this.teeth.forEach((tooth,index)=>{
      tooth.mesh.visible=p.teeth>.006;
      if(!tooth.mesh.visible)return;
      tooth.draw((u,v)=>{
        // The row shares the mouth curve. Four crowns have rounded corners and a convex face.
        const edge=index===0||index===3;
        const start=[.14,.30,.50,.70][index],end=[.30,.50,.70,.86][index];
        const t=mix(start,end,.018+.964*u);
        const round=.84+.16*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.5);
        const depth=p.teeth*(edge?.46:.55);
        const y=mouthY(t,1-depth*(1-v)*round);
        const bulge=Math.pow(Math.sin(Math.PI*u)*Math.sin(Math.PI*v),.55);
        return [(2*t-1)*p.mouthWidth,y,.024+.013*bulge];
      });
    });
    this.tongue.mesh.visible=p.tongue>.006;
    this.tongue.draw((u,v)=>{
      const t=.16+.68*u;
      return [(2*t-1)*p.mouthWidth,mouthY(t,p.tongue*Math.sin(u*Math.PI)*v),.026+.014*Math.sin(v*Math.PI)];
    });
  }
  dispose(){this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.dispose();}});}
}
