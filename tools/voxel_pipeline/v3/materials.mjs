/**
 * Material vocabulary for the 512³ native pipeline.
 *
 * Every voxel is authored with a *material id*, not a loose hex colour. The
 * material owns three things:
 *
 *   1. its albedo family (so army livery can repaint "team.*" without touching
 *      steel, rubber, glass or skin),
 *   2. its PBR scalars (metalness / roughness / emissive) that are written into
 *      the baked material map,
 *   3. a stable byte id used in the material-map PNG and in `materials.json`.
 *
 * Team materials are the only ones an army skin rewrites. Nothing here scales
 * geometry — these are palette and surface facts only.
 */

/** Army livery, mirrored from src/renderer.js TEAM_COLORS/light/dark sets. */
export const ARMY_LIVERY = {
  standard: { hull: '#df794b', light: '#ffc68b', dark: '#934b32', accent: '#ece7bc' },
  allies:   { hull: '#639bc3', light: '#a9d0e1', dark: '#345f78', accent: '#e8f1f4' },
  soviets:  { hull: '#7eb06a', light: '#b8e0a8', dark: '#2d4a2d', accent: '#dfe8c8' },
  empire:   { hull: '#d9b44e', light: '#ffe79a', dark: '#8a6a1a', accent: '#f6eecd' },
  legion:   { hull: '#c65a54', light: '#ffb0a8', dark: '#7a2a2a', accent: '#f3d9d4' },
  neutral:  { hull: '#aaa78b', light: '#cfcdb6', dark: '#6c6a55', accent: '#e2e0cf' },
};

/** Material table. `team: true` entries are repainted per army livery role. */
export const MATERIALS = {
  // ---- team livery -------------------------------------------------------
  'team.hull':    { color: '#df794b', metal: 0.35, rough: 0.62, team: 'hull' },
  'team.light':   { color: '#ffc68b', metal: 0.35, rough: 0.58, team: 'light' },
  'team.dark':    { color: '#934b32', metal: 0.40, rough: 0.66, team: 'dark' },
  'team.accent':  { color: '#ece7bc', metal: 0.20, rough: 0.70, team: 'accent' },

  // ---- structural metals ------------------------------------------------
  'steel':        { color: '#8e9680', metal: 0.85, rough: 0.42 },
  'steel.dark':   { color: '#5d6552', metal: 0.85, rough: 0.50 },
  'steel.bright': { color: '#b9c2b0', metal: 0.95, rough: 0.24 },
  'gunmetal':     { color: '#354d42', metal: 0.90, rough: 0.38 },
  'gunmetal.lit': { color: '#4d6a5c', metal: 0.90, rough: 0.32 },
  'iron':         { color: '#4c4935', metal: 0.80, rough: 0.62 },
  'brass':        { color: '#c9a24a', metal: 0.95, rough: 0.30 },
  'copper':       { color: '#a5693c', metal: 0.95, rough: 0.34 },
  'chrome':       { color: '#dfe6ea', metal: 1.00, rough: 0.12 },

  // ---- running gear -----------------------------------------------------
  'rubber':       { color: '#2b3128', metal: 0.05, rough: 0.92 },
  'track':        { color: '#3b4732', metal: 0.70, rough: 0.68 },
  'track.worn':   { color: '#6a705a', metal: 0.85, rough: 0.44 },
  'tyre':         { color: '#232a22', metal: 0.03, rough: 0.95 },

  // ---- armour plate -----------------------------------------------------
  'plate':        { color: '#5e6a4e', metal: 0.55, rough: 0.66 },
  'plate.lit':    { color: '#7d8a66', metal: 0.55, rough: 0.60 },
  'plate.dark':   { color: '#414a38', metal: 0.55, rough: 0.72 },

  // ---- glazing / optics -------------------------------------------------
  'glass':        { color: '#b8dedc', metal: 0.30, rough: 0.08, blend: 'glass' },
  'glass.dark':   { color: '#6b9496', metal: 0.40, rough: 0.12, blend: 'glass' },
  'optic':        { color: '#5fd6c8', metal: 0.60, rough: 0.05, emissive: 0.55, blend: 'glass' },

  // ---- lights -----------------------------------------------------------
  'lamp.warm':    { color: '#ffe9b0', metal: 0.00, rough: 0.35, emissive: 0.85 },
  'lamp.red':     { color: '#e0563f', metal: 0.00, rough: 0.35, emissive: 0.80 },
  'lamp.cyan':    { color: '#8fe6ff', metal: 0.00, rough: 0.35, emissive: 0.80 },

  // ---- infantry ---------------------------------------------------------
  'skin':         { color: '#efcf99', metal: 0.00, rough: 0.78 },
  'skin.dark':    { color: '#c8a878', metal: 0.00, rough: 0.80 },
  'cloth':        { color: '#6f7a58', metal: 0.00, rough: 0.90 },
  'cloth.dark':   { color: '#4a5340', metal: 0.00, rough: 0.92 },
  'webbing':      { color: '#3d4534', metal: 0.05, rough: 0.88 },
  'boot':         { color: '#241a12', metal: 0.10, rough: 0.85 },
  'hair':         { color: '#3a2014', metal: 0.00, rough: 0.90 },

  // ---- structures -------------------------------------------------------
  'concrete':     { color: '#e0d9b2', metal: 0.00, rough: 0.92 },
  'concrete.lit': { color: '#ece7bc', metal: 0.00, rough: 0.90 },
  'concrete.dark':{ color: '#8a8c70', metal: 0.00, rough: 0.94 },
  'brick':        { color: '#a8674a', metal: 0.00, rough: 0.90 },
  'roof':         { color: '#df794b', metal: 0.10, rough: 0.82, team: 'hull' },
  'roof.light':   { color: '#ffc68b', metal: 0.10, rough: 0.80, team: 'light' },
  'roof.dark':    { color: '#934b32', metal: 0.10, rough: 0.84, team: 'dark' },
  'asphalt':      { color: '#586d62', metal: 0.00, rough: 0.96 },
  'paint.line':   { color: '#dfe3c0', metal: 0.00, rough: 0.90 },
  'wood':         { color: '#6b5a3a', metal: 0.00, rough: 0.88 },
  'wood.dark':    { color: '#4d4029', metal: 0.00, rough: 0.90 },
  'canvas':       { color: '#6b5a3a', metal: 0.00, rough: 0.92 },
  'sandbag':      { color: '#c2b083', metal: 0.00, rough: 0.94 },
  'solar':        { color: '#2f4a66', metal: 0.60, rough: 0.22 },
  'rust':         { color: '#8a5a3a', metal: 0.30, rough: 0.88 },
  'scorch':       { color: '#241a12', metal: 0.20, rough: 0.94 },
  'smoke':        { color: '#d8dede', metal: 0.00, rough: 1.00, emissive: 0.10 },
  'water':        { color: '#324b50', metal: 0.20, rough: 0.15 },
  'foam':         { color: '#e2f6f8', metal: 0.00, rough: 0.60, emissive: 0.10 },
};

/** Stable byte id per material (order of declaration), used by the map PNG. */
export const MATERIAL_IDS = Object.fromEntries(Object.keys(MATERIALS).map((k, i) => [k, i]));
export const MATERIAL_NAMES = Object.keys(MATERIALS);

/** Resolve a material id to its albedo for a livery (or the base colour). */
export function colorFor(matId, livery = 'standard') {
  const m = MATERIALS[matId];
  if (!m) throw new Error(`unknown material "${matId}"`);
  if (!m.team) return m.color;
  return ARMY_LIVERY[livery]?.[m.team] ?? ARMY_LIVERY.standard[m.team];
}

/** Material-map metadata: id byte -> PBR scalars (no albedo; that is the sheet). */
export function materialMapDescriptor() {
  return MATERIAL_NAMES.map((name, id) => {
    const m = MATERIALS[name];
    return {
      id,
      name,
      metalness: m.metal,
      roughness: m.rough,
      emissive: m.emissive ?? 0,
      blend: m.blend ?? 'opaque',
      team: m.team ?? null,
    };
  });
}
