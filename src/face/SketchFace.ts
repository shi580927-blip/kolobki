import * as T from 'three';
import {patch} from './ControlFace';
import {contours,cubic,type Pose,type Curve} from './V5Contours';

const mix=T.MathUtils.lerp;
const inner=.045,outer=.815;
function eyeRelief(u:number,v:number) {
  return .013+.107*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.58)*(1-.75*(2*v-1)**2);
}
function eye(parent:T.Group, side:number) {
  const white=patch(parent,'sclera','#fff5f1',36,16);
  const rings=[patch(parent,'iris-edge','#582132'),patch(parent,'iris','#be5334'),patch(parent,'pupil','#201222'),patch(parent,'glint','#ffffff')];
  const upper=patch(parent,'upper-lid','#cc5552'),lower=patch(parent,'lower-lid','#bb413a');
  const brow=patch(parent,'sculpted-brow','#302436',36,16);
  const cheek=patch(parent,'raised-cheek','#bb3c41',24,8);
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
      lid.mesh.material.color.set(color).multiplyScalar(isTop?.78:.92);
      lid.draw((u,v)=>{
        const [lo,hi]=bounds(u),s=isTop?v:1-v;
        const span=Math.sin(Math.PI*u)**.64;
        const y=(isTop?hi:lo)+(isTop?1:-1)*span*s*(isTop?.061:.034);
        return [xAt(u),y,mix(eyeRelief(u,isTop?1:0)+.004,.003,s)+.012*Math.sin(s*Math.PI)*span];
      });
    }
    // Loft the drawn upper/lower silhouettes into a bevelled solid with softly rounded ends.
    brow.mesh.castShadow=detail;
    brow.draw((u,v)=>{
      const a=v*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const round=Math.pow(Math.min(1,u/.055,(1-u)/.065),.34);
      const mid=(cubic(p.browTop,u)+cubic(p.browBottom,u))/2+side*p.browLift;
      const height=(cubic(p.browTop,u)-cubic(p.browBottom,u))/2;
      return [side*mix(.032,.85,u),mid+height*round*Math.sign(c)*Math.abs(c)**.52,
        .079+round*.060*Math.sign(s)*Math.abs(s)**.56];
    });
    cheek.mesh.visible=detail&&p.cheek>.03;
    cheek.mesh.material.color.set(color);
    cheek.draw((u,v)=>{
      const a=u*Math.PI*2,r=v;
      return [side*(p.mouthWidth+.018+.145*r*Math.cos(a)),-.275+.075*r*Math.sin(a),
        -.005+.048*p.cheek*(1-r*r)**2];
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
  private teeth=patch(this,'upper-teeth','#fff2da');
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
    this.lip.mesh.material.color.set(color).multiplyScalar(.78);
    this.lip.draw((u,v)=>{
      const a=2*Math.PI*u,t=(1+Math.cos(a))/2;
      return [(2*t-1)*(p.mouthWidth+.019*v),mouthY(t,Math.sin(a)>=0?1:0)+Math.sin(a)*.027*v,
        .023+.020*Math.sin(Math.PI*v)-.022*v];
    });
    this.teeth.mesh.visible=p.teeth>.006;
    this.teeth.draw((u,v)=>{
      const t=.10+.8*u,depth=p.teeth*(.83+.17*Math.sin(u*Math.PI*4)**2);
      return [(2*t-1)*p.mouthWidth,mouthY(t,1-depth*(1-v)),.029+.019*Math.sin(Math.PI*v)];
    });
    this.tongue.mesh.visible=p.tongue>.006;
    this.tongue.draw((u,v)=>{
      const t=.16+.68*u;
      return [(2*t-1)*p.mouthWidth,mouthY(t,p.tongue*Math.sin(u*Math.PI)*v),.026+.014*Math.sin(v*Math.PI)];
    });
  }
  dispose(){this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.dispose();}});}
}
