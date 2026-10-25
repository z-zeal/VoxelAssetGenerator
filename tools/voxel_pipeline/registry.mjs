/**
 * Model registration helper for the voxel pipeline.
 * Documents every file/array/list that must contain a new asset ID.
 * Not executed automatically; use it to verify nothing was forgotten.
 */

export const REGISTRY_POINTS = {
  unit: [
    'data/units.json',
    'data/animation.json',
    'tools/voxel_pipeline/build.mjs (UNIT_FAMILY, UNIT_WEAPON, MODEL_POSES)',
    'tools/voxel_pipeline/models/units.mjs',
    'src/armies.js (ARMY_IDS)',
  ],
  building: [
    'tools/voxel_pipeline/build.mjs (BUILDINGS, BUILDING_IDLE)',
    'tools/voxel_pipeline/models/buildings.mjs',
    'data/animation.json (if mechanical parts)',
  ],
  terrain: [
    'tools/voxel_pipeline/build.mjs (TERRAIN_MODELS)',
    'tools/voxel_pipeline/models/terrain.mjs (terrainVoxels)',
    'data/animation.json (only if animated; most terrain is static idle:1)',
  ],
  effect: [
    'tools/voxel_pipeline/build.mjs (TERRAIN_MODELS + effect kind)',
    'tools/voxel_pipeline/models/terrain.mjs (siloMissileVoxels or new effect branch)',
    'tools/voxel_pipeline/build.mjs (MODEL_POSES)',
  ],
};

export function verifyRegistered(id, kind, files) {
  const missing = [];
  for (const f of files) {
    // In a real check we'd read the file; here we document the expected content.
    missing.push(`verify ${f} contains ${id}`);
  }
  return { id, kind, checks: missing };
}

export function registerTerrain(id) {
  return verifyRegistered(id, 'terrain', REGISTRY_POINTS.terrain);
}
export function registerBuilding(id) {
  return verifyRegistered(id, 'building', REGISTRY_POINTS.building);
}
export function registerUnit(id) {
  return verifyRegistered(id, 'unit', REGISTRY_POINTS.unit);
}
