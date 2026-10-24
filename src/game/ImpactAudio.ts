/** Original synthesized impact; no external audio assets or network. */
export class ImpactAudio {
  private context: AudioContext | null = null;
  constructor() {
    const unlock = () => {
      this.context ??= new AudioContext();
      void this.context.resume();
    };
    addEventListener("pointerdown", unlock, { once: true });
    addEventListener("keydown", unlock, { once: true });
  }
  play() {
    const c = this.context;
    if (!c || c.state !== "running") return;
    const t = c.currentTime,
      gain = c.createGain(),
      oscillator = c.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(150, t);
    oscillator.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    oscillator.connect(gain).connect(c.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.21);
  }
  collect() {
    const c = this.context;
    if (!c || c.state !== "running") return;
    for (const [offset, frequency] of [
      [0, 740],
      [0.075, 1110],
    ]) {
      const t = c.currentTime + offset,
        gain = c.createGain(),
        tone = c.createOscillator();
      tone.type = "sine";
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      tone.connect(gain).connect(c.destination);
      tone.start(t);
      tone.stop(t + 0.16);
    }
  }
}
