// config.js — every tuning number for Sky Courier: Island Run, in one place.
// Speeds are m/s, altitudes metres, fuel percent. Change a number here and the
// whole game (flight model, missions, HUD scales) follows it.
export const CONFIG = {
  // Flight model
  maxSpeed: 85,
  cruiseSpeed: 55,
  stallSpeed: 22,
  minSpeed: 0,
  thrustAccel: 14,
  drag: 0.16,
  gravitySink: 9,
  pitchRate: 1.5,
  rollRate: 2.4,
  turnFactor: 0.55,
  maxPitch: 0.55,
  maxBank: 1.1,
  // Fuel and damage
  fuelBurnCruise: 0.55, // percent per second at cruise throttle
  fuelBurnFull: 1.4, // percent per second at full throttle
  damageHardLanding: 34,
  damageCrash: 100,
  damageScrape: 12,
  // World
  worldSize: 4200,
  seaLevel: 0,
  cloudBase: 190,
  // Rings
  ringRadius: 18,
  ringTube: 1.6,
  // Scoring
  scoreRing: 500,
  scoreLanding: 1000,
  scoreDelivery: 1500,
  timeBonusPerSec: 12,
  // Camera
  chaseDistance: 16,
  chaseHeight: 4.5,
  cameraLerp: 6,
};

export const MISSION_DEFS = [
  {
    id: 'rings',
    key: '1',
    name: 'Ring Run',
    tagline: 'Fly all 8 sky rings over Merak island.',
    brief: 'Thread every glowing ring in order. Gentle on the throttle: smooth flying scores, wild flying wastes fuel.',
    fuelStart: 100,
    fuelBurn: 1.0,
    wind: 0,
  },
  {
    id: 'hop',
    key: '2',
    name: 'Island Hop',
    tagline: 'Land on all three island strips, then lift off again.',
    brief: 'Touch down soft on Merak, Seroja and Bintang. A hard landing bends the Kestrel; a crash ends the sortie.',
    fuelStart: 100,
    fuelBurn: 1.0,
    wind: 0,
  },
  {
    id: 'courier',
    key: '3',
    name: 'Storm Courier',
    tagline: 'Carry the mail to Bintang before the fuel runs dry.',
    brief: 'A crosswind pushes you sideways the whole way. Full throttle drinks fuel; plan the climb and the glide.',
    fuelStart: 70,
    fuelBurn: 1.6,
    wind: 6,
  },
];

export const BEST_KEY = 'skycourier.best';
