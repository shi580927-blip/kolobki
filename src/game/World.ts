import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { terrainData, heightAt, WORLD_SIZE } from "../core/terrain";
import {randomFrom} from "../core/skin";
export function createWorld(scene: THREE.Scene, world: RAPIER.World) {
  const { vertices, indices } = terrainData();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const colors = new Float32Array(vertices.length);
  const color = new THREE.Color();
  for (let i = 0; i < vertices.length; i += 3) {
    const x=vertices[i],y=vertices[i+1],z=vertices[i+2],patch=Math.sin(x*.11)*Math.cos(z*.09)*.035;
    color.setHSL(.27+patch+y*.0009,.30,.50+y*.004,THREE.SRGBColorSpace);
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
  addValleyScenery(scene,world);
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

/** First color/layout pass: keep the center open for rolling and future trains. */
function addValleyScenery(scene:THREE.Scene,world:RAPIER.World){
 const random=randomFrom(7391),count=18,trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.3,.44,2.7,7),new THREE.MeshStandardMaterial({color:'#927054',roughness:1}),count),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#7caa68',roughness:1}),count*3),dummy=new THREE.Object3D();trunks.castShadow=true;crowns.castShadow=true;
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2,radius=44+random()*22,x=Math.cos(a)*radius,z=Math.sin(a)*radius,y=heightAt(x,z),size=.85+random()*.45;dummy.position.set(x,y+1.35*size,z);dummy.scale.setScalar(size);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);world.createCollider(RAPIER.ColliderDesc.cylinder(1.35*size,.4*size).setTranslation(x,y+1.35*size,z));
  for(let j=0;j<3;j++){dummy.position.set(x+(j-1)*.9*size,y+(3.1+(j===1?.7:0))*size,z+(j===1?.2:0));dummy.scale.set(1.6*size,1.7*size,1.5*size);dummy.updateMatrix();crowns.setMatrixAt(i*3+j,dummy.matrix);crowns.setColorAt(i*3+j,new THREE.Color().setHSL(.23+random()*.04,.27,.45+random()*.12));}}
 scene.add(trunks,crowns);
 const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.16,0),new THREE.MeshStandardMaterial({color:'#e9d8a3',roughness:.85}),100);
 for(let i=0;i<100;i++){const a=random()*Math.PI*2,r=22+random()*52,x=Math.cos(a)*r,z=Math.sin(a)*r;dummy.position.set(x,heightAt(x,z)+.13,z);dummy.scale.set(.8+random()*.5,.65,.8+random()*.5);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);flowers.setColorAt(i,new THREE.Color(i%3===0?'#d5b7d0':'#eee1b1'));}scene.add(flowers);
}
