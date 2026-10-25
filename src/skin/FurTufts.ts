import * as T from 'three';
import {randomFrom} from '../core/skin';
import type {SkinDesign} from './SkinDesign';
export function furLayout(d:SkinDesign){const r=randomFrom(d.seed^0x6fa21);return Array.from({length:d.furCount},(_,i)=>{const y=r()*2-1,a=r()*Math.PI*2,z=Math.sqrt(1-y*y);return{direction:(i===0?[.6,.8,0]:[Math.cos(a)*z,y,Math.sin(a)*z]) as [number,number,number],size:1+(r()*2-1)*d.furScatter*.65,twist:r()*Math.PI*2};});}
/** Small curved tapered fibres give tufts volume without a solid cone silhouette. */
export function makeFurGeometry(seed:number){const r=randomFrom(seed^0x3421),positions:number[]=[],colors:number[]=[],indices:number[]=[];
 for(let strand=0;strand<28;strand++){const a=r()*Math.PI*2,radius=Math.sqrt(r())*.42,root=new T.Vector3(Math.cos(a)*radius,-.015,Math.sin(a)*radius),bend=new T.Vector3(.35+Math.cos(a)*.17,0,.13+Math.sin(a)*.17),length=.38+r()*.78,width=.025+r()*.025,start=positions.length/3;
  for(let j=0;j<=5;j++){const t=j/5,center=root.clone().addScaledVector(bend,t*t).add(new T.Vector3(.05*Math.sin(t*Math.PI),length*t,0)),w=Math.max(.0005,width*Math.pow(1-t,.8));
   for(let k=0;k<5;k++){const angle=k/5*Math.PI*2;positions.push(center.x+Math.cos(angle)*w,center.y,center.z+Math.sin(angle)*w);const shade=.88+t*.12;colors.push(shade,shade,shade);}
  }
  for(let j=0;j<5;j++)for(let k=0;k<5;k++){const next=(k+1)%5,x=start+j*5;indices.push(x+k,x+k+5,x+next,x+next,x+k+5,x+next+5);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
export class FurTufts extends T.InstancedMesh<T.BufferGeometry,T.MeshStandardMaterial>{
 private layout:ReturnType<typeof furLayout>;private dummy=new T.Object3D();private direction=new T.Vector3();private world=new T.Vector3();private tuftAxis=new T.Vector3(0,1,0);private twist=new T.Quaternion();
 constructor(readonly design:SkinDesign){super(makeFurGeometry(design.seed),new T.MeshStandardMaterial({color:design.base,roughness:.9,vertexColors:true}),design.furCount);this.layout=furLayout(design);this.castShadow=true;this.receiveShadow=false;this.frustumCulled=false;this.updateTufts(new T.Quaternion());}
 updateTufts(bodyRotation:T.Quaternion){this.layout.forEach((tuft,i)=>{this.direction.fromArray(tuft.direction).normalize();this.world.copy(this.direction).applyQuaternion(bodyRotation);
  const clear=1-T.MathUtils.smoothstep(this.world.z,.48,.8)*(1-T.MathUtils.smoothstep(Math.abs(this.world.y),.58,.86));
  const width=this.design.furLength*(this.design.surface==='fuzz'?2.3:1.8)*tuft.size,height=this.design.furLength*(this.design.surface==='fuzz'?.48:1.5)*tuft.size;
  this.dummy.position.copy(this.direction).multiplyScalar(.992);this.dummy.quaternion.setFromUnitVectors(this.tuftAxis,this.direction);this.twist.setFromAxisAngle(this.tuftAxis,tuft.twist);this.dummy.quaternion.multiply(this.twist);this.dummy.scale.set(width*clear,height*clear,width*clear);this.dummy.updateMatrix();this.setMatrixAt(i,this.dummy.matrix);
 });this.instanceMatrix.needsUpdate=true;}
 release(){this.geometry.dispose();this.material.dispose();this.dispose();}
}
