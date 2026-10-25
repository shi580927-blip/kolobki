import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCellGeometry,sphericalCells} from '../src/skin/SurfaceCells';
import {defaultDesign} from '../src/skin/SkinDesign';
test('geodesic cell coverage has no collapsed pole rows and mostly hexagons',()=>{
 const cells=sphericalCells(1);assert.ok(cells.length>100);assert.equal(cells.filter(c=>c.corners.length===5).length,12);assert.ok(cells.every(c=>c.corners.length===5||c.corners.length===6));
 for(const c of cells){assert.ok(Math.abs(c.center.length()-1)<1e-6);assert.ok(c.corners.every(p=>p.distanceTo(c.center)>.04));}
 const north=cells.filter(c=>c.center.y>.5).length,south=cells.filter(c=>c.center.y<-.5).length;assert.ok(Math.abs(north-south)<=3);
});
test('seeded separate cells vary depth and tilt, have finite geometry and preserve face clearance',()=>{
 for(const surface of ['scales','segments'] as const){const d={...defaultDesign,surface},a=makeCellGeometry(d),b=makeCellGeometry(d),other=makeCellGeometry({...d,seed:d.seed+1});
 assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.notDeepEqual(a.attributes.position.array,other.attributes.position.array);
 const cells=a.userData.cells;assert.ok(cells.some((c:any)=>c.tilt===0));assert.ok(cells.some((c:any)=>c.tilt>0));assert.ok(new Set(cells.map((c:any)=>c.depth.toFixed(4))).size>10);
 const p=a.attributes.position,n=a.attributes.normal;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));assert.ok(r<=1.000001&&r>.8);assert.ok(Number.isFinite(n.getX(i)));}
 a.dispose();b.dispose();other.dispose();}
});
test('surface size changes cell count and relief changes seating depth',()=>{
 assert.ok(sphericalCells(.5).length>sphericalCells(2).length);
 const shallow=makeCellGeometry({...defaultDesign,surface:'segments',relief:.005}),deep=makeCellGeometry({...defaultDesign,surface:'segments',relief:.1});assert.ok(deep.userData.coreRadius<shallow.userData.coreRadius);shallow.dispose();deep.dispose();
});

test('two-tone cells keep base caps and accent recesses, with a true monochrome switch',()=>{
 const d={...defaultDesign,surface:'scales' as const,base:'#ff0000',accent:'#0000ff',surfaceAccent:true},g=makeCellGeometry(d),c=g.attributes.color;
 assert.equal(c.getX(0),1);assert.equal(c.getZ(0),0);assert.equal(c.getX(3),0);assert.equal(c.getZ(3),1);
 const mono=makeCellGeometry({...d,surfaceAccent:false}),m=mono.attributes.color;
 for(let i=0;i<m.count;i++){assert.equal(m.getX(i),1);assert.equal(m.getZ(i),0);}g.dispose();mono.dispose();
});
