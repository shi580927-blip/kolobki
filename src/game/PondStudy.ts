import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {addPondWater} from './PondWater';
import R from '@dimforge/rapier3d-compat';
import {addShoreArt} from './ShoreArt';
import {addShoreCascade} from './ShoreCascade';
import {POND,heightAt,pondRadius} from '../core/terrain';

/** A small shallow pond; water is visual and the sloped terrain remains solid. */
export function addPondStudy(scene:T.Scene,world:R.World){
 const water=addPondWater(scene);
 // Broad walkable deck: planks, side beams, rails and posts use a few batches.
 const deckLength=13,deckWidth=4.6,top=POND.water+.23;
 const wood=new T.MeshStandardMaterial({color:0xffffff,roughness:.94});
 world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.11,deckWidth/2).setTranslation(POND.x,top-.11,POND.z).setFriction(.85));
 const dummy=new T.Object3D(),boards=new T.InstancedMesh(new RoundedBoxGeometry(.49,.22,deckWidth,1,.035),wood,26);
 for(let i=0;i<26;i++){dummy.position.set(POND.x-6.25+i*.5,top-.11,POND.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();boards.setMatrixAt(i,dummy.matrix);boards.setColorAt(i,new T.Color(i%3===0?'#ac9272':i%3===1?'#93785a':'#a38969'));}boards.name='pond-bridge-planks';boards.castShadow=true;boards.receiveShadow=true;scene.add(boards);
 // Continuous side guards match the visible rails, with open entrances at both ends.
 for(const side of [-1,1])world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.62,.12).setTranslation(POND.x,top+.60,POND.z+side*(deckWidth/2+.12)).setFriction(.35));
 const beamMat=new T.MeshStandardMaterial({color:0x745d46,roughness:.9});
 const rails=new T.InstancedMesh(new RoundedBoxGeometry(deckLength,.20,.20,1,.025),beamMat,4);
 for(let side=0;side<2;side++)for(let level=0;level<2;level++){dummy.position.set(POND.x,top+(level?1.12:-.13),POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();rails.setMatrixAt(side*2+level,dummy.matrix);}rails.name='pond-bridge-rails-and-beams';rails.castShadow=true;scene.add(rails);
 const posts=new T.InstancedMesh(new RoundedBoxGeometry(.20,1.42,.20,1,.025),beamMat,10);
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){dummy.position.set(POND.x-6+i*3,top+.52,POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();posts.setMatrixAt(side*5+i,dummy.matrix);}posts.name='pond-bridge-posts';posts.castShadow=true;scene.add(posts);
 // Recessed end grain caps and small fasteners make the broad deck read as joinery.
 const caps=new T.InstancedMesh(new RoundedBoxGeometry(.27,.07,.27,1,.025),wood,10);
 const bolts=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#665b48',roughness:.8}),20);
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){
  const k=side*5+i,px=POND.x-6+i*3,pz=POND.z+(side?1:-1)*(deckWidth/2+.12);
  dummy.position.set(px,top+1.26,pz);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();caps.setMatrixAt(k,dummy.matrix);caps.setColorAt(k,new T.Color('#ad9270'));
  for(let end=0;end<2;end++){dummy.position.set(px,top+1.12,pz+(end?1:-1)*.108);dummy.scale.set(.033,.033,.014);dummy.updateMatrix();bolts.setMatrixAt(k*2+end,dummy.matrix);}
 }caps.name='pond-bridge-post-caps';bolts.name='pond-bridge-fasteners';caps.castShadow=true;scene.add(caps,bolts);
 addShoreArt(scene,world);
 const cascade=addShoreCascade(scene,world);
 return {update:(dt:number)=>{water.update(dt);cascade.update(dt);}};
}
