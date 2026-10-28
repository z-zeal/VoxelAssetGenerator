/**
 * Single import surface for model builders.
 *
 * Builders should not care whether a primitive lives in `kit.mjs` (vehicles),
 * `kit-buildings.mjs` (architecture) or the canvas itself. Re-exporting keeps
 * every builder's import line stable as the kits grow.
 */
export * from './kit.mjs';
export * from './kit-buildings.mjs';
