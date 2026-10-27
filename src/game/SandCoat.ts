import * as T from 'three';
/** Cosmetic overlay never changes the saved skin or face geometry. */
export class SandCoat extends T.InstancedMesh {
 private previousCount=0;
 private directions:T.Vector3[]=[];private dummy=new T.Object3D();private direction=new T.Vector3();
 constructor(){super(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xc3a267,roughness:1}),72);this.count=0;this.frustumCulled=false;this.name='temporary-sand-coat';for(let i=0;i<72;i++){const y=1-2*(i+.5)/72,a=i*2.39996,r=Math.sqrt(1-y*y);this.directions.push(new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}}
 update(amount:number,rolling:T.Quaternion,face:T.Quaternion,wetness:number){
  this.count=Math.ceil(amount*72);
  const inverse=rolling.clone().invert();for(let i=this.previousCount;i<this.count;i++){const a=i*2.39996;this.directions[i].set(Math.cos(a)*.42,-.91,Math.sin(a)*.42).normalize().applyQuaternion(inverse);}
  this.previousCount=this.count;this.quaternion.copy(rolling);const forward=new T.Vector3(0,0,1).applyQuaternion(face);
  this.directions.slice(0,this.count).forEach((n,i)=>{this.direction.copy(n).applyQuaternion(rolling);const clear=this.direction.dot(forward)<.4;this.dummy.position.copy(n).multiplyScalar(1.025);this.dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);const size=clear?.11+(i%4)*.018:0;this.dummy.scale.set(size,.022,size*.85);this.dummy.updateMatrix();this.setMatrixAt(i,this.dummy.matrix);});this.instanceMatrix.needsUpdate=true;(this.material as T.MeshStandardMaterial).color.set(wetness>.3?0xb89c66:0xd8bd83);
 }
}
