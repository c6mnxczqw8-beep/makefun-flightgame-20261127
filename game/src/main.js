// Valley Mail Run — boot, rules and the state machine.
//
// ?seed=N fixes the valley. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it, and sets
// window.__shotReady for a screenshot.

import { VIEW, PLANE, ROUND } from './config.js';
import { buildWorld, centreAt } from './world.js';
import { bindInput, readSteer, readThrottle, takeActions, ACTION_START, ACTION_RESTART } from './input.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 1) || 1;
const shot = params.get('shot');

function freshState(mode) {
  const world = buildWorld(seed);
  return {
    mode,
    world,
    seed,
    plane: {
      x: centreAt(world.sections, 0),
      alt: PLANE.startAlt,
      speed: PLANE.startSpeed,
      heading: 178,
      bank: 0,
      climb: 0,
      steerVis: 0,
      z: 0,
    },
    score: 0,
    ringsTaken: 0,
    ringTotal: world.rings.length,
    timeLeft: ROUND.seconds,
    flash: null,
    landed: false,
    crashed: false,
    elapsed: 0,
  };
}

let state = freshState('title');

function flash(text, color, seconds, t) {
  state.flash = { text, color, until: t + seconds };
}

function crossEvents(prevZ, t) {
  const plane = state.plane;
  for (const ring of state.world.rings) {
    if (ring.taken || ring.missed || ring.z <= prevZ || ring.z > plane.z) continue;
    const dx = plane.x - ring.x;
    const da = plane.alt - ring.alt;
    const dist = Math.hypot(dx, da);
    if (dist <= 17) {
      ring.taken = true;
      state.ringsTaken += 1;
      state.score += ROUND.ringScore;
      flash(`RING +${ROUND.ringScore}`, '#ffd166', 0.9, t);
    } else if (dist <= 31) {
      ring.missed = true;
      state.score += ROUND.ringNearMiss;
      flash(`NEAR MISS +${ROUND.ringNearMiss}`, '#cfe3f2', 0.7, t);
    } else {
      ring.missed = true;
    }
  }
  for (const cloud of state.world.clouds) {
    if (cloud.hit || cloud.z <= prevZ || cloud.z > plane.z) continue;
    const dist = Math.hypot(plane.x - cloud.x, plane.alt - cloud.alt);
    if (dist <= cloud.r) {
      cloud.hit = true;
      state.score = Math.max(0, state.score - ROUND.cloudPenalty);
      plane.speed = Math.max(PLANE.minSpeed, plane.speed * 0.55);
      flash(`STORM CLOUD -${ROUND.cloudPenalty}`, '#ff9d8a', 1.1, t);
    }
  }
}

function step(dt, t) {
  const plane = state.plane;
  const steer = readSteer();
  const throttle = readThrottle();
  const prevZ = plane.z;

  plane.bank += ((steer.x * 0.95) - plane.bank) * Math.min(1, dt * 5);
  plane.steerVis += (steer.x - plane.steerVis) * Math.min(1, dt * 6);
  plane.climb += (steer.y - plane.climb) * Math.min(1, dt * 4);
  plane.heading = (plane.heading + plane.bank * dt * 46 + 360) % 360;
  plane.x += plane.bank * plane.speed * dt * 1.05;
  plane.alt += plane.climb * PLANE.climbRate * dt;
  plane.speed += throttle * 15 * dt - (plane.speed - PLANE.startSpeed) * 0.05 * dt;
  plane.speed = Math.max(PLANE.minSpeed, Math.min(PLANE.maxSpeed, plane.speed));
  plane.z += plane.speed * dt;
  state.elapsed += dt;
  state.timeLeft -= dt;

  crossEvents(prevZ, t);

  const rw = state.world.runway;
  if (plane.alt <= PLANE.minAlt) {
    const overStrip = plane.z >= rw.z - 10 && plane.z <= rw.z + rw.length;
    const onCentre = Math.abs(plane.x - centreAt(state.world.sections, plane.z)) <= rw.width / 2 + 8;
    if (overStrip && onCentre && plane.speed <= 42) {
      state.landed = true;
      state.score += ROUND.landingBonus;
      state.mode = 'done';
    } else {
      state.crashed = true;
      state.mode = 'done';
    }
  }
  if (plane.alt > PLANE.maxAlt) plane.alt = PLANE.maxAlt;
  if (state.timeLeft <= 0 || plane.z > state.world.finishZ) {
    state.mode = 'done';
  }
  status.textContent = `Altitude ${Math.round(plane.alt)} metres, speed ${Math.round(plane.speed * 3.6)} kilometres per hour, score ${state.score}.`;
}

function frame(nowMs) {
  const t = nowMs / 1000;
  const dt = Math.min(0.05, frame.last ? t - frame.last : 0.016);
  frame.last = t;
  const actions = takeActions();
  if (state.mode === 'title' && (actions & ACTION_START)) {
    state = freshState('flying');
  } else if (state.mode === 'done' && (actions & ACTION_RESTART)) {
    state = freshState('flying');
  } else if (state.mode === 'flying') {
    step(dt, t);
  }
  render(ctx, state, t);
  requestAnimationFrame(frame);
}

function stageShot(which) {
  state = freshState(which === 'start' ? 'title' : 'flying');
  const plane = state.plane;
  if (which === 'play') {
    plane.z = 1500;
    plane.x = centreAt(state.world.sections, 1500) + 18;
    plane.alt = 168;
    plane.speed = 52;
    plane.bank = 0.24;
    plane.steerVis = 0.3;
    state.score = 450;
    state.ringsTaken = 2;
    state.timeLeft = 41.2;
    state.world.rings.forEach((ring, i) => { if (i < 2) ring.taken = true; });
    state.flash = { text: 'RING +150', color: '#ffd166', until: 1e9 };
  } else if (which === 'end') {
    state.mode = 'done';
    state.landed = true;
    plane.z = state.world.runway.z + 160;
    plane.x = centreAt(state.world.sections, plane.z);
    plane.alt = 12;
    plane.speed = 30;
    state.score = 1450;
    state.ringsTaken = 5;
    state.timeLeft = 18.4;
  } else {
    plane.z = 700;
    plane.alt = 170;
  }
  render(ctx, state, 0.5);
  render(ctx, state, 0.55);
  window.__shotReady = true;
}

bindInput(canvas);
if (shot) stageShot(shot);
else requestAnimationFrame(frame);
