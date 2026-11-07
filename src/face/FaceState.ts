export type Mood = "sly" | "grumpy" | "worried";
export type Reaction = "joy" | "rage" | "shock";
/** v03: reaction envelope never replaces the persistent character. Times in seconds. */
export class FaceState {
  time = 0;
  blink = 0;
  stun = 0;
  reaction: Reaction | null = null;
  phase: "IN" | "HOLD" | "OUT" | "IDLE" = "IDLE";
  weight = 0;
  private elapsed = 0;
  private hold = 0.6;
  private blinkTime = -1;
  private nextBlink: number;
  constructor(
    readonly baseMood: Mood,
    private random = Math.random,
  ) {
    this.nextBlink = 1.8 + random() * 3;
  }
  react(name: Reaction, hold = 0.6) {
    if (this.stun > 0) return;
    this.reaction = name;
    this.elapsed = 0;
    this.hold = hold;
    this.phase = "IN";
  }
  knockOut(seconds = 0.9) {
    this.stun = seconds;
    this.blink = 0;
    this.blinkTime = -1;
    this.reaction = null;
    this.phase = "IDLE";
    this.weight = 0;
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt < 0) return;
    this.time += dt;
    if (this.stun > 0) {
      this.stun = Math.max(0, this.stun - dt);
      this.blink = 0;
      this.nextBlink = this.time + 1.8 + this.random() * 3;
      return;
    }
    if (this.reaction) {
      this.elapsed += dt;
      const t = this.elapsed;
      if (t < 0.16) {
        this.phase = "IN";
        this.weight = t / 0.16;
      } else if (t < 0.16 + this.hold) {
        this.phase = "HOLD";
        this.weight = 1;
      } else if (t < 0.4 + this.hold) {
        this.phase = "OUT";
        this.weight = 1 - (t - 0.16 - this.hold) / 0.24;
      } else {
        this.phase = "IDLE";
        this.weight = 0;
        this.reaction = null;
      }
    }
    if (this.blinkTime < 0 && this.time >= this.nextBlink)
      this.blinkTime = this.time - this.nextBlink;
    else if (this.blinkTime >= 0) this.blinkTime += dt;
    if (this.blinkTime >= 0) {
      const t = this.blinkTime;
      this.blink =
        t < 0.15 ? t / 0.15 : t < 0.25 ? 1 : Math.max(0, 1 - (t - 0.25) / 0.15);
      if (t >= 0.4) {
        this.blinkTime = -1;
        this.blink = 0;
        this.nextBlink = this.time + 1.8 + this.random() * 3;
      }
    }
  }
}
