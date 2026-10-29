import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {stoneColors,stoneMaterial} from './StoneArt';
import {makeLeafGeometry} from './BerryArt';
import {heightAt} from '../core/terrain';
export const ROCK_ARCH={x:-43,z:35,inner:3.8,outer:5.5,depth:2.6};
/** A physical, open landmark off the route, with irregular stone wedges. */
export function addRockArch(scene:T.Scene,world:R.World){
 const {x,z,inner,outer,depth}=ROCK_ARCH;
 const spring=Math.max(heightAt(x-inner-1,z),heightAt(x+inner+1,z),heightAt(x,z))+2.8;
 const dummy=new T.Object3D(),left=heightAt(x-4.7,z)-.3,right=heightAt(x+4.7,z)-.3;
 // One eroded mass, with an uneven shoulder and a low wide opening; no voussoir pattern.
 const shape=new T.Shape();
 shape.moveTo(-6.1,left);
 shape.quadraticCurveTo(-6.5,left+1.6,-6.0,spring+.1);
 shape.quadraticCurveTo(-5.9,spring+2.3,-4.7,spring+3.7);
 shape.quadraticCurveTo(-4.2,spring+4.8,-2.8,spring+5.1);
 shape.quadraticCurveTo(-1.9,spring+5.9,-.4,spring+5.45);
 shape.quadraticCurveTo(.8,spring+5.65,2.2,spring+4.8);
 shape.quadraticCurveTo(4.0,spring+4.6,4.7,spring+2.9);
 shape.quadraticCurveTo(6.0,spring+2.3,6.05,spring-.3);
 shape.lineTo(6.2,right);shape.lineTo(3.75,right);
 shape.quadraticCurveTo(4.1,spring-.1,3.65,spring+1.2);
 shape.quadraticCurveTo(3.25,spring+2.65,1.75,spring+3.35);
 shape.quadraticCurveTo(.4,spring+3.85,-1.2,spring+3.55);
 shape.quadraticCurveTo(-2.7,spring+3.25,-3.45,spring+1.75);
 shape.quadraticCurveTo(-3.95,spring+.7,-3.8,left);
 shape.closePath();
 const raw=new T.ExtrudeGeometry(shape,{depth:depth-.32,bevelEnabled:true,bevelThickness:.16,bevelSize:.16,bevelSegments:2,curveSegments:6,steps:1});
 const rp=raw.getAttribute('position');for(let i=0;i<rp.count;i++)rp.setZ(i,rp.getZ(i)+.16*Math.sin(rp.getX(i)*.8+rp.getY(i)*.65));
 raw.computeVertexNormals();const g=stoneColors(toCreasedNormals(raw,1.1),spring+outer-.55);raw.dispose();
 const arch=new T.Mesh(g,stoneMaterial());arch.name='valley-rock-arch';arch.position.set(x,0,z-depth/2+.16);arch.castShadow=arch.receiveShadow=true;scene.add(arch);
 const p=g.getAttribute('position'),vertices=new Float32Array(p.count*3),indices=new Uint32Array(p.count);
 for(let i=0;i<p.count;i++){vertices.set([p.getX(i),p.getY(i),p.getZ(i)],i*3);indices[i]=i;}
 world.createCollider(R.ColliderDesc.trimesh(vertices,indices).setTranslation(arch.position.x,arch.position.y,arch.position.z).setFriction(.85));
 const plants=new T.InstancedMesh(makeLeafGeometry(7,4),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9}),48);
 const petals=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#fff0cb',roughness:.9}),40),axis=new T.Vector3(0,0,1);
 for(let i=0;i<8;i++){const px=x+(i<4?-1:1)*(6.2+(i%2)*.5),pz=z+(i%4-1.5)*1.6,ground=heightAt(px,pz);for(let j=0;j<6;j++){const a=j*2.39996+i*.7;dummy.position.set(px,ground+.02,pz);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(a),.6+(j%2)*.5,Math.sin(a)).normalize());dummy.scale.setScalar(.45+(j%3)*.1);dummy.updateMatrix();plants.setMatrixAt(i*6+j,dummy.matrix);}for(let j=0;j<5;j++){const a=j*Math.PI*2/5;dummy.position.set(px+.12*Math.cos(a),ground+.3,pz+.12*Math.sin(a));dummy.rotation.set(0,a,0);dummy.scale.set(.11,.035,.08);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix);}}
 plants.name='arch-base-plants';petals.name='arch-base-flowers';scene.add(plants,petals);
 return {spring};
}
