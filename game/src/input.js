// Keyboard and pointer input for Valley Mail Run.
// Held keys give a steering direction; one-shot presses (start, restart)
// are queued for the state machine to consume once.

export const ACTION_START = 1;
export const ACTION_RESTART = 2;

const held = new Set();
let queued = 0;
let pointerX = null;
let pointerDown = false;

export function bindInput(canvas) {
  addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    held.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') queued |= ACTION_START;
    if (event.key.toLowerCase() === 'r') queued |= ACTION_RESTART;
  });
  addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
  canvas.addEventListener('pointermove', (event) => {
    pointerX = event.clientX / innerWidth;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointerX = event.clientX / innerWidth;
    queued |= ACTION_START;
  });
  addEventListener('pointerup', () => { pointerDown = false; });
}

/** Steering in -1..1 on both axes, from keys or the pointer. */
export function readSteer() {
  let x = 0;
  let y = 0;
  if (held.has('arrowleft') || held.has('a')) x -= 1;
  if (held.has('arrowright') || held.has('d')) x += 1;
  if (held.has('arrowup') || held.has('w')) y += 1;
  if (held.has('arrowdown') || held.has('s')) y -= 1;
  if (pointerDown && pointerX !== null) x = (pointerX - 0.5) * 2;
  return { x, y };
}

/** Throttle delta: shift boosts, control or x brakes. */
export function readThrottle() {
  let t = 0;
  if (held.has('shift')) t += 1;
  if (held.has('x') || held.has('control')) t -= 1;
  return t;
}

/** The one-shot actions since the last call, as ACTION_* flags. */
export function takeActions() {
  const got = queued;
  queued = 0;
  return got;
}
