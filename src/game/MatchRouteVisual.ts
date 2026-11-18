import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from '../core/terrain';
import {HILL_TRACK,type ValleyTrack} from '../core/valleyRoute';
import {RouteMatch} from './RouteMatch';
import {makeMatchGates} from './RacingArt';

type View={group:T.Group;gates:T.Group[]};
/** Exactly one temporary luminous route; the open world has no race furniture. */
export class MatchRouteVisual {
 readonly group=new T.Group();private views=new Map<string,View>();private activeId:string;
 private activeMaterial=new T.MeshBasicMaterial({color:0xfff091,toneMapped:false});
 private routeMaterial=new T.MeshBasicMaterial({color:0xffdc66,transparent:true,opacity:.95,depthWrite:false,toneMapped:false});
 constructor(scene:T.Scene,track:ValleyTrack=HILL_TRACK){
  this.group.name='match-route';this.group.visible=false;scene.add(this.group);this.activeId=track.id;this.ensure(track);
 }
 private ensure(track:ValleyTrack){
  const cached=this.views.get(track.id);if(cached)return cached;
  const group=new T.Group(),gates:T.Group[]=[],points=track.points;group.name='match-track-'+track.id;this.group.add(group);
  const geo=new T.BoxGeometry(.22,.035,1.1),dummy=new T.Object3D(),pieces:T.Matrix4[]=[];
  const axisX=new T.Vector3(),axisY=new T.Vector3(),axisZ=new T.Vector3(),basis=new T.Matrix4();
  const mark=(x:number,z:number,angle:number,wide=1,long=1)=>{
   const gx=(heightAt(x+.2,z)-heightAt(x-.2,z))/.4,gz=(heightAt(x,z+.2)-heightAt(x,z-.2))/.4;
   axisY.set(-gx,1,-gz).normalize();axisZ.set(Math.sin(angle),gx*Math.sin(angle)+gz*Math.cos(angle),Math.cos(angle)).normalize();axisX.crossVectors(axisY,axisZ).normalize();axisY.crossVectors(axisZ,axisX).normalize();
   basis.makeBasis(axisX,axisY,axisZ);dummy.quaternion.setFromRotationMatrix(basis);dummy.position.set(x,heightAt(x,z)+.16,z);dummy.scale.set(wide,1,long);dummy.updateMatrix();pieces.push(dummy.matrix.clone());
  };
  points.forEach((point,i)=>{
   const from=points[(i+points.length-1)%points.length],dx=point.x-from.x,dz=point.z-from.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,angle=Math.atan2(dx,dz);
   const arrows:number[]=[];for(let d=4;d<length-10;d+=9)arrows.push(d);
   for(const back of [8,5,2])if(length>back+1)arrows.push(length-back);
   for(const d of arrows)for(const side of [-1,1])mark(from.x+dx*d/length-nx*side*.85,from.z+dz*d/length-nz*side*.85,angle-side*.8,2,2.2);
   const gate=new T.Group();gate.position.set(point.x,heightAt(point.x,point.z),point.z);
   const marker=new T.Mesh(new T.OctahedronGeometry(.75),this.activeMaterial);marker.name='next-marker';marker.position.y=8;gate.add(marker);gates.push(gate);group.add(gate);
  });
  const marks=new T.InstancedMesh(geo,this.routeMaterial,pieces.length);marks.name='route-marks';pieces.forEach((m,i)=>marks.setMatrixAt(i,m));group.add(marks,makeMatchGates(track));
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.z)),true,'centripetal');
  const samples=Math.ceil(curve.getLength()/.8);
  const ribbon=(side:number,thickness:number)=>{
   const positions:number[]=[],indices:number[]=[];
   for(let i=0;i<=samples;i++){
    const p=curve.getPointAt(i/samples),t=curve.getTangentAt(i/samples),nx=-t.z,nz=t.x;
    for(const edge of [-1,1]){const offset=side*track.halfWidth+edge*thickness,x=p.x+nx*offset,z=p.z+nz*offset;positions.push(x,heightAt(x,z)+.13,z);}
    if(i<samples){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);return g;
  };
  for(const [thickness,opacity] of [[.8,.12],[.32,.32],[.095,1]]){
   const parts=[ribbon(-1,thickness),ribbon(1,thickness)],g=mergeGeometries(parts);parts.forEach(p=>p.dispose());
   const m=new T.MeshBasicMaterial({color:opacity===1?'#fff3ab':'#ffc331',transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending});
   const mesh=new T.Mesh(g,m);mesh.name='match-luminous-edges';mesh.renderOrder=2;group.add(mesh);
  }
  const view={group,gates};this.views.set(track.id,view);return view;
 }
 update(match:RouteMatch){
  this.activeId=match.track.id;const view=this.ensure(match.track);this.group.visible=match.phase!=='sandbox';
  this.views.forEach((v,id)=>v.group.visible=id===this.activeId);
  view.gates.forEach((gate,i)=>gate.visible=i===match.progress[0]%match.track.points.length);
 }
 snapshot(){return {visible:this.group.visible,trackId:this.activeId,visibleTracks:[...this.views].filter(([,v])=>this.group.visible&&v.group.visible).map(([id])=>id)};}
}
