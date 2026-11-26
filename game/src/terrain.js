// terrain.js — the Merak archipelago: three islands, one sea, a sky.
// The ground height is one pure function, heightAt(x, z), shared by the mesh
// and by the flight model, so what you see is exactly what you can hit.
// Islands are Gaussian bumps with noise hills; the shore ring is sand, the
// slopes are grass and forest, the peaks are rock.
import * as THREE from 'three';
import { createNoise } from './random.js';

export const ISLANDS = [
  { name: 'Merak', x: 0, z: 0, radius: 720, peak: 105 },
  { name: 'Seroja', x: -1250, z: -850, radius: 460, peak: 85 },
  { name: 'Bintang', x: 1350, z: 950, radius: 520, peak: 100 },
];

export const RUNWAYS = [
  { island: 'Merak', x: 60, z: 120, heading: 0, length: 420, width: 26 },
  { island: 'Seroja', x: -1250, z: -850, heading: 0.6, length: 300, width: 22 },
  { island: 'Bintang', x: 1350, z: 950, heading: -0.5, length: 340, width: 22 },
];

function islandHeight(island, x, z, noise) {
  const dx = x - island.x;
  const dz = z - island.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= island.radius) return 0;
  const fall = Math.cos((d / island.radius) * Math.PI * 0.5);
  const hills = 0.75 + 0.5 * noise(x, z);
  return island.peak * fall * fall * hills;
}

export function createHeightAt(random) {
  const noise = createNoise(random);
  function rawHeight(x, z) {
    let h = 0;
    for (const island of ISLANDS) h += islandHeight(island, x, z, noise);
    // A low ridge across Merak so the skyline reads from the air.
    const ridge = 18 * Math.exp(-(((x + 260) ** 2) / (2 * 180 * 180) + ((z - 320) ** 2) / (2 * 260 * 260)));
    h += ridge * (islandHeight(ISLANDS[0], x, z, noise) > 4 ? 1 : 0);
    return h;
  }
  // Runways are flat: the ground under each strip (and a margin around it)
  // is levelled to the strip's own height, so a landing is a landing, not a
  // hillside. The mesh and the flight model share this one function.
  const stripHeights = RUNWAYS.map((strip) => rawHeight(strip.x, strip.z));
  return function heightAt(x, z) {
    let h = rawHeight(x, z);
    for (let i = 0; i < RUNWAYS.length; i += 1) {
      const strip = RUNWAYS[i];
      const cos = Math.cos(strip.heading);
      const sin = Math.sin(strip.heading);
      const dx = x - strip.x;
      const dz = z - strip.z;
      const along = dx * cos + dz * sin;
      const across = -dx * sin + dz * cos;
      const marginA = strip.length / 2 + 70;
      const marginC = strip.width / 2 + 70;
      if (Math.abs(along) < marginA && Math.abs(across) < marginC) {
        const tA = 1 - Math.max(0, (Math.abs(along) - strip.length / 2) / 70);
        const tC = 1 - Math.max(0, (Math.abs(across) - strip.width / 2) / 70);
        const t = Math.min(tA, tC);
        const smooth = t * t * (3 - 2 * t);
        h = h * (1 - smooth) + stripHeights[i] * smooth;
      }
    }
    return h;
  };
}

function colourFor(height, noiseValue) {
  const sand = new THREE.Color(0xd9c28a);
  const grass = new THREE.Color(0x5da24a);
  const forest = new THREE.Color(0x2f6b34);
  const rock = new THREE.Color(0x7d7468);
  const snow = new THREE.Color(0xf2f4f6);
  const out = new THREE.Color();
  if (height < 2.5) out.copy(sand);
  else if (height < 75) out.copy(grass).lerp(forest, Math.min(1, (height - 30) / 45));
  else if (height < 125) out.copy(forest).lerp(rock, (height - 75) / 50);
  else if (height < 150) out.copy(rock);
  else out.copy(rock).lerp(snow, Math.min(1, (height - 150) / 20));
  const shade = 0.92 + 0.16 * noiseValue;
  out.multiplyScalar(shade);
  return out;
}

export function createTerrain(scene, random, heightAt) {
  const noise = createNoise(random);
  const size = 4200;
  const segments = 200;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    // The sea floor dips just below the water so shores read as beaches.
    pos.setY(i, h > 0.4 ? h : -6 + h * 0.5);
    const c = colourFor(Math.max(0, h), noise(x, z));
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  scene.add(ground);

  // The sea: one calm plane at y = 0, slightly see-through at the shore.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ color: 0x2e7fb8, transparent: true, opacity: 0.94 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  scene.add(sea);

  // Runway strips: dark asphalt with a pale centre line and threshold bars.
  const stripGroup = new THREE.Group();
  for (const strip of RUNWAYS) {
    const y = Math.max(2, heightAt(strip.x, strip.z));
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(strip.length, strip.width),
      new THREE.MeshLambertMaterial({ color: 0x3a3f45 }),
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.rotation.z = -strip.heading;
    asphalt.position.set(strip.x, y + 1.0, strip.z);
    stripGroup.add(asphalt);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(strip.length * 0.92, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xf5f2e8 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -strip.heading;
    line.position.set(strip.x, y + 1.2, strip.z);
    stripGroup.add(line);
  }
  scene.add(stripGroup);

  // Low-poly trees and huts on Merak so the ground reads as lived-in.
  const treeTop = new THREE.ConeGeometry(7, 16, 6);
  const treeTopMat = new THREE.MeshLambertMaterial({ color: 0x2f6b34 });
  const trunkGeo = new THREE.CylinderGeometry(1.2, 1.6, 7, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const hutGeo = new THREE.BoxGeometry(12, 7, 10);
  const hutMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const roofGeo = new THREE.ConeGeometry(10, 6, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xb5502e });
  for (let i = 0; i < 90; i += 1) {
    const a = random.range(0, Math.PI * 2);
    const r = random.range(120, 640);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < 6 || h > 70) continue;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, h + 3.5, z);
    scene.add(trunk);
    const top = new THREE.Mesh(treeTop, treeTopMat);
    top.position.set(x, h + 14, z);
    scene.add(top);
    if (i % 9 === 0) {
      const hut = new THREE.Mesh(hutGeo, hutMat);
      hut.position.set(x + 14, h + 3.5, z + 8);
      hut.rotation.y = random.range(0, Math.PI);
      scene.add(hut);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(x + 14, h + 10, z + 8);
      roof.rotation.y = Math.PI / 4;
      scene.add(roof);
    }
  }

  // Clouds: flattened white puffs drifting slowly across the sky.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(random.next() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(random.range(14, 30), 10, 8), cloudMat);
      s.scale.y = 0.45;
      s.position.set(random.range(-40, 40), random.range(-4, 6), random.range(-16, 16));
      group.add(s);
    }
    group.position.set(random.range(-1900, 1900), random.range(190, 280), random.range(-1900, 1900));
    group.userData.speed = random.range(1.5, 4);
    scene.add(group);
    clouds.push(group);
  }

  return {
    update(dt) {
      for (const cloud of clouds) {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 2100) cloud.position.x = -2100;
      }
    },
  };
}
