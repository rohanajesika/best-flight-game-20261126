// input.js — keyboard and mouse, read fresh every frame.
// Arrows / WASD fly the plane, Shift / Ctrl work the throttle, G drops the
// gear, Enter confirms, P pauses, R restarts, 1/2/3 pick a mission on the
// title screen. The mouse is a second stick: hold it off-centre to bank.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_GEAR = 'gear';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyG: ACTION_GEAR,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, active: false };

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) {
      pressed.add(action);
      event.preventDefault();
    }
    if (event.code.startsWith('Arrow')) event.preventDefault();
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouse.active = true;
  }
  function onMouseLeave() {
    mouse.active = false;
    mouse.x = 0;
    mouse.y = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  function down(...codes) {
    return codes.some((code) => keys.has(code));
  }

  return {
    // Read once per frame: -1..1 stick deflections from keys and mouse.
    read() {
      let pitch = 0;
      let bank = 0;
      if (down('ArrowUp', 'KeyW')) pitch -= 1;
      if (down('ArrowDown', 'KeyS')) pitch += 1;
      if (down('ArrowLeft', 'KeyA')) bank -= 1;
      if (down('ArrowRight', 'KeyD')) bank += 1;
      if (mouse.active) {
        bank += mouse.x * 0.7;
        pitch += mouse.y * 0.5;
      }
      let throttle = 0;
      if (down('ShiftLeft', 'ShiftRight', 'Equal', 'NumpadAdd')) throttle += 1;
      if (down('ControlLeft', 'ControlRight', 'Minus', 'NumpadSubtract')) throttle -= 1;
      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        bank: Math.max(-1, Math.min(1, bank)),
        throttle,
      };
    },
    // Edge-triggered actions, consumed once by whoever reads them.
    consume(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    missionKey() {
      if (keys.has('Digit1')) return '1';
      if (keys.has('Digit2')) return '2';
      if (keys.has('Digit3')) return '3';
      return null;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
