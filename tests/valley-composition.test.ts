import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compositionHeight,VALLEY_MASSIFS} from '../src/core/valleyComposition';
import {heightAt,terrainData} from '../src/core/terrain';
test('whole valley has distinct major elevations and preserves the central playground',()=>{
 for(let x=-80;x<=80;x+=4)for(let z=-80;z<=80;z+=4)if(Math.hypot(x,z)<=110)assert.equal(compositionHeight(x,z),0);
 assert.ok(heightAt(-28,-157)>35,'main mountain has actual terrain height');
 assert.ok(heightAt(-160,105)>25,'western highland');
 assert.ok(heightAt(155,-66)>19,'eastern ridge');
 for(const m of VALLEY_MASSIFS)assert.ok(heightAt(m.x,m.z)>10);
 const data=terrainData();assert.equal(data.vertices.length,201*201*3);
 // Sample the complete visible/physical surface for finite heights and seams.
 for(let x=-199;x<200;x+=3)for(let z=-199;z<200;z+=3){
  const y=heightAt(x,z);assert.ok(Number.isFinite(y));
  assert.ok(Math.abs(heightAt(x+.001,z)-y)<.02);
  assert.ok(Math.abs(heightAt(x,z+.001)-y)<.02);
 }
});
