/** Whole-map landforms, in metres. Broad asymmetric shoulders, not isolated bumps.
 * The central playground and lagoon keep their accepted relief. */
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export const VALLEY_MASSIFS=[
 {name:'north meadow',x:-28,z:-151,rx:119,rz:91,height:16},
 {name:'western meadow',x:-151,z:105,rx:84,rz:107,height:13},
 {name:'eastern rolling ridge',x:143,z:-66,rx:81,rz:119,height:12},
 {name:'southern meadow',x:14,z:164,rx:112,rz:79,height:9},
] as const;
export function compositionHeight(x:number,z:number){
 const core=smooth(125,150,Math.hypot(x,z));
 let h=0;
 for(const m of VALLEY_MASSIFS){
  const dx=(x-m.x)/m.rx,dz=(z-m.z)/m.rz;
  const a=Math.atan2(dz,dx),r=Math.hypot(dx,dz)/(1+.07*Math.sin(a*3+.4));
  // Broad crown and a long continuous slope with zero derivative at its foot.
  const crown=1-smooth(0,1,r);
  h=Math.max(h,m.height*crown);
 }
 // Low continuous peripheral shoulders close the square visually.
 const edge=smooth(167,200,Math.max(Math.abs(x),Math.abs(z)));
 return core*Math.max(h,edge*(7+2*Math.sin(x*.025+z*.018)));
}
