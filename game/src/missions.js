// missions.js — the three sorties, their objectives and their scoring.
// Each mission is a small state machine over the same flight: rings count
// flown rings, hop counts gentle touchdowns on the three strips in order,
// courier counts one delivery to Bintang against the fuel gauge. A landing
// is gentle below 6 m/s of sink with the gear down; anything harder bends
// the airframe, and a fast impact or a hillside ends the sortie.
import { CONFIG } from './config.js';
import { RUNWAYS } from './terrain.js';

export const EVENT_RING = 'ring';
export const EVENT_LANDED = 'landed';
export const EVENT_CRASH = 'crash';
export const EVENT_WIN = 'win';
export const EVENT_FUEL = 'fuel';

export function createMissions(def) {
  let ringsDone = 0;
  let stripsDone = 0;
  let delivered = false;
  let score = 0;
  let elapsed = 0;
  let over = false;
  let message = '';
  let messageColour = '#ffb02e';
  let messageUntil = 0;

  function say(text, colour, seconds, now) {
    message = text;
    messageColour = colour || '#ffb02e';
    messageUntil = now + (seconds || 2.5);
  }

  function objectiveText() {
    if (def.id === 'rings') return `RINGS ${ringsDone}/8`;
    if (def.id === 'hop') {
      const names = ['Merak', 'Seroja', 'Bintang'];
      return stripsDone >= 3
        ? 'ALL STRIPS DONE'
        : `LAND: ${names[stripsDone].toUpperCase()} (${stripsDone}/3)`;
    }
    return delivered ? 'DELIVERED' : 'DELIVER TO BINTANG';
  }

  return {
    get score() {
      return score;
    },
    get over() {
      return over;
    },
    get message() {
      return message;
    },
    get messageColour() {
      return messageColour;
    },
    objectiveText,
    reset(now) {
      ringsDone = 0;
      stripsDone = 0;
      delivered = false;
      score = 0;
      elapsed = 0;
      over = false;
      message = def.brief;
      messageColour = '#eaf4ff';
      messageUntil = now + 4;
    },
    // Screenshot staging: a finished Ring Run, score and all, without flying it.
    stageComplete(finalScore) {
      ringsDone = 8;
      stripsDone = 3;
      delivered = true;
      score = finalScore;
      over = true;
      message = 'RING RUN COMPLETE!';
      messageColour = '#37e07a';
      messageUntil = 1e9;
    },
    // Called every frame with the live flight state. Returns an event name
    // (or null) for the main loop to sound and to show on screen.
    update(state, now, dt) {
      if (over) return null;
      elapsed += dt;
      if (now > messageUntil) message = '';
      let event = null;

      if (state.ringPassed) {
        ringsDone += 1;
        score += CONFIG.scoreRing;
        say(`RING ${ringsDone}/8  +${CONFIG.scoreRing}`, '#37e07a', 2, now);
        event = EVENT_RING;
        if (def.id === 'rings' && ringsDone >= 8) {
          over = true;
          score += Math.max(0, Math.round(600 - elapsed) * 2);
          say('RING RUN COMPLETE!', '#37e07a', 6, now);
          event = EVENT_WIN;
        }
      }

      if (state.landed) {
        const strip = RUNWAYS[state.landedStrip];
        if (def.id === 'hop' || def.id === 'courier') {
          const want = def.id === 'hop' ? stripsDone : 0;
          if (state.landedStrip === want) {
            if (def.id === 'hop') {
              stripsDone += 1;
              score += CONFIG.scoreLanding;
              say(`TOUCHDOWN ${strip.island.toUpperCase()}  +${CONFIG.scoreLanding}`, '#37e07a', 2.5, now);
              event = EVENT_LANDED;
              if (stripsDone >= 3) {
                over = true;
                score += Math.max(0, Math.round(900 - elapsed));
                say('ISLAND HOP COMPLETE!', '#37e07a', 6, now);
                event = EVENT_WIN;
              }
            } else if (!delivered && state.landedStrip === 2) {
              delivered = true;
              score += CONFIG.scoreDelivery;
              say(`MAIL DELIVERED  +${CONFIG.scoreDelivery}`, '#37e07a', 3, now);
              event = EVENT_LANDED;
              over = true;
              score += Math.max(0, Math.round(state.fuel) * 10);
              say('STORM COURIER COMPLETE!', '#37e07a', 6, now);
              event = EVENT_WIN;
            }
          } else {
            say(`WRONG STRIP — aim for ${def.id === 'hop' ? ['MERAK', 'SEROJA', 'BINTANG'][stripsDone] : 'BINTANG'}`, '#ff5a3c', 2.5, now);
          }
        } else {
          say('LANDED — take off and keep flying', '#eaf4ff', 2, now);
          event = EVENT_LANDED;
        }
      }

      if (state.crashed) {
        over = true;
        say(state.crashReason || 'CRASHED', '#ff5a3c', 6, now);
        event = EVENT_CRASH;
      }

      if (state.fuel <= 0 && !over) {
        over = true;
        say('OUT OF FUEL — gliding to the sea', '#ff5a3c', 6, now);
        event = EVENT_FUEL;
      }
      return event;
    },
  };
}

// Which strip, if any, the plane is over: the strip's rotated rectangle.
export function stripAt(x, z) {
  for (let i = 0; i < RUNWAYS.length; i += 1) {
    const strip = RUNWAYS[i];
    const cos = Math.cos(strip.heading);
    const sin = Math.sin(strip.heading);
    const dx = x - strip.x;
    const dz = z - strip.z;
    const along = dx * cos + dz * sin;
    const across = -dx * sin + dz * cos;
    if (Math.abs(along) < strip.length / 2 && Math.abs(across) < strip.width / 2) return i;
  }
  return -1;
}
