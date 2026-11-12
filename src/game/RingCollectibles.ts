import {
  Mesh,
  MeshStandardMaterial,
  Scene,
  TorusGeometry,
  Vector3,
} from "three";
import { heightAt } from "../core/terrain";
import type { EventBus } from "../core/events";

/** Swept sphere triggers: a fast dash cannot skip a collectible between steps. */
export class RingCollectibles {
  readonly total = 12;
  count = 0;
  private readonly rings: { mesh: Mesh; collected: boolean }[] = [];
  private readonly offset = new Vector3();
  private readonly segment = new Vector3();
  private readonly closest = new Vector3();
  constructor(
    scene: Scene,
    private readonly bus: EventBus,
  ) {
    const geometry = new TorusGeometry(1, 0.12, 8, 32);
    const material = new MeshStandardMaterial({
      color: 0xf3cf74,
      emissive: 0x7c4d0c,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });
    for (let i = 0; i < this.total; i++) {
      const x = Math.sin(i * 0.9) * 28,
        z = -8 - i * 4;
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, heightAt(x, z) + 1.6, z);
      scene.add(mesh);
      this.rings.push({ mesh, collected: false });
    }
  }
  checkSegment(from: Vector3, to: Vector3) {
    this.segment.subVectors(to, from);
    const lengthSquared = this.segment.lengthSq();
    for (const ring of this.rings) {
      if (ring.collected) continue;
      const t =
        lengthSquared > 0
          ? Math.max(
              0,
              Math.min(
                1,
                this.offset
                  .subVectors(ring.mesh.position, from)
                  .dot(this.segment) / lengthSquared,
              ),
            )
          : 0;
      this.closest.copy(from).addScaledVector(this.segment, t);
      if (this.closest.distanceToSquared(ring.mesh.position) > 1.75 ** 2)
        continue;
      ring.collected = true;
      ring.mesh.visible = false;
      this.count++;
      this.bus.emit("ring_collected", {
        position: ring.mesh.position.clone(),
        count: this.count,
        total: this.total,
      });
    }
  }
  reset() {
    this.count = 0;
    for (const ring of this.rings) {
      ring.collected = false;
      ring.mesh.visible = true;
    }
  }
}
