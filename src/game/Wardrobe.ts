export const GOODS = [
 {id:'stripes',slot:'mark',name:'Когтистые шрамы',price:3},
 {id:'star',slot:'mark',name:'Золотые звёзды',price:4},
 {id:'bolt',slot:'mark',name:'Рваная молния',price:5},
 {id:'helmet',slot:'head',name:'Шипованный шлем',price:8},
 {id:'crown',slot:'head',name:'Королевская корона',price:10},
 {id:'horns',slot:'head',name:'Боевые рожки',price:6}
] as const;
type Item=typeof GOODS[number];
export type Outfit={head:'none'|'helmet'|'crown'|'horns';mark:'none'|'stripes'|'star'|'bolt'};
export class Wardrobe {
 coins=0;owned=new Set<string>();outfit:Outfit={head:'none',mark:'none'};
 constructor(){try{const data=JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')??'{}');
 if(Number.isSafeInteger(data.coins)&&data.coins>=0)this.coins=data.coins;
 for(const item of GOODS)if(Array.isArray(data.owned)&&data.owned.includes(item.id)){
 this.owned.add(item.id);if(data.outfit?.[item.slot]===item.id)this.equip(item);}
 }catch{/* Storage may be disabled. Keep session progress. */}}
 private equip(item:Item){if(item.slot==='head')this.outfit.head=item.id;else this.outfit.mark=item.id;}
 private save(){try{localStorage.setItem('sharobesy.wardrobe.v1',JSON.stringify({coins:this.coins,owned:[...this.owned],outfit:this.outfit}));}catch{/* Session-only storage. */}}
 earn(){this.coins++;this.save();}
 choose(item:Item){if(!this.owned.has(item.id)){if(this.coins<item.price)return;this.coins-=item.price;this.owned.add(item.id);}
 if(this.outfit[item.slot]===item.id)this.outfit[item.slot]='none';else this.equip(item);this.save();}
}
