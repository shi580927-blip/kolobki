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
  base:[.31,.32,.017,.48,-.77,.21,.014,.027,0,0],
  surprised:[.48,.40,.09,.98,-.98,.11,.14,.008,0,.22],
  happy:[.42,.34,.09,.88,-.48,.37,.145,.092,.30,.30],
  angry:[.29,.46,.018,.39,-.75,.31,.095,-.063,.36,.12],
} as const;

function buildEye(parent:T.Group,side:number) {
  const white=patch(parent,'sclera','#fff8e9');
  const iris=patch(parent,'iris','#8e3623');
  const pupil=patch(parent,'pupil','#1b1217');
  const glint=patch(parent,'catchlight','#ffffff');
  const top=patch(parent,'upper-lid','#aaaaaa'),bottom=patch(parent,'lower-lid','#aaaaaa');
  const brow=patch(parent,'brow','#28232b');
  const cx=side*.335,cy=.057,w=.306,h=.252;
  function relief(x:number,y:number) {
    return .007+.072*Math.max(0,1-((x-cx)/w)**2-((y-cy)/h)**2);
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
        const a=u*2*Math.PI,x=cx-side*.044+offX+r*v*Math.cos(a),y=cy+offY+r*v*Math.sin(a);
        return [x,y,relief(x,y)+offset];
      });
    }
    for(const [lid,edge] of [[top,1],[bottom,-1]] as const) {
      lid.draw((u,v)=>{
        const t=2*u-1,x=cx+w*t,span=h*Math.sqrt(1-t*t);
        const tilt=side*t*(p[1]-p[0])*1.7;
        const aperture=T.MathUtils.lerp(edge===1?p[3]+tilt:p[4],-.10,blink);
        const y=cy+span*T.MathUtils.lerp(T.MathUtils.clamp(aperture,-1,1),edge,v);
        return [x,y,relief(x,y)+.009+.003*Math.sin(v*Math.PI)];
      });
    }
    brow.draw((u,v)=>{
      const a=Math.PI*2*v, taper=.17+.83*Math.pow(Math.sin(Math.PI*u),.48);
      const x=side*(.075+.542*u), mid=T.MathUtils.lerp(p[0],p[1],u)+p[2]*Math.sin(Math.PI*u);
      return [x,mid+.048*taper*Math.cos(a),.062+.032*taper*Math.sin(a)];
    });
  };
}

export class ControlFace extends T.Group {
  private eyes=[buildEye(this,-1),buildEye(this,1)];
  private cavity=patch(this,'mouth-interior','#421420');
  private teeth=patch(this,'tooth-band','#fff3da');
  private tongue=patch(this,'tongue','#d96071');
  private state:number[]=[...poses.base];
  private last='';
  updatePose(dt:number,pose:FacePose,blink:number,_short:boolean,color:string) {
    const target=pose==='happy'||pose==='angry'||pose==='surprised'?poses[pose]:poses.base;
    this.state=this.state.map((value,i)=>T.MathUtils.lerp(value,target[i],1-Math.exp(-12*dt)));
    const key=[...this.state,blink].map(x=>Math.round(x*1500)).join('/')+color;
    if(key===this.last)return;
    this.last=key;
    for(const eye of this.eyes)eye(this.state,blink,color);
    const p=this.state;
    for(const [part,kind] of [[this.cavity,'cavity'],[this.teeth,'teeth'],[this.tongue,'tongue']] as const) {
      part.mesh.visible=kind==='cavity'||p[kind==='teeth'?8:9]>.003;
      if(!part.mesh.visible)continue;
      part.draw((u,v)=>{
        const t=2*u-1,span=p[6]*Math.sqrt(1-t*t);
        const center=-.34+p[7]*t*t;
        if(kind==='teeth')return [t*p[5],center+span*(1-2*p[8]*(1-v)),.019];
        if(kind==='tongue')return [t*p[5]*.78,center-p[6]*Math.sqrt(1-(t*.78)**2)+span*p[9]*v,.018];
        return [t*p[5],center+span*(2*v-1),.010+.004*(2*v-1)**2];
      });
    }
  }
  dispose() {
    this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.dispose();}});
  }
}
