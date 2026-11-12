import * as T from "three";
import approved from "./approved-layout.json";
import {applyLayout, type FaceLayout} from "./FaceLayout";
export type StudyExpression = "sly" | "happy" | "grumpy";
const crops = {
  sly: { brows: [[30,168,284,184],[320,199,200,160]], eyes: [[17,406,265,220],[306,437,208,214]], mouth: [103,710,360,162] },
  happy: { brows: [[544,167,212,166],[790,165,207,164]], eyes: [[546,408,212,220],[781,408,210,220]], mouth: [588,715,378,148] },
  grumpy: { brows: [[1024,169,248,194],[1275,174,235,190]], eyes: [[1023,429,243,214],[1286,428,235,214]], mouth: [1135,768,276,82] },
};
/** Isolated art study. Parts are separate; no face backing and no persistence. */
export class StudyFaceRig extends T.Group {
  readonly eyeParts: T.Mesh<T.BufferGeometry,T.ShaderMaterial>[] = [];
  readonly lids: T.Mesh[] = [];
  private elapsed = 0;
  private impactTime = 0;
  constructor(texture: T.Texture, readonly expression: StudyExpression) {
    super();
    const pose = crops[expression];
    const eyeY = expression === "happy" ? 0.12 : 0.02;
    for (let i=0;i<2;i++) {
      const x = i===0 ? -0.36 : 0.36;
      const eye=this.part(texture,pose.eyes[i],x,eyeY,0.66,expression==="happy" ? 0.67 : 0.58);
      eye.name="study-eye-"+i; this.eyeParts.push(eye);this.add(eye);
      const brow=this.part(texture,pose.brows[i],x,expression==="happy" ? 0.53 : 0.40,0.72,0.42);
      brow.name="study-brow-"+i;
      // Transparent features draw in semantic order; depth testing still hides the far hemisphere.
      eye.renderOrder=10;brow.renderOrder=30;this.add(brow);
      const points=Array.from({length:21},(_,j)=>{
        const dx=(j/20-0.5)*0.56;
        return this.surface(x+dx,eyeY-0.06-0.035*Math.sin(j/20*Math.PI),0.036);
      });
      const lid=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,0.014,6,false),new T.MeshBasicMaterial({color:0x164846}));
      lid.visible=false;lid.renderOrder=20;this.lids.push(lid);this.add(lid);
    }
    const mouth=this.part(texture,pose.mouth,0,expression==="happy" ? -0.46 : -0.52,expression==="grumpy" ? 0.67 : 0.89,0.40);
    mouth.name="study-mouth";mouth.renderOrder=5;this.add(mouth);
    applyLayout(this, approved.faces[expression] as FaceLayout);
  }
  private surface(x:number,y:number,offset=0.025) {
    return new T.Vector3(x,y,Math.sqrt(Math.max(0.001,1-x*x-y*y))+offset);
  }
  private part(texture:T.Texture,r:number[],x:number,y:number,maxW:number,maxH:number) {
    const ratio=r[3]/r[2],w=Math.min(maxW,maxH/ratio),h=w*ratio;
    const g=new T.PlaneGeometry(w,h,24,20),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {
      const v=this.surface(x+p.getX(i),y+p.getY(i));p.setXYZ(i,v.x,v.y,v.z);
    }
    const material=new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.DoubleSide,
      uniforms:{map:{value:texture},rect:{value:new T.Vector4(r[0]/1536,1-(r[1]+r[3])/1024,r[2]/1536,r[3]/1024)},open:{value:1}},
      vertexShader:'varying vec2 vUv;varying vec2 faceXY;void main(){vUv=uv;faceXY=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D map;uniform vec4 rect;uniform float open;varying vec2 vUv;varying vec2 faceXY;
      void main(){if(length(faceXY)>.99||open<.015||vUv.y>open)discard;vec4 c=texture2D(map,rect.xy+vUv*rect.zw);
      if(c.a<.91)discard;gl_FragColor=vec4(c.rgb,1.);
      #include <colorspace_fragment>
      }`,
    });
    const mesh = new T.Mesh(g,material);
    mesh.userData.layout = {x,y,width:w,height:h,angle:0};
    return mesh;
  }
  impact(){this.impactTime=0.8;}
  update(dt:number,blink:number) {
    this.elapsed+=dt;this.impactTime=Math.max(0,this.impactTime-dt);
    this.rotation.set(0,0,0);
    if(this.impactTime>0){this.rotation.z=Math.sin(this.elapsed*31)*this.impactTime*.3;this.rotation.y=Math.sin(this.elapsed*23)*this.impactTime*.5;}
    this.eyeParts.forEach((e,i)=>{e.visible=blink<.985;e.material.uniforms.open.value=1-blink;this.lids[i].visible=blink>.82;});
  }
}
