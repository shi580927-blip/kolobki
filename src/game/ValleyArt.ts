import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {makeLeafGeometry} from './BerryArt';
import {heightAt,WORLD_SIZE} from '../core/terrain';
import {clearRoutePosition,nearestRoutePoint,VALLEY_ROUTE} from '../core/valleyRoute';
import {randomFrom} from '../core/skin';

const meadowDark=new T.Color('#489c36'),meadowLight=new T.Color('#8ac84d'),sunGrass=new T.Color('#b3d36a'),soil=new T.Color('#d6a96a');
/** Continuous world-space colour fields keep the broad slopes from reading as a flat sheet. */
export function valleyGroundColor(x:number,y:number,z:number){
 const patch=.5+.25*Math.sin(x*.075+Math.sin(z*.09)*1.3)+.25*Math.sin(z*.13-x*.035);
 const grass=meadowDark.clone().lerp(meadowLight,Math.max(0,Math.min(1,patch))).lerp(sunGrass,Math.max(0,Math.min(.23,(y+2)*.016)));
 const distance=nearestRoutePoint(x,z).distance,edge=4.5+.35*Math.sin(x*.9+z*.5)+.2*Math.sin(z*1.3);
 const path=1-T.MathUtils.smoothstep(distance,edge-.6,edge+1);
 return grass.lerp(soil,path*.96);
}

/** Seeded composition follows the whole playable loop, with space around every solid prop. */
export function valleyArtLayout(){
 const random=randomFrom(291026),trees:{x:number;z:number;scale:number;kind:number}[]=[],patches:{x:number;z:number}[]=[];
 for(let i=0;i<VALLEY_ROUTE.length;i++){
  const a=VALLEY_ROUTE[(i+VALLEY_ROUTE.length-1)%VALLEY_ROUTE.length],b=VALLEY_ROUTE[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  for(const t of [.22,.55,.86])for(const side of [-1,1]){
   const offset=side*(12+random()*6),point=clearRoutePosition(a.x+dx*t+nx*offset,a.z+dz*t+nz*offset,4.2);
   if(!trees.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<4))trees.push({...point,scale:.8+random()*.5,kind:i%3});
  }
  for(let d=5;d<l;d+=12)for(const side of [-1,1])patches.push({x:a.x+dx*d/l+nx*side*(8+random()*2.8),z:a.z+dz*d/l+nz*side*(8+random()*2.8)});
 }
 for(let i=0;i<24;i++){
  const a=i/24*Math.PI*2+(random()-.5)*.2,r=76+random()*24,point=clearRoutePosition(Math.cos(a)*r,Math.sin(a)*r,4.2);
  if(!trees.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<5))trees.push({...point,scale:1+random()*.5,kind:i%3});
 }
 const flowers:{x:number;z:number;height:number;size:number;kind:number}[]=[],grass:{x:number;z:number;height:number;angle:number}[]=[],rocks:{x:number;z:number;radius:number}[]=[],pebbles:{x:number;z:number;size:number}[]=[];
 for(let i=0;i<480;i++){
  const p=patches[i%patches.length],a=random()*Math.PI*2,r=Math.sqrt(random())*2.7,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
  if(nearestRoutePoint(x,z).distance<6.5)continue;
  flowers.push({x,z,height:.26+random()*.42,size:.7+random()*.7,kind:Math.floor(random()*10)});
 }
 for(let i=0;i<2800;i++){
  const p=patches[i%patches.length],x=p.x+(random()-.5)*8,z=p.z+(random()-.5)*8;if(nearestRoutePoint(x,z).distance<6.2)continue;
  grass.push({x,z,height:.16+random()*.35,angle:random()*Math.PI*2});
 }
 for(let i=0;i<16;i++){
  const p=patches[(i*7+3)%patches.length],radius=1+random()*1.5,point=clearRoutePosition(p.x+(random()-.5)*8,p.z+(random()-.5)*8,radius+4);
  if(Math.hypot(point.x,point.z)>24)rocks.push({...point,radius});
 }
 for(let i=0;i<480;i++){
  const p=patches[i%patches.length],q=nearestRoutePoint(p.x,p.z),d=q.distance||1,r=3.5+random()*1.7,x=q.x+(p.x-q.x)/d*r+(random()-.5)*1.4,z=q.z+(p.z-q.z)/d*r+(random()-.5)*1.4;
  if(nearestRoutePoint(x,z).distance>2.8)pebbles.push({x,z,size:.08+random()*.13});
 }
 return {trees,patches,flowers,grass,rocks,pebbles};
}
function canopyGeometry(){
 const g=new T.SphereGeometry(1,11,8),p=g.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=1+.045*Math.sin(x*7+z*4)*Math.sin(y*5);
  p.setXYZ(i,x*s,y*(1+.025*Math.cos(z*8)),z*s);
  const c=new T.Color('#4e8f2e').lerp(new T.Color('#c4dc64'),Math.max(0,Math.min(1,(y+1)*.5)));
  colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function valleyRockGeometry(){
 const g=new T.IcosahedronGeometry(1,1),p=g.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=1+.1*Math.sin(x*6+z*3)*Math.cos(y*7);
  p.setXYZ(i,x*s,y*.88,z*(1+.06*Math.cos(x*7)));
  const c=new T.Color('#7e8584').lerp(new T.Color('#d6c394'),Math.max(0,Math.min(1,(y+1)*.5))).multiplyScalar(.93+.07*Math.sin(y*21));colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function addValleyArt(scene:T.Scene,world:R.World){
 const layout=valleyArtLayout(),random=randomFrom(31729),dummy=new T.Object3D();
 const material=(color:string,vertexColors=false)=>new T.MeshStandardMaterial({color,vertexColors,roughness:.86});
 const make=(name:string,count:number,geometry:T.BufferGeometry,mat:T.Material,shadow=false)=>{const mesh=new T.InstancedMesh(geometry,mat,count);mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
 const put=(mesh:T.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,color?:string,angle=random()*Math.PI*2)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(color)mesh.setColorAt(i,new T.Color(color));};
 // Segmented trunks curve visibly; every tree shares the same small set of batches.
 const trunkGeometry=new T.CylinderGeometry(.26,.55,1,8,8),tp=trunkGeometry.getAttribute('position');
 for(let i=0;i<tp.count;i++){const t=tp.getY(i)+.5;tp.setX(i,tp.getX(i)+.42*t*t-.08*Math.sin(t*Math.PI));tp.setZ(i,tp.getZ(i)+.10*Math.sin(t*Math.PI));}trunkGeometry.computeVertexNormals();
 const trunks=make('valley-art-trunks',layout.trees.length,trunkGeometry,material('#98704a'),true),branches=make('valley-art-branches',layout.trees.length*6,new T.CylinderGeometry(.045,.13,1,6),material('#98704a'),true),crowns=make('valley-art-crowns',layout.trees.length*6,canopyGeometry(),material('#ffffff',true),true);
 const treeLeaves=make('valley-art-tree-leaves',layout.trees.length*12,makeLeafGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.8,side:T.DoubleSide}));
 const up=new T.Vector3(0,1,0),leafAxis=new T.Vector3(0,0,1),branchDirection=new T.Vector3();
 layout.trees.forEach((p,i)=>{
  const y=heightAt(p.x,p.z),s=p.scale,h=3.6*s,yaw=i*2.39996+p.kind*.7;
  put(trunks,i,p.x,y+h/2,p.z,s,h,s,undefined,yaw);
  const colliderHeight=3.4*s;world.createCollider(R.ColliderDesc.cylinder(colliderHeight/2,.54*s).setTranslation(p.x,y+colliderHeight/2,p.z));
  // Four irregular forks and two fine twigs, with varied radial direction and height.
  for(let j=0;j<6;j++){
   const a=yaw+j*2.39996,twig=j>=4,reach=(twig?1.15:2.0+(j%2)*.35)*s,rise=(twig?.60:.8+(j%3)*.14)*s;
   const baseX=p.x+Math.cos(yaw)*.30*s+(twig?Math.cos(a)*1.35*s:0),baseZ=p.z-Math.sin(yaw)*.30*s+(twig?Math.sin(a)*1.35*s:0);
   const baseY=y+(twig?2.9:2.05+(j%3)*.18)*s;
   branchDirection.set(Math.cos(a)*reach,rise,Math.sin(a)*reach);
   dummy.position.set(baseX+branchDirection.x*.5,baseY+rise*.5,baseZ+branchDirection.z*.5);
   dummy.quaternion.setFromUnitVectors(up,branchDirection.clone().normalize());dummy.scale.set(twig?.55*s:s,branchDirection.length(),twig?.55*s:s);dummy.updateMatrix();branches.setMatrixAt(i*6+j,dummy.matrix);
  }
  // Individual leaves below and beyond the canopy silhouette, not hidden inside it.
  for(let j=0;j<12;j++){
   const a=yaw+j*Math.PI*2/12,rad=(1.5+(j%3)*.28)*s;
   dummy.position.set(p.x+Math.cos(a)*rad,y+(2.85+(j%3)*.16)*s,p.z+Math.sin(a)*rad);
   branchDirection.set(Math.cos(a),.16+((j%2)*.18),Math.sin(a)).normalize();
   dummy.quaternion.setFromUnitVectors(leafAxis,branchDirection);dummy.scale.setScalar((.85+(j%3)*.12)*s);dummy.updateMatrix();treeLeaves.setMatrixAt(i*12+j,dummy.matrix);
  }
  const tint=['#f2f9b5','#d0ec9b','#c7e7a3'][p.kind];
  for(let j=0;j<6;j++){
   const a=j*2.39996+yaw,r=j===0?0:(1.12+(j%2)*.2)*s,yOffset=j===0?5.85:4.75+(j%3)*.52;
   put(crowns,i*6+j,p.x+Math.cos(a)*r+Math.cos(yaw)*.25*s,y+yOffset*s,p.z+Math.sin(a)*r-Math.sin(yaw)*.25*s,(j===0?2.0:1.65+(j%2)*.2)*s,(p.kind===1?1.9:1.4+(j%2)*.2)*s,(j===0?2.0:1.65)*s,tint);
  }
 });
 const rockGeometry=valleyRockGeometry(),stones=make('valley-art-rock-gardens',layout.rocks.length,rockGeometry,material('#ffffff',true),true);
 layout.rocks.forEach((p,i)=>{const y=heightAt(p.x,p.z)+p.radius*.56;put(stones,i,p.x,y,p.z,p.radius,p.radius,p.radius);world.createCollider(R.ColliderDesc.ball(p.radius).setTranslation(p.x,y,p.z));});
 // Distant silhouettes sit entirely outside the physical field, never in the driving area.
 const far=make('valley-art-distant-outcrops',9,rockGeometry,material('#c7c6af',true));far.castShadow=far.receiveShadow=false;
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.15,r=WORLD_SIZE/2+36;put(far,i,Math.cos(a)*r,-9,Math.sin(a)*r,15+random()*6,19+random()*14,15+random()*6);}
 const petalGeo=new T.SphereGeometry(1,7,5),budGeo=new T.SphereGeometry(1,7,4),leafGeo=new T.SphereGeometry(1,6,4),flowerCount=layout.flowers.length;
 const petals=make('valley-art-petals',flowerCount*5,petalGeo,material('#ffffff')),centers=make('valley-art-flower-centers',flowerCount,budGeo,material('#f2b62f')),stems=make('valley-art-flower-stems',flowerCount,new T.CylinderGeometry(1,1,1,5),material('#578c33')),leaves=make('valley-art-flower-leaves',flowerCount*2,leafGeo,material('#75a53d'));
 layout.flowers.forEach((p,i)=>{
  const soil=heightAt(p.x,p.z),y=soil+p.height,s=p.size,color=p.kind<5?'#fff6d5':p.kind<7?'#ed83ba':p.kind<9?'#a59be8':'#f6da4e';
  put(stems,i,p.x,soil+p.height/2,p.z,.022,p.height,.022);put(centers,i,p.x,y+.025,p.z,.105*s,.07*s,.105*s);
  for(let j=0;j<5;j++){const a=j/5*Math.PI*2;put(petals,i*5+j,p.x+Math.sin(a)*.155*s,y,p.z+Math.cos(a)*.155*s,.105*s,.045*s,.18*s,color,a);}
  for(let j=0;j<2;j++)put(leaves,i*2+j,p.x+(j?-.1:.1),soil+p.height*.35,p.z,.18*s,.025,.07*s);
 });
 const pebbles=make('valley-art-path-pebbles',layout.pebbles.length,new T.IcosahedronGeometry(1,0),material('#ffffff'));
 layout.pebbles.forEach((p,i)=>put(pebbles,i,p.x,heightAt(p.x,p.z)+p.size*.22,p.z,p.size,p.size*.42,p.size*.8,['#ddc797','#b5ad87','#e9d4a7'][i%3]));
 const bushLeaves=make('valley-art-leaf-shrubs',layout.patches.length*9,makeLeafGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.72,side:T.DoubleSide}));
 const axis=new T.Vector3(0,0,1);
 layout.patches.forEach((p,i)=>{for(let j=0;j<9;j++){
  const a=j*2.39996,s=.55+random()*.45;dummy.position.set(p.x,heightAt(p.x,p.z)+.02,p.z);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),.22+random()*.45,Math.sin(a)).normalize());dummy.scale.set(s,s,s);dummy.updateMatrix();bushLeaves.setMatrixAt(i*9+j,dummy.matrix);
 }});
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 for(let j=0;j<=5;j++){const t=j/5;for(const side of [-1,1]){positions.push(.12*t*t+side*.07*(1-t),t,.15*t*t);const c=new T.Color('#4e932e').lerp(new T.Color('#c4d963'),t);colors.push(c.r,c.g,c.b);}if(j<5){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute(positions,3));blade.setAttribute('color',new T.Float32BufferAttribute(colors,3));blade.setIndex(indices);blade.computeVertexNormals();
 const grass=make('valley-art-curved-grass',layout.grass.length,blade,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9}));
 layout.grass.forEach((p,i)=>put(grass,i,p.x,heightAt(p.x,p.z)+.015,p.z,.85,p.height,.85,undefined,p.angle));
 return {trees:layout.trees.length,flowers:flowerCount,grass:layout.grass.length,rocks:layout.rocks.length,pebbles:layout.pebbles.length};
}
