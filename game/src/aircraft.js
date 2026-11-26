// aircraft.js — the Kestrel-9 courier plane, built from primitives only.
// Orange and cream livery, a spinning prop, a dark canopy, fixed gear that
// folds away with G. Nothing here is a borrowed model: every part is a box,
// cylinder or cone placed by hand, so the aircraft reads as built, not drawn.
import * as THREE from 'three';

export function createAircraft() {
  const group = new THREE.Group();
  const orange = new THREE.MeshLambertMaterial({ color: 0xe8641c });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf2e8d5 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1d3a4d });
  const metal = new THREE.MeshLambertMaterial({ color: 0x9aa2ab });

  // Fuselage: a long cylinder along Z, nose forward (-Z is forward here).
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.7, 7.2, 10), orange);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 10), cream);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.5;
  group.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 10), cream);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 4.6;
  group.add(tailCone);

  // Canopy: a dark half-dome the pilot looks out of.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.75, 1.7);
  canopy.position.set(0, 0.75, -1.4);
  group.add(canopy);

  // Main wing and tailplane: flat boxes with a slight taper faked by scale.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.28, 2.1), cream);
  wing.position.set(0, -0.15, -0.4);
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 2.1), orange);
  wingTipL.position.set(-5.7, -0.15, -0.4);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 5.7;
  group.add(wingTipR);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 1.4), cream);
  tailplane.position.set(0, 0.25, 4.9);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.1, 1.8), orange);
  fin.position.set(0, 1.1, 4.9);
  group.add(fin);

  // Propeller: a hub and two blades that spin with the throttle.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 8), metal);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.5, 4.6, 0.16);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  prop.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade2);
  prop.position.z = -5.6;
  group.add(prop);

  // Landing gear: two legs with wheels, hidden when the gear is up.
  const gear = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, metal);
    leg.position.set(side * 1.6, -1.2, -0.6);
    gear.add(leg);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(side * 1.6, -2.0, -0.6);
    gear.add(wheel);
  }
  group.add(gear);

  // Navigation lights: a red tip left, green tip right, white tail.
  const lightGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const lightL = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
  lightL.position.set(-5.95, -0.15, -0.4);
  group.add(lightL);
  const lightR = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x2aff66 }));
  lightR.position.set(5.95, -0.15, -0.4);
  group.add(lightR);

  return {
    group,
    setGearDown(down) {
      gear.visible = down;
    },
    // The prop spins faster with speed: the one moving part that sells flight.
    update(dt, speed) {
      prop.rotation.z += dt * (2 + speed * 0.9);
    },
  };
}
