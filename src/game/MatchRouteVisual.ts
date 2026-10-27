import * as T from 'three';
import {heightAt} from '../core/terrain';
import {MATCH_ROUTE,RouteMatch} from './RouteMatch';

/** Ground-following luminous dashes, arrows and checkpoint beacons. No colliders. */
export class MatchRouteVisual {
 readonly group=new T.Group();private gates:T.Group[]=[];
 private activeMaterial=new T.MeshBasicMaterial({color:0xffef84});
 private routeMaterial=new T.MeshBasicMaterial({color:0x73f5da,transparent:true,opacity:.75,depthWrite:false});
 constructor(scene:T.Scene){
  this.group.name='match-route';this.group.visible=false;scene.add(this.group);
  const geo=new T.BoxGeometry(.16,.035,1.1),dummy=new T.Object3D();
  const pieces:T.Matrix4[]=[];
  MATCH_ROUTE.forEach((point,i)=>{
   const from=MATCH_ROUTE[(i+MATCH_ROUTE.length-1)%MATCH_ROUTE.length],dx=point.x-from.x,dz=point.z-from.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
   for(let d=1;d<length;d+=1.6)for(const side of [-1,1]){
    const x=from.x+dx*d/length+nx*side*3,z=from.z+dz*d/length+nz*side*3;
    dummy.position.set(x,heightAt(x,z)+.12,z);dummy.rotation.set(0,Math.atan2(dx,dz),0);dummy.updateMatrix();pieces.push(dummy.matrix.clone());
   }
   // Repeated chevrons show travel direction, including in the opening view.
   for(let d=3;d<length;d+=7)for(const side of [-1,1]){
    const x=from.x+dx*d/length-nx*side*.45,z=from.z+dz*d/length-nz*side*.45;
    dummy.position.set(x,heightAt(x,z)+.13,z);dummy.rotation.set(0,Math.atan2(dx,dz)+side*.8,0);dummy.updateMatrix();pieces.push(dummy.matrix.clone());
   }
   const gate=new T.Group();gate.position.set(point.x,heightAt(point.x,point.z),point.z);
   const ring=new T.Mesh(new T.TorusGeometry(3.6,.09,5,40),this.routeMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.18;gate.add(ring);
   // Tall slim beacons remain visible across the hills; no solid race corridor.
   for(const side of [-1,1]){const post=new T.Mesh(new T.CylinderGeometry(.08,.08,4.5,5),this.routeMaterial);post.position.set(nx*side*3.6,2.25,nz*side*3.6);gate.add(post);}
   this.gates.push(gate);this.group.add(gate);
  });
  const marks=new T.InstancedMesh(geo,this.routeMaterial,pieces.length);pieces.forEach((m,i)=>marks.setMatrixAt(i,m));this.group.add(marks);
 }
 update(match:RouteMatch){
  this.group.visible=match.phase!=='sandbox';
  this.gates.forEach((gate,i)=>gate.traverse(o=>{if(o instanceof T.Mesh)o.material=i===match.progress[0]%MATCH_ROUTE.length?this.activeMaterial:this.routeMaterial;}));
 }
}
