export class Input {
  x = 0;
  z = 0;
  jump = false;
  dash = false;
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
      this.keys.add(e.code);
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    const clear = () => {
      this.keys.clear();
      this.touchX = this.touchZ = 0;
      this.jump = this.dash = false;
      this.drawKnob();
    };
    addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    const stick = document.querySelector<HTMLElement>("#stick")!;
    let pointer: number | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const r = stick.getBoundingClientRect(),
        dx = (e.clientX - r.left - r.width / 2) / (r.width / 2),
        dy = (e.clientY - r.top - r.height / 2) / (r.height / 2),
        n = Math.max(1, Math.hypot(dx, dy));
      this.touchX = dx / n;
      this.touchZ = dy / n;
      this.drawKnob();
    };
    stick.addEventListener("pointerdown", (e) => {
      if (pointer !== null) return;
      pointer = e.pointerId;
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
      `translate(${this.touchX * 37}px,${this.touchZ * 37}px)`;
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
