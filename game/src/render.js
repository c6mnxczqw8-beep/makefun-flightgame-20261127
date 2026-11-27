// All drawing for Valley Mail Run: the projected valley, the plane in
// chase view, the lit instruments, and the title and results screens.
// Nothing in here changes the game; it only paints the state it is given.

import { VIEW, ROUND } from './config.js';
import { centreAt } from './world.js';

const FOCAL = 880; // projection focal length, in pixels
const FIELD_TONES = ['#7fae56', '#8fb45c', '#74a24e', '#a9bd62'];
const FIELD_TONES_B = ['#86b25a', '#779f4b', '#9cb763', '#83ac55'];

function project(cam, x, alt, z) {
  const dz = Math.max(1, z - cam.z);
  const s = FOCAL / dz;
  return {
    x: VIEW.width / 2 + (x - cam.x) * s,
    y: cam.horizonY + (cam.alt - alt) * s,
    s,
  };
}

function groundPoint(cam, x, z) {
  return project(cam, x, 0, z);
}

export function makeCamera(state) {
  const bankTilt = state.plane.bank * 26;
  return {
    x: state.plane.x,
    alt: state.plane.alt,
    z: state.plane.z,
    horizonY: VIEW.horizon + state.plane.climb * 60 + bankTilt * 0.4,
  };
}

function drawSky(ctx, cam, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, cam.horizonY + 190);
  grad.addColorStop(0, '#79a6d8');
  grad.addColorStop(0.72, '#bcd6ee');
  grad.addColorStop(1, '#e8efdf');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun, high left.
  ctx.fillStyle = '#f7e3a1';
  ctx.beginPath();
  ctx.arc(238, 108, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(247,227,161,0.35)';
  ctx.beginPath();
  ctx.arc(238, 108, 62, 0, Math.PI * 2);
  ctx.fill();
  // Far fair-weather clouds, drifting slowly with time.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 317 + t * 4) % (VIEW.width + 240)) - 120;
    const cy = 58 + (i % 3) * 44;
    cloudPuff(ctx, cx, cy, 30 + (i % 2) * 12);
  }
}

function cloudPuff(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.9, cy + r * 0.12, r * 0.72, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.9, cy + r * 0.14, r * 0.66, 0, Math.PI * 2);
  ctx.fill();
}

function ridge(ctx, baseY, amp, seed, color, shift) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  for (let x = 0; x <= VIEW.width; x += 32) {
    const y = baseY - (Math.sin((x + shift) / 210 + seed) * amp
      + Math.sin((x + shift) / 83 + seed * 2.7) * amp * 0.36);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  ctx.fill();
}

function drawTerrain(ctx, cam, world) {
  const sections = world.sections;
  const start = Math.max(0, Math.floor(cam.z / 40));
  const strips = [];
  for (let i = start; i < sections.length - 1; i++) {
    const a = sections[i];
    const b = sections[i + 1];
    if (a.z - cam.z > VIEW.drawDistance) break;
    if (b.z - cam.z < 4) continue;
    strips.push([a, b]);
  }
  // Far to near, so nearer strips paint over the seams.
  for (let k = strips.length - 1; k >= 0; k--) {
    const [a, b] = strips[k];
    const tones = (Math.floor(a.z / 40) % 2 === 0) ? FIELD_TONES : FIELD_TONES_B;
    quad(ctx, cam, a, b, -290, -34, tones[a.fieldTone % tones.length]);
    quad(ctx, cam, a, b, 34, 290, tones[(a.fieldTone + 2) % tones.length]);
    // The river road down the middle.
    quad(ctx, cam, a, b, -34, 34, '#5d94b8');
    quad(ctx, cam, a, b, -30, -24, '#d9c98f');
    quad(ctx, cam, a, b, 24, 30, '#d9c98f');
    // Tree-dark edges.
    quad(ctx, cam, a, b, -290, -262, '#4c7a3d');
    quad(ctx, cam, a, b, 262, 290, '#4c7a3d');
  }
  drawRunway(ctx, cam, world);
}

function quad(ctx, cam, a, b, offLo, offHi, color) {
  const p1 = groundPoint(cam, a.centre + offLo, a.z);
  const p2 = groundPoint(cam, a.centre + offHi, a.z);
  const p3 = groundPoint(cam, b.centre + offHi, b.z);
  const p4 = groundPoint(cam, b.centre + offLo, b.z);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx, cam, world) {
  const rw = world.runway;
  if (rw.z - cam.z > VIEW.drawDistance || rw.z + rw.length < cam.z) return;
  const step = 40;
  for (let z = rw.z; z < rw.z + rw.length; z += step) {
    const a = { centre: centreAt(world.sections, z), z };
    const b = { centre: centreAt(world.sections, z + step), z: z + step };
    quad(ctx, cam, a, b, -rw.width / 2, rw.width / 2, '#4a4d52');
    quad(ctx, cam, a, b, -2.2, 2.2, '#e8e8e2');
  }
  // Threshold bars.
  const t = { centre: centreAt(world.sections, rw.z), z: rw.z };
  const t2 = { centre: centreAt(world.sections, rw.z + 14), z: rw.z + 14 };
  for (const off of [-16, -6, 6, 16]) {
    quad(ctx, cam, t, t2, off - 3, off + 3, '#f2f2ea');
  }
}

function drawRings(ctx, cam, world) {
  const rings = [...world.rings].sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    if (ring.taken) continue;
    const dz = ring.z - cam.z;
    if (dz < 6 || dz > VIEW.drawDistance) continue;
    const p = project(cam, ring.x, ring.alt, ring.z);
    const r = Math.max(2, 17 * p.s);
    ctx.strokeStyle = ring.missed ? 'rgba(150,150,150,0.6)' : '#f4b942';
    ctx.lineWidth = Math.max(2, 5 * p.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (!ring.missed) {
      ctx.strokeStyle = 'rgba(255,236,170,0.55)';
      ctx.lineWidth = Math.max(1, 2 * p.s);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawClouds(ctx, cam, world) {
  const clouds = [...world.clouds].sort((a, b) => b.z - a.z);
  for (const cloud of clouds) {
    const dz = cloud.z - cam.z;
    if (dz < 6 || dz > VIEW.drawDistance) continue;
    const p = project(cam, cloud.x, cloud.alt, cloud.z);
    const r = cloud.r * p.s;
    if (r < 2) continue;
    ctx.fillStyle = cloud.hit ? 'rgba(70,74,84,0.9)' : 'rgba(88,94,108,0.88)';
    cloudPuff(ctx, p.x, p.y, r);
    ctx.fillStyle = 'rgba(52,56,66,0.85)';
    cloudPuff(ctx, p.x + r * 0.3, p.y + r * 0.34, r * 0.7);
  }
}

function drawPlane(ctx, state) {
  const plane = state.plane;
  const cx = VIEW.width / 2 + plane.steerVis * 130;
  const cy = 618 + plane.climb * -36;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.bank * 0.55);
  // Shadow of the wings on the fuselage side, then the airframe.
  ctx.fillStyle = '#b8433a';
  ctx.beginPath(); // main wing
  ctx.moveTo(-118, 26);
  ctx.lineTo(118, 26);
  ctx.lineTo(88, 44);
  ctx.lineTo(-88, 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d8564a';
  ctx.beginPath(); // tailplane
  ctx.moveTo(-52, -64);
  ctx.lineTo(52, -64);
  ctx.lineTo(38, -50);
  ctx.lineTo(-38, -50);
  ctx.closePath();
  ctx.fill();
  const body = ctx.createLinearGradient(0, -96, 0, 52);
  body.addColorStop(0, '#f3e9d2');
  body.addColorStop(1, '#d9c9a4');
  ctx.fillStyle = body;
  ctx.beginPath(); // fuselage, nose down-screen
  ctx.moveTo(0, 58);
  ctx.quadraticCurveTo(21, 30, 19, -18);
  ctx.quadraticCurveTo(17, -74, 0, -92);
  ctx.quadraticCurveTo(-17, -74, -19, -18);
  ctx.quadraticCurveTo(-21, 30, 0, 58);
  ctx.fill();
  ctx.fillStyle = '#7fb2d9'; // canopy
  ctx.beginPath();
  ctx.ellipse(0, -34, 10.5, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c2f28'; // fin stripe and nose band
  ctx.fillRect(-3.5, -96, 7, 22);
  ctx.fillRect(-19, 34, 38, 7);
  // Propeller blur at the nose.
  ctx.strokeStyle = 'rgba(40,40,44,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 62, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // The plane's shadow on the valley floor, shrinking as she climbs.
  const shScale = Math.max(0.25, 1 - plane.alt / 700);
  ctx.fillStyle = 'rgba(20,40,20,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, 742, 74 * shScale + 12, 10 * shScale + 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function gauge(ctx, x, y, r, label, value, frac, needleColor) {
  ctx.fillStyle = '#141a21';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d4a57';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.strokeStyle = '#9fb4c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 9), y + Math.sin(a) * (r - 9));
    ctx.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  const a = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#e8f0f6';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y + r - 12);
  ctx.fillStyle = '#8fa6b8';
  ctx.font = '600 10.5px system-ui, sans-serif';
  ctx.fillText(label, x, y + 15);
}

function drawCockpit(ctx, state) {
  const plane = state.plane;
  ctx.fillStyle = '#1d242d';
  ctx.fillRect(0, 706, VIEW.width, 94);
  ctx.fillStyle = '#262f39';
  ctx.fillRect(0, 706, VIEW.width, 5);
  gauge(ctx, 120, 753, 40, 'ALT m', String(Math.round(plane.alt)),
    plane.alt / 420, '#ffd166');
  gauge(ctx, 250, 753, 40, 'SPD km/h', String(Math.round(plane.speed * 3.6)),
    (plane.speed - 26) / 52, '#8be0a4');
  gauge(ctx, 380, 753, 40, 'HDG', String(Math.round(plane.heading)).padStart(3, '0'),
    plane.heading / 360, '#7fb2d9');
  // Artificial horizon, lit.
  ctx.save();
  ctx.beginPath();
  ctx.arc(510, 753, 40, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(510, 753);
  ctx.rotate(plane.bank * 0.55);
  ctx.fillStyle = '#5d94b8';
  ctx.fillRect(-46, -46 + plane.climb * 22, 92, 46);
  ctx.fillStyle = '#8a6f4d';
  ctx.fillRect(-46, plane.climb * 22, 92, 46);
  ctx.strokeStyle = '#f2f2ea';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-46, plane.climb * 22);
  ctx.lineTo(46, plane.climb * 22);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(486, 753);
  ctx.lineTo(534, 753);
  ctx.moveTo(510, 745);
  ctx.lineTo(510, 753);
  ctx.stroke();
  ctx.fillStyle = '#8fa6b8';
  ctx.font = '600 10.5px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', 510, 782);
  // Right side of the panel: the run's story.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8f0f6';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score}`, VIEW.width - 28, 748);
  ctx.font = '600 16.5px system-ui, sans-serif';
  ctx.fillStyle = state.timeLeft <= 10 ? '#ff9d8a' : '#9fb4c4';
  ctx.fillText(`TIME ${Math.max(0, state.timeLeft).toFixed(1)}s   RINGS ${state.ringsTaken}/${state.ringTotal}`, VIEW.width - 28, 776);
  ctx.textAlign = 'left';
}

function banner(ctx, title, lines, foot) {
  ctx.fillStyle = 'rgba(10,16,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f6efdd';
  ctx.strokeStyle = '#b8433a';
  ctx.lineWidth = 3;
  const w = 660;
  const h = 96 + lines.length * 34 + 62;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2 - 30;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#22303c';
  ctx.textAlign = 'center';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText(title, VIEW.width / 2, y + 62);
  ctx.font = '500 19.5px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, y + 108 + i * 34);
  });
  ctx.fillStyle = '#b8433a';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(foot, VIEW.width / 2, y + h - 24);
  ctx.textAlign = 'left';
}

export function render(ctx, state, t) {
  const cam = makeCamera(state);
  drawSky(ctx, cam, t);
  ridge(ctx, cam.horizonY + 66, 54, 1.7, '#8fa8bf', cam.x * 0.12);
  ridge(ctx, cam.horizonY + 128, 40, 4.2, '#6d8a68', cam.x * 0.3);
  drawTerrain(ctx, cam, state.world);
  drawRings(ctx, cam, state.world);
  drawClouds(ctx, cam, state.world);
  drawPlane(ctx, state);
  drawCockpit(ctx, state);
  if (state.flash && t < state.flash.until) {
    ctx.fillStyle = state.flash.color;
    ctx.font = '800 37px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.flash.text, VIEW.width / 2, 168);
    ctx.textAlign = 'left';
  }
  if (state.mode === 'title') {
    banner(ctx, 'VALLEY MAIL RUN', [
      'Fly the little mail plane down the river valley.',
      'Thread the golden rings, dodge the storm clouds,',
      'and put her down on the home runway before the clock dies.',
      'Steer: arrow keys or A/D · Climb: W/S · Boost: SHIFT · Brake: X',
    ], 'Press SPACE or click to take off');
  } else if (state.mode === 'done') {
    const verdict = state.landed
      ? 'A greased landing. The valley keeps its mail.'
      : state.crashed
        ? 'The valley floor arrived early. The mail is confetti.'
        : 'Out of time — the runway lights go dark.';
    banner(ctx, 'FLIGHT COMPLETE', [
      verdict,
      `Score ${state.score} · Rings ${state.ringsTaken} of ${state.ringTotal}`,
      state.landed ? `Landing bonus +${ROUND.landingBonus} included.` : 'No landing bonus this run.',
    ], 'Press R to fly again');
  }
}
