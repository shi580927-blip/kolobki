import * as T from 'three';
import {heightAt} from '../core/terrain';
import {ROUTE_HALF_WIDTH} from '../core/valleyRoute';
import {MATCH_ROUTE,RouteMatch} from './RouteMatch';

/** Broad, ground-aligned guidance. Markers never act as physical barriers. */
export class MatchRouteVisual {
 readonly group=new T.Group();private gates:T.Group[]=[];
 private activeMaterial=new T.MeshBasicMaterial({color:0xffd531,toneMapped:false});
 private routeMaterial=new T.MeshBasicMaterial({color:0xffd168,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
 constructor(scene:T.Scene){
  this.group.name='match-route';this.group.visible=false;scene.add(this.group);
  const geo=new T.BoxGeometry(.22,.035,1.1),dummy=new T.Object3D(),pieces:T.Matrix4[]=[];
  const axisX=new T.Vector3(),axisY=new T.Vector3(),axisZ=new T.Vector3(),basis=new T.Matrix4();
  const mark=(x:number,z:number,angle:number,wide=1,long=1)=>{
   const gx=(heightAt(x+.2,z)-heightAt(x-.2,z))/.4,gz=(heightAt(x,z+.2)-heightAt(x,z-.2))/.4;
   axisY.set(-gx,1,-gz).normalize();axisZ.set(Math.sin(angle),gx*Math.sin(angle)+gz*Math.cos(angle),Math.cos(angle)).normalize();axisX.crossVectors(axisY,axisZ).normalize();axisY.crossVectors(axisZ,axisX).normalize();
   basis.makeBasis(axisX,axisY,axisZ);dummy.quaternion.setFromRotationMatrix(basis);dummy.position.set(x,heightAt(x,z)+.16,z);dummy.scale.set(wide,1,long);dummy.updateMatrix();pieces.push(dummy.matrix.clone());
  };
  MATCH_ROUTE.forEach((point,i)=>{
   const from=MATCH_ROUTE[(i+MATCH_ROUTE.length-1)%MATCH_ROUTE.length],dx=point.x-from.x,dz=point.z-from.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,angle=Math.atan2(dx,dz);

   // Larger chevrons point forward; three close together announce each turn.
   const arrows:number[]=[];for(let d=4;d<length-10;d+=9)arrows.push(d);
   for(const back of [8,5,2])if(length>back+1)arrows.push(length-back);
   for(const d of arrows)for(const side of [-1,1])mark(from.x+dx*d/length-nx*side*.85,from.z+dz*d/length-nz*side*.85,angle-side*.8,2,2.2);
   const gate=new T.Group();gate.position.set(point.x,heightAt(point.x,point.z),point.z);
   const marker=new T.Mesh(new T.OctahedronGeometry(.75),this.activeMaterial);marker.name='next-marker';marker.position.y=7;gate.add(marker);
   this.gates.push(gate);this.group.add(gate);
  });
  const marks=new T.InstancedMesh(geo,this.routeMaterial,pieces.length);marks.name='route-marks';pieces.forEach((m,i)=>marks.setMatrixAt(i,m));this.group.add(marks);
 }
 update(match:RouteMatch){
  this.group.visible=match.phase!=='sandbox';
  this.gates.forEach((gate,i)=>gate.traverse(o=>{if(o.name==='next-marker')o.visible=i===match.progress[0]%MATCH_ROUTE.length;else if(o instanceof T.Mesh)o.material=i===match.progress[0]%MATCH_ROUTE.length?this.activeMaterial:this.routeMaterial;}));
 }
}
