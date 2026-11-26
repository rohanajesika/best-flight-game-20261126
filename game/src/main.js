// main.js — boot and the one loop for Sky Courier: Island Run.
// Input is read every frame, the world advances in fixed 1/60 s steps, the
// renderer paints what is there. Screens: title, play, paused, over.
// ?seed=N fixes the world. ?shot=cover|rings|landing|win stages one scene
// for a screenshot instead of running the loop, paints it twice and sets
// window.__shotReady.
import * as THREE from 'three';
import { BEST_KEY, CONFIG, MISSION_DEFS } from './config.js';
import { createRandom } from './random.js';
import { createTerrain, createHeightAt } from './terrain.js';
import { createAircraft } from './aircraft.js';
import { createRings } from './rings.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createMissions, stripAt } from './missions.js';
import { ACTION_CONFIRM, ACTION_GEAR, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const status = document.getElementById('status');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayBody = document.getElementById('overlay-body');
const overlayHint = document.getElementById('overlay-hint');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7e8);
scene.fog = new THREE.Fog(0xa8d0e8, 900, 3600);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 6000);

const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
sun.position.set(600, 900, 300);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ee, 0x4a6b3a, 1.1));

const heightAt = createHeightAt(random);
const terrain = createTerrain(scene, random, heightAt);
const aircraft = createAircraft();
scene.add(aircraft.group);
const rings = createRings(scene);
const hud = createHud(hudCanvas);
const audio = createAudio();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

// The plane: one object the flight model, the camera and the HUD all read.
const plane = {
  position: new THREE.Vector3(60, 130, 420),
  heading: -0.5,
  pitch: 0,
  bank: 0,
  speed: 45,
  throttle: 0.5,
  fuel: 100,
  damage: 0,
  gearDown: false,
  verticalSpeed: 0,
  grounded: false,
};

let missionDef = MISSION_DEFS[0];
let missions = createMissions(missionDef);
let screen = 'title';
let best = readBest();
let time = 0;
let message = '';
let messageColour = '#ffb02e';
let messageUntil = 0;
let crashed = false;
let landed = false;
let landedStrip = -1;
let ringPassed = false;
let crashReason = '';
let snapCamera = false;

const world = {
  plane,
  rings,
  missions,
  aircraft,
  heightAt,
  screen,
  message,
  messageColour,
};
function syncWorld() {
  world.missions = missions;
  world.screen = screen;
  world.message = message;
  world.messageColour = messageColour;
}

function forwardVector() {
  const cp = Math.cos(plane.pitch);
  return new THREE.Vector3(
    Math.sin(plane.heading) * cp,
    Math.sin(plane.pitch),
    -Math.cos(plane.heading) * cp,
  );
}

function resetFlight() {
  plane.position.set(60, 130, 420);
  plane.heading = -0.5;
  plane.pitch = 0;
  plane.bank = 0;
  plane.speed = 45;
  plane.throttle = 0.5;
  plane.fuel = missionDef.fuelStart;
  plane.damage = 0;
  plane.gearDown = false;
  plane.verticalSpeed = 0;
  plane.grounded = false;
  crashed = false;
  landed = false;
  landedStrip = -1;
  ringPassed = false;
  crashReason = '';
  rings.reset();
  missions.reset(time);
  aircraft.setGearDown(false);
}

function startMission(def) {
  missionDef = def;
  missions = createMissions(def);
  resetFlight();
  screen = 'play';
  showOverlay(false);
  status.textContent = `${def.name}: ${def.brief}`;
  audio.unlock();
}

function showOverlay(show, title, body, hint) {
  overlay.style.display = show ? 'flex' : 'none';
  if (title !== undefined) overlayTitle.textContent = title;
  if (body !== undefined) overlayBody.textContent = body;
  if (hint !== undefined) overlayHint.textContent = hint;
}

function showTitle() {
  screen = 'title';
  showOverlay(
    true,
    'SKY COURIER: ISLAND RUN',
    'You fly the Kestrel-9 mail plane over the Merak archipelago. Pick a sortie — 1, 2 or 3 — or click one below. Arrows / WASD fly, Shift / Ctrl work the throttle, G drops the gear, mouse steers too. Land soft, mind the fuel.',
    '1 Ring Run · 2 Island Hop · 3 Storm Courier — Enter to fly Ring Run',
  );
  status.textContent = 'Sky Courier: Island Run — pick a mission to fly.';
}

function showOver(win) {
  screen = 'over';
  const finalScore = missions.score;
  if (finalScore > best) {
    best = finalScore;
    saveBest(best);
  }
  showOverlay(
    true,
    win ? 'SORTIE COMPLETE' : 'SORTIE OVER',
    `${missionDef.name} — score ${finalScore} · best ${best}. ${win ? 'The islands are yours.' : 'The Kestrel will fly again.'}`,
    'Enter to fly again · R to restart · 1/2/3 to pick another mission',
  );
  status.textContent = `Sortie over — score ${finalScore}, best ${best}.`;
}

function step(dt) {
  time += dt;
  terrain.update(dt);
  rings.update(time);

  if (screen !== 'play') return;
  const stick = input.read();

  // Throttle: Shift spools up, Ctrl spools down; fuel burns with it.
  plane.throttle = Math.max(0, Math.min(1, plane.throttle + stick.throttle * dt * 0.55));
  plane.fuel = Math.max(
    0,
    plane.fuel - dt * (CONFIG.fuelBurnCruise + plane.throttle * (CONFIG.fuelBurnFull - CONFIG.fuelBurnCruise)) * missionDef.fuelBurn,
  );

  // Attitude: the stick steers toward a target pitch and bank, then eases back.
  const targetPitch = -stick.pitch * CONFIG.maxPitch;
  const targetBank = stick.bank * CONFIG.maxBank;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 3.2);
  plane.bank += (targetBank - plane.bank) * Math.min(1, dt * 3.2);
  // A banked plane turns: the steeper the bank, the harder the turn.
  plane.heading += plane.bank * CONFIG.turnFactor * (plane.speed / CONFIG.maxSpeed) * dt;
  // Wind on the courier run pushes the plane sideways, steadily.
  if (missionDef.wind) plane.position.x += missionDef.wind * dt;

  // Speed: thrust minus drag; below stall speed the plane sinks.
  const thrust = plane.throttle * CONFIG.thrustAccel;
  plane.speed += (thrust - CONFIG.drag * plane.speed) * dt;
  plane.speed = Math.max(CONFIG.minSpeed, Math.min(CONFIG.maxSpeed, plane.speed));
  let sink = 0;
  if (plane.speed < CONFIG.stallSpeed) {
    sink = (CONFIG.stallSpeed - plane.speed) * 0.35;
  }
  plane.verticalSpeed = Math.sin(plane.pitch) * plane.speed - sink;

  const fwd = forwardVector();
  plane.position.addScaledVector(fwd, plane.speed * dt);
  plane.position.y += -sink * dt;

  // Ground: the sea and the islands. Touching down is a landing or a crash.
  const ground = heightAt(plane.position.x, plane.position.z);
  const strip = stripAt(plane.position.x, plane.position.z);
  const onGround = plane.position.y <= ground + 1.2;
  if (onGround && !plane.grounded) {
    const sinkRate = -plane.verticalSpeed;
    const gentle = sinkRate < 6 && plane.speed < 55 && Math.abs(plane.bank) < 0.35;
    if (strip >= 0 && gentle && plane.gearDown) {
      landed = true;
      landedStrip = strip;
      plane.grounded = true;
      plane.position.y = ground + 1.2;
      plane.speed = Math.max(0, plane.speed - 18 * dt);
    } else if (sinkRate < 3 && plane.speed < 30) {
      // A soft ditching on grass or sand: bent, not broken.
      plane.damage += CONFIG.damageScrape;
      plane.grounded = true;
      plane.position.y = ground + 1.2;
      message = 'ROUGH LANDING — AIRFRAME BENT';
      messageColour = '#ff5a3c';
      messageUntil = time + 2.5;
      audio.crash();
    } else {
      crashed = true;
      crashReason = plane.position.y <= 1.5 && ground <= 0.5 ? 'DITCHED IN THE SEA' : 'CRASHED INTO TERRAIN';
      plane.damage = 100;
      plane.position.y = ground + 1.2;
      audio.crash();
    }
  }
  if (plane.grounded && !crashed) {
    // Rolling out: friction bleeds speed, the plane stays on the ground.
    plane.speed = Math.max(0, plane.speed - 22 * dt);
    plane.position.y = ground + 1.2;
    if (plane.speed < 2 && plane.throttle < 0.1) {
      plane.speed = 0;
    }
    // Full throttle lifts off again once the speed is there.
    if (plane.speed > CONFIG.stallSpeed + 6 && plane.throttle > 0.8) {
      plane.grounded = false;
      landed = false;
      message = 'AIRBORNE AGAIN';
      messageColour = '#37e07a';
      messageUntil = time + 2;
    }
  }

  ringPassed = rings.check(plane.position);

  // Mission bookkeeping: rings, landings, fuel, crash — one event a frame.
  const event = missions.update(
    { ringPassed, landed, landedStrip, crashed, crashReason, fuel: plane.fuel },
    time,
    dt,
  );
  landed = false;
  ringPassed = false;
  if (missions.message) {
    message = missions.message;
    messageColour = missions.messageColour;
  }
  if (event === 'ring') audio.ring();
  if (event === 'landed') audio.land();
  if (event === 'win') {
    audio.win();
    showOver(true);
  }
  if (event === 'crash' || event === 'fuel') {
    if (event === 'fuel') plane.throttle = 0;
    showOver(false);
  }

  audio.update(plane.throttle, plane.speed, screen === 'play' && !plane.grounded);
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // The plane itself: position, attitude, prop.
  aircraft.group.position.copy(plane.position);
  aircraft.group.rotation.order = 'YXZ';
  aircraft.group.rotation.y = plane.heading;
  aircraft.group.rotation.x = plane.pitch;
  aircraft.group.rotation.z = -plane.bank;
  aircraft.update(1 / 60, plane.speed);

  // Chase camera: behind and above the tail, looking at the nose. A staged
  // screenshot snaps straight to its framing; live play eases into it.
  const back = new THREE.Vector3(-Math.sin(plane.heading), 0, Math.cos(plane.heading));
  const desired = plane.position.clone()
    .addScaledVector(back, CONFIG.chaseDistance)
    .add(new THREE.Vector3(0, CONFIG.chaseHeight, 0));
  if (snapCamera) {
    camera.position.copy(desired);
    snapCamera = false;
  } else {
    camera.position.lerp(desired, 0.14);
  }
  const lookAt = plane.position.clone().addScaledVector(forwardVector(), 30);
  camera.lookAt(lookAt);

  renderer.render(scene, camera);

  hud.draw({
    speed: plane.speed,
    altitude: Math.max(0, plane.position.y),
    heading: plane.heading,
    pitch: plane.pitch,
    bank: plane.bank,
    throttle: plane.throttle,
    fuel: plane.fuel,
    damage: plane.damage,
    gearDown: plane.gearDown,
    verticalSpeed: plane.verticalSpeed,
    missionName: missionDef.name.toUpperCase(),
    objective: missions.objectiveText(),
    score: missions.score,
    message: time < messageUntil ? message : missions.message,
    messageColour: messageColour,
    wind: missionDef.wind ? Math.round(missionDef.wind * 1.944) : 0,
    screen,
  });
}

function resize() {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function loop(now) {
  const frame = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  let remaining = frame;
  while (remaining > 0) {
    const dt = Math.min(STEP, remaining);
    step(dt);
    remaining -= dt;
  }
  if (input.consume(ACTION_PAUSE) && screen === 'play') {
    screen = 'paused';
    showOverlay(true, 'PAUSED', 'The Kestrel holds its breath. P or Enter to keep flying.', 'P / Enter to resume · R to restart');
  } else if (input.consume(ACTION_PAUSE) && screen === 'paused') {
    screen = 'play';
    showOverlay(false);
  }
  if (input.consume(ACTION_GEAR) && screen === 'play') {
    plane.gearDown = !plane.gearDown;
    aircraft.setGearDown(plane.gearDown);
  }
  if (input.consume(ACTION_RESTART) && (screen === 'play' || screen === 'over' || screen === 'paused')) {
    startMission(missionDef);
  }
  if (screen === 'title') {
    const key = input.missionKey();
    if (key) {
      startMission(MISSION_DEFS[Number.parseInt(key, 10) - 1]);
    } else if (input.consume(ACTION_CONFIRM)) {
      startMission(MISSION_DEFS[0]);
    }
  } else if (screen === 'over' || screen === 'paused') {
    const key = input.missionKey();
    if (key) startMission(MISSION_DEFS[Number.parseInt(key, 10) - 1]);
    else if (input.consume(ACTION_CONFIRM) && screen === 'over') startMission(missionDef);
    else if (input.consume(ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      showOverlay(false);
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function runShot(name) {
  syncWorld();
  const staged = stageShot(name, world);
  // The staged world writes back through the shared object.
  screen = world.screen;
  message = world.message;
  messageColour = world.messageColour;
  messageUntil = 1e9;
  best = staged.best;
  snapCamera = true;
  let painted = 0;
  function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) {
  showOverlay(false);
  runShot(shot);
} else {
  showTitle();
  requestAnimationFrame(loop);
}
