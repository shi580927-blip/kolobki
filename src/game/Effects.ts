import * as T from "three";
export class Effects {
  private items: {
    mesh: T.Mesh;
    velocity: T.Vector3;
    life: number;
    total: number;
  }[] = [];
  constructor(private scene: T.Scene) {}
  burst(position: T.Vector3) {
    for (let i = 0; i < 24; i++) {
      const dust = i % 3 === 0;
      const geometry = dust
        ? new T.IcosahedronGeometry(0.16, 0)
        : new T.OctahedronGeometry(0.11, 0);
      const mesh = new T.Mesh(
        geometry,
        new T.MeshBasicMaterial({
          color: dust ? 0xead6aa : i % 2 ? 0xffd556 : 0xffffff,
          transparent: true,
        }),
      );
      mesh.position.copy(position);
      this.scene.add(mesh);
      const life = 0.35 + Math.random() * 0.4;
      this.items.push({
        mesh,
        velocity: new T.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 6,
          (Math.random() - 0.5) * 8,
        ),
        life,
        total: life,
      });
    }
    const ring = new T.Mesh(
      new T.TorusGeometry(1, 0.05, 5, 40),
      new T.MeshBasicMaterial({ color: 0xfff0af, transparent: true }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position);
    this.scene.add(ring);
    this.items.push({
      mesh: ring,
      velocity: new T.Vector3(),
      life: 0.3,
      total: 0.3,
    });
    while (this.items.length > 80) this.remove(0);
  }
  private remove(i: number) {
    const item = this.items[i];
    this.scene.remove(item.mesh);
    item.mesh.geometry.dispose();
    (item.mesh.material as T.Material).dispose();
    this.items.splice(i, 1);
  }
  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.remove(i);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= dt * 9;
      const f = p.life / p.total;
      (p.mesh.material as T.MeshBasicMaterial).opacity = f;
      if (p.mesh.geometry.type === "TorusGeometry")
        p.mesh.scale.setScalar(1 + (1 - f) * 4);
      else p.mesh.scale.setScalar(0.6 + f);
    }
  }
}
