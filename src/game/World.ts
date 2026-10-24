import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { terrainData, heightAt, WORLD_SIZE } from "../core/terrain";
export function createWorld(scene: THREE.Scene, world: RAPIER.World) {
  const { vertices, indices } = terrainData();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const colors = new Float32Array(vertices.length);
  const color = new THREE.Color();
  for (let i = 0; i < vertices.length; i += 3) {
    color.setHSL(
      0.29 + vertices[i + 1] * 0.001,
      0.3,
      0.34 + vertices[i + 1] * 0.004,
      THREE.SRGBColorSpace,
    );
    colors.set([color.r, color.g, color.b], i);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  mesh.receiveShadow = true;
  scene.add(mesh);
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.85),
  );
  for (const [x, z] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const d = RAPIER.ColliderDesc.cuboid(
      x ? 1 : WORLD_SIZE / 2,
      30,
      z ? 1 : WORLD_SIZE / 2,
    ).setTranslation((x * WORLD_SIZE) / 2, 0, (z * WORLD_SIZE) / 2);
    world.createCollider(d);
  }
  // Sparse collision targets: original primitive geometry, no third-party assets.
  for (const [x, z, r] of [
    [12, 6, 1.8],
    [-12, -14, 2],
    [22, -18, 2.4],
    [-25, 20, 1.6],
  ]) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 1),
      new THREE.MeshStandardMaterial({ color: 0x8c9c87, roughness: 0.95 }),
    );
    rock.position.set(x, heightAt(x, z) + r * 0.6, z);
    rock.castShadow = true;
    scene.add(rock);
    world.createCollider(
      RAPIER.ColliderDesc.ball(r).setTranslation(
        rock.position.x,
        rock.position.y,
        rock.position.z,
      ),
    );
  }
}
