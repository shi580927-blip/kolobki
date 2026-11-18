/** Shared crossing layout; shore shaping and the wooden deck use the same axis. */
export const SOUTH_BRIDGE={x:-46.5,z:74.5,length:Math.hypot(23,19),width:6.4};
const dx=23/SOUTH_BRIDGE.length,dz=19/SOUTH_BRIDGE.length;
export function southBridgePoint(t:number,side=0){return {x:-58+23*t-dz*side,z:65+19*t+dx*side,y:2.36+.5*Math.sin(Math.PI*Math.max(0,Math.min(1,t)))**2};}
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
/** A shallow open cove beneath the crossing, with dry, uncut landings. */
export function southCoveFloor(x:number,z:number,ground:number){
 const t=((x+58)*23+(z-65)*19)/(23*23+19*19);
 if(t<=0||t>=1)return ground;
 const side=Math.abs((x+58)*-dz+(z-65)*dx);
 const weight=smooth(.05,.28,t)*(1-smooth(.72,.95,t))*(1-smooth(3.4,6,side));
 return ground-Math.max(0,ground-1.97)*weight;
}
