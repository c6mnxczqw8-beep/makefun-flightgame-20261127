// The valley itself: a winding river road of sky, generated from a seed.
// Everything the renderer and the rules need — the centreline curve, the
// golden mail rings, the storm clouds, the fields and the home runway —
// is derived here and nowhere else, so a seed fully describes a flight.

import { makeRandom, range } from './random.js';
import { ROUND } from './config.js';

export const SEGMENT = 40; // metres between valley cross-sections

/** Build the world for one seed. */
export function buildWorld(seed) {
  const next = makeRandom(seed * 7919 + 13);
  const sections = [];
  const count = Math.ceil(ROUND.valleyLength / SEGMENT) + 30;
  let bend = 0;
  let bendTarget = 0;
  for (let i = 0; i < count; i++) {
    if (i % 14 === 0) bendTarget = range(next, -46, 46);
    bend += (bendTarget - bend) * 0.12;
    sections.push({
      z: i * SEGMENT,
      centre: bend * Math.sin(i / 22) + bend * 0.6,
      fieldTone: Math.floor(range(next, 0, 4)),
      treeLine: range(next, 0.25, 0.9),
    });
  }

  const rings = [];
  for (let z = 420; z < ROUND.valleyLength - 260; z += range(next, 300, 460)) {
    const at = sectionAt(sections, z);
    rings.push({
      z,
      x: at.centre + range(next, -55, 55),
      alt: range(next, 60, 300),
      taken: false,
      missed: false,
    });
  }

  const clouds = [];
  for (let z = 640; z < ROUND.valleyLength - 200; z += range(next, 420, 700)) {
    const at = sectionAt(sections, z);
    clouds.push({
      z,
      x: at.centre + range(next, -80, 80),
      alt: range(next, 90, 330),
      r: range(next, 26, 44),
      hit: false,
    });
  }

  return {
    sections,
    rings,
    clouds,
    runway: { z: ROUND.valleyLength, width: 46, length: 420 },
    finishZ: ROUND.valleyLength + 300,
  };
}

/** The cross-section nearest a distance down the valley. */
export function sectionAt(sections, z) {
  const i = Math.max(0, Math.min(sections.length - 1, Math.round(z / SEGMENT)));
  return sections[i];
}

/** Where the valley centre sits at distance z, smoothed. */
export function centreAt(sections, z) {
  const f = Math.max(0, Math.min(sections.length - 1.001, z / SEGMENT));
  const i = Math.floor(f);
  const a = sections[i];
  const b = sections[Math.min(sections.length - 1, i + 1)];
  return a.centre + (b.centre - a.centre) * (f - i);
}
