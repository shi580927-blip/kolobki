import test from 'node:test';
import assert from 'node:assert/strict';
import {Wardrobe,GOODS} from '../src/game/Wardrobe';
test('earned coins unlock independent slots and repeat equipment is free',()=>{
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k),setItem:(k:string,v:string)=>values.set(k,v)}});
 try{
  const w=new Wardrobe(),paint=GOODS[0],helmet=GOODS[3];
  w.choose(paint);assert.equal(w.outfit.mark,'none');
  for(let i=0;i<paint.price+helmet.price;i++)w.earn();
  w.choose(paint);w.choose(helmet);assert.equal(w.coins,0);
  const saved=new Wardrobe();assert.deepEqual(saved.outfit,{mark:'stripes',head:'helmet'});
  saved.choose(paint);saved.choose(paint);assert.deepEqual(saved.outfit,w.outfit);assert.equal(saved.coins,0);
 }finally{Reflect.deleteProperty(globalThis,'localStorage');}
});

test('approved accessories and legacy purchases round-trip through the existing wardrobe',async()=>{
 const {atelierAccessories}=await import('../src/cosmetics/AtelierAccessories');
 const {readOutfit,SHOP_TABS,goodsForCategory}=await import('../src/game/Wardrobe');
 const values=new Map<string,string>();values.set('sharobesy.wardrobe.v1',JSON.stringify({coins:120,owned:['helmet','crown','horns','star'],outfit:{head:'horns',mark:'star'},skull:true}));
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k),setItem:(k:string,v:string)=>values.set(k,v)}});
 try{
  let w=new Wardrobe();assert.deepEqual(w.outfit,{head:'horns',mark:'star'});assert.equal(w.skull,true);
  for(const id of Object.keys(atelierAccessories).filter(id=>id!=='none')){
   const item=GOODS.find(item=>item.id===id);assert.ok(item,id+' must be offered in game');const coins=w.coins,owned=w.owned.has(id);
   if(w.outfit.head===id)w.choose(item);w.choose(item);assert.equal(w.outfit.head,id);assert.equal(w.outfit.mark,'star');assert.equal(w.coins,coins-(owned?0:item.price));
   assert.equal(readOutfit(w.outfit).head,id);w=new Wardrobe();assert.equal(w.outfit.head,id);assert.equal(w.skull,true);
  }
  for(const id of ['helmet','crown','horns','star'])assert.ok(w.owned.has(id),'legacy ownership must survive');
  assert.deepEqual(readOutfit({head:'zorro',mark:'bad'}),{head:'none',mark:'none'});
  const categories=SHOP_TABS.filter(([id])=>id!=='all').flatMap(([id])=>goodsForCategory(id).map(g=>g.id));
  assert.equal(categories.length,GOODS.length);assert.equal(new Set(categories).size,GOODS.length,'each item has exactly one category');
  for(const [id]of SHOP_TABS)assert.ok(goodsForCategory(id).length>0);
 }finally{Reflect.deleteProperty(globalThis,'localStorage');}
});
