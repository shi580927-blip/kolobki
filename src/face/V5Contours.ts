// Cubic Bézier ordinates, from the inner to the outer eye corner.
// A mouth runs from the character's left to its right.
export type Curve=[number,number,number,number];
export interface Pose {
  browTop:Curve; browBottom:Curve; upper:Curve; lower:Curve;
  lipTop:Curve; lipBottom:Curve; mouthWidth:number; irisX:number; irisY:number;
  browLift:number; cheek:number; tension:number; teeth:number; tongue:number; irisScale:number; lowerTeeth:number;
}
export const contours:Record<string,Pose>={
  neutral:{browTop:[.32,.33,.34,.31],browBottom:[.17,.18,.19,.16],upper:[.03,.11,.13,.08],lower:[.03,-.28,-.28,.08],lipTop:[-.37,-.40,-.38,-.35],lipBottom:[-.37,-.44,-.42,-.35],mouthWidth:.28,irisX:0,irisY:.01,browLift:.008,cheek:.25,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  frightened:{browTop:[.54,.72,.73,.43],browBottom:[.39,.57,.58,.28],upper:[.04,.65,.62,.04],lower:[.04,-.48,-.48,.04],lipTop:[-.52,-.35,-.35,-.52],lipBottom:[-.52,-.79,-.79,-.52],mouthWidth:.31,irisX:0,irisY:.025,browLift:.06,cheek:0,tension:0,teeth:.22,irisScale:.60,lowerTeeth:0,tongue:.45},
  dreamy:{browTop:[.37,.51,.48,.32],browBottom:[.22,.35,.32,.17],upper:[.03,.12,.13,.06],lower:[.03,-.26,-.24,.06],lipTop:[-.35,-.40,-.40,-.31],lipBottom:[-.35,-.44,-.44,-.31],mouthWidth:.27,irisX:-.015,irisY:.105,browLift:.025,cheek:.3,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  curious:{browTop:[.49,.67,.60,.38],browBottom:[.34,.52,.45,.23],upper:[.04,.51,.52,.07],lower:[.04,-.39,-.40,.07],lipTop:[-.40,-.28,-.28,-.40],lipBottom:[-.40,-.57,-.57,-.40],mouthWidth:.11,irisX:-.045,irisY:.04,browLift:.07,cheek:0,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:.18},
  confident:{browTop:[.25,.32,.40,.43],browBottom:[.10,.17,.25,.28],upper:[.02,.12,.18,.09],lower:[.02,-.30,-.30,.09],lipTop:[-.35,-.38,-.38,-.33],lipBottom:[-.35,-.42,-.42,-.33],mouthWidth:.29,irisX:-.025,irisY:.01,browLift:.012,cheek:.1,tension:.24,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  focused:{browTop:[.15,.24,.43,.48],browBottom:[0,.09,.28,.33],upper:[.02,.06,.12,.08],lower:[.02,-.15,-.16,.08],lipTop:[-.37,-.27,-.27,-.37],lipBottom:[-.37,-.32,-.32,-.37],mouthWidth:.24,irisX:-.055,irisY:.01,browLift:.008,cheek:0,tension:.7,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  tired:{browTop:[.53,.54,.37,.26],browBottom:[.38,.39,.22,.11],upper:[.03,.11,.12,.05],lower:[.03,-.20,-.20,.05],lipTop:[-.42,-.34,-.34,-.42],lipBottom:[-.42,-.44,-.44,-.42],mouthWidth:.22,irisX:0,irisY:-.035,browLift:.04,cheek:0,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:.08},
  sleeping:{browTop:[.34,.43,.42,.32],browBottom:[.19,.28,.27,.17],upper:[.03,.05,.05,.03],lower:[.03,.045,.045,.03],lipTop:[-.40,-.31,-.31,-.40],lipBottom:[-.40,-.49,-.49,-.40],mouthWidth:.09,irisX:0,irisY:0,browLift:.01,cheek:0,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  stunned:{browTop:[.48,.62,.59,.37],browBottom:[.33,.47,.44,.22],upper:[.04,.53,.53,.04],lower:[.04,-.44,-.44,.04],lipTop:[-.40,-.30,-.30,-.40],lipBottom:[-.40,-.57,-.57,-.40],mouthWidth:.16,irisX:0,irisY:0,browLift:.04,cheek:0,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:.15},
  rage:{browTop:[.11,.25,.48,.56],browBottom:[-.06,.05,.20,.32],upper:[-.025,.04,.21,.26],lower:[-.025,-.39,-.39,.26],lipTop:[-.56,-.36,-.36,-.56],lipBottom:[-.56,-.88,-.88,-.56],mouthWidth:.40,irisX:-.09,irisY:.01,browLift:.01,cheek:0,tension:1,teeth:.35,irisScale:1,lowerTeeth:0,tongue:.55},
  angry_clenched:{browTop:[.11,.25,.47,.56],browBottom:[-.06,.05,.19,.32],upper:[-.025,.035,.22,.27],lower:[-.025,-.42,-.42,.27],lipTop:[-.38,-.22,-.22,-.38],lipBottom:[-.38,-.48,-.48,-.38],mouthWidth:.31,irisX:-.088,irisY:.016,browLift:.006,cheek:.05,tension:.85,teeth:.75,irisScale:1,lowerTeeth:1,tongue:0},
  sly:{browTop:[.19,.26,.47,.49],browBottom:[.015,.08,.27,.27],upper:[.015,-.02,.30,.24],lower:[.015,-.30,-.29,.17],lipTop:[-.37,-.46,-.43,-.29],lipBottom:[-.37,-.52,-.49,-.29],mouthWidth:.33,irisX:.08,irisY:.015,browLift:.042,cheek:.65,tension:.12,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  content:{browTop:[.25,.55,.57,.31],browBottom:[.12,.31,.34,.15],upper:[.04,.26,.29,.10],lower:[.04,-.21,-.17,.10],lipTop:[-.26,-.41,-.41,-.25],lipBottom:[-.26,-.54,-.53,-.25],mouthWidth:.43,irisX:-.015,irisY:.06,browLift:.009,cheek:1,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  smile:{browTop:[.32,.62,.64,.38],browBottom:[.19,.38,.41,.22],upper:[.04,.27,.29,.10],lower:[.04,-.19,-.16,.10],lipTop:[-.28,-.34,-.34,-.28],lipBottom:[-.28,-.68,-.67,-.28],mouthWidth:.43,irisX:-.015,irisY:.06,browLift:.009,cheek:1,tension:0,teeth:.40,irisScale:1,lowerTeeth:0,tongue:.76},
  surprised:{browTop:[.53,.71,.71,.40],browBottom:[.46,.59,.63,.34],upper:[.09,.62,.57,.12],lower:[.09,-.45,-.43,.12],lipTop:[-.43,-.25,-.25,-.43],lipBottom:[-.43,-.68,-.68,-.43],mouthWidth:.135,irisX:-.074,irisY:.06,browLift:.038,cheek:0,tension:0,teeth:0,irisScale:1,lowerTeeth:0,tongue:.28},
  angry:{browTop:[.11,.25,.47,.56],browBottom:[-.06,.05,.19,.32],upper:[-.025,.035,.22,.27],lower:[-.025,-.42,-.42,.27],lipTop:[-.40,-.29,-.29,-.40],lipBottom:[-.40,-.34,-.34,-.40],mouthWidth:.22,irisX:-.088,irisY:.016,browLift:.006,cheek:.13,tension:.85,teeth:0,irisScale:1,lowerTeeth:0,tongue:0},
  attack:{browTop:[.12,.24,.51,.58],browBottom:[-.065,.03,.19,.32],upper:[-.038,.02,.24,.27],lower:[-.038,-.37,-.34,.27],lipTop:[-.55,-.36,-.36,-.55],lipBottom:[-.55,-.74,-.74,-.55],mouthWidth:.43,irisX:-.105,irisY:.016,browLift:.015,cheek:.08,tension:1,teeth:.36,irisScale:1,lowerTeeth:0,tongue:.38}
};
export function cubic(c:Curve,u:number) {
  const v=1-u;
  return v*v*v*c[0]+3*v*v*u*c[1]+3*v*u*u*c[2]+u*u*u*c[3];
}
