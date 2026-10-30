import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {randomFrom} from '../core/skin';

/** Smooth joined lobes, generated once. No volumetric ray marching at runtime. */
export function makeCloudGeometry(seed:number){
 const random=randomFrom(seed),temporary=new T.MeshBasicMaterial(),field=new MarchingCubes(28,temporary,false,false,6000);
 field.isolation=0;
 const lobes=[[-.55,-.02,0,.22],[-.29,.05,0,.30],[.02,.15,-.01,.38],[.32,.04,0,.28],[.55,-.02,0,.20],[-.16,-.02,.17,.27],[.21,-.03,.16,.25]].map(([x,y,z,r])=>[x,y+(random()-.5)*.05,z,r+(random()-.5)*.025]);
 // A smooth union retains distinct puffs instead of adding them into one oval.
 for(let z=0;z<field.size;z++)for(let y=0;y<field.size;y++)for(let x=0;x<field.size;x++){
  const px=x/field.size*2-1,py=y/field.size*2-1,pz=z/field.size*2-1;let distance=10;
  for(const [cx,cy,cz,r] of lobes){const next=Math.hypot(px-cx,py-cy,pz-cz)-r,k=.10,h=Math.max(k-Math.abs(distance-next),0)/k;distance=Math.min(distance,next)-h*h*k*.25;}
  field.field[x+y*field.size+z*field.size2]=-distance*100;
 }
 field.update();
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(field.positionArray.slice(0,field.count*3),3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(field.normalArray.slice(0,field.count*3),3));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();field.geometry.dispose();temporary.dispose();
 return geometry;
}
export function addCloudSky(scene:T.Scene){
 const skyGeometry=new T.SphereGeometry(195,32,16),skyColours=new Float32Array(skyGeometry.attributes.position.count*3),horizon=new T.Color('#b5d8ef'),zenith=new T.Color('#6face2');
 for(let i=0;i<skyGeometry.attributes.position.count;i++){const h=Math.max(0,skyGeometry.attributes.normal.getY(i)),colour=horizon.clone().lerp(zenith,Math.pow(h,.60));skyColours.set([colour.r,colour.g,colour.b],i*3);}
 skyGeometry.setAttribute('color',new T.BufferAttribute(skyColours,3));
 const skyMaterial=new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false});
 const sky=new T.Mesh(skyGeometry,skyMaterial);sky.name='valley-sky-gradient';sky.renderOrder=-100;sky.frustumCulled=false;scene.add(sky);
 const cloudMaterial=new T.ShaderMaterial({vertexShader:`varying vec3 cloudNormal;varying vec3 cloudView;varying float cloudHeight;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);cloudNormal=normalize(normalMatrix*normal);cloudView=-mv.xyz;cloudHeight=position.y;gl_Position=projectionMatrix*mv;}`,fragmentShader:`
 #include <common>
 varying vec3 cloudNormal;varying vec3 cloudView;varying float cloudHeight;
 void main(){
  vec3 n=inverseTransformDirection(normalize(cloudNormal),viewMatrix);
  float light=dot(n,normalize(vec3(-.45,.82,.36)))*.5+.5;
  float crown=smoothstep(-.35,.48,cloudHeight);
  vec3 underside=vec3(.50,.62,.78),cream=vec3(1.,.97,.90);
  vec3 colour=mix(underside,cream,clamp(.12+.32*light+.48*crown,0.,1.));
  float rim=pow(1.-abs(dot(normalize(cloudNormal),normalize(cloudView))),3.);
  colour=mix(colour,vec3(.82,.89,.96),rim*.24);
  float distanceFade=smoothstep(65.,200.,length(cloudView))*.20;
  colour=mix(colour,vec3(.46,.69,.86),distanceFade);
  gl_FragColor=vec4(colour,1.);
  #include <colorspace_fragment>
 }`});
 const geometries=[makeCloudGeometry(201),makeCloudGeometry(802),makeCloudGeometry(1307)],random=randomFrom(261019),clouds:T.Mesh[]=[];
 for(let i=0;i<10;i++){
  const a=i===9?Math.PI/2+.08:i/9*Math.PI*2+.18,r=123+random()*20,cloud=new T.Mesh(geometries[i%3],cloudMaterial);
  cloud.position.set(Math.cos(a)*r,[18,17,28,18,22,18,19,21,18,4.5][i],Math.sin(a)*r);
  cloud.scale.set(12+random()*7,i===9?7:12+random()*5,9+random()*4);cloud.rotation.y=Math.PI/2-a+(random()-.5)*.16;cloud.name='valley-cloud-'+i;cloud.userData.anchor=cloud.position.clone();cloud.userData.phase=random()*Math.PI*2;scene.add(cloud);clouds.push(cloud);
 }
 let time=0;
 return {clouds,update(dt:number,camera:T.Camera){time+=dt;sky.position.copy(camera.position);clouds.forEach(cloud=>{const anchor=cloud.userData.anchor as T.Vector3;cloud.position.x=anchor.x+Math.sin(time*.012+cloud.userData.phase)*1.4;});}};
}
