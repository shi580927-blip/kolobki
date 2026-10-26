import type { Vector3 } from "three";
export interface GameEvents {
  train_attach: {id:number;count:number;position:Vector3};
  train_break: {ids:number[];count:number;reason:string;position:Vector3};
  npc_impact: {id:number;position:Vector3;strength:number};
  berry_pickup: { position: Vector3; count: number; total: number };
  ring_collected: { position: Vector3; count: number; total: number };
  player_jump: {};
  player_dash: {};
  impact_major: { position: Vector3; strength: number; source?: "collision"|"landing"; closingSpeed?:number; severity?:number };
  face_unhinged: { duration: number };
  combo: { count: number };
  capture_moment: { time: number };
}
export class EventBus {
  private listeners = new Map<keyof GameEvents, Set<(data: never) => void>>();
  on<K extends keyof GameEvents>(name: K, fn: (data: GameEvents[K]) => void) {
    const set = this.listeners.get(name) ?? new Set();
    set.add(fn as (data: never) => void);
    this.listeners.set(name, set);
    return () => set.delete(fn as (data: never) => void);
  }
  emit<K extends keyof GameEvents>(name: K, data: GameEvents[K]) {
    this.listeners.get(name)?.forEach((fn) => fn(data as never));
  }
}
