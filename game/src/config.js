// Valley Mail Run — the numbers that shape a flight.

export const VIEW = {
  width: 1280,
  height: 800,
  horizon: 300,        // y of the horizon line at level flight
  camDepth: 0.84,      // projection depth of the chase camera
  drawDistance: 2600,  // how far down the valley is drawn, in metres
};

export const PLANE = {
  minSpeed: 26,        // metres per second; slower and she stalls
  maxSpeed: 78,
  startSpeed: 44,
  startAlt: 150,       // metres above the valley floor
  minAlt: 6,
  maxAlt: 420,
  turnRate: 1.15,      // radians of bank per second at full stick
  climbRate: 26,       // metres per second at full stick
};

export const ROUND = {
  seconds: 75,         // the mail run clock
  valleyLength: 5200,  // metres of valley before the runway strip
  ringScore: 150,
  ringNearMiss: 25,
  cloudPenalty: 90,    // points and a speed cut for clipping a storm cloud
  landingBonus: 400,
};
