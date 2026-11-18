/** Shared, world-scale quadrilateral stone relief. Colour and bevel normals
 * are procedural: large ledges remain real geometry, fine joints need no new meshes. */
export const STONE_RELIEF_GLSL=`
 float stoneHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 vec3 stoneTiles(vec2 p){
  p*=.55;
  p+=vec2(.16*sin(p.y*2.1)+.06*sin(p.y*4.3+p.x*.6),.15*sin(p.x*2.2)+.065*sin(p.x*4.8+p.y*.8));
  float row=floor(p.y);p.x=p.x*(.82+.36*stoneHash(vec2(row,3.)))+stoneHash(vec2(row,7.))*.7;
  vec2 cell=floor(p),f=fract(p);
  float id=stoneHash(cell),dent=stoneHash(cell+19.);
  vec2 sides=min(f,1.-f);float edge=min(sides.x,sides.y);
  float chip=.035+.12*stoneHash(cell+31.);
  edge=min(edge,(min(f.x+f.y,2.-f.x-f.y)-chip)*.707);
  edge=min(edge,(min(f.x+1.-f.y,1.-f.x+f.y)-chip*.7)*.707);
  edge+=.018*sin(f.x*16.+id*20.)*sin(f.y*13.+id*15.);
  float aa=max(.004,fwidth(edge)*.55);
  float joint=smoothstep(.012,.032+aa,edge);
  float bevel=smoothstep(.014,.105,edge);
  float dish=1.-smoothstep(.08,.42,length((f-.5)*vec2(1.,1.3)));
  float height=bevel*(.35+.65*dent)*(dent<.17?.45:1.)*(1.-.16*dish);
  float shade=mix(.48,.85+.24*id,joint)*(.96+.04*bevel);
  return vec3(height,shade,id);
 }
 vec3 stoneRelief(vec3 p,vec3 n,vec2 front){
  vec3 w=pow(abs(n),vec3(6.));w/=max(.0001,w.x+w.y+w.z);
  return stoneTiles(p.zy)*w.x+stoneTiles(p.xz)*w.y+stoneTiles(front)*w.z;
 }
 vec3 stoneReliefNormal(vec3 surface,vec3 n,float height){
  vec3 a=dFdx(surface),b=dFdy(surface),r1=cross(b,n),r2=cross(n,a);
  float determinant=dot(a,r1);
  return normalize(max(.000001,abs(determinant))*n-sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2));
 }
`;
