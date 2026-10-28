/**
 * Registry of 512³-native assets.
 *
 * Every entry names its own output folder (`game_assets/<folder>/<id>/`), the
 * parts it must produce, and the builder that sculpts it. Adding an asset means
 * adding one module and one line here — the baker, the index writer and the
 * validator all read this table.
 */
import { buildTank } from './tank.mjs';

export const MODELS = {
  tank: {
    kind: 'unit',
    folder: 'units',
    group: 'vehicles.tracked',
    label: 'Light Tank',
    build: buildTank,
    requiredParts: ['body', 'turret', 'barrel'],
  },
};
