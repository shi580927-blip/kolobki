/** Radial dead zone preserves diagonals and a continuous low-speed range. */
export function joystickAxes(x:number,z:number){
  const length=Math.hypot(x,z);if(length<=.12)return {x:0,z:0};
  const strength=Math.min(1,(length-.12)/.88);
  return {x:x/length*strength,z:z/length*strength};
}
export class Input {
  x = 0;
  z = 0;
  jump = false;
  dash = false;
  touchDrive = false;
  private keys = new Set<string>();
  private touchX = 0;
  private touchZ = 0;
  constructor() {
    addEventListener("keydown", (e) => {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (!e.repeat) {
        if (e.code === "Space") this.jump = true;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.dash = true;
      }
      if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))this.touchDrive=false;
      this.keys.add(e.code);
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    const stick = document.querySelector<HTMLElement>("#stick")!;
    let pointer: number | null = null;
    const clear = () => {
      const held=pointer;pointer=null;
      if(held!==null&&stick.hasPointerCapture(held))stick.releasePointerCapture(held);
      this.keys.clear();
      this.touchX = this.touchZ = 0;
      this.jump = this.dash = false;
      this.drawKnob();
    };
    addEventListener("blur", clear);
    addEventListener("sharobesy-controls-change",clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const r = stick.getBoundingClientRect(),
        dx = (e.clientX - r.left - r.width / 2) / (r.width / 2),
        dy = (e.clientY - r.top - r.height / 2) / (r.height / 2),
        axes=joystickAxes(dx,dy);
      this.touchX = axes.x;
      this.touchZ = axes.z;
      this.drawKnob();
    };
    stick.addEventListener("pointerdown", (e) => {
      if (pointer !== null) return;
      pointer = e.pointerId;
      this.touchDrive=true;
      stick.setPointerCapture(pointer);
      move(e);
    });
    stick.addEventListener("pointermove", move);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      this.touchX = this.touchZ = 0;
      this.drawKnob();
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
    stick.addEventListener("lostpointercapture", end);
    document
      .querySelector("#jump")!
      .addEventListener("pointerdown", () => (this.jump = true));
    document
      .querySelector("#dash")!
      .addEventListener("pointerdown", () => (this.dash = true));
  }
  private drawKnob() {
    document.querySelector<HTMLElement>("#knob")!.style.transform =
      `translate(${this.touchX * 51}px,${this.touchZ * 51}px)`;
  }
  sample() {
    this.x =
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")) +
      this.touchX;
    this.z =
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) +
      this.touchZ;
    const n = Math.max(1, Math.hypot(this.x, this.z));
    this.x /= n;
    this.z /= n;
  }
}
