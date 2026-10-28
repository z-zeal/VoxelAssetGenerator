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
import { buildApc } from './apc.mjs';
import { buildHeavy } from './heavy.mjs';
import { buildArtillery } from './artillery.mjs';
import { buildAntiair } from './antiair.mjs';
import { buildTankDestroyer } from './tank-destroyer.mjs';
import { buildIfv } from './ifv.mjs';
import { buildMega } from './mega.mjs';
import { buildBastion } from './bastion.mjs';
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
  apc: {
    kind: 'unit',
    folder: 'units',
    group: 'vehicles.tracked',
    label: 'Armoured Personnel Carrier',
    build: buildApc,
    requiredParts: ['body', 'turret', 'barrel'],
  },
  heavy: {
    kind: 'unit',
    folder: 'units',
    group: 'vehicles.tracked',
    label: 'Heavy Tank',
    build: buildHeavy,
    requiredParts: ['body', 'turret', 'barrel'],
  },
  artillery: {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Self-Propelled Artillery',
    build: buildArtillery, requiredParts: ['body', 'turret', 'barrel'],
  },
  antiair: {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Anti-Aircraft Vehicle',
    build: buildAntiair, requiredParts: ['body', 'turret', 'barrel', 'radar'],
  },
  'tank-destroyer': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Tank Destroyer',
    build: buildTankDestroyer, requiredParts: ['body', 'turret', 'barrel'],
  },
  ifv: {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Infantry Fighting Vehicle',
    build: buildIfv, requiredParts: ['body', 'turret', 'barrel', 'atgm'],
  },
  mega: {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Mega Tank',
    build: buildMega, requiredParts: ['body', 'turret', 'barrel'],
    voxelBudget: 1600000,
  },
  bastion: {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Bastion',
    build: buildBastion, requiredParts: ['body', 'turret', 'barrel'],
    voxelBudget: 1600000,
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
