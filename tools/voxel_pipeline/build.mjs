#!/usr/bin/env node
/**
 * Deterministic 64×64×64 voxel models for the complete unit, building, and
 * environment roster, plus their mechanical animation pose frames.
 *
 * Units, buildings, and terrain props are authored directly as 3D voxel
 * geometry on a 64×64 ground footprint with up to 64 elevation layers
 * (z ∈ 0..63), matching the 64×32 isometric diamond and 32×32 2D tile grid at
 * half a runtime pixel per voxel step. Shapes occupy only the cells their
 * natural proportions need — nothing is stretched to fill the cube.
 *
 * Mechanical animation: builders tag moving parts as named groups (turret,
 * barrel, rotorMain, cleats, legs, …) and draw cyclic patterns (tread cleats,
 * wheel lugs, exhaust plumes, wakes) from the pose argument. `poseOpsFor`
 * then applies rigid group transforms (yaw / pitch / roll / translate / belt
 * wrap / hide / scorch) per clip frame. Frame 0 of every clip is the rest
 * pose, so `voxels` (the canonical geometry) is exactly clip frame 0.
 *
 * Output: data/voxels.json  (palette + per-model canonical voxel lists)
 * Run:    npm run voxels:build     (sheets: npm run voxels:bake)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {ARMY_IDS} from '../../src/armies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VOXEL_SIZE = [64, 64, 64];

// Pose frame counts per model, mirrored from data/animation.json families and
// units.*.weapon (tools/validate-animation.mjs owns the JSON; the mirror is
// cross-checked by tests/voxel-frames.test.js so the two cannot drift).
export const MODEL_POSES = {
  // foot: infantry, mech, engineer, medic
  infantry: { idle: 1, move: 4, attack: 3, death: 5 },
  'rocket-infantry': { idle: 1, move: 4, attack: 3, death: 5 },
  'aa-infantry': { idle: 1, move: 4, attack: 3, death: 5 },
  'sniper': { idle: 1, move: 4, attack: 3, death: 5 },
  grenadier: { idle: 1, move: 4, attack: 3, death: 5 },
  flamethrower: { idle: 1, move: 4, attack: 3, death: 5 },
  demolitionist: { idle: 1, move: 4, attack: 3, death: 5 },
  commando: { idle: 1, move: 4, attack: 3, death: 5 },
  officer: { idle: 1, move: 4, attack: 3, death: 5 },
  spy: { idle: 1, move: 4, attack: 3, death: 5 },
  'elite-hero': { idle: 1, move: 4, attack: 3, death: 5 },
  'attack-dog': { idle: 1, move: 4, attack: 3, death: 5 },
  scout: { idle: 1, move: 4, attack: 3, death: 5 },
  mech: { idle: 1, move: 4, attack: 3, death: 5 },
  engineer: { idle: 1, move: 4, death: 5 },
  medic: { idle: 1, move: 4, death: 5 },
  // tracked: apc, tank, heavy, artillery, antiair, mega
  apc: { idle: 1, move: 4, death: 4 },
  tank: { idle: 1, move: 4, attack: 3, death: 4 },
  heavy: { idle: 1, move: 4, attack: 3, death: 4 },
  artillery: { idle: 1, move: 4, attack: 3, death: 4 },
  antiair: { idle: 1, move: 4, attack: 3, death: 4 },
  mega: { idle: 1, move: 4, attack: 3, death: 4 },
  // wheeled: recon, rockets, missiles
  recon: { idle: 1, move: 4, attack: 3, death: 4 },
  rockets: { idle: 1, move: 4, attack: 3, death: 4 },
  missiles: { idle: 1, move: 4, attack: 3, death: 4 },
  // naval: submarine, gunboat, cruiser, battleship, lander
  submarine: { idle: 1, move: 4, attack: 2, death: 4 },
  gunboat: { idle: 1, move: 4, attack: 2, death: 4 },
  cruiser: { idle: 1, move: 4, attack: 2, death: 4 },
  battleship: { idle: 1, move: 4, attack: 2, death: 4 },
  lander: { idle: 1, move: 4, death: 4 },
  // rotor: copter, lift-copter
  copter: { idle: 2, move: 4, attack: 2, death: 4 },
  'lift-copter': { idle: 2, move: 4, death: 4 },
  // jet: fighter, bomber
  fighter: { idle: 1, move: 3, attack: 2, death: 4 },
  bomber: { idle: 1, move: 3, attack: 2, death: 4 },
  // expansion roster
  uhac: { idle: 1, move: 4, death: 4 },
  uav: { idle: 2, move: 4, death: 4 },
  mpa: { idle: 1, move: 3, attack: 2, death: 4 },
  bastion: { idle: 1, move: 4, attack: 3, death: 4 },
  specter: { idle: 1, move: 3, attack: 2, death: 4 },
  aegis: { idle: 1, move: 4, attack: 3, death: 4 },
  ifv: { idle: 1, move: 4, attack: 3, death: 4 },
  'supply-truck': { idle: 1, move: 4, death: 4 },
  'mobile-repair': { idle: 1, move: 4, death: 4 },
  'command-vehicle': { idle: 1, move: 4, death: 4 },
  'mine-layer': { idle: 1, move: 4, death: 4 },
  'tank-destroyer': { idle: 1, move: 4, attack: 3, death: 4 },
  'flame-tank': { idle: 1, move: 4, attack: 3, death: 4 },
  'amphibious-tank': { idle: 1, move: 4, attack: 3, death: 4 },
  'mine-clearing': { idle: 1, move: 4, death: 4 },
  'ground-attack-jet': { idle: 1, move: 3, attack: 2, death: 4 },
  'transport-plane': { idle: 1, move: 3, death: 4 },
  'stealth-fighter': { idle: 1, move: 3, attack: 2, death: 4 },
  'spy-plane': { idle: 1, move: 3, death: 4 },
  destroyer: { idle: 1, move: 4, attack: 2, death: 4 },
  'missile-boat': { idle: 1, move: 4, attack: 2, death: 4 },
  carrier: { idle: 1, move: 4, attack: 2, death: 4 },
  'naval-repair': { idle: 1, move: 4, death: 4 },
  'mine-layer-ship': { idle: 1, move: 4, death: 4 },
  // silo-missile: neutral effect model; the 3-frame clip is its thrust cycle
  'silo-missile': { idle: 3 },
};
/** Building operational idles, mirrored from data/animation.json buildings. */
export const BUILDING_IDLE = {
  hq: 1, base: 2, city: 1, airport: 2, port: 1, farm: 1, mine: 1, depot: 1,
  landmine: 1, 'supply-depot': 1, 'repair-depot': 1, 'field-hospital': 1,
  barracks: 1, helipad: 1, 'power-plant': 1, refinery: 1, 'radar-station': 2,
  'research-lab': 1, pillbox: 1, bunker: 1, 'at-turret': 1, 'sam-site': 1,
  'flak-cannon': 1, 'coastal-battery': 1, 'artillery-emplacement': 1, 'guard-tower': 1,
};
const [GX, GY, GZ] = VOXEL_SIZE;

// `landmine` is authored with the buildings on purpose: it is an *owned* object,
// so bake.mjs gives it the six team variants (the owner-coloured casing accent)
// that terrain models never get. It is still never a terrain id — the explosive
// lives in `s.landmines`, while `mine` remains the 2,000 G gold-mine property.
export const BUILDINGS = ['hq', 'base', 'city', 'airport', 'port', 'farm', 'mine', 'depot', 'landmine',
  'supply-depot', 'repair-depot', 'field-hospital', 'barracks',
  'helipad', 'power-plant', 'refinery', 'radar-station', 'research-lab',
  'pillbox', 'bunker', 'at-turret', 'sam-site', 'flak-cannon',
  'coastal-battery', 'artillery-emplacement', 'guard-tower'];
/** Playable armies that get their own unit models (Standard keeps the base names). */
export const UNIT_ARMY_IDS = ARMY_IDS.filter(id => id !== 'standard');
export const TERRAIN_MODELS = [
  'tree',
  'mountain',
  'hill',
  'silo',
  'silo-spent',
  'reef',
  // Hazard & objective props (volcano caldera, secret lab facility).
  'volcano',
  'secret-lab',
  'pipe-ew',
  'pipe-ns',
  'pipe-seam-ew',
  'pipe-seam-ns',
  'snow-tile',
  'cracked-dry-ground',
  'marsh',
  'plains',
  'tallgrass',
  'sea',
  'shoal',
  'rubble',
  'wall-standard',
  'wall-allies',
  'wall-soviets',
  'wall-empire',
  'wall-legion',
  'wall-end',
  'wall-corner',
  'wall-t',
  'wall-cross',
  'wall-gate',
  'wall-gate-allies',
  'wall-gate-soviets',
  'wall-gate-empire',
  'wall-gate-legion',
  // Silo missile: neutral effect model baked for iso silo combat.
  'silo-missile',
  ...Array.from({ length: 16 }, (_, mask) => `road-${mask.toString(16)}`),
  'bridge-ew',
  'bridge-ns',
  // Wreckage: stubs on both banks, the middle planks missing, one plank afloat.
  'bridge-broken-ew',
  'bridge-broken-ns',
];

/** Deterministic PRNG (mulberry32) for wreck debris — never Math.random. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shared 3D sculpting primitives bounded strictly to [0..63, 0..63, 0..63].
 *  Every voxel carries the group active when it was placed; pose transforms
 *  later move whole groups around their recorded pivots. */
function createCanvas() {
  const voxels = new Map();
  const pivots = {};
  let cur = 'body';
  const group = name => { cur = name || 'body'; return api; };
  const pivot = (name, p) => { pivots[name] = p; return api; };
  const put = (x, y, z, color, g) => {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (x < 0 || x >= GX || y < 0 || y >= GY || z < 0 || z >= GZ) return;
    voxels.set(`${x},${y},${z}`, [x, y, z, color, g ?? cur]);
  };
  const del = (x, y, z) => {
    voxels.delete(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`);
  };
  const box = (x0, y0, z0, x1, y1, z1, color, g) => {
    for (let z = z0; z < z1; z++) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) put(x, y, z, color, g);
      }
    }
  };
  /** Hollow box: six walls only. Big masses use this so the committed JSON
   *  stores surfaces, not invisible interiors (the baker overdraws anyway). */
  const shell = (x0, y0, z0, x1, y1, z1, color, g) => {
    for (let z = z0; z < z1; z++) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1 || z === z0 || z === z1 - 1) {
            put(x, y, z, color, g);
          }
        }
      }
    }
  };
  const clearBox = (x0, y0, z0, x1, y1, z1) => {
    for (let z = z0; z < z1; z++) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) del(x, y, z);
      }
    }
  };
  /** Vertical cylinder centered at (cx, cy), radius r, for z ∈ [z0, z1). */
  const cylZ = (cx, cy, z0, z1, r, color, g) => {
    const r2 = r * r;
    for (let z = z0; z < z1; z++) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) put(x, y, z, color, g);
        }
      }
    }
  };
  /** Horizontal wheel/pod cylinder along Y axis centered at (cx, cz). */
  const cylY = (cx, y0, y1, cz, r, color, g) => {
    const r2 = r * r;
    for (let y = y0; y < y1; y++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (z - cz) ** 2 <= r2) put(x, y, z, color, g);
        }
      }
    }
  };
  /** Horizontal barrel/hull cylinder along X axis centered at (cy, cz). */
  const cylX = (x0, x1, cy, cz, r, color, g) => {
    const r2 = r * r;
    for (let x = x0; x < x1; x++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
          if ((y - cy) ** 2 + (z - cz) ** 2 <= r2) put(x, y, z, color, g);
        }
      }
    }
  };
  /** Sloped plate: for each x step the top z rises by `rise` per `run`. */
  const ramp = (x0, x1, y0, y1, z0, rise, run, color, g) => {
    for (let x = x0; x < x1; x++) {
      const z = z0 + Math.floor(((x - x0) * rise) / run);
      box(x, y0, z0, x + 1, y1, z + 1, color, g);
    }
  };
  const finish = () =>
    [...voxels.values()].sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0])
      .map(([x, y, z, c, _g]) => [x, y, z, c]);
  const entries = () => [...voxels.values()];
  const has = (x, y, z) => voxels.has(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`);
  /** Replace colours in place (army hull palettes). */
  const recolor = mapping => {
    for (const [key, [x, y, z, color, g]] of voxels) {
      const next = mapping[color];
      if (next) voxels.set(key, [x, y, z, next, g]);
    }
  };
  /** Repaint existing voxels matching a predicate (stripes/insignia, no growth). */
  const paint = (predicate, color) => {
    for (const [key, [x, y, z, c, g]] of voxels) {
      if (predicate(x, y, z, c)) voxels.set(key, [x, y, z, color, g]);
    }
  };
  /** Retag voxels matching a predicate into a group (army headgear etc.). */
  const regroup = (predicate, name) => {
    for (const [key, [x, y, z, c, g]] of voxels) {
      if (predicate(x, y, z, c)) voxels.set(key, [x, y, z, c, name]);
    }
  };
  /** Drop voxels no iso facing can ever see: the painter overdraws a voxel's
   *  top / screen-left / screen-right faces when the +z, +y and +x neighbours
   *  exist, and the four facings rotate those three directions through
   *  {+x,+y,-x,-y,+z}. The bottom face is never visible in this projection, so
   *  a voxel with those five neighbours is pure interior — culling it keeps
   *  every silhouette byte-identical while the JSON stores surfaces only. */
  const hollow = () => {
    for (const [key, [x, y, z]] of [...voxels]) {
      if (voxels.has(`${x + 1},${y},${z}`) && voxels.has(`${x - 1},${y},${z}`)
        && voxels.has(`${x},${y + 1},${z}`) && voxels.has(`${x},${y - 1},${z}`)
        && voxels.has(`${x},${y},${z + 1}`)) {
        voxels.delete(key);
      }
    }
  };

  const api = {
    put, del, box, shell, clearBox, cylZ, cylY, cylX, ramp, finish, entries,
    has, recolor, paint, regroup, hollow, group, pivot,
    get pivots() { return pivots; },
    get currentGroup() { return cur; },
    raw: voxels,
  };
  return api;
}

/* ------------------------------------------------- pose transform engine --- */
/** Rotate group voxels about the vertical axis through pivot [px, py]. */
function opYaw(list, deg, px, py) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return list.map(([x, y, z, col, g]) => [
    Math.round(px + (x - px) * c - (y - py) * s),
    Math.round(py + (x - px) * s + (y - py) * c),
    z, col, g,
  ]);
}
/** Rotate group voxels in the X/Z plane (barrel elevation) about [px, pz]. */
function opPitch(list, deg, px, pz) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return list.map(([x, y, z, col, g]) => [
    Math.round(px + (x - px) * c - (z - pz) * s),
    y,
    Math.round(pz + (x - px) * s + (z - pz) * c),
    col, g,
  ]);
}
/** Rotate group voxels in the Y/Z plane (tail rotor, disc roll) about [py, pz]. */
function opRoll(list, deg, py, pz) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return list.map(([x, y, z, col, g]) => [
    x,
    Math.round(py + (y - py) * c - (z - pz) * s),
    Math.round(pz + (y - py) * s + (z - pz) * c),
    col, g,
  ]);
}
/** Spin wheel lugs about each axle centre [cx, cz] in the X/Z plane. */
function opSpin(list, deg, axles) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return list.map(([x, y, z, col, g]) => {
    const axle = axles.reduce((best, a) =>
      Math.hypot(x - a[0], z - a[1]) < Math.hypot(x - best[0], z - best[1]) ? a : best);
    const [cx, cz] = axle;
    return [
      Math.round(cx + (x - cx) * c - (z - cz) * s),
      y,
      Math.round(cz + (x - cx) * s + (z - cz) * c),
      col, g,
    ];
  });
}
/** Cyclic belt wrap along X inside [x0, x1): tread cleats marching backwards. */
function opWrapX(list, dx, x0, x1) {
  const span = x1 - x0;
  return list.map(([x, y, z, col, g]) => [x0 + (((x - x0 + dx) % span) + span) % span, y, z, col, g]);
}

const CHARCOAL = ['#241a12', '#3a2014', '#2c231c', '#1e2226'];
/** Progressive battle damage: scorch recolour + sagging + debris ring. */
function opScorch(canvas, level, seed) {
  if (level <= 0) return;
  const rnd = mulberry32(seed);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const all = canvas.entries();
  const exposed = all.filter(([x, y, z]) => !canvas.has(x, y, z + 1));
  const n = Math.floor(exposed.length * Math.min(0.85, level * 0.35));
  for (let i = 0; i < n; i++) {
    const [x, y, z, , g] = exposed[Math.floor((i / n) * exposed.length)];
    canvas.raw.set(`${x},${y},${z}`, [x, y, z, pick(CHARCOAL), g]);
  }
  if (level >= 2) {
    // Debris chunks flung onto the ground ring around the wreck.
    for (let i = 0; i < 6 + level * 3; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 20 + rnd() * 10;
      const x = Math.round(32 + Math.cos(a) * r);
      const y = Math.round(32 + Math.sin(a) * r);
      canvas.put(x, y, 0, pick(['#525b64', '#3b4238', '#4a535c']), 'debris');
      if (rnd() > 0.5) canvas.put(x, y, 1, pick(CHARCOAL), 'debris');
    }
  }
}

/** Apply a list of group operations to the canvas (deterministic, in order).
 *  Pivots come from the sculptor (`canvas.pivot(group, …)`) so poses track the
 *  real geometry of each model instead of hardcoded constants. */
export function applyPoseOps(canvas, ops) {
  for (const op of ops) {
    if (op.scorch) { opScorch(canvas, op.scorch, op.seed ?? 7); continue; }
    const list = canvas.entries().filter(v => v[4] === op.g);
    if (!list.length) continue;
    for (const [x, y, z] of list) canvas.del(x, y, z);
    let out = list;
    const piv = op.pivot ?? (op.pivotFrom ? canvas.pivots[op.pivotFrom] : null) ?? canvas.pivots[op.g] ?? [32, 32];
    if (op.yaw) out = opYaw(out, op.yaw, piv[0], piv[1]);
    if (op.pitch) out = opPitch(out, op.pitch, piv[0], piv[1]);
    if (op.roll) out = opRoll(out, op.roll, piv[0], piv[1]);
    if (op.spin) out = opSpin(out, op.spin, op.axles ?? canvas.pivots[op.g] ?? DEFAULT_AXLES);
    if (op.wrap != null) {
      const w = op.window ?? canvas.pivots[op.g] ?? BELT_X;
      out = opWrapX(out, op.wrap, w[0], w[1]);
    }
    if (op.move) out = out.map(([x, y, z, c, g]) => [x + op.move[0], y + op.move[1], z + op.move[2], c, g]);
    if (op.hide) continue;
    for (const [x, y, z, c, g] of out) canvas.put(x, y, z, c, g);
  }
}

/* ------------------------------------------------------- pose driver ------- */
/** Gait / mechanism scalars a builder reads while drawing cyclic patterns. */
export function posePhase(action, frame) {
  return { action, frame };
}

/** Rigid group operations for one clip frame of one unit model. */
export function poseOpsFor(id, family, weapon, action, frame) {
  const ops = [];
  if (action === 'idle' || frame === 0 && action !== 'move') {
    // Rest poses still get family-specific idle machinery below.
  }
  if (family === 'foot') {
    if (action === 'move') {
      const step = [[2, -2, 0], [0, 0, 1], [-2, 2, 0], [0, 0, 1]][frame];
      ops.push({g: 'legL', move: [step[0], 0, step[0] > 0 ? 1 : 0]});
      ops.push({g: 'legR', move: [step[1], 0, step[1] > 0 ? 1 : 0]});
      ops.push({g: 'upper', move: [0, 0, step[2]]});
      ops.push({g: 'weapon', move: [0, 0, step[2]]});
    } else if (action === 'attack') {
      if (frame === 0) ops.push({g: 'upper', move: [1, 0, 1]}, {g: 'weapon', pitch: -8});
      else if (frame === 1) ops.push({g: 'upper', move: [-1, 0, 1]}, {g: 'weapon', pitch: -8, move: [-2, 0, 0]});
      else ops.push({g: 'weapon', pitch: -4, move: [-1, 0, 0]});
    } else if (action === 'death') {
      if (frame === 0) ops.push({g: 'upper', pitch: -12});
      else if (frame === 1) ops.push({g: 'upper', pitch: -24, move: [0, 0, -4]}, {g: 'legL', move: [2, 0, -1]}, {g: 'legR', move: [-2, 0, -1]});
      else if (frame === 2) ops.push({g: 'upper', pitch: -58, move: [-2, 0, -9]}, {g: 'legL', move: [3, 0, -2]}, {g: 'legR', move: [-3, 0, -2]});
      else if (frame === 3) ops.push({g: 'upper', pitch: -84, move: [-4, 0, -13]}, {g: 'legL', move: [4, 0, -3]}, {g: 'legR', move: [-4, 0, -3]}, {g: 'weapon', move: [-6, 3, -12]});
      else ops.push({g: 'upper', pitch: -88, move: [-4, 0, -14]}, {g: 'legL', move: [4, 0, -3]}, {g: 'legR', move: [-4, 0, -3]}, {g: 'weapon', move: [-7, 4, -13]}, {scorch: 2, seed: 11});
    }
    return ops;
  }
  if (family === 'tracked' || family === 'wheeled') {
    if (action === 'move') {
      if (family === 'tracked') {
        ops.push({g: 'cleatL', wrap: -frame});
        ops.push({g: 'cleatR', wrap: -frame});
      }
      ops.push({g: 'wheels', spin: -frame * 50});
    } else if (action === 'attack') {
      // Gun tanks run a real fire cycle: elevate → drop + recoil → recover,
      // so the muzzle brake crosses the hull skyline on every frame change.
      const gunTank = id === 'tank' || id === 'heavy' || id === 'mega' || id === 'bastion'
        || id === 'ifv' || id === 'tank-destroyer' || id === 'flame-tank' || id === 'amphibious-tank';
      // Gun tanks elevate positively (muzzle climbs above the hull skyline on
      // the aim frame, drops through it on the burst frame); launchers keep
      // their own depression/elevation maps.
      const elev = {artillery: -12, antiair: -26, missiles: -14, rockets: -10, recon: -30,
        tank: -22, heavy: -22, mega: -22, bastion: -20, aegis: -16,
        ifv: -22, 'tank-destroyer': -18, 'flame-tank': -20, 'amphibious-tank': -22}[id] ?? 6;
      // The recon's pintle MG elevates past the roofline and swings wide so
      // every burst frame breaks the skyline (colour-only motion is gated).
      const swing = id === 'recon' ? -14 : 5;
      const elevF1 = {recon: -10, tank: -2, heavy: -2, mega: -2, bastion: -2,
        ifv: -2, 'tank-destroyer': -2, 'flame-tank': -2, 'amphibious-tank': -2}[id] ?? elev;
      const swingF2 = id === 'recon' ? 14 : -3;
      const elevF2 = {recon: -20, tank: -10, heavy: -10, mega: -10, bastion: -10,
        ifv: -10, 'tank-destroyer': -8, 'flame-tank': -10, 'amphibious-tank': -10}[id] ?? Math.round(elev / 2);
      const recF1 = gunTank ? -4 : -3;
      // Gun tanks also traverse: the barrel yaws about the turret ring (its
      // own pivot is a pitch centre) so the muzzle sweeps the skyline in
      // every facing, then elevates/drops through the recoil cycle.
      const traverse = gunTank ? [-20, 12, 4] : [swing, 0, swingF2];
      if (frame === 0) {
        ops.push({g: 'turret', yaw: traverse[0]});
        ops.push({g: 'barrel', yaw: traverse[0], pivotFrom: 'turret'});
        ops.push({g: 'barrel', pitch: -elev});
        ops.push({g: 'rack', yaw: swing, pitch: -elev});
      } else if (frame === 1) {
        ops.push({g: 'turret', yaw: traverse[1]});
        ops.push({g: 'barrel', yaw: traverse[1], pivotFrom: 'turret'});
        ops.push({g: 'barrel', pitch: -elevF1, move: [recF1, 0, 0]});
        // Burst frame: the mount kicks down and swings across the skyline.
        ops.push({g: 'rack', yaw: id === 'recon' ? swing + 16 : 0, pitch: -elevF1, move: [-3, 0, 0]});
        if (id === 'rockets' || id === 'missiles' || id === 'aegis') ops.push({g: 'ammo', hide: true});
      } else {
        ops.push({g: 'turret', yaw: traverse[2]});
        ops.push({g: 'barrel', yaw: traverse[2], pivotFrom: 'turret'});
        ops.push({g: 'barrel', pitch: -elevF2, move: [-1, 0, 0]});
        ops.push({g: 'rack', yaw: swingF2, pitch: -elevF2, move: [-1, 0, 0]});
        if (id === 'rockets' || id === 'missiles' || id === 'aegis') ops.push({g: 'ammo', hide: true});
      }
    } else if (action === 'death') {
      // Knocked-out hulls list progressively (roll about the centreline) on
      // top of the slackening turret, so every frame changes the silhouette.
      const list = [0, 5, 10, 14][Math.min(frame, 3)];
      if (frame === 0) ops.push({g: 'turret', yaw: 10}, {scorch: 1, seed: 21});
      else if (frame === 1) ops.push({g: 'turret', yaw: 20, move: [0, 0, -1]}, {g: 'barrel', pitch: 8}, {g: 'rack', pitch: 10, move: [0, 0, -1]}, {g: 'body', roll: list, move: [0, 0, -1]}, {scorch: 2, seed: 22});
      else if (frame === 2) ops.push({g: 'turret', yaw: 32, move: [0, 0, -2]}, {g: 'barrel', pitch: 16}, {g: 'rack', pitch: 20, move: [0, 0, -2]}, {g: 'body', roll: list, move: [0, 0, -2]}, {scorch: 3, seed: 23});
      else ops.push({g: 'turret', yaw: 40, move: [0, 0, -3]}, {g: 'barrel', pitch: 24, move: [-2, 0, -2]}, {g: 'rack', pitch: 28, move: [0, 0, -3]}, {g: 'body', roll: list, move: [0, 0, -1]}, {scorch: 4, seed: 24});
    }
    return ops;
  }
  if (family === 'naval') {
    if (action === 'move') {
      // Surge-and-settle: hull rises two voxels across the clip while the
      // deck pitches bow-up then bow-down, so every frame is distinct.
      const lift = [0, 1, 2, 1][frame % 4];
      const list = [0, -2, 0, 2][frame % 4];
      ops.push({g: 'body', move: [0, 0, lift]});
      if (list) ops.push({g: 'upper', pitch: list});
      ops.push({g: 'wake', move: [frame % 2 ? -2 : 2, 0, lift]});
    } else if (action === 'attack') {
      // Main-gun ships traverse and elevate hard so the muzzles sweep the
      // skyline from every facing; [turretX, barrelX, barrelZ] pivots.
      const gunship = id === 'gunboat' ? [44, 46, 14]
        : id === 'destroyer' ? [46, 48, 15]
        : id === 'battleship' ? [45, 45, 16] : null;
      if (frame === 0) {
        if (gunship) {
          ops.push({g: 'turret', yaw: -16});
          ops.push({g: 'barrel', yaw: -16, pivot: [gunship[0], 32]});
          ops.push({g: 'barrel', pitch: 20, pivot: [gunship[1], gunship[2]]});
        } else {
          ops.push({g: 'turret', yaw: 5});
          ops.push({g: 'barrel', pitch: -8});
        }
        ops.push({g: 'hatch', move: [0, 0, 1]});
      } else {
        if (gunship) {
          ops.push({g: 'turret', yaw: 8});
          ops.push({g: 'barrel', yaw: 8, pivot: [gunship[0], 32]});
          ops.push({g: 'barrel', pitch: 4, move: [-4, 0, 0], pivot: [gunship[1], gunship[2]]});
        } else {
          ops.push({g: 'turret', yaw: 0});
          ops.push({g: 'barrel', pitch: -3, move: [-4, 0, 0]});
        }
        ops.push({g: 'hatch', move: [2, 0, 1]});
        // The submarine's torpedo clears the bow on launch; cruiser missiles
        // rise straight out of their cells; carrier strike jet launches forward.
        ops.push({g: 'ammo', move: id === 'submarine' ? [2, 0, 6]
          : id === 'carrier' ? [8, 0, 5] : [0, 0, 8]});
      }
    } else if (action === 'death') {
      if (frame === 0) ops.push({g: 'upper', move: [0, 0, -1]}, {scorch: 1, seed: 31});
      else if (frame === 1) ops.push({g: 'upper', move: [0, 0, -2], pitch: -6}, {g: 'body', move: [0, 0, -1]}, {scorch: 2, seed: 32});
      else if (frame === 2) ops.push({g: 'upper', move: [0, 0, -4], pitch: -12}, {g: 'body', move: [0, 0, -2]}, {scorch: 3, seed: 33});
      else ops.push({g: 'upper', move: [0, 0, -6], pitch: -18}, {g: 'body', move: [0, 0, -3]}, {scorch: 4, seed: 34});
    }
    return ops;
  }
  if (family === 'rotor') {
    // The Recon Drone is a quad-rotor: every blade set spins about its own hub,
    // so each rotor group carries its own pivot instead of sharing one centre.
    const UAV_HUBS = [[12, 12], [12, 48], [48, 12], [48, 48]];
    const spin = deg => id === 'uav'
      ? UAV_HUBS.map(([hx, hy]) => ({g: `rotor${hx}-${hy}`, yaw: deg}))
      : [{g: 'rotorMain', yaw: deg}];
    const tumble = (deg, dz) => id === 'uav'
      ? UAV_HUBS.map(([hx, hy]) => ({g: `rotor${hx}-${hy}`, pitch: deg, move: [0, 0, dz], pivot: [hx, 30]}))
      : [{g: 'rotorMain', pitch: deg, move: [0, 0, dz]}];
    if (action === 'idle') {
      ops.push(...spin(frame * 50), {g: 'rotorTail', roll: frame * 70});
      if (id === 'lift-copter') ops.push({g: 'rotorFore', yaw: -frame * 50});
    } else if (action === 'move') {
      ops.push(...spin(frame * 50), {g: 'rotorTail', roll: frame * 70});
      if (id === 'lift-copter') ops.push({g: 'rotorFore', yaw: -frame * 50});
      ops.push({g: 'body', move: [0, 0, frame === 1 || frame === 3 ? 1 : 0]});
    } else if (action === 'attack') {
      ops.push(...spin(frame * 100), {g: 'rotorTail', roll: frame * 70});
      if (frame === 0) ops.push({g: 'pods', pitch: -6});
      else ops.push({g: 'pods', pitch: -6, move: [-2, 0, 0]}, {g: 'ammo', hide: true});
    } else if (action === 'death') {
      if (frame === 0) ops.push(...tumble(8, 0), {scorch: 1, seed: 41});
      else if (frame === 1) ops.push(...tumble(20, -2), {g: 'body', move: [0, 0, -2]}, {scorch: 2, seed: 42});
      else if (frame === 2) ops.push(...tumble(40, -5), {g: 'body', move: [0, 0, -5], yaw: 12}, {scorch: 3, seed: 43});
      else ops.push(...tumble(62, -8), {g: 'body', move: [0, 0, -8], yaw: 22}, {scorch: 4, seed: 44});
    }
    return ops;
  }
  if (family === 'jet') {
    if (action === 'move') {
      // Flight undulation: the airframe rides two voxels up across the clip so
      // the wing silhouette crosses the skyline on every frame.
      ops.push({g: 'body', move: [0, 0, [0, 1, 2, 1][frame % 4]]});
    } else if (action === 'attack') {
      // The bomber's dorsal speed-brake rises clear of the spine (visible
      // against the sky from every facing) while the bombs leave the racks;
      // the fighter's ventral airbrake drops below its thin fuselage.
      const dorsalBay = id === 'mpa' || id === 'specter' || id === 'ground-attack-jet' || id === 'stealth-fighter';
      if (frame === 0) ops.push({g: 'bay', move: [0, 0, id === 'bomber' ? 3 : dorsalBay ? 2 : -1]});
      else if (id === 'bomber') ops.push({g: 'bay', move: [0, 0, 6]}, {g: 'ammo', move: [4, 0, -8]});
      else if (dorsalBay)
        // Dorsal doors/brake rise clear of the spine (reads from above) while
        // the store drops/launches clear of the belly (reads from every side facing).
        ops.push({g: 'bay', move: [0, 0, 5]}, {g: 'ammo', move: [6, 0, -10]});
      else ops.push({g: 'bay', move: [0, 0, -2]}, {g: 'ammo', hide: true});
    } else if (action === 'death') {
      if (frame === 0) ops.push({g: 'body', yaw: 12, move: [0, 0, -2]}, {scorch: 1, seed: 51});
      else if (frame === 1) ops.push({g: 'body', yaw: 28, move: [0, 0, -6]}, {scorch: 2, seed: 52});
      else if (frame === 2) ops.push({g: 'body', yaw: 46, move: [0, 0, -11]}, {scorch: 3, seed: 53});
      else ops.push({g: 'body', yaw: 64, move: [0, 0, -16]}, {scorch: 4, seed: 54});
    }
    return ops;
  }
  return ops;
}

/** Building idle operations (operational machinery only). */
export function buildingPoseOps(id, frame) {
  if ((id === 'airport' || id === 'radar-station') && frame === 1) return [{g: 'dish', yaw: 60}];
  return [];
}

// Tread belt wrap window and wheel axle tables (64³ coordinates), filled in by
// the unit sculptors through canvas.pivot so poses track the real geometry.
export const BELT_X = [6, 58];
export const DEFAULT_AXLES = [[12, 5], [24, 5], [40, 5], [52, 5]];
export const WHEEL_AXLES = {};

/* ------------------------------------------------------------- assembly ---- */
import {unitVoxels, applyArmyDelta} from './models/units.mjs';
import {buildingVoxels} from './models/buildings.mjs';
import {terrainVoxels, siloMissileVoxels} from './models/terrain.mjs';

export const UNIT_FAMILY = {
  infantry: 'foot', mech: 'foot', engineer: 'foot', medic: 'foot',
  'rocket-infantry': 'foot', 'aa-infantry': 'foot', 'sniper': 'foot',
  grenadier: 'foot', flamethrower: 'foot', demolitionist: 'foot', commando: 'foot',
  officer: 'foot', spy: 'foot', 'elite-hero': 'foot', 'attack-dog': 'foot', scout: 'foot',
  apc: 'tracked', tank: 'tracked', heavy: 'tracked', artillery: 'tracked',
  antiair: 'tracked', mega: 'tracked',
  recon: 'wheeled', rockets: 'wheeled', missiles: 'wheeled',
  submarine: 'naval', gunboat: 'naval', cruiser: 'naval',
  battleship: 'naval', lander: 'naval',
  copter: 'rotor', 'lift-copter': 'rotor',
  fighter: 'jet', bomber: 'jet',
  uhac: 'naval', uav: 'rotor', mpa: 'jet',
  bastion: 'tracked', specter: 'jet', aegis: 'wheeled',
  ifv: 'tracked', 'supply-truck': 'wheeled', 'mobile-repair': 'tracked',
  'command-vehicle': 'wheeled', 'mine-layer': 'tracked', 'tank-destroyer': 'tracked',
  'flame-tank': 'tracked', 'amphibious-tank': 'tracked', 'mine-clearing': 'tracked',
  'ground-attack-jet': 'jet', 'transport-plane': 'jet',
  'stealth-fighter': 'jet', 'spy-plane': 'jet',
  destroyer: 'naval', 'missile-boat': 'naval', carrier: 'naval',
  'naval-repair': 'naval', 'mine-layer-ship': 'naval',
};
export const UNIT_WEAPON = {
  infantry: 'rifle', mech: 'cannon', 'rocket-infantry': 'rocket', 'aa-infantry': 'aa', 'sniper': 'rifle',
  grenadier: 'cannon', flamethrower: 'rifle', demolitionist: 'heavy', commando: 'rifle',
  officer: 'rifle', spy: 'rifle', 'elite-hero': 'heavy', 'attack-dog': 'rifle', scout: 'rifle',
  recon: 'rifle', tank: 'cannon',
  heavy: 'heavy', artillery: 'shell', antiair: 'aa', mega: 'mega',
  rockets: 'rockets', missiles: 'sam', submarine: 'torpedo',
  gunboat: 'navalGun', cruiser: 'navalMissile', battleship: 'navalShell',
  copter: 'airRocket', fighter: 'airMissile', bomber: 'bomb',
  uhac: null, uav: null, mpa: 'torpedo',
  bastion: 'heavy', specter: 'bomb', aegis: 'sam',
  ifv: 'cannon', 'supply-truck': null, 'mobile-repair': null,
  'command-vehicle': null, 'mine-layer': null, 'tank-destroyer': 'heavy',
  'flame-tank': 'cannon', 'amphibious-tank': 'cannon', 'mine-clearing': null,
  'ground-attack-jet': 'airRocket', 'transport-plane': null,
  'stealth-fighter': 'airMissile', 'spy-plane': null,
  destroyer: 'navalGun', 'missile-boat': 'navalMissile', carrier: 'airMissile',
  'naval-repair': null, 'mine-layer-ship': null,
};

export function clipsFor(id, kind) {
  if (kind === 'unit') return MODEL_POSES[id];
  if (kind === 'building') return { idle: BUILDING_IDLE[id] ?? 1 };
  if (kind === 'effect') return MODEL_POSES[id] ?? { idle: 1 };
  return { idle: 1 };
}

/** Full model roster as [id, kind, armyId] triples (units + army skins first). */
export function modelRoster(unitsJson) {
  const roster = [];
  for (const type of Object.keys(unitsJson)) roster.push([type, 'unit', 'standard']);
  for (const armyId of UNIT_ARMY_IDS) {
    for (const type of Object.keys(unitsJson)) roster.push([`${type}--${armyId}`, 'unit', armyId]);
  }
  for (const t of BUILDINGS) roster.push([t, 'building', 'standard']);
  for (const t of TERRAIN_MODELS) roster.push([t, t === 'silo-missile' ? 'effect' : 'terrain', 'standard']);
  return roster;
}

/** Sculpt one model for one pose; returns the tagged canvas (pre-hollow). */
export function sculptModel(id, kind, armyId, pose) {
  const canvas = createCanvas();
  if (kind === 'building') {
    buildingVoxels(canvas, id, pose);
    if (pose && pose.frame > 0) applyPoseOps(canvas, buildingPoseOps(id, pose.frame));
  } else if (kind === 'terrain') {
    terrainVoxels(canvas, id, pose);
  } else if (kind === 'effect') {
    siloMissileVoxels(canvas, id, pose);
  } else {
    const baseId = id.includes('--') ? id.split('--')[0] : id;
    unitVoxels(canvas, baseId, pose);
    if (armyId && armyId !== 'standard') applyArmyDelta(canvas, baseId, armyId);
    const {action, frame} = pose ?? { action: 'idle', frame: 0 };
    if (frame > 0 || action !== 'idle') {
      applyPoseOps(canvas, poseOpsFor(baseId, UNIT_FAMILY[baseId], UNIT_WEAPON[baseId] ?? null, action, frame));
    }
  }
  return canvas;
}

/** Every clip frame of one model, as sorted voxel lists (frame 0 = canonical). */
export function buildModelFrames(id, kind, armyId = 'standard') {
  const clips = clipsFor(id, kind);
  const out = {};
  for (const [action, frames] of Object.entries(clips)) {
    const list = [];
    for (let f = 0; f < frames; f++) {
      const canvas = sculptModel(id, kind, armyId, { action, frame: f });
      canvas.hollow();
      list.push(canvas.finish());
    }
    out[action] = list;
  }
  return out;
}

export function buildVoxels(unitsJson) {
  const palette = [];
  const indexOf = new Map();
  const pix = color => {
    const lc = color.toLowerCase();
    let i = indexOf.get(lc);
    if (i === undefined) {
      i = palette.length;
      indexOf.set(lc, i);
      palette.push(lc);
    }
    return i;
  };
  try {
    const existingPath = path.join(ROOT, 'data/voxels.json');
    if (fs.existsSync(existingPath)) {
      const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      if (Array.isArray(existing.palette)) {
        for (const c of existing.palette) pix(c);
      }
    }
  } catch {}
  const models = {};
  const add = (id, kind, armyId = 'standard') => {
    const canvas = sculptModel(id, kind, armyId, { action: 'idle', frame: 0 });
    canvas.hollow();
    const raw = canvas.finish();
    models[id] = {
      kind,
      size: [...VOXEL_SIZE],
      clips: clipsFor(id, kind),
      voxels: raw.map(([x, y, z, c]) => [x, y, z, pix(c)]),
    };
  };
  for (const type of Object.keys(unitsJson)) add(type, 'unit');
  // Army variants: `tank--allies`, `fighter--empire`, … (Standard keeps `tank`).
  for (const armyId of UNIT_ARMY_IDS) {
    for (const type of Object.keys(unitsJson)) add(`${type}--${armyId}`, 'unit', armyId);
  }
  for (const t of BUILDINGS) add(t, 'building');
  for (const t of TERRAIN_MODELS) add(t, t === 'silo-missile' ? 'effect' : 'terrain');
  return {
    format: 'field-command-voxel-64x64x64',
    generatedBy: 'tools/voxel_pipeline/build.mjs',
    palette,
    models,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8'));
  const out = buildVoxels(units);
  const dest = path.join(ROOT, 'data/voxels.json');
  fs.writeFileSync(dest, JSON.stringify(out) + '\n');
  const count = Object.values(out.models).reduce((s, m) => s + m.voxels.length, 0);
  console.log(`Wrote ${Object.keys(out.models).length} voxel models (${count} voxels, ${out.palette.length} colours) to data/voxels.json`);
}
