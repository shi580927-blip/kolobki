import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {POND,heightAt} from '../core/terrain';

/** A small shallow pond; water is visual and the sloped terrain remains solid. */
export function addPondStudy(scene:T.Scene,world:R.World){
 const water=new T.Mesh(new T.CircleGeometry(POND.radius,48),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v; uniform float time; void main(){float w=sin(v.x*30.+time*1.1)+sin(v.y*24.-time*.8); float glint=smoothstep(1.65,1.95,w)*.13; vec3 color=mix(vec3(.07,.55,.58),vec3(.36,.84,.79),v.y*.3+.35)+glint;gl_FragColor=vec4(color,.79);}`}));
 water.rotation.x=-Math.PI/2;water.position.set(POND.x,POND.water,POND.z);water.name='pond-water';scene.add(water);
 // A low, wide timber deck; no handrails obstruct movement on the shallow edge.
 const deckLength=13,deckWidth=4.6,top=POND.water+.23,wood=new T.MeshStandardMaterial({color:0xb77d43,roughness:.8});
 const deck=new T.Mesh(new T.BoxGeometry(deckLength,.22,deckWidth),wood);deck.position.set(POND.x,top-.11,POND.z);deck.name='pond-bridge';deck.receiveShadow=true;deck.castShadow=true;scene.add(deck);
 world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.11,deckWidth/2).setTranslation(POND.x,top-.11,POND.z).setFriction(.85));
 const lines=new T.InstancedMesh(new T.BoxGeometry(.035,.018,deckWidth-.05),new T.MeshStandardMaterial({color:0x79502e,roughness:1}),25),dummy=new T.Object3D();
 for(let i=0;i<25;i++){dummy.position.set(POND.x-6+i*.5,top+.012,POND.z);dummy.updateMatrix();lines.setMatrixAt(i,dummy.matrix);}lines.name='pond-bridge-plank-seams';scene.add(lines);
 const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0xc1b698,roughness:1}),7);
 for(let i=0;i<7;i++){const a=.45+i*.55,r=8.1,x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,scale=.6+(i%3)*.25;dummy.position.set(x,heightAt(x,z)+scale*.35,z);dummy.rotation.set(0,a,0);dummy.scale.set(scale,scale*.75,scale*.9);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.name='pond-shore-stones';scene.add(stones);
 return {update:(dt:number)=>{(water.material as T.ShaderMaterial).uniforms.time.value+=dt;}};
}
