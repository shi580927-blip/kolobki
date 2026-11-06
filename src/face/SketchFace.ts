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
  const spiral=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color:0x26121d}));
  spiral.name='stun-spiral';parent.add(spiral);
  const upper=patch(parent,'upper-lid','#cc5552'),lower=patch(parent,'lower-lid','#bb413a');
  const brow=patch(parent,'sculpted-brow','#302436',36,16);
  const eyeOutline=patch(parent,'eye-outline','#191316',72,6);
  const browCaps=[patch(parent,'brow-inner-cap','#302436',12,8),patch(parent,'brow-outer-cap','#302436',12,8)];
  const corner=patch(parent,'smile-dimple','#763036',20,8);
  const furrow=patch(parent,'forehead-fold','#bb3c41',16,6);
  brow.mesh.material.roughness=.82;
  white.mesh.receiveShadow=true;
  const positions=white.mesh.geometry.attributes.position;
  const ambient=new T.BufferAttribute(new Float32Array(positions.count*3).fill(1),3);
  white.mesh.geometry.setAttribute('color',ambient);
  white.mesh.material.vertexColors=true;
  let shadowKey='';
  let lastShape='';
  upper.mesh.receiveShadow=true;
  return (p:Pose,blink:number,color:string,detail:boolean,gaze:number,poseKey:string,stunned:boolean,rage:boolean)=>{
    // The underlying angry eyeball is a circle, not a compressed eye shape.
    // Its upper arc is hidden by the brow; the outer tip of the brow overhangs.
    const eyeOuter=mix(outer,.675,p.tension);
    const bounds=(u:number)=>{
      const shift=side*p.browLift*Math.sin(Math.PI*u)*.90;
      const x=mix(inner,eyeOuter,(1-Math.cos(Math.PI*u))*.5);
      const browU=T.MathUtils.clamp((x-.032)/(.75-.032),0,1);
      const browEdge=cubic(p.browBottom,browU)+side*p.browLift;
      const rounded=.065*Math.sin(Math.PI*u)**.7*T.MathUtils.smoothstep(u,.35,.9);
      const openTop=cubic(p.upper,u)+shift+rounded;
      const originalBottom=cubic(p.lower,u)-rounded;
      // A rounded lower eye follows the end heights and curves smoothly around the globe.
      const eyeCentre=(inner+eyeOuter)*.5;
      const eyeRadius=(eyeOuter-inner)*.5;
      const circleArc=Math.sqrt(Math.max(0,eyeRadius**2-(x-eyeCentre)**2));
      const roundBottom=.035-circleArc;
      const circleWeight=Math.max(p.tension,p.roundOpen);
      const bottom=mix(originalBottom,roundBottom,circleWeight);
      const roundTop=Math.min(.035+circleArc,browEdge-.012);
      const circularTop=mix(.035+circleArc,roundTop,p.tension);
      const top=Math.max(bottom,mix(openTop,circularTop,circleWeight));
      const line=mix(bottom,top,.42);
      return [mix(bottom,line,blink),mix(top,line,blink)];
    };
    // Vertical tangents soften the two corners of the eye opening.
    const xAt=(u:number)=>side*mix(inner,eyeOuter,(1-Math.cos(Math.PI*u))*.5);
    const nextShadowKey=String(detail)+Math.round(p.tension*15);
    if(shadowKey!==nextShadowKey){
      shadowKey=nextShadowKey;
      for(let i=0;i<ambient.count;i++){
        const v=white.mesh.geometry.attributes.uv.getY(i);
        const shade=detail?mix(.21,.40,p.tension)*v**3:0;
        ambient.setXYZ(i,1-shade,1-1.25*shade,1-1.1*shade);
      }
      ambient.needsUpdate=true;
    }
    const shapeKey=poseKey+':'+Math.round(blink*240)+color+detail;
    const changed=shapeKey!==lastShape;
    if(changed)eyeOutline.draw((u,v)=>{
      const a=2*Math.PI*u,t=(1-Math.cos(a))*.5;
      const [lo,hi]=bounds(t),top=Math.sin(a)>=0;
      // Keep the upper eyelash/outline continuous even under a lowered brow.
      const width=top?mix(.018,.010,p.tension):.012;
      const x=xAt(t)+side*(2*t-1)*width*v;
      const y=(top?hi:lo)+Math.sin(a)*width*v;
      return [x,y,eyeRelief(t,top?1:0)+.010-.004*v];
    });
    if(changed)white.draw((u,v)=>{
      const [lo,hi]=bounds(u);
      return [xAt(u),mix(lo,hi,v),eyeRelief(u,v)];
    });
    white.mesh.material.emissive.set(rage?'#ff9c20':'#000000');
    white.mesh.material.emissiveIntensity=rage?.8:0;
    spiral.visible=stunned;
    if(stunned&&changed){
      const points:T.Vector3[]=[];
      for(let i=0;i<=96;i++){
        const t=i/96,angle=t*5.6*Math.PI,radius=.31*t;
        const x=side*(inner+eyeOuter)*.5+radius*Math.cos(angle);
        const fraction=T.MathUtils.clamp((side*x-inner)/(eyeOuter-inner),.001,.999);
        const ex=Math.acos(1-2*fraction)/Math.PI,[lo,hi]=bounds(ex);
        const y=.035+radius*Math.sin(angle);
        const relief=eyeRelief(ex,(y-lo)/Math.max(.00001,hi-lo))+.035;
        points.push(new T.Vector3(x,y,Math.sqrt(Math.max(.001,1-x*x-y*y))+relief));
      }
      const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.014,6,false);
      spiral.geometry.dispose();spiral.geometry=geometry;
    }
    rings.forEach((part,i)=>{
      part.mesh.visible=blink<.985&&!stunned&&!rage;
      part.draw((u,v)=>{
        const angle=u*Math.PI*2,r=[.129,.115,.081,.024][i]*p.irisScale;
        // Keep both irises focused toward the bridge in every expression.
        const focusOffset=side*Math.min(p.irisX,0)*.2;
        const x=side*.25+focusOffset+gaze*.35+(i===3?-.030:0)+r*v*Math.cos(angle);
        const fraction=T.MathUtils.clamp((side*x-inner)/(eyeOuter-inner),0,1);
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
        const y=(isTop?hi:lo)+(isTop?1:-1)*span*s*(isTop?mix(.061,.002,p.tension):.034);
        return [xAt(u),y,mix(eyeRelief(u,isTop?1:0)+.004,.003,s)+.008*Math.sin(s*Math.PI)*span];
      });
    }
    // Loft the drawn upper/lower silhouettes into a bevelled solid with softly rounded ends.
    brow.mesh.castShadow=detail;
    brow.draw((u,v)=>{
      const a=v*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const round=.96+.04*Math.min(1,u/.045,(1-u)/.045);
      const mid=(cubic(p.browTop,u)+cubic(p.browBottom,u))/2+side*p.browLift;
      const height=Math.max(.073,(cubic(p.browTop,u)-cubic(p.browBottom,u))/2);
      const bevel=.018*Math.abs(c)**4*(1-2*u);
      return [side*mix(.032,.75,u+bevel),mid+height*round*Math.sign(c)*Math.abs(c)**.52,
        .079+round*.060*Math.sign(s)*Math.abs(s)**.56];
    });
    browCaps.forEach((cap,index)=>{
      const endpoint=index===0?0:1;
      const mid=(cubic(p.browTop,endpoint)+cubic(p.browBottom,endpoint))/2+side*p.browLift;
      const height=Math.max(.073,(cubic(p.browTop,endpoint)-cubic(p.browBottom,endpoint))/2)*.96;
      cap.mesh.material.roughness=.82;
      cap.draw((u,v)=>{
        const angle=2*Math.PI*u,r=v;
        const c=Math.cos(angle),z=Math.sin(angle);
        const bevel=.018*Math.abs(c)**4*(1-2*endpoint);
        return [side*mix(.032,.75,endpoint+bevel),mid+height*r*Math.sign(c)*Math.abs(c)**.52,
          .079+.96*.060*r*Math.sign(z)*Math.abs(z)**.56];
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
  private scars=Array.from({length:3},(_,i)=>patch(this,'closed-eye-scar-'+i,'#5a1522',20,4));
  closedScarEye=false;
  private lip=patch(this,'lip-rim','#9d373a',48,8);
  private mouth=patch(this,'mouth','#391825',40,12);
  private upperMouthShadow=patch(this,'mouth-upper-shadow','#160810',40,6);
  private teeth=Array.from({length:4},(_,i)=>patch(this,'upper-tooth-'+i,'#fff1df',18,12));
  private tongue=patch(this,'tongue','#e57976');
  private lowerTeeth=Array.from({length:4},(_,i)=>patch(this,'lower-tooth-'+i,'#fff1df',18,12));
  private pose=structuredClone(contours.sly);
  private time=0;
  private recoil=0;
  private settled='';
  private lastMouth='';
  private lastDraw='';
  constructor(env?:T.Texture) {
    super();
    this.scars.forEach(s=>{s.mesh.visible=false;});
    this.traverse(o=>{if(o instanceof T.Mesh){o.material.envMap=env??null;o.material.envMapIntensity=o.name==='sculpted-brow'?.30:.70;}});
    const geom=this.mouth.mesh.geometry, uv=geom.attributes.uv;
    const shades=new Float32Array(uv.count*3);
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=uv.getY(i);
      const shade=.48+.38*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.12*(1-v);
      shades[i*3]=shade;shades[i*3+1]=shade;shades[i*3+2]=shade;
    }
    geom.setAttribute('color',new T.BufferAttribute(shades,3));
    this.mouth.mesh.material.vertexColors=true;
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
    const drawKey=[poseKey,Math.round(blink*240),Math.round(gaze*250),color,detail,this.closedScarEye].join(':');
    if(drawKey===this.lastDraw)return;
    this.lastDraw=drawKey;
    this.eyes.forEach((draw,index)=>draw(p,this.closedScarEye&&index===1?1:blink,color,detail,gaze,poseKey,name==='stunned',name==='rage'));
    this.scars.forEach((scar,index)=>{scar.mesh.visible=this.closedScarEye;if(!scar.mesh.visible)return;scar.draw((u,v)=>{const x=.20+index*.12+u*.17,y=.30-u*.52+(v-.5)*.025;return [x,y,.075];});});
    if(this.lastMouth===poseKey+color)return;
    this.lastMouth=poseKey+color;
    const mouthEdge=(curve:Curve,u:number)=>{
      const centre=cubic(curve,.5),ends=mix(curve[0],curve[3],u);
      const arc=Math.sqrt(Math.max(0,1-(2*u-1)**2));
      const round=ends+(centre-(curve[0]+curve[3])*.5)*arc;
      return mix(cubic(curve,u),round,p.mouthRound);
    };
    const mouthY=(u:number,v:number)=>mix(mouthEdge(p.lipBottom,u),mouthEdge(p.lipTop,u),v);
    this.mouth.draw((u,v)=>[(2*u-1)*p.mouthWidth,mouthY(u,v),.008+.010*(2*v-1)**2]);
    // A thin recessed, curved shadow below the upper edge and upper teeth.
    this.upperMouthShadow.mesh.visible=p.teeth>.006;
    if(this.upperMouthShadow.mesh.visible)this.upperMouthShadow.draw((u,v)=>{
      const t=.10+.80*u,fade=Math.sin(Math.PI*u)**.7;
      const edge=Math.min(.52,p.teeth*.70+.10)*fade;
      return [(2*t-1)*p.mouthWidth,mouthY(t,1-edge*v),.021];
    });
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
        const depth=p.teeth*(edge?.58:.70);
        const y=mouthY(t,1-depth*(1-v)*round);
        const bulge=Math.pow(Math.sin(Math.PI*u)*Math.sin(Math.PI*v),.55);
        return [(2*t-1)*p.mouthWidth,y,.042+.013*bulge];
      });
    });
    this.lowerTeeth.forEach((tooth,index)=>{
      tooth.mesh.visible=p.lowerTeeth>.006;
      if(!tooth.mesh.visible)return;
      tooth.draw((u,v)=>{
        const start=[.19,.34,.50,.66][index],end=[.34,.50,.66,.81][index];
        const t=mix(start,end,.035+.93*u),round=.86+.14*Math.sin(Math.PI*u);
        const depth=p.lowerTeeth*.38*round;
        const y=mouthY(t,depth*v);
        return [(2*t-1)*p.mouthWidth,y,.043+.012*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
      });
    });
    this.tongue.mesh.visible=p.tongue>.006;
    this.tongue.draw((u,v)=>{
      const t=.16+.68*u;
      const dome=Math.sin(u*Math.PI)**.65;
      // Layer inside the cavity, behind both rows of teeth.
      return [(2*t-1)*p.mouthWidth,mouthY(t,p.tongue*dome*(.12+.88*v)),.026+.004*dome*Math.sin(v*Math.PI)];
    });
  }
  dispose(){this.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();o.material.dispose();}});}
}
