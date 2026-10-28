/**
 * Registry of 512³-native assets.
 *
 * Every entry names its own output folder (`game_assets/<folder>/<id>/`), the
 * parts it must produce, and the builder that sculpts it. Adding an asset means
 * adding one module and one line here — the baker, the index writer and the
 * validator all read this table.
 *
 * `kind` decides the facing set: units bake 16 (22.5° steps), buildings bake the
 * 4 legacy cardinal poses and never more.
 */
import { buildTank } from './tank.mjs';
import { buildBarracks } from './barracks.mjs';
import { buildAtTurret } from './at-turret.mjs';

export const MODELS = {
  tank: {
    kind: 'unit',
    folder: 'units',
    group: 'vehicles.tracked',
    label: 'Light Tank',
    build: buildTank,
    requiredParts: ['body', 'turret', 'barrel'],
  },
  barracks: {
    kind: 'building',
    folder: 'buildings',
    group: 'infrastructure.military',
    label: 'Barracks',
    build: buildBarracks,
    requiredParts: ['body', 'door', 'flag'],
    minSpan: 180,
  },
  'at-turret': {
    kind: 'building',
    folder: 'buildings',
    group: 'defences.anti-tank',
    label: 'Anti-Tank Turret',
    build: buildAtTurret,
    requiredParts: ['body', 'turret', 'barrel'],
    minSpan: 180,
  },
};
