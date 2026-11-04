import * as T from 'three';
import type {FacePose} from './ModularFace';

type Vertex = (u:number, v:number) => [number, number, number];

// x and y are frontal coordinates in body radii. Relief is measured above the globe.
function patch(parent:T.Group, name:string, color:string, columns=32, rows=10) {
  const geometry=new T.PlaneGeometry(1,1,columns,rows);
  const material=new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.55});
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;
  mesh.frustumCulled=false;
  parent.add(mesh);
  return {mesh,draw(vertex:Vertex) {
    const position=geometry.attributes.position;
    for(let j=0;j<=rows;j++) for(let i=0;i<=columns;i++) {
      const [x,y,relief]=vertex(i/columns,1-j/rows);
      position.setXYZ(j*(columns+1)+i,x,y,Math.sqrt(Math.max(0,1-x*x-y*y))+relief);
    }
    position.needsUpdate=true;
    geometry.computeVertexNormals();
  }};
}

// brow inner / outer height, arch, upper / lower eye aperture,
// mouth half-width, opening, corner lift, teeth, tongue
const poses={
  // Last channels: brow asymmetry, sideways gaze, gaze height, corner skew, sneer.
  base:[.26,.30,.04,.18,-.78,.255,.016,.037,0,0,.054,.080,.025,.065,0],
  surprised:[.44,.31,.19,.97,-.99,.135,.176,-.005,0,.24,.037,.038,.046,-.022,0],
  happy:[.37,.30,.16,.89,-.32,.43,.178,.112,.34,.56,.048,-.035,.045,.036,0],
  angry:[.16,.40,.046,.01,-.83,.355,.118,-.045,.46,.09,.016,.013,.003,.041,1],
} as const;

function buildEye(parent:T.Group,side:number) {
  const white=patch(parent,'sclera','#fff8e9');
  const iris=patch(parent,'iris','#8e3623');
  const pupil=patch(parent,'pupil','#1b1217');
  const glint=patch(parent,'catchlight','#ffffff');
  const top=patch(parent,'upper-lid','#aaaaaa'),bottom=patch(parent,'lower-lid','#aaaaaa');
  const brow=patch(parent,'brow','#28232b');
  brow.mesh.material.roughness=.83;
  const cx=side*.324,cy=.065,w=.304,h=.275;
  function relief(x:number,y:number) {
    return .004+.061*Math.max(0,1-((x-cx)/w)**2-((y-cy)/h)**2);
  }
  white.draw((u,v)=>{
    const t=2*u-1,x=cx+w*t,y=cy+h*Math.sqrt(1-t*t)*(2*v-1);
    return [x,y,relief(x,y)];
  });
  return (p:number[],blink:number,color:string)=>{
    for(const lid of [top,bottom])lid.mesh.material.color.set(color);
    for(const [layer,r,offX,offY,offset] of [
      [iris,.103,0,0,.002],[pupil,.067,0,0,.0035],[glint,.018,-.026,.036,.005],
    ] as const) {
      layer.mesh.visible=blink<.999;
      layer.draw((u,v)=>{
        const a=u*2*Math.PI,x=cx+p[11]-side*(.024+.035*p[14])+offX+r*v*Math.cos(a),y=cy+p[12]+offY+r*v*Math.sin(a);
        return [x,y,relief(x,y)+offset];
      });
    }
    for(const [lid,edge] of [[top,1],[bottom,-1]] as const) {
      lid.draw((u,v)=>{
        const t=2*u-1,x=cx+w*t,span=h*Math.sqrt(1-t*t);
        const tilt=side*t*(p[1]-p[0])*3.9+side*p[10]*2.5;
        const aperture=T.MathUtils.lerp(edge===1?p[3]+tilt:p[4]+.10*(1-t*t)+side*p[10],-.10,blink);
        const y=cy+span*T.MathUtils.lerp(T.MathUtils.clamp(aperture,-1,1),edge,edge===1?v:1-v);
        return [x,y,relief(x,y)+.009+.004*Math.sin(v*Math.PI)];
      });
    }
    // Ease lid lighting back into the globe at the socket, keeping a rounded free edge.
    for(const lid of [top,bottom]){
      const {position,normal}=lid.mesh.geometry.attributes;
      const n=new T.Vector3(),body=new T.Vector3();
      for(let i=0;i<normal.count;i++){
        body.fromBufferAttribute(position,i).normalize();
        n.fromBufferAttribute(normal,i).lerp(body,lid===bottom?.88:.66).normalize();
        normal.setXYZ(i,n.x,n.y,n.z);
      }
      normal.needsUpdate=true;
    }
    brow.draw((u,v)=>{
      const a=Math.PI*2*v, taper=.17+.83*Math.pow(Math.sin(Math.PI*u),.48);
      const x=side*(.068-.029*p[14]+.56*u), mid=T.MathUtils.lerp(p[0],p[1],u)+p[2]*Math.sin(Math.PI*u)+side*p[10]*(1-u*.65);
      return [x,mid+.071*(1.22-.46*u)*taper*Math.cos(a),.065+.045*taper*Math.sin(a)];
    });
  };
}

export class ControlFace extends T.Group {
  private eyes=[buildEye(this,-1),buildEye(this,1)];
  private cavity=patch(this,'mouth-interior','#421420');
  private teeth=patch(this,'teeth','#fff2db',64);
  private lip=patch(this,'lip-edge','#884356',48,6);
  private tongue=patch(this,'tongue','#d96071');
  private state:number[]=[...poses.base];
  private last='';
  constructor(environment?:T.Texture){
    super();
    this.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      object.material.envMap=environment??null;
      object.material.envMapIntensity=object.name==='brow'?.22:.65;
      if(object.name.endsWith('-lid'))object.material.roughness=.52;
      if(object.name==='sclera'||object.name==='iris')object.material.roughness=.29;
      if(object.name==='brow')object.castShadow=true;
      if(object.name==='upper-lid'||object.name==='sclera')object.receiveShadow=true;
    });
  }
  updatePose(dt:number,pose:FacePose,blink:number,_short:boolean,color:string,boost=false) {
    const target=pose==='happy'||pose==='angry'||pose==='surprised'?poses[pose]:poses.base;
    this.state=this.state.map((value,i)=>T.MathUtils.lerp(value,target[i]+(boost ? (target[i]-poses.base[i])*.23 : 0)+(boost && target===poses.base && [10,11,13].includes(i) ? .045 : 0),1-Math.exp(-12*dt)));
    const key=[...this.state,blink].map(x=>Math.round(x*1500)).join('/')+color;
    if(key===this.last)return;
    this.last=key;
    for(const eye of this.eyes)eye(this.state,blink,color);
    const p=this.state;
    const contour=(t:number)=>{
      const half=p[6]*Math.sqrt(Math.max(0,1-t*t))*(1+.20*t*p[14]);
      const mid=-.35+p[7]*t*t+p[13]*t+.038*p[14]*Math.sin(Math.PI*t);
      return {half,mid};
    };
    this.lip.mesh.material.color.set(color).multiplyScalar(.71);
    this.lip.draw((u,v)=>{
      const a=2*Math.PI*u,t=Math.cos(a),{half,mid}=contour(t);
      const radius=.005+.019*Math.min(1,p[6]*7);
      return [t*(p[5]+radius*v),mid+Math.sign(Math.sin(a))*half+Math.sin(a)*radius*v,.021+.019*Math.sin(Math.PI*v)];
    });
    for(const [part,kind] of [[this.cavity,'cavity'],[this.teeth,'teeth'],[this.tongue,'tongue']] as const) {
      part.mesh.visible=kind==='cavity'||p[kind==='teeth'?8:9]>.003;
      if(!part.mesh.visible)continue;
      part.draw((u,v)=>{
        const t=2*u-1;
        if(kind==='teeth'){
          const x=t*.94,{half,mid}=contour(x);
          const crown=Math.sin(Math.PI*u*6)**2;
          const canine=p[14]*Math.exp(-((Math.abs(t)-.73)**2)/.014);
          return [x*p[5],mid+half*(1-2*p[8]*(.70+.24*crown+.77*canine)*(1-v)),.021+.014*crown*Math.sin(Math.PI*v)];
        }
        if(kind==='tongue'){
          const x=.74*t+.055,{half,mid}=contour(x);
          return [x*p[5],mid-half+half*p[9]*1.48*Math.sqrt(1-t*t)*v,.020+.011*(1-t*t)*Math.sin(Math.PI*v)];
        }
        const {half,mid}=contour(t);
        return [t*p[5],mid+half*(2*v-1),.008+.010*(2*v-1)**2];
      });
    }
  }
  dispose() {
    this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.dispose();}});
  }
}
