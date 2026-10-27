import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {addShoreArt} from './ShoreArt';
import {addShoreCascade} from './ShoreCascade';
import {POND,heightAt,pondRadius} from '../core/terrain';

/** A small shallow pond; water is visual and the sloped terrain remains solid. */
export function addPondStudy(scene:T.Scene,world:R.World){
 const outline=new T.Shape();
 for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,r=pondRadius(a),x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)outline.moveTo(x,y);else outline.lineTo(x,y);}
 const water=new T.Mesh(new T.ShapeGeometry(outline),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 waterWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);waterWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 waterWorld;uniform float time;void main(){
 float phase=waterWorld.x*.65+waterWorld.z*.22-time*.65;
 float slope=.055*cos(phase)+.018*cos(phase*1.7+.9);
 vec3 n=normalize(vec3(-slope*.65,1.,-slope*.22));
 vec3 view=normalize(cameraPosition-waterWorld),light=normalize(vec3(-.45,.85,.26));
 vec3 halfDirection=normalize(view+light);
 float spec=pow(max(0.,dot(n,halfDirection)),48.);
 float fresnel=pow(1.-max(0.,dot(view,n)),3.);
 vec3 color=mix(vec3(.08,.56,.63),vec3(.32,.77,.76),fresnel*.5);
 color+=vec3(.83,.90,.88)*spec*.78;
 gl_FragColor=vec4(color,.82);
 }` }));
 water.rotation.x=-Math.PI/2;water.position.set(POND.x,POND.water,POND.z);water.name='pond-water';scene.add(water);
 // Broad walkable deck: planks, side beams, rails and posts use a few batches.
 const deckLength=13,deckWidth=4.6,top=POND.water+.23;
 const wood=new T.MeshStandardMaterial({color:0xb98650,roughness:.82});
 world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.11,deckWidth/2).setTranslation(POND.x,top-.11,POND.z).setFriction(.85));
 const dummy=new T.Object3D(),boards=new T.InstancedMesh(new T.BoxGeometry(.49,.22,deckWidth),wood,26);
 for(let i=0;i<26;i++){dummy.position.set(POND.x-6.25+i*.5,top-.11,POND.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();boards.setMatrixAt(i,dummy.matrix);boards.setColorAt(i,new T.Color(i%3===0?'#e0b77b':i%3===1?'#c99a5e':'#d6a76b'));}boards.name='pond-bridge-planks';boards.castShadow=true;boards.receiveShadow=true;scene.add(boards);
 // Continuous side guards match the visible rails, with open entrances at both ends.
 for(const side of [-1,1])world.createCollider(R.ColliderDesc.cuboid(deckLength/2,.62,.12).setTranslation(POND.x,top+.60,POND.z+side*(deckWidth/2+.12)).setFriction(.35));
 const beamMat=new T.MeshStandardMaterial({color:0x81502e,roughness:.9});
 const rails=new T.InstancedMesh(new T.BoxGeometry(deckLength,.20,.20),beamMat,4);
 for(let side=0;side<2;side++)for(let level=0;level<2;level++){dummy.position.set(POND.x,top+(level?1.12:-.13),POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();rails.setMatrixAt(side*2+level,dummy.matrix);}rails.name='pond-bridge-rails-and-beams';rails.castShadow=true;scene.add(rails);
 const posts=new T.InstancedMesh(new T.BoxGeometry(.20,1.42,.20),beamMat,10);
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){dummy.position.set(POND.x-6+i*3,top+.52,POND.z+(side?1:-1)*(deckWidth/2+.12));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();posts.setMatrixAt(side*5+i,dummy.matrix);}posts.name='pond-bridge-posts';posts.castShadow=true;scene.add(posts);
 addShoreArt(scene,world);
 const cascade=addShoreCascade(scene,world);
 return {update:(dt:number)=>{(water.material as T.ShaderMaterial).uniforms.time.value+=dt;cascade.update(dt);}};
}
