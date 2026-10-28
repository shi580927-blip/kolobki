import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {randomFrom} from '../core/skin';

/** Curved pointed leaf, ridged at the midrib, with gently irregular edges. */
export function makeLeafGeometry(n=14,m=6){
 const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let j=0;j<=n;j++)for(let i=0;i<=m;i++){
  const t=j/n,u=i/m*2-1,width=Math.pow(Math.sin(Math.PI*t),.8)*(.29+.025*Math.sin(t*23));
  positions.push(u*width,.12*Math.sin(Math.PI*t)*(1-u*u)+.07*t*t+.025*Math.abs(u)*Math.sin(t*19),t);
  const c=new T.Color(i===m/2?'#96bd47':Math.abs(u)>.9?'#397938':'#5d9d3d');colors.push(c.r,c.g,c.b);uvs.push(i/m,t);
  if(i<m&&j<n){const a=j*(m+1)+i,b=a+m+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export interface BerryPlacement {x:number;z:number;centerY:number;onPlant:boolean}
export function berryPlacement(i:number):BerryPlacement {
 const x=i===0?0:i===1?-4:i===2?4:Math.sin(i*.9)*28,z=i===0?5:i===1?9:i===2?10:5+i*4;
 const onPlant=i%3===1;
 return {x,z,centerY:heightAt(x,z)+(onPlant?.92:.45),onPlant};
}
export class BerryArt {
 readonly leafGeometry=makeLeafGeometry();
 readonly leafMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.65,side:T.DoubleSide});
 readonly fruitMaterial:T.MeshPhysicalMaterial;
 private drupeGeometry=new T.SphereGeometry(1,16,12);
 private stemMaterial=new T.MeshStandardMaterial({color:'#56813a',roughness:.78});
 constructor(environment?:T.Texture){
  this.fruitMaterial=new T.MeshPhysicalMaterial({color:'#df1544',roughness:.23,metalness:0,clearcoat:.8,clearcoatRoughness:.14,transmission:0,thickness:.24,ior:1.36,attenuationColor:new T.Color('#ff3150'),attenuationDistance:.65,envMap:environment,envMapIntensity:.75});
  // A thin flesh glow gives fruit-like translucency without a second scene/refraction pass.
  this.fruitMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float fleshRim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.);
   float fleshBack=0.;
   #if NUM_DIR_LIGHTS > 0
    fleshBack=pow(max(dot(-normal,directionalLights[0].direction),0.),1.5);
   #endif
   outgoingLight+=diffuseColor.rgb*(.035+.10*fleshRim+.18*fleshBack);
   #include <opaque_fragment>`);};
  this.fruitMaterial.customProgramCacheKey=()=> 'raspberry-flesh-v1';
 }
 fruit(seed:number){
  const group=new T.Group(),random=randomFrom(seed),counts=[5,7,3],radii=[.22,.30,.12];
  const drupes=new T.InstancedMesh(this.drupeGeometry,this.fruitMaterial,counts.reduce((a,b)=>a+b,0)),dummy=new T.Object3D();let index=0;
  counts.forEach((count,row)=>{for(let j=0;j<count;j++){
   const a=j/count*Math.PI*2+row*.43,r=.19+random()*.025;
   dummy.position.set(Math.cos(a)*radii[row],.26-row*.26+(random()-.5)*.015,Math.sin(a)*radii[row]);dummy.scale.set(r,r*.94,r);dummy.updateMatrix();drupes.setMatrixAt(index,dummy.matrix);
   drupes.setColorAt(index,new T.Color().setHSL(.965+random()*.02,.91,.47+random()*.09));index++;
  }});
  drupes.name='raspberry-flesh';drupes.castShadow=true;drupes.receiveShadow=true;group.add(drupes);
  const calyx=new T.InstancedMesh(this.leafGeometry,this.leafMaterial,5);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;dummy.position.set(0,.39,0);dummy.rotation.set(-.25,a,0);dummy.scale.set(.38,.8,.38);dummy.updateMatrix();calyx.setMatrixAt(i,dummy.matrix);}calyx.castShadow=true;group.add(calyx);
  const stem=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.40,0),new T.Vector3(.02,.55,0),new T.Vector3(.12,.63,.03)]),6,.024,5,false),this.stemMaterial);stem.castShadow=true;group.add(stem);
  return group;
 }
 /** Vegetation stays rooted when its collectible fruit is picked. */
 plants(scene:T.Scene,placements:BerryPlacement[]){
  const leafCount=placements.length*18,leaves=new T.InstancedMesh(this.leafGeometry,this.leafMaterial,leafCount),dummy=new T.Object3D(),axis=new T.Vector3(0,0,1),random=randomFrom(131343),stems:T.BufferGeometry[]=[];
  placements.forEach((p,i)=>{
   const x=p.x+.42,z=p.z+.36,y=heightAt(x,z),tip=new T.Vector3(p.x-x,p.centerY-y+.58,p.z-z);
   const curve=new T.CatmullRomCurve3([new T.Vector3(x,y,z),new T.Vector3(x+.12,y+.42,z-.08),new T.Vector3(x+tip.x*.6,y+tip.y*.82,z+tip.z*.4),new T.Vector3(x+tip.x,y+tip.y,z+tip.z)]);
   stems.push(new T.TubeGeometry(curve,12,.027,5,false));
   for(let j=0;j<18;j++){
    const ring=Math.floor(j/6),a=j*2.39996+i*.8,size=ring===0?.65+random()*.24:.46+random()*.24;
    const base=curve.getPoint(ring===0?.04:ring===1?.35:.66),direction=new T.Vector3(Math.cos(a),ring===0?.12:.25+random()*.45,Math.sin(a)).normalize();
    dummy.position.copy(base);dummy.quaternion.setFromUnitVectors(axis,direction);dummy.scale.set(size,size,size);dummy.updateMatrix();leaves.setMatrixAt(i*18+j,dummy.matrix);
   }
  });
  leaves.name='berry-plant-leaves';leaves.castShadow=true;leaves.receiveShadow=true;scene.add(leaves);
  const merged=mergeGeometries(stems);stems.forEach(g=>g.dispose());const branches=new T.Mesh(merged,this.stemMaterial);branches.name='berry-plant-stems';branches.castShadow=true;scene.add(branches);
 }
}
