export const SHOP_TABS=[['all','Все'],['headwear','Головные уборы'],['glasses','Очки'],['masks','Маски'],['accessories','Украшения'],['marks','Рисунки']] as const;
export type ShopCategory=typeof SHOP_TABS[number][0];
export const GOODS = [
 {id:'stripes',slot:'mark',category:'marks',name:'Когтистые шрамы',price:3},
 {id:'star',slot:'mark',category:'marks',name:'Золотые звёзды',price:4},
 {id:'bolt',slot:'mark',category:'marks',name:'Рваная молния',price:5},
 {id:'helmet',slot:'head',category:'headwear',name:'Шипованный шлем',price:8},
 {id:'crown',slot:'head',category:'headwear',name:'Королевская корона',price:10},
 {id:'horns',slot:'head',category:'accessories',name:'Светлые рожки',price:6},
 {id:'cap',slot:'head',category:'headwear',name:'Кепка вперёд',price:7},
 {id:'roundGlasses',slot:'head',category:'glasses',name:'Круглые очки',price:6},
 {id:'goggles',slot:'head',category:'glasses',name:'Стимпанк-очки',price:9},
 {id:'catEars',slot:'head',category:'accessories',name:'Кошачьи ушки',price:7},
 {id:'headphones',slot:'head',category:'accessories',name:'Наушники',price:10},
 {id:'viking',slot:'head',category:'headwear',name:'Шлем викинга',price:12},
 {id:'ninja',slot:'head',category:'masks',name:'Маска ниндзя',price:8},
 {id:'knight',slot:'head',category:'headwear',name:'Рыцарский шлем',price:12}
] as const;
export type Item=typeof GOODS[number];
export type Outfit={head:'none'|Extract<Item,{slot:'head'}>['id'];mark:'none'|Extract<Item,{slot:'mark'}>['id']};
export function goodsForCategory(category:ShopCategory){return GOODS.filter(g=>category==='all'||g.category===category);}
export function readOutfit(value:unknown):Outfit {
 const outfit:Outfit={head:'none',mark:'none'};
 if(!value||typeof value!=='object')return outfit;
 const saved=value as Partial<Outfit>;
 for(const item of GOODS){
  if(item.slot==='head'&&saved.head===item.id)outfit.head=item.id;
  if(item.slot==='mark'&&saved.mark===item.id)outfit.mark=item.id;
 }
 return outfit;
}
export class Wardrobe {
 skull=false;
 setSkull(enabled:boolean){this.skull=enabled;this.save();}
 coins=0;owned=new Set<string>();outfit:Outfit={head:'none',mark:'none'};
 constructor(){try{const data=JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')??'{}');
 this.skull=data.skull===true;
 if(Number.isSafeInteger(data.coins)&&data.coins>=0)this.coins=data.coins;
 for(const item of GOODS)if(Array.isArray(data.owned)&&data.owned.includes(item.id)){
 this.owned.add(item.id);if(data.outfit?.[item.slot]===item.id)this.equip(item);}
 }catch{/* Storage may be disabled. Keep session progress. */}}
 private equip(item:Item){if(item.slot==='head')this.outfit.head=item.id;else this.outfit.mark=item.id;}
 private save(){try{localStorage.setItem('sharobesy.wardrobe.v1',JSON.stringify({skull:this.skull,coins:this.coins,owned:[...this.owned],outfit:this.outfit}));}catch{/* Session-only storage. */}}
 earn(){this.coins++;this.save();}
 choose(item:Item){if(!this.owned.has(item.id)){if(this.coins<item.price)return;this.coins-=item.price;this.owned.add(item.id);}
 if(this.outfit[item.slot]===item.id)this.outfit[item.slot]='none';else this.equip(item);this.save();}
}
