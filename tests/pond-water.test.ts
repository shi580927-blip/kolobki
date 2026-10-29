import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pondWaterGeometry} from '../src/game/PondWater';
import {POND,heightAt,pondDistance} from '../src/core/terrain';
test('rendered pond uses physical world contour and actual ground depth, facing up',()=>{
 const g=pondWaterGeometry(),p=g.getAttribute('position'),d=g.getAttribute('waterDepth'),n=g.getAttribute('normal');let maxDepth=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);assert.ok(pondDistance(x,z)<1.000001);assert.ok(Math.abs(d.getX(i)-(POND.water-heightAt(x,z)))<.00001);assert.ok(n.getY(i)>.99);maxDepth=Math.max(maxDepth,d.getX(i));
 }
 assert.ok(maxDepth>.35&&maxDepth<.5);g.dispose();
});

test('lake opens beyond the bridge without covering the match route or placing plants underwater',async()=>{
 const {pondRadius}=await import('../src/core/terrain');
 const {nearestRoutePoint}=await import('../src/core/valleyRoute');
 const {valleyArtLayout}=await import('../src/game/ValleyArt');
 let area=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<720;i++){
  const a=i/720*Math.PI*2,r=pondRadius(a),x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r;
  assert.ok(nearestRoutePoint(x,z).distance>10,'water stays away from the driving corridor');
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);area+=r*r*Math.PI/720;
 }
 assert.ok(area>300&&area<400);assert.ok(maxX-minX>18&&maxZ-minZ>24);
 assert.ok(pondRadius(0)<6&&pondRadius(Math.PI)<6,'existing bridge spans the narrow inlet');
 const layout=valleyArtLayout();
 for(const p of [...layout.trees,...layout.grass,...layout.flowers,...layout.rocks])assert.ok(pondDistance(p.x,p.z)>1.55,'dry vegetation and major rocks stay off the water');
});


test('enlarged lake keeps all twelve berries and both arch feet on dry ground',async()=>{
 const {berryPlacement}=await import('../src/game/BerryArt');
 const {ROCK_ARCH}=await import('../src/game/RockArch');
 for(let i=0;i<12;i++){const p=berryPlacement(i);assert.ok(pondDistance(p.x,p.z)>1.4);if(pondDistance(p.x,p.z)<2)assert.ok(heightAt(p.x,p.z)>POND.water);}
 for(const dx of [-6,-4,4,6])assert.ok(pondDistance(ROCK_ARCH.x+dx,ROCK_ARCH.z)>1.4);
});

test('water normal map stays within a small repeatable texture budget with valid normals',async()=>{
 const {waterNormalTexture}=await import('../src/game/PondWater');
 const {RepeatWrapping,LinearMipmapLinearFilter}=await import('three');
 const a=waterNormalTexture(),b=waterNormalTexture();
 assert.equal(a.image.width,128);assert.equal(a.image.height,128);assert.equal(a.image.data.length,65536);
 assert.equal(a.wrapS,RepeatWrapping);assert.equal(a.wrapT,RepeatWrapping);assert.equal(a.minFilter,LinearMipmapLinearFilter);
 assert.deepEqual(a.image.data,b.image.data);
 const data=a.image.data;let varied=false;
 for(let i=0;i<data.length;i+=4){const x=data[i]/255*2-1,y=data[i+1]/255*2-1,z=data[i+2]/255*2-1;assert.ok(Math.abs(Math.hypot(x,y,z)-1)<.015);assert.ok(z>0);if(Math.abs(x)>.1)varied=true;}
 assert.ok(varied);a.dispose();b.dispose();
});
