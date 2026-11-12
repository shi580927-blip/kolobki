import * as T from 'three';
import {ColourBatch} from './SunnyLandmarks';
import {heightAt} from '../core/terrain';
import type {ValleyTrack} from '../core/valleyRoute';

/** Light gates exist only inside the selected match visual. No solid barriers. */
export function makeMatchGates(track:ValleyTrack){
 const b=new ColourBatch(),points=track.points;
 points.forEach((p,i)=>{
  const before=points[(i+points.length-1)%points.length],dx=p.x-before.x,dz=p.z-before.z,len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  const width=track.halfWidth+1,curve:T.Vector3[]=[];
  for(let j=0;j<=24;j++){
   const a=j/24*Math.PI,u=Math.cos(a)*width,x=p.x+nx*u,z=p.z+nz*u;
   curve.push(new T.Vector3(x,heightAt(x,z)+.18+Math.sin(a)*6.8,z));
  }
  const arch=new T.CatmullRomCurve3(curve);
  b.add(new T.TubeGeometry(arch,32,.17,6,false),i===0?'#ff49dc':'#cf53ff',new T.Vector3());
  // Tiny cyan feet and alternating panels make a substantial cartoon portal.
  for(const side of [-1,1]){
   const x=p.x+nx*side*width,z=p.z+nz*side*width,y=heightAt(x,z);
   b.box(x,y+.18,z,1.1,.35,1.1,'#32e7ed');
   b.box(x,y+.50,z,.55,.60,.55,'#a747ce');
  }
  if(i===0){
   for(let j=0;j<Math.round(track.halfWidth*2);j++)for(const row of [-1,0]){
    const u=-track.halfWidth+.5+j,x=p.x+nx*u+dx/len*row,z=p.z+nz*u+dz/len*row;
    b.box(x,heightAt(x,z)+.035,z,.95,.035,.95,(j+row)%2?'#f7f2c9':'#722bc2',new T.Euler(0,Math.atan2(dx,dz),0));
   }
  }
 });
 const mesh=new T.Mesh(b.finish(),new T.MeshBasicMaterial({vertexColors:true,toneMapped:false}));mesh.name='match-light-gates';return mesh;
}
