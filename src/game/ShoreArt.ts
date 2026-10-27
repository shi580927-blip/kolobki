import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {POND,heightAt} from '../core/terrain';
import {makeLeafGeometry} from './BerryArt';
/** One small bank composition; solid rocks leave the bridge and both shallow exits open. */
export function addShoreArt(scene:T.Scene,world:R.World){
 const dummy=new T.Object3D();
 const batch=(name:string,g:T.BufferGeometry,m:T.Material,n:number,shadow=false)=>{const mesh=new T.InstancedMesh(g,m,n);mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
 const rock=new T.IcosahedronGeometry(1,1),p=rock.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x*(1+.08*Math.sin(z*9)),Math.min(.68,y),z);const c=new T.Color('#887e69').lerp(new T.Color('#dbc99d'),(y+1)*.5);colors.push(c.r,c.g,c.b);}rock.setAttribute('color',new T.Float32BufferAttribute(colors,3));rock.computeVertexNormals();
 const cliffs=batch('shore-rock-clusters',rock,new T.MeshStandardMaterial({vertexColors:true,roughness:.95}),8,true);
 const turf=batch('shore-rock-turf',new T.SphereGeometry(1,9,5),new T.MeshStandardMaterial({color:'#8dbb46',roughness:.95}),8,true);
 const groups=[[-5,9.5,1.35],[-3.3,9.8,1.7],[-4,11.3,1.2],[.8,10.2,1.1],[2.2,10.8,1.65],[3.1,11.5,1.25],[5.4,9.2,.8],[5.9,10.4,1.0]];
 for(let i=0;i<8;i++){
  const [dx,dz,s]=groups[i],x=POND.x+dx,z=POND.z+dz,a=i*1.37,y=heightAt(x,z);
  dummy.position.set(x,y+s*.5,z);dummy.rotation.set(0,a*.7,0);dummy.scale.set(s*1.25,s*(i%2?.95:1.1),s*.9);dummy.updateMatrix();cliffs.setMatrixAt(i,dummy.matrix);
  // Conservative rounded support matches the visible mass without enclosing the bank.
  world.createCollider(R.ColliderDesc.ball(s*.75).setTranslation(x,y+s*.45,z).setFriction(.9));
  dummy.position.set(x+s*.13,y+s*(i%2?1.14:1.25),z+s*.09);dummy.scale.set(s*.55,.055,s*.47);dummy.updateMatrix();turf.setMatrixAt(i,dummy.matrix);
 }
 const rubble=batch('shore-small-stones',new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#cbb790',roughness:1}),24);
 const leaves=batch('shore-bank-leaves',makeLeafGeometry(),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.85}),120);
 const flowers=batch('shore-bank-flowers',new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#ffffff',roughness:.9}),100);
 const axis=new T.Vector3(0,0,1);let fi=0;
 for(let i=0;i<24;i++){
  const a=.8+(i%12)*.14,r=7.3+Math.floor(i/12)*1.3+.45*Math.sin(i*5.1),x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,y=heightAt(x,z),s=.12+(i%4)*.045;
  dummy.position.set(x,y+s*.28,z);dummy.rotation.set(0,a,0);dummy.scale.set(s*1.2,s*.65,s);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<5;j++){const angle=a+j*2.39996;dummy.position.set(x+.25,y+.025,z-.15);dummy.quaternion.setFromUnitVectors(axis,new T.Vector3(Math.cos(angle),.8+(j%2)*.8,Math.sin(angle)).normalize());dummy.scale.setScalar(.40+(j%3)*.12);dummy.updateMatrix();leaves.setMatrixAt(i*5+j,dummy.matrix);}
  if(i%6===0)continue;
  const fy=y+.26;
  for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;dummy.position.set(x+Math.cos(angle)*.10,fy,z+Math.sin(angle)*.10);dummy.rotation.set(0,angle,0);dummy.scale.set(.11,.035,.075);dummy.updateMatrix();flowers.setMatrixAt(fi,dummy.matrix);flowers.setColorAt(fi++,new T.Color(i%3===0?'#f0d356':i%3===1?'#fff0cd':'#e69db9'));}
 }
 flowers.count=fi;
}
