import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { terrainData, heightAt, WORLD_SIZE } from "../core/terrain";
import {makeGroundLighting} from "./GroundLighting";
import {addValleyArt,valleyGroundColor,valleyRockGeometry} from "./ValleyArt";
import {addRockArch} from "./RockArch";
import {addPondStudy} from "./PondStudy";
import {clearRoutePosition} from '../core/valleyRoute';
export function createWorld(scene: THREE.Scene, world: RAPIER.World) {
  const { vertices, indices } = terrainData();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const colors = new Float32Array(vertices.length);
  const color = new THREE.Color();
  for (let i = 0; i < vertices.length; i += 3) {
    const x=vertices[i],y=vertices[i+1],z=vertices[i+2];
    color.copy(valleyGroundColor(x,y,z));
    colors.set([color.r, color.g, color.b], i);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const lighting=makeGroundLighting();
  const mesh = new THREE.Mesh(
    geometry,
    lighting.material,
  );
  mesh.name="valley-ground";
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
  const art=addValleyArt(scene,world);
  const pond=addPondStudy(scene,world);
  addRockArch(scene,world);
  // Sparse collision targets: original primitive geometry, no third-party assets.
  for (const [originalX, originalZ, r] of [
    [12, 6, 1.8],
    [-12, -14, 2],
    [22, -18, 2.4],
    [-25, 20, 1.6],
  ]) {
    const {x,z}=clearRoutePosition(originalX,originalZ,r);
    const rock = new THREE.Mesh(
      valleyRockGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors:true, roughness: 0.9 }),
    );
    rock.scale.setScalar(r);
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
  return {...lighting,art,pond};
}
