// shots.js — staged scenes for the screenshots, driven by ?shot=.
// Each scene puts the plane, the mission and the camera in one exact state
// and paints it twice, then sets window.__shotReady so a screenshot tool
// knows the frame is final. The scenes are real states of the live game:
// the same flight model, the same HUD, nothing faked for the camera.
export const SHOT_NAMES = ['cover', 'rings', 'landing', 'win'];

export function stageShot(name, world) {
  const { plane, rings, missions, aircraft, heightAt } = world;
  const put = (x, y, z, heading, pitch, speed, throttle) => {
    plane.position.set(x, y, z);
    plane.heading = heading;
    plane.pitch = pitch;
    plane.bank = 0;
    plane.speed = speed;
    plane.throttle = throttle;
    plane.fuel = 78;
    plane.damage = 0;
    plane.gearDown = false;
    plane.verticalSpeed = Math.sin(pitch) * speed;
  };

  if (name === 'cover') {
    // Chase view mid-flight: the first ring dead ahead, Merak below, HUD lit.
    missions.reset(0);
    rings.reset();
    put(340, 122, -320, 2.21, -0.02, 58, 0.62);
    plane.bank = -0.1;
    world.screen = 'play';
    world.message = 'FLY THE ORANGE RING';
    return { screen: 'play', best: 0 };
  }
  if (name === 'rings') {
    // A heartbeat from the ring: the torus frames the plane, island behind.
    missions.reset(0);
    rings.reset();
    put(330, 118, -330, 2.23, 0.0, 62, 0.7);
    world.screen = 'play';
    world.message = '';
    return { screen: 'play', best: 0 };
  }
  if (name === 'landing') {
    // Final approach to the Merak strip from the sea, gear down, low and
    // slow, the runway dead ahead over the eastern beach.
    missions.reset(0);
    rings.reset();
    put(350, 140, 120, -Math.PI / 2, -0.05, 36, 0.3);
    plane.gearDown = true;
    aircraft.setGearDown(true);
    world.screen = 'play';
    world.message = 'FINAL — MERAK STRIP AHEAD';
    return { screen: 'play', best: 0 };
  }
  if (name === 'win') {
    // Mission complete: parked on the Merak strip, looking down its length.
    missions.reset(0);
    missions.stageComplete(4850);
    rings.reset();
    put(60, heightAt(60, 120) + 1.2, 120, Math.PI / 2, 0, 0, 0);
    plane.gearDown = true;
    aircraft.setGearDown(true);
    world.screen = 'over';
    world.message = 'RING RUN COMPLETE!  SCORE 4850';
    world.messageColour = '#37e07a';
    return { screen: 'over', best: 4850 };
  }
  return { screen: 'title', best: 0 };
}
