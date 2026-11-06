import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptySelection,validateSelection,wrapU} from '../src/cosmetics/CosmeticCatalog';
test('cosmetic combinations validate independent slots and incompatible eyewear/mask',()=>{
 const selection=emptySelection();selection.makeup=['lashes','blush'];selection.tattoo={id:'hearts',color:'#ff77aa',u:.99,v:.5,scale:.2,excludeFace:true};selection.accessories=['cat-ears'];assert.deepEqual(validateSelection(selection),[]);
 selection.accessories=['reading-glasses','zorro-mask'];assert.ok(validateSelection(selection).some(x=>x.includes('conflicts')));
 selection.accessories=['cat-ears','viking-helmet'];assert.ok(validateSelection(selection).some(x=>x.includes('Slot occupied')));
});
test('tattoo longitude wraps across the sphere seam',()=>{assert.ok(Math.abs(wrapU(-.05)-.95)<1e-10);assert.ok(Math.abs(wrapU(1.05)-.05)<1e-10);assert.throws(()=>wrapU(NaN));});
