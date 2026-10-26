import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {heightAt} from '../core/terrain';
import {randomFrom} from '../core/skin';
/** Local art sample around the quiet start; the playfield remains open. */
export function valleyGroundColor(x:number,y:number,z:number) {
 const old=new T.Color().setHSL(.27+Math.sin(x*.11)*Math.cos(z*.09)*.035+y*.0009,.30,.50+y*.004,T.SRGBColorSpace);
 const edge=1-T.MathUtils.smoothstep(Math.hypot(x,z-10),24,39);
 const grass=new T.Color('#78a34c').lerp(new T.Color('#a4c565'),.5+.5*Math.sin(x*.14+z*.09));
 const path=1-T.MathUtils.smoothstep(Math.abs(x-3*Math.sin(z*.10)),2,4.2);
 return old.lerp(grass.lerp(new T.Color('#d3b37a'),path*.9),edge);
}
export function addValleyArt(scene:T.Scene,world:R.World) {
 const random=randomFrom(261026),dummy=new T.Object3D(),round=new T.SphereGeometry(1,14,10);
 function instances(name:string,count:number,color:string,geometry:T.BufferGeometry=round){
  const mesh=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color,roughness:.95}),count);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
 }
 function put(mesh:T.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,color?:string){
  dummy.position.set(x,y,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(color)mesh.setColorAt(i,new T.Color(color));
 }
 const spots=[[-16,8],[-19,18],[-14,30],[17,14],[20,29],[10,37]];
 const trunks=instances('valley-art-trunks',spots.length,'#9c7654',new T.CylinderGeometry(.28,.48,1,9));
 const crowns=instances('valley-art-crowns',spots.length*7,'#ffffff');
 spots.forEach(([x,z],i)=>{const y=heightAt(x,z),s=.9+random()*.35;put(trunks,i,x,y+2*s,z,1,4*s,1);world.createCollider(R.ColliderDesc.cylinder(2*s,.48).setTranslation(x,y+2*s,z));
  for(let j=0;j<7;j++){const a=j/6*Math.PI*2,r=j===6?0:1.25*s;put(crowns,i*7+j,x+Math.cos(a)*r,y+(4.1+(j===6?1.15:0))*s,z+Math.sin(a)*r,1.8*s,1.65*s,1.65*s,['#729747','#8eae50','#a3bd61'][j%3]);}
 });
 const shrubsAt=[[-10,6],[10,11],[-13,19],[13,25],[-8,29],[19,6]];
 const shrubs=instances('valley-art-shrubs',shrubsAt.length*4,'#ffffff');
 shrubsAt.forEach(([x,z],i)=>{for(let j=0;j<4;j++){const px=x+(random()-.5)*2,pz=z+(random()-.5)*2,s=.55+random()*.4;put(shrubs,i*4+j,px,heightAt(px,pz)+s*.55,pz,s,s*.8,s,['#668e4f','#7fa653','#9bb666'][j%3]);}});
 const stones=instances('valley-art-small-stones',16,'#ffffff',new T.DodecahedronGeometry(1,2));
 for(let i=0;i<16;i++){const x=(i%2?1:-1)*(8+random()*10),z=1+random()*31,s=.3+random()*.5;put(stones,i,x,heightAt(x,z)+s*.35,z,s,s*.65,s*.8,['#b8b3a0','#a9b0a2','#c9bba5'][i%3]);}
 const flowers=instances('valley-art-petals',350,'#fff2d8'),centers=instances('valley-art-flower-centers',70,'#edbe52'),leaves=instances('valley-art-leaves',140,'#6e9b47');
 for(const mesh of [flowers,centers,leaves])mesh.castShadow=false;
 for(let i=0;i<70;i++){const [cx,cz]=shrubsAt[i%shrubsAt.length],x=cx+(random()-.5)*5,z=cz+(random()-.5)*5,y=heightAt(x,z)+.26,s=.8+random()*.5;put(centers,i,x,y+.025,z,.10*s,.065*s,.10*s);
  for(let j=0;j<5;j++){const a=j/5*Math.PI*2;put(flowers,i*5+j,x+Math.cos(a)*.14*s,y,z+Math.sin(a)*.14*s,.14*s,.055*s,.10*s,i%5===0?'#e0c2df':'#fff2d8');}
  put(leaves,i*2,x-.12,y-.18,z,.24,.055,.10);put(leaves,i*2+1,x+.10,y-.19,z,.10,.055,.24);
 }
 const grass=instances('valley-art-grass',480,'#ffffff',new T.ConeGeometry(1,1,4));grass.castShadow=false;
 for(let i=0;i<480;i++){const [cx,cz]=shrubsAt[i%shrubsAt.length],x=cx+(random()-.5)*7,z=cz+(random()-.5)*7,h=.13+random()*.22;put(grass,i,x,heightAt(x,z)+h*.45,z,.07,h,.045,i%3===0?'#92b54e':'#719a43');}
 const clouds=instances('valley-art-clouds',15,'#fff8ec');clouds.castShadow=false;clouds.receiveShadow=false;
 for(let i=0;i<5;i++)for(let j=0;j<3;j++)put(clouds,i*3+j,-70+i*32+(j-1)*4,28+(i%2)*8+(j===1?2:0),55+(i%3)*12,6,3+j%2,3.5);
}
