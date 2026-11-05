// Cubic Bézier ordinates, from the inner to the outer eye corner.
// A mouth runs from the character's left to its right.
export type Curve=[number,number,number,number];
export interface Pose {
  browTop:Curve; browBottom:Curve; upper:Curve; lower:Curve;
  lipTop:Curve; lipBottom:Curve; mouthWidth:number; irisX:number; irisY:number;
  browLift:number; cheek:number; tension:number; teeth:number; tongue:number;
}
export const contours:Record<string,Pose>={
  sly:{browTop:[.19,.26,.47,.49],browBottom:[.015,.08,.27,.27],upper:[.015,-.02,.30,.24],lower:[.015,-.30,-.29,.17],lipTop:[-.37,-.46,-.43,-.29],lipBottom:[-.37,-.52,-.49,-.29],mouthWidth:.33,irisX:.08,irisY:.015,browLift:.042,cheek:.65,tension:.12,teeth:0,tongue:0},
  content:{browTop:[.25,.55,.57,.31],browBottom:[.12,.31,.34,.15],upper:[.04,.26,.29,.10],lower:[.04,-.21,-.17,.10],lipTop:[-.26,-.41,-.41,-.25],lipBottom:[-.26,-.54,-.53,-.25],mouthWidth:.43,irisX:-.015,irisY:.06,browLift:.009,cheek:1,tension:0,teeth:0,tongue:0},
  smile:{browTop:[.32,.62,.64,.38],browBottom:[.19,.38,.41,.22],upper:[.04,.27,.29,.10],lower:[.04,-.19,-.16,.10],lipTop:[-.28,-.34,-.34,-.28],lipBottom:[-.28,-.68,-.67,-.28],mouthWidth:.43,irisX:-.015,irisY:.06,browLift:.009,cheek:1,tension:0,teeth:.40,tongue:.76},
  surprised:{browTop:[.53,.71,.71,.40],browBottom:[.46,.59,.63,.34],upper:[.09,.62,.57,.12],lower:[.09,-.45,-.43,.12],lipTop:[-.43,-.25,-.25,-.43],lipBottom:[-.43,-.68,-.68,-.43],mouthWidth:.135,irisX:-.074,irisY:.06,browLift:.038,cheek:0,tension:0,teeth:0,tongue:.28},
  angry:{browTop:[.11,.25,.47,.56],browBottom:[-.06,.05,.19,.32],upper:[-.025,.035,.22,.27],lower:[-.025,-.42,-.42,.27],lipTop:[-.40,-.29,-.29,-.40],lipBottom:[-.40,-.34,-.34,-.40],mouthWidth:.22,irisX:-.088,irisY:.016,browLift:.006,cheek:.13,tension:.85,teeth:0,tongue:0},
  attack:{browTop:[.12,.24,.51,.58],browBottom:[-.065,.03,.19,.32],upper:[-.038,.02,.24,.27],lower:[-.038,-.37,-.34,.27],lipTop:[-.53,-.12,-.07,-.52],lipBottom:[-.53,-.43,-.42,-.52],mouthWidth:.43,irisX:-.105,irisY:.016,browLift:.015,cheek:.08,tension:1,teeth:.36,tongue:.38}
};
export function cubic(c:Curve,u:number) {
  const v=1-u;
  return v*v*v*c[0]+3*v*v*u*c[1]+3*v*u*u*c[2]+u*u*u*c[3];
}
