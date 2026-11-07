import * as T from 'three';
import {heightAt} from '../core/terrain';
export class SandFall {
 private particles:{x:number;y:number;z:number;vx:number;vy:number;vz:number;age:number;size:number}[]=[];
 private credit=new Map<number,number>();private mesh:T.InstancedMesh;private dummy=new T.Object3D();
 constructor(scene:T.Scene){this.mesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xd4b47d,roughness:1}),80);this.mesh.count=0;this.mesh.frustumCulled=false;scene.add(this.mesh);}
 reset(){this.particles=[];this.credit.clear();this.mesh.count=0;}
 emit(id:number,amount:number,p:T.Vector3){let c=(this.credit.get(id)??0)+amount*170;while(c>=1){c--;if(this.particles.length>=80)continue;const a=Math.random()*Math.PI*2;this.particles.push({x:p.x+Math.cos(a)*.92,y:p.y-.55,z:p.z+Math.sin(a)*.92,vx:Math.cos(a)*.45,vy:-.2,vz:Math.sin(a)*.45,age:0,size:.045+Math.random()*.03});}this.credit.set(id,c);}
 update(dt:number){for(const p of this.particles){p.age+=dt;p.vy-=7*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}this.particles=this.particles.filter(p=>p.age<.65&&p.y>heightAt(p.x,p.z));this.mesh.count=this.particles.length;this.particles.forEach((p,i)=>{this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.age*4,p.age*3,0);this.dummy.scale.setScalar(p.size*(1-p.age/.65));this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);});this.mesh.instanceMatrix.needsUpdate=true;}
}
