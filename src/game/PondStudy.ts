import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {POND,heightAt} from '../core/terrain';

/** A small shallow pond; water is visual and the sloped terrain remains solid. */
export function addPondStudy(scene:T.Scene,world:R.World){
 const water=new T.Mesh(new T.CircleGeometry(POND.radius,48),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v; uniform float time; void main(){float drift=v.y*19.+v.x*3.+time*.28; float ripple=sin(drift+sin(v.x*7.+time*.13)*.35)*.5+.5; float soft=sin(v.y*8.-v.x*2.-time*.17)*.5+.5; vec3 color=mix(vec3(.08,.50,.53),vec3(.30,.76,.72),.30+.13*ripple+.10*soft); float streak=smoothstep(.91,.99,ripple)*smoothstep(.30,.72,soft)*.24; color+=vec3(.65,.78,.70)*streak;gl_FragColor=vec4(color,.80);}`}));
 water.rotation.x=-Math.PI/2;water.position.set(POND.x,POND.water,POND.z);water.name='pond-water';scene.add(water);
 // Broad walkable deck: planks, side beams, rails and posts use a few batches.
 const deckLength=13,deckWidth=4.6,top=POND.water+.23;
 const wood=new T.MeshStandardMaterial({color:0xb98650,roughness:.82});
 world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.11,deckWidth/2).setTranslation(POND.x,top-.11,POND.z).setFriction(.85));
 const dummy=new T.Object3D(),boards=new T.InstancedMesh(new T.BoxGeometry(.49,.22,deckWidth),wood,26);
 for(let i=0;i<26;i++){dummy.position.set(POND.x-6.25+i*.5,top-.11,POND.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();boards.setMatrixAt(i,dummy.matrix);boards.setColorAt(i,new T.Color(i%3===0?'#e0b77b':i%3===1?'#c99a5e':'#d6a76b'));}boards.name='pond-bridge-planks';boards.castShadow=true;boards.receiveShadow=true;scene.add(boards);
 const beamMat=new T.MeshStandardMaterial({color:0x81502e,roughness:.9});
 const rails=new T.InstancedMesh(new T.BoxGeometry(deckLength,.20,.20),beamMat,4);
 for(let side=0;side<2;side++)for(let level=0;level<2;level++){dummy.position.set(POND.x,top+(level?1.12:-.13),POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();rails.setMatrixAt(side*2+level,dummy.matrix);}rails.name='pond-bridge-rails-and-beams';rails.castShadow=true;scene.add(rails);
 const posts=new T.InstancedMesh(new T.BoxGeometry(.20,1.42,.20),beamMat,10);
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){dummy.position.set(POND.x-6+i*3,top+.52,POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();posts.setMatrixAt(side*5+i,dummy.matrix);}posts.name='pond-bridge-posts';posts.castShadow=true;scene.add(posts);
 const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0xc1b698,roughness:1}),7);
 for(let i=0;i<7;i++){const a=.45+i*.55,r=8.1,x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,scale=.6+(i%3)*.25;dummy.position.set(x,heightAt(x,z)+scale*.35,z);dummy.rotation.set(0,a,0);dummy.scale.set(scale,scale*.75,scale*.9);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.name='pond-shore-stones';scene.add(stones);
 return {update:(dt:number)=>{(water.material as T.ShaderMaterial).uniforms.time.value+=dt;}};
}
