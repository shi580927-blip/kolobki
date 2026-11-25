import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const atelierAccessories={none:'Без украшения',cap:'Кепка вперёд',roundGlasses:'Круглые очки',goggles:'Стимпанк-очки',catEars:'Кошачьи ушки',headphones:'Наушники',viking:'Шлем викинга',horns:'Светлые рожки',ninja:'Маска ниндзя',knight:'Рыцарский шлем'} as const;
export type AtelierAccessory=keyof typeof atelierAccessories;

/** Author prototypes. No collider, no roll: the whole rig belongs to the face frame. */
export class AtelierAccessories extends T.Group {
 constructor(readonly kind:AtelierAccessory,environment?:T.Texture){
  super();this.name='atelier-accessory';
  const material=(color:string,metalness=0,roughness=.32)=>new T.MeshPhysicalMaterial({color,metalness,roughness,envMap:environment??null,envMapIntensity:.85,clearcoat:.7,clearcoatRoughness:.18});
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
   const arch=[[-1.02,.10,-.04],[-.96,.60,-.06],[-.62,.91,-.07],[0,1.055,-.07],[.62,.91,-.07],[.96,.60,-.06],[1.02,.10,-.04]];
   tube(arch,.075,rubber);tube(arch.map(([x,y,z])=>[x,y+.045,z]),.045,purple);
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
   // An independent, tall helmet dome; only its padded rim follows the head.
   const radius=.76,height=.70,rise=.68;
   const shell=new T.SphereGeometry(1,64,36,0,Math.PI*2,0,Math.PI/2).scale(radius,rise,radius).translate(0,height,0);
   add(shell,steel).name='helmet-shell';
   ring(0,height,0,radius,.052,gold);
   ring(0,height+.065,0,radius*.995,.018,gold);
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;stud(Math.sin(a)*(radius+.025),height+.012,Math.cos(a)*(radius+.025),.026);}
   for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const pts=[];for(let j=0;j<=20;j++){const t=.035+j/20*(Math.PI/2-.035);pts.push([Math.sin(a)*Math.sin(t)*(radius+.012),height+Math.cos(t)*(rise+.01),Math.cos(a)*Math.sin(t)*(radius+.012)]);}tube(pts,.022,gold,40);
   }
   ball(0,height+rise+.008,0,.063,gold,1,.42,1);
   horn(-1,.87,.66,true);horn(1,.87,.66,true);
  }
  if(kind==='horns'){
   tube([[-.70,.73,-.02],[-.46,.94,-.06],[0,1.045,-.08],[.46,.94,-.06],[.70,.73,-.02]],.055,rubber);
   horn(-1,.81,.62,true);horn(1,.81,.62,true);
  }
  const rounded=(x:number,y:number,w:number,h:number,r:number)=>{const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
  const star=(x:number,y:number,z:number,r:number)=>{const shape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();return add(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.007,bevelThickness:.008}).translate(0,0,z),gold);};
  const reflect=(g:T.BufferGeometry,sign:number)=>{if(sign>0)return g;g.scale(-1,1,1);if(g.index){for(let i=0;i<g.index.count;i+=3){const t=g.index.getX(i+1);g.index.setX(i+1,g.index.getX(i+2));g.index.setX(i+2,t);}}else{for(const a of Object.values(g.attributes)){for(let i=0;i<a.count;i+=3)for(let k=0;k<a.itemSize;k++){const t=a.array[(i+1)*a.itemSize+k];a.array[(i+1)*a.itemSize+k]=a.array[(i+2)*a.itemSize+k];a.array[(i+2)*a.itemSize+k]=t;}}}return g;};
  const cloth=material('#653caf',0,.76);cloth.clearcoat=.05;
  if(kind==='cap'){
   const height=.64,radius=.79,rise=.70;
   const crown=new T.SphereGeometry(1,64,36,0,Math.PI*2,0,Math.PI/2).scale(radius,rise,radius).translate(0,height,0);
   add(crown,cloth).name='cap-crown';
   const panel=material('#f3e9df',0,.68);panel.clearcoat=.04;
   add(new T.SphereGeometry(1,28,26,Math.PI/2-.56,1.12,.015,Math.PI/2-.015).scale(radius+.005,rise+.005,radius+.005).translate(0,height,0),panel);
   ring(0,height,0,radius,.025,cloth);
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2,pts=[];for(let j=0;j<=20;j++){const t=.06+j/20*(Math.PI/2-.06);pts.push([-Math.cos(a)*Math.sin(t)*(radius+.011),height+Math.cos(t)*(rise+.011),Math.sin(a)*Math.sin(t)*(radius+.011)]);}tube(pts,.005,material('#b096cb',0,.8),32);}
   ball(0,height+rise+.015,0,.05,cloth,1,.5,1);
   // A regular, symmetric visor with a continuous smooth edge and underside.
   const visor=new T.Shape();visor.moveTo(-.72,.30);visor.bezierCurveTo(-.90,.79,-.68,1.32,0,1.36);visor.bezierCurveTo(.68,1.32,.90,.79,.72,.30);visor.quadraticCurveTo(0,.89,-.72,.30);visor.closePath();
   const g=new T.ExtrudeGeometry(visor,{depth:.042,bevelEnabled:true,bevelSize:.025,bevelThickness:.014,bevelSegments:5,curveSegments:36});g.rotateX(Math.PI/2);
   const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+height-.012-.065*Math.max(0,p.getZ(i)-.45));g.computeVertexNormals();add(g,cloth);
   const trim=[];const outline=visor.getPoints(100);for(const v of outline)trim.push([v.x,height-.012-.065*Math.max(0,v.y-.45)+.003,v.y]);tube(trim,.007,material('#d1b9e6',0,.6),128);
   const badge=star(0,.99,0,.11),bp=badge.geometry.attributes.position;
   for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i);bp.setZ(i,Math.sqrt(Math.max(.01,radius*radius*(1-((y-height)/rise)**2)-x*x))+.014+z);}badge.geometry.computeVertexNormals();
   for(let i=-2;i<=2;i++)ball(i*.075,height+.018,-radius-.005,.013,gold,.6,.7,1);
  }
  if(kind==='roundGlasses'){
   const lens=material('#b4e7f6',.02,.08);lens.transparent=true;lens.opacity=.16;lens.depthWrite=false;lens.clearcoat=1;
   for(const sign of [-1,1]){
    const fit=(g:T.BufferGeometry)=>g.rotateY(sign*.10).translate(sign*.365,.075,1.160);
    add(fit(new T.TorusGeometry(.292,.025,16,80)),gold).name='optical-rim';
    const glass=new T.SphereGeometry(2.5,64,20,0,Math.PI*2,0,Math.asin(.269/2.5)).rotateX(Math.PI/2).translate(0,0,-2.5+.004);
    add(fit(glass),lens);
    tube([[sign*.67,.13,1.135],[sign*.93,.13,.47],[sign*.99,.08,-.19],[sign*.91,-.03,-.38]],.022,gold);
    ball(sign*.67,.125,1.135,.033,rubber,.5,.8,.8);
   }
   tube([[-.073,.14,1.190],[0,.18,1.213],[.073,.14,1.190]],.022,gold);
   for(const sign of [-1,1])ball(sign*.075,.02,1.192,.026,material('#d6c9c3',0,.6),.6,1,.5);
  }
  if(kind==='goggles'){
   const leather=material('#74432b',0,.68);leather.clearcoat=.12;
   ring(0,.65,0,.805,.052,leather);
   const glass=material('#1c87ca',.28,.12);glass.clearcoat=1;glass.transparent=true;glass.opacity=.79;
   for(const sign of [-1,1]){
    // Rigid optical cups keep truly circular rims; the padded mount supplies the fit.
    const fit=(g:T.BufferGeometry)=>g.rotateX(-.65).translate(sign*.31,.87,.72);
    add(fit(new T.TorusGeometry(.237,.058,20,72)),leather);
    add(fit(new T.TorusGeometry(.221,.026,16,72).translate(0,0,.07)),gold).name='optical-rim';
    add(fit(new T.SphereGeometry(2,64,20,0,Math.PI*2,0,Math.asin(.197/2)).rotateX(Math.PI/2).translate(0,0,-2+.08)),glass);
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2,v=new T.Vector3(Math.cos(a)*.244,Math.sin(a)*.244,.10).applyAxisAngle(new T.Vector3(1,0,0),-.65).add(new T.Vector3(sign*.31,.87,.72));stud(v.x,v.y,v.z,.012);}
    tube([[sign*.55,.87,.72],[sign*.65,.72,.56],[sign*.68,.65,.43]],.027,gold);
   }
   tube([[-.095,.90,.79],[0,.93,.82],[.095,.90,.79]],.033,leather);
   const buckle=rounded(-.11,.59,.22,.14,.025);buckle.holes.push(new T.Path(rounded(-.075,.62,.15,.08,.01).getPoints().reverse()));
   add(new T.ExtrudeGeometry(buckle,{depth:.025,bevelEnabled:true,bevelSize:.007,bevelThickness:.005,bevelSegments:3}).rotateY(Math.PI).translate(0,0,-.86),gold);
   for(const sign of [-1,1])for(let i=0;i<3;i++)stud(sign*.73,.65,-.25-i*.07,.013);
  }
  if(kind==='catEars'){
   tube([[-.76,.68,-.04],[-.51,.96,-.035],[0,1.045,-.035],[.51,.96,-.035],[.76,.68,-.04]],.055,purple);
   const inner=material('#e86baf',0,.48);inner.clearcoat=.22;
   for(const sign of [-1,1]){
    const shape=new T.Shape();shape.moveTo(.31,.91);shape.quadraticCurveTo(.48,1.23,.85,1.48);shape.quadraticCurveTo(1.00,1.02,.81,.78);shape.quadraticCurveTo(.51,.80,.31,.91);shape.closePath();
    const ear=new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:5,curveSegments:20});reflect(ear,sign).translate(0,0,-.01);add(ear,purple);
    const inset=new T.Shape();inset.moveTo(.43,.94);inset.quadraticCurveTo(.55,1.19,.82,1.37);inset.quadraticCurveTo(.90,1.04,.75,.87);inset.quadraticCurveTo(.56,.89,.43,.94);inset.closePath();
    const g=new T.ExtrudeGeometry(inset,{depth:.012,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:4,curveSegments:20});reflect(g,sign).translate(0,0,.154);add(g,inner);
   }
  }
  // A real curved front surface, offset beyond the maximum V5 brow relief (.139).
  const faceShell=(shape:T.Shape,depth:number,m:T.Material,name:string)=>{
   let g:T.BufferGeometry=new TessellateModifier(.09,5).modify(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:3,curveSegments:32}));
   const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sqrt(Math.max(.025,(1+depth)**2-x*x-y*y))+p.getZ(i));}
   g.deleteAttribute('normal');g=mergeVertices(g);g.computeVertexNormals();return add(g,m).name=name;
  };
  if(kind==='ninja'){
   const fabric=material('#25283c',0,.86);fabric.clearcoat=.07;
   const panel=new T.Shape();panel.moveTo(-.91,-.09);panel.quadraticCurveTo(-.48,-.24,0,-.19);panel.quadraticCurveTo(.48,-.24,.91,-.09);panel.bezierCurveTo(.89,-.43,.70,-.68,.40,-.73);panel.quadraticCurveTo(0,-.82,-.40,-.73);panel.bezierCurveTo(-.70,-.68,-.89,-.43,-.91,-.09);panel.closePath();
   faceShell(panel,.22,fabric,'ninja-face-wrap');
   const forehead=new T.Shape();forehead.moveTo(-.76,.59);forehead.quadraticCurveTo(0,.64,.76,.59);forehead.lineTo(.69,.74);forehead.quadraticCurveTo(0,.78,-.69,.74);forehead.closePath();faceShell(forehead,.20,fabric,'ninja-headband');
   // Wide cloth band, rear knot and two tapering tails, separate from the eye aperture.
   ring(0,.56,0,.87,.065,fabric);
   ball(.42,.45,-.88,.12,fabric,1.25,.8,.8);
   for(const sign of [-1,1]){
    const tail=new T.Shape();tail.moveTo(.40,.46);tail.quadraticCurveTo(.48+sign*.16,.10,.52+sign*.18,-.02);tail.lineTo(.61+sign*.18,.06);tail.quadraticCurveTo(.57+sign*.14,.27,.47,.47);tail.closePath();
    add(new T.ExtrudeGeometry(tail,{depth:.035,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:3,curveSegments:24}).translate(0,0,-.97),fabric);
   }
   for(const y of [-.40,-.55]){const pts=[-.70,-.35,0,.35,.70].map(x=>[x,y,Math.sqrt(1.22**2-x*x-y*y)+.032]);tube(pts,.007,material('#40465c',0,.9));}
  }
  if(kind==='knight'){
   const armor=material('#9aa9c0',.78,.30),edge=material('#d8dce6',.7,.25);
   add(new T.SphereGeometry(1,64,36,0,Math.PI*2,0,Math.PI/2).scale(.83,.72,.83).translate(0,.65,0),armor).name='knight-crown';
   ring(0,.65,0,.83,.035,edge);ring(0,.65,0,.79,.045,rubber);
   // Raised visor with a broad open eye slot. All metal stays in front of facial relief.
   const visor=new T.Shape();visor.moveTo(-.82,.65);visor.quadraticCurveTo(0,.71,.82,.65);visor.quadraticCurveTo(1.00,.18,.89,-.27);visor.quadraticCurveTo(.78,-.58,.42,-.64);visor.quadraticCurveTo(0,-.72,-.42,-.64);visor.quadraticCurveTo(-.78,-.58,-.89,-.27);visor.quadraticCurveTo(-1.00,.18,-.82,.65);visor.closePath();
   visor.holes.push(new T.Path(rounded(-.79,-.17,1.58,.72,.12).getPoints(40).reverse()));
   for(const x of [-.48,-.24,0,.24,.48])visor.holes.push(new T.Path(rounded(x-.035,-.46,.07,.20,.028).getPoints(16).reverse()));
   faceShell(visor,.24,armor,'knight-visor');
   // Continuous brow plate joins the forward visor to the helmet rim.
   const browPlate=new T.BufferGeometry(),bp:number[]=[],bi:number[]=[];
   for(let j=0;j<=4;j++)for(let i=0;i<=48;i++){
    const x=-.82+i/48*1.64,t=j/4,y=.65+t*.03*(1-(x/.82)**2);
    const back=Math.sqrt(Math.max(.001,.83**2-x*x)),front=Math.sqrt(1.24**2-x*x-y*y)+.02;
    bp.push(x,y,T.MathUtils.lerp(back,front,t));
   }
   for(let j=0;j<4;j++)for(let i=0;i<48;i++){const a=j*49+i,b=a+49;bi.push(a,b,a+1,b,b+1,a+1);}
   browPlate.setAttribute('position',new T.Float32BufferAttribute(bp,3));browPlate.setIndex(bi);browPlate.computeVertexNormals();const plateMetal=armor.clone();plateMetal.side=T.DoubleSide;add(browPlate,plateMetal).name='knight-brow-bridge';

   // The central reinforcing seam follows the actual dome, with no detached ornaments.
   const seam=[];for(let i=0;i<=48;i++){const a=-Math.PI/2+i/48*Math.PI;seam.push([0,.65+.73*Math.cos(a),.84*Math.sin(a)]);}tube(seam,.022,edge,64);

  }
  // Unused materials have no GPU allocation; all instantiated ones are released below.
 }
 dispose(){const mats=new Set<T.Material>();this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});mats.forEach(m=>m.dispose());}
}
