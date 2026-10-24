import * as T from "three";
import { FaceState } from "./FaceState";
import type { FaceAtlas } from "./FaceAtlas";
export const EXPRESSIONS = [
  "neutral",
  "sly",
  "irritated",
  "rage",
  "delighted",
  "scared",
  "shocked",
  "proud",
  "dizzy",
  "stunned",
  "unhinged",
  "sleepy",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];
// Eye shapes, brows and mouth are independent interchangeable atlas parts.
export const FACE_POSES: Record<
  Expression,
  { eyes: [number, number]; brow: number; mouth: number }
> = {
  neutral: { eyes: [0, 0], brow: 0, mouth: 0 },
  sly: { eyes: [1, 1], brow: 1, mouth: 0 },
  irritated: { eyes: [1, 1], brow: 2, mouth: 0 },
  rage: { eyes: [2, 2], brow: 2, mouth: 2 },
  delighted: { eyes: [0, 0], brow: 0, mouth: 1 },
  scared: { eyes: [3, 3], brow: 3, mouth: 2 },
  shocked: { eyes: [3, 3], brow: 3, mouth: 3 },
  proud: { eyes: [1, 1], brow: 0, mouth: 0 },
  dizzy: { eyes: [3, 3], brow: 3, mouth: 3 },
  stunned: { eyes: [0, 0], brow: 3, mouth: 3 },
  unhinged: { eyes: [1, 3], brow: 1, mouth: 1 },
  sleepy: { eyes: [1, 1], brow: 0, mouth: 3 },
};
const fallback: FaceAtlas = {
  texture: new T.Texture(),
  width: 1448,
  height: 1086,
  eyes: [
    [72, 87, 260, 305],
    [399, 218, 300, 168],
    [755, 225, 330, 154],
    [1146, 104, 275, 292],
  ],
  brows: [
    [26, 543, 322, 119],
    [385, 535, 324, 126],
    [738, 538, 334, 139],
    [1107, 534, 322, 126],
  ],
  mouths: [
    [50, 839, 293, 105],
    [414, 791, 291, 210],
    [776, 803, 324, 195],
    [1203, 806, 160, 190],
  ],
};
/** Curved independent RGBA parts on the front hemisphere; never a billboard or backing plate. */
export class FaceRig extends T.Group {
  readonly eyes: T.Mesh<T.BufferGeometry, T.ShaderMaterial>[] = [];
  readonly lids: T.Mesh[] = [];
  readonly crosses: T.Group[] = [];
  readonly spirals: T.Mesh[] = [];
  readonly stunWhites: T.Mesh[] = [];
  private brow: T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
  private mouth: T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
  private unhinged = 0;
  private smileStroke: T.Mesh;
  private smileRim: T.Mesh;
  /** Used only by the read-only developer art review, never a player skin editor. */
  reviewExpression: Expression | null = null;
  constructor(
    readonly state: FaceState,
    color: string,
    private atlas: FaceAtlas = fallback,
  ) {
    super();
    const dark = new T.MeshBasicMaterial({
      color: 0x332a35,
      toneMapped: false,
    });
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? -0.335 : 0.335;
      const eye = this.patch(x, 0.32, 0.66, 0.72, atlas.eyes[0], i === 1);
      eye.name = "eye-" + i;
      this.eyes.push(eye);
      this.add(eye);
      // A neutral crease reveals the actual patterned body beneath closed eyes.
      const points = [];
      for (let j = 0; j <= 16; j++) {
        const px = x + (j / 16 - 0.5) * 0.42,
          py = 0.32 - 0.025 * Math.sin((j / 16) * Math.PI);
        points.push(this.surface(px, py, 0.028));
      }
      const lid = new T.Mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 16, 0.012, 5, false),
        new T.MeshBasicMaterial({
          color: new T.Color(color).multiplyScalar(0.38),
          toneMapped: false,
        }),
      );
      lid.visible = false;
      lid.name = "closed-lid-" + i;
      this.lids.push(lid);
      this.add(lid);
      const whiteGeometry = new T.CircleGeometry(1, 40),
        wp = whiteGeometry.attributes.position;
      for (let k = 0; k < wp.count; k++) {
        const v = this.surface(
          x + wp.getX(k) * 0.23,
          0.32 + wp.getY(k) * 0.28,
          0.026,
        );
        wp.setXYZ(k, v.x, v.y, v.z);
      }
      const stunWhite = new T.Mesh(
        whiteGeometry,
        new T.MeshBasicMaterial({ color: 0xfff5de, toneMapped: false }),
      );
      stunWhite.visible = false;
      stunWhite.name = "stun-white-" + i;
      this.stunWhites.push(stunWhite);
      this.add(stunWhite);
      const cross = new T.Group();
      cross.name = "stun-eye-" + i;
      for (const sign of [-1, 1]) {
        const pts = [];
        for (let j = 0; j <= 8; j++) {
          const d = (j / 8 - 0.5) * 0.33;
          pts.push(this.surface(x + d, 0.32 + sign * d, 0.045));
        }
        cross.add(
          new T.Mesh(
            new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.019, 5, false),
            dark,
          ),
        );
      }
      const spiralPoints = [];
      for (let j = 0; j <= 70; j++) {
        const a = (j / 70) * Math.PI * 5,
          r = 0.016 + (j / 70) * 0.16;
        spiralPoints.push(
          this.surface(x + Math.cos(a) * r, 0.32 + Math.sin(a) * r, 0.045),
        );
      }
      const spiral = new T.Mesh(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(spiralPoints),
          70,
          0.011,
          5,
          false,
        ),
        dark,
      );
      spiral.visible = false;
      spiral.name = "dizzy-spiral-" + i;
      this.spirals.push(spiral);
      this.add(spiral);
      cross.visible = false;
      this.crosses.push(cross);
      this.add(cross);
    }
    this.brow = this.patch(0, 0.64, 1.05, 0.32, atlas.brows[0]);
    this.brow.material.uniforms.feature.value = 1;
    this.brow.name = "brows";
    this.add(this.brow);
    this.mouth = this.patch(0, -0.40, 0.88, 0.48, atlas.mouths[0]);
    this.mouth.name = "mouth";
    this.add(this.mouth);
    const smilePoints = [];
    for (let j = 0; j <= 28; j++) {
      const x = (j / 28 - 0.5) * 0.60;
      smilePoints.push(this.surface(x, -0.40 + 0.11 * (x / 0.30) ** 2, 0.032));
    }
    this.smileStroke = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(smilePoints),
        28,
        0.018,
        6,
        false,
      ),
      new T.MeshBasicMaterial({ color: 0x291208, toneMapped: false }),
    );
    this.smileRim = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          smilePoints.map((p) => p.clone().add(new T.Vector3(0, 0, -0.016))),
        ),
        28,
        0.028,
        6,
        false,
      ),
      new T.MeshBasicMaterial({
        color: 0xd8b88e,
        toneMapped: false,
        transparent: true,
        opacity: 0.45,
      }),
    );
    this.smileRim.name = "mouth-crease-rim";
    this.add(this.smileRim);
    this.smileStroke.name = "mouth-crease";
    this.add(this.smileStroke);
  }
  private surface(x: number, y: number, offset = 0.02) {
    return new T.Vector3(
      x,
      y,
      Math.sqrt(Math.max(0.001, 1 - x * x - y * y)) + offset,
    );
  }
  private patch(
    x: number,
    y: number,
    w: number,
    h: number,
    rect: number[],
    mirror = false,
  ) {
    const g = new T.PlaneGeometry(w, h, 14, 12),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = this.surface(p.getX(i) + x, p.getY(i) + y);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms: {
        map: { value: this.atlas.texture },
        rect: { value: new T.Vector4() },
        open: { value: 1 },
        mirror: { value: mirror ? 1 : 0 },
        flipY: { value: 0 },
        feature: { value: 0 },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `uniform sampler2D map;uniform vec4 rect;uniform float open;uniform float mirror;uniform float flipY;uniform float feature;varying vec2 vUv;
  void main(){if(vUv.y>open || open<.015)discard;vec2 uv=vec2(mix(vUv.x,1.-vUv.x,mirror),mix(vUv.y,1.-vUv.y,flipY));vec2 tc=rect.xy+uv*rect.zw;vec4 c=texture2D(map,tc);vec2 d=vec2(2./1448.,2./1086.);float coverage=min(min(texture2D(map,tc+d).a,texture2D(map,tc-d).a),min(texture2D(map,tc+vec2(d.x,-d.y)).a,texture2D(map,tc+vec2(-d.x,d.y)).a));c.a=min(c.a,coverage);if(c.a<.35){
    if(feature>.5&&feature<1.5){vec2 e=vec2(7./1448.,7./1086.);float rim=max(max(texture2D(map,tc+vec2(e.x,0.)).a,texture2D(map,tc-vec2(e.x,0.)).a),max(texture2D(map,tc+vec2(0.,e.y)).a,texture2D(map,tc-vec2(0.,e.y)).a));if(rim<.5)discard;c=vec4(.50,.40,.28,rim*.4);}
    else discard;
  }
  bool rimPixel=c.a<.66&&feature>.5&&feature<1.5;
  float l=dot(c.rgb,vec3(.2126,.7152,.0722));
  if(rimPixel){}else if(feature<.5){
    float white=smoothstep(.16,.64,l);
    vec3 base=mix(vec3(.009,.005,.003),vec3(1.,.975,.90),white);
    float iris=1.-smoothstep(.86,1.05,length((uv-vec2(.55,.45))/vec2(.27,.38)));
    float colour=iris*smoothstep(.012,.04,l)*(1.-smoothstep(.28,.48,l));
    vec3 amber=vec3(.055+l*1.9,.012+l*.65,.004+l*.12);
    c.rgb=mix(base,amber,colour);
  }else if(feature<1.5){c.rgb=vec3(.016,.006,.003)+l*vec3(.36,.16,.055);}
  else if(feature<2.5){
    vec3 inside=vec3(.035,.003,.008)+l*vec3(1.35,.24,.38);
    c.rgb=mix(inside,vec3(1.,.965,.85),smoothstep(.35,.62,l));
  }else{c.rgb=vec3(.018,.006,.003)+l*vec3(.15,.055,.025);}
  gl_FragColor=c;
  #include <colorspace_fragment>
  }`,
    });
    const mesh = new T.Mesh(g, material);
    mesh.userData = { x, y, maxW: w, maxH: h };
    this.setRect(mesh, rect);
    return mesh;
  }
  private setRect(
    mesh: T.Mesh<T.BufferGeometry, T.ShaderMaterial>,
    r: number[],
  ) {
    const key = r.join(",");
    if (mesh.userData.rect !== key) {
      mesh.userData.rect = key;
      const ratio = r[3] / r[2],
        w = Math.min(mesh.userData.maxW, mesh.userData.maxH / ratio),
        h = w * ratio;
      mesh.userData.width = w;
      mesh.userData.height = h;
      const p = mesh.geometry.attributes.position,
        uv = mesh.geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const v = this.surface(
          mesh.userData.x + (uv.getX(i) - 0.5) * w,
          mesh.userData.y + (uv.getY(i) - 0.5) * h,
        );
        p.setXYZ(i, v.x, v.y, v.z);
      }
      p.needsUpdate = true;
    }
    mesh.material.uniforms.rect.value.set(
      r[0] / this.atlas.width,
      1 - (r[1] + r[3]) / this.atlas.height,
      r[2] / this.atlas.width,
      r[3] / this.atlas.height,
    );
  }
  impact() {
    this.unhinged = 0.85;
  }
  expression(): Expression {
    if (this.reviewExpression) return this.reviewExpression;
    if (this.state.stun > 0) return "stunned";
    if (this.state.reaction && this.state.weight > 0.2)
      return this.state.reaction === "joy"
        ? "delighted"
        : this.state.reaction === "rage"
          ? "rage"
          : "shocked";
    return this.state.baseMood === "grumpy"
      ? "irritated"
      : this.state.baseMood === "worried"
        ? "scared"
        : "sly";
  }
  update(dt: number, heading: number) {
    this.unhinged = Math.max(0, this.unhinged - dt);
    const t = this.state.time;
    this.rotation.set(
      this.unhinged ? Math.sin(t * 29) * this.unhinged * 0.7 : 0,
      heading + (this.unhinged ? Math.sin(t * 22) * this.unhinged * 2 : 0),
      this.unhinged ? Math.sin(t * 35) * this.unhinged : 0,
    );
    const expression = this.expression(),
      pose = FACE_POSES[expression],
      stunned = expression === "stunned" || expression === "dizzy";
    const blink = stunned ? 0 : this.state.blink,
      closed = blink >= 0.985;
    for (let i = 0; i < 2; i++) {
      this.setRect(this.eyes[i], this.atlas.eyes[pose.eyes[i]]);
      this.eyes[i].visible = !stunned && !closed;
      this.eyes[i].material.uniforms.open.value = 1 - blink;
      this.lids[i].visible = !stunned && blink > 0.82;
      this.stunWhites[i].visible = stunned;
      this.crosses[i].visible = expression === "stunned";
      this.spirals[i].visible = expression === "dizzy";
    }
    this.setRect(this.brow, this.atlas.brows[pose.brow]);
    this.setRect(this.mouth, this.atlas.mouths[pose.mouth]);
    this.mouth.material.uniforms.feature.value = pose.mouth === 0 ? 3 : 2;
    this.mouth.visible = pose.mouth !== 0;
    this.smileStroke.visible = pose.mouth === 0;
    this.smileRim.visible = pose.mouth === 0;
    if (this.smileStroke.userData.frown !== (expression === "irritated")) {
      this.smileStroke.userData.frown = expression === "irritated";
      const points = [];
      for (let j = 0; j <= 28; j++) {
        const x = (j / 28 - 0.5) * 0.60;
        const y =
          expression === "irritated"
            ? -0.29 - 0.11 * (x / 0.30) ** 2
            : -0.40 + 0.11 * (x / 0.30) ** 2;
        points.push(this.surface(x, y, 0.032));
      }
      this.smileStroke.geometry.dispose();
      this.smileRim.geometry.dispose();
      this.smileRim.geometry = new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => p.clone().add(new T.Vector3(0, 0, -0.016))),
        ),
        28,
        0.028,
        6,
        false,
      );
      this.smileStroke.geometry = new T.TubeGeometry(
        new T.CatmullRomCurve3(points),
        28,
        0.018,
        6,
        false,
      );
    }
    this.mouth.material.uniforms.flipY.value =
      expression === "irritated" ? 1 : 0;
    const b = this.brow.geometry.attributes.position;
    // Small asymmetric motion stays on the sphere, without rotating a plane off its surface.
    const dy = Math.sin(t * 1.73 + Math.sin(t * 0.81)) * 0.006;
    for (let i = 0; i < b.count; i++) {
      const y =
        0.64 +
        (this.brow.geometry.attributes.uv.getY(i) - 0.5) *
          this.brow.userData.height +
        dy;
      const x = b.getX(i);
      b.setY(i, y);
      b.setZ(i, this.surface(x, y).z);
    }
    b.needsUpdate = true;
  }
}
