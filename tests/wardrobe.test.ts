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
