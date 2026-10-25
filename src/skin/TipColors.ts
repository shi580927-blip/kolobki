import {BufferGeometry, Color, Float32BufferAttribute, MathUtils} from 'three';
/** Vertex colours in linear space; no extra maps or draw calls. */
export function applyTipColors(geometry:BufferGeometry, base:string, accent:string, weight:(index:number)=>number){
 const root=new Color(base),tip=new Color(accent),color=new Color(),values:number[]=[];
 for(let i=0;i<geometry.attributes.position.count;i++){
  color.copy(root).lerp(tip,MathUtils.clamp(weight(i),0,1));values.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new Float32BufferAttribute(values,3));return geometry;
}
