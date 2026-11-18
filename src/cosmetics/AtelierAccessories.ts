import * as T from 'three';

export const atelierAccessories={none:'Без украшения',headphones:'Наушники',glasses:'Очки',viking:'Шлем викинга',horns:'Рожки'} as const;
export type AtelierAccessory=keyof typeof atelierAccessories;

/** Author prototypes. No collider, no roll: the whole rig belongs to the face frame. */
export class AtelierAccessories extends T.Group {
 constructor(readonly kind:AtelierAccessory,environment:T.Texture){
  super();this.name='atelier-accessory';
  const material=(color:string,metalness=0,roughness=.32)=>new T.MeshPhysicalMaterial({color,metalness,roughness,envMap:environment,envMapIntensity:.85,clearcoat:.7,clearcoatRoughness:.18});
  const gold=material('#eeb54b',.72,.25),steel=material('#8196af',.8,.33),purple=material('#7138bc',.38,.24),rubber=material('#231d32',0,.72),ivory=material('#e6c99d',.05,.42),red=material('#bd283d',.12,.3);
  const add=(g:T.BufferGeometry,m:T.Material)=>{const mesh=new T.Mesh(g,m);mesh.castShadow=true;this.add(mesh);return mesh;};
  const ball=(x:number,y:number,z:number,r:number,m:T.Material,sx=1,sy=1,sz=1)=>add(new T.SphereGeometry(r,24,16).scale(sx,sy,sz).translate(x,y,z),m);
  const tube=(points:number[][],radius:number,m:T.Material,segments=40)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));return add(new T.TubeGeometry(curve,segments,radius,12,false),m);};
  const ring=(x:number,y:number,z:number,r:number,width:number,m:T.Material,axis:'x'|'y'|'z'='y')=>{const g=new T.TorusGeometry(r,width,12,48);if(axis==='x')g.rotateY(Math.PI/2);if(axis==='y')g.rotateX(Math.PI/2);return add(g.translate(x,y,z),m);};
  const stud=(x:number,y:number,z:number,r=.031)=>ball(x,y,z,r,gold);
  const horn=(sign:number,baseY:number,baseX:number,cream:boolean)=>{
   const curve=new T.CatmullRomCurve3([new T.Vector3(sign*baseX,baseY,0),new T.Vector3(sign*(baseX+.26),baseY+.15,-.02),new T.Vector3(sign*(baseX+.34),baseY+.43,.015),new T.Vector3(sign*(baseX+.20),baseY+.68,.055)]);
   const g=new T.TubeGeometry(curve,40,.16,20,false),p=g.attributes.position;
   for(let i=0;i<p.count;i++){const t=Math.floor(i/21)/40,c=curve.getPointAt(t),v=new T.Vector3().fromBufferAttribute(p,i).sub(c);v.multiplyScalar(Math.pow(1-t,.72)*(.98+.025*Math.sin(t*35)));v.add(c);p.setXYZ(i,v.x,v.y,v.z);}
   g.computeVertexNormals();add(g,cream?ivory:red);
   const tangent=curve.getTangentAt(0),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),tangent);
   for(const [t,r] of [[.015,.167],[.11,.148]] as const){const c=curve.getPointAt(t),rim=new T.TorusGeometry(r,.022,10,40);rim.applyQuaternion(q);rim.translate(c.x,c.y,c.z);add(rim,gold);}
   // Fine, shallow growth rings; tapered curved silhouette stays continuous.
   if(cream)for(let k=1;k<5;k++){const t=k*.13,c=curve.getPointAt(t),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangentAt(t));const groove=new T.TorusGeometry(.16*Math.pow(1-t,.72),.0035,6,32).applyQuaternion(q).translate(c.x,c.y,c.z);add(groove,material('#b39369',0,.65));}
  };
  if(kind==='headphones'){
   const arch=[[-1.02,.10,-.04],[-.98,.73,-.06],[-.62,1.09,-.07],[0,1.22,-.07],[.62,1.09,-.07],[.98,.73,-.06],[1.02,.10,-.04]];
   tube(arch,.105,rubber);tube(arch.map(([x,y,z])=>[x,y+.075,z]),.06,purple);
   for(const sign of [-1,1]){
    tube([[sign*.98,.58,-.02],[sign*1.05,.35,-.02],[sign*1.07,.12,-.02]],.045,gold);
    ball(sign*1.045,.06,-.015,1,purple,.19,.345,.29);
    ring(sign*.995,.06,-.015,.242,.069,rubber,'x');
    add(new T.CylinderGeometry(.267,.267,.075,48).rotateZ(Math.PI/2).translate(sign*1.20,.06,-.015),purple);
    ring(sign*1.245,.06,-.015,.248,.022,gold,'x');
    ring(sign*1.251,.06,-.015,.204,.009,material('#bf82ff',.25,.25),'x');
    // Enamel badge, raised five-point star and a small hinge plate.
    const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.062:.135;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
    const badge=new T.ExtrudeGeometry(shape,{depth:.019,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.007,curveSegments:12});badge.rotateY(sign*Math.PI/2).translate(sign*1.263,.06,-.015);add(badge,gold);
    ball(sign*1.07,.36,.015,.07,gold,1,.7,.55);
    for(let k=-2;k<=2;k++)ball(sign*1.27,-.17+k*.018,.11,.006,rubber);
   }
  }
  if(kind==='viking'){
   // Rounded steel shell, rolled bronze lip, raised seams and individual rivets.
   add(new T.SphereGeometry(1.075,64,28,0,Math.PI*2,0,.80),steel);
   const radius=1.075*Math.sin(.80),height=1.075*Math.cos(.80);
   ring(0,height,0,radius,.052,gold);
   ring(0,height+.065,0,radius*.95,.018,gold);
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;stud(Math.sin(a)*(radius+.025),height+.012,Math.cos(a)*(radius+.025),.026);}
   for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const pts=[];for(let j=0;j<=12;j++){const t=.04+j/12*.73;pts.push([Math.sin(a)*Math.sin(t)*1.085,Math.cos(t)*1.085,Math.cos(a)*Math.sin(t)*1.085]);}tube(pts,.026,gold,24);
   }
   ball(0,1.085,0,.075,gold,1,.45,1);
   horn(-1,.87,.66,true);horn(1,.87,.66,true);
  }
  if(kind==='horns'){
   tube([[-.70,.73,-.02],[-.46,.94,-.06],[0,1.045,-.08],[.46,.94,-.06],[.70,.73,-.02]],.055,rubber);
   horn(-1,.81,.62,false);horn(1,.81,.62,false);
  }
  if(kind==='glasses'){
   const rounded=(x:number,y:number,w:number,h:number,r:number)=>{const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
   const follow=(g:T.BufferGeometry,offset:number)=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sqrt(Math.max(.12,1-x*x-y*y))+offset+p.getZ(i));}g.computeVertexNormals();return g;};
   const lens=material('#282a48',.2,.13);lens.transparent=true;lens.opacity=.76;lens.depthWrite=false;
   for(const sign of [-1,1]){
    const x=sign<0?-.84:.075,shape=rounded(x,-.12,.765,.48,.13),hole=rounded(x+.046,-.074,.673,.388,.10);shape.holes.push(new T.Path(hole.getPoints(36).reverse()));
    const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:4,bevelSize:.018,bevelThickness:.014,curveSegments:16});add(follow(g,.078),rubber);
    add(follow(new T.ShapeGeometry(rounded(x+.049,-.071,.667,.382,.095),24),.083),lens);
    tube([[sign*.83,.24,.59],[sign*.98,.20,.29],[sign*.99,.12,-.27],[sign*.88,.02,-.49]],.029,rubber);
    ball(sign*.85,.205,.622,.034,gold,.6,1,1);
    tube([[sign*.24,.275,.999],[sign*.42,.275,.966],[sign*.53,.265,.90]],.009,gold);
   }
   tube([[-.09,.20,1.09],[0,.235,1.11],[.09,.20,1.09]],.027,gold);
  }
  // Unused materials have no GPU allocation; all instantiated ones are released below.
 }
 dispose(){const mats=new Set<T.Material>();this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});mats.forEach(m=>m.dispose());}
}
