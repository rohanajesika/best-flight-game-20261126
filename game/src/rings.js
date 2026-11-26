// rings.js — the glowing sky rings of the Ring Run mission.
// Eight rings in a loop over Merak island, each one a torus that faces the
// flight path. The next ring pulses orange; a flown ring turns green and
// stays green, so the course reads at a glance from the cockpit.
import * as THREE from 'three';
import { CONFIG } from './config.js';

const RING_COURSE = [
  { x: 420, y: 120, z: -260 },
  { x: 180, y: 90, z: -620 },
  { x: -320, y: 150, z: -540 },
  { x: -620, y: 110, z: -120 },
  { x: -480, y: 80, z: 380 },
  { x: -80, y: 140, z: 620 },
  { x: 380, y: 95, z: 480 },
  { x: 560, y: 130, z: 60 },
];

export function createRings(scene) {
  const geo = new THREE.TorusGeometry(CONFIG.ringRadius, CONFIG.ringTube, 12, 40);
  const nextMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
  const doneMat = new THREE.MeshBasicMaterial({ color: 0x2aff66 });
  const laterMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55 });
  const meshes = RING_COURSE.map((spot, i) => {
    const mesh = new THREE.Mesh(geo, i === 0 ? nextMat : laterMat);
    mesh.position.set(spot.x, spot.y, spot.z);
    // Face the ring toward the previous ring, so the course flows through it.
    const prev = RING_COURSE[(i + RING_COURSE.length - 1) % RING_COURSE.length];
    mesh.lookAt(prev.x, prev.y, prev.z);
    scene.add(mesh);
    return mesh;
  });
  // A small beacon light above the next ring, visible from far away.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(3, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8c1a }),
  );
  scene.add(beacon);

  let next = 0;
  return {
    count: RING_COURSE.length,
    get nextIndex() {
      return next;
    },
    get nextPosition() {
      return RING_COURSE[next] ?? null;
    },
    reset() {
      next = 0;
      meshes.forEach((mesh, i) => {
        mesh.material = i === 0 ? nextMat : laterMat;
      });
    },
    // Returns true when the plane just flew this ring.
    check(position) {
      if (next >= RING_COURSE.length) return false;
      const spot = RING_COURSE[next];
      const dx = position.x - spot.x;
      const dy = position.y - spot.y;
      const dz = position.z - spot.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < CONFIG.ringRadius * 0.9) {
        meshes[next].material = doneMat;
        next += 1;
        if (next < RING_COURSE.length) meshes[next].material = nextMat;
        return true;
      }
      return false;
    },
    update(time) {
      const pulse = 1 + 0.18 * Math.sin(time * 4);
      for (let i = 0; i < meshes.length; i += 1) {
        meshes[i].scale.setScalar(i === next ? pulse : 1);
      }
      if (next < RING_COURSE.length) {
        const spot = RING_COURSE[next];
        beacon.position.set(spot.x, spot.y + CONFIG.ringRadius + 12, spot.z);
        beacon.visible = true;
      } else {
        beacon.visible = false;
      }
    },
  };
}
