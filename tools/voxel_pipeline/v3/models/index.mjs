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
import { buildFlameTank } from './flame-tank.mjs';
import { buildAmphibiousTank } from './amphibious-tank.mjs';
import { buildMineLayer } from './mine-layer.mjs';
import { buildMobileRepair } from './mobile-repair.mjs';
import { buildMineClearing } from './mine-clearing.mjs';
import { buildRecon } from './recon.mjs';
import { buildRockets } from './rockets.mjs';
import { buildMissiles } from './missiles.mjs';
import { buildSupplyTruck } from './supply-truck.mjs';
import { buildCommandVehicle } from './command-vehicle.mjs';
import { buildAegis } from './aegis.mjs';
import { buildInfantry } from './infantry.mjs';
import { buildEngineer } from './engineer.mjs';
import { buildMedic } from './medic.mjs';
import { buildRocketInfantry } from './rocket-infantry.mjs';
import { buildAaInfantry } from './aa-infantry.mjs';
import { buildSniper } from './sniper.mjs';
import { buildGrenadier } from './grenadier.mjs';
import { buildFlamethrower } from './flamethrower.mjs';
import { buildDemolitionist } from './demolitionist.mjs';
import { buildCommando } from './commando.mjs';
import { buildOfficer } from './officer.mjs';
import { buildSpy } from './spy.mjs';
import { buildEliteHero } from './elite-hero.mjs';
import { buildScout } from './scout.mjs';
import { buildAttackDog } from './attack-dog.mjs';
import { buildMech } from './mech.mjs';
import { buildBomber } from './bomber.mjs';
import { buildSpecter } from './specter.mjs';
import { buildTransportPlane } from './transport-plane.mjs';
import { buildMpa } from './mpa.mjs';
import { buildFighter } from './fighter.mjs';
import { buildCopter } from './copter.mjs';
import { buildLiftCopter } from './lift-copter.mjs';
import { buildUav } from './uav.mjs';
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
  'flame-tank': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Flame Tank',
    build: buildFlameTank, requiredParts: ['body', 'turret', 'barrel'],
  },
  'amphibious-tank': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Amphibious Tank',
    build: buildAmphibiousTank, requiredParts: ['body', 'turret', 'barrel'],
  },
  'mine-layer': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Mine-Laying Vehicle',
    build: buildMineLayer, requiredParts: ['body', 'dispenser'],
  },
  'mobile-repair': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Mobile Repair Vehicle',
    build: buildMobileRepair, requiredParts: ['body', 'crane'],
  },
  'mine-clearing': {
    kind: 'unit', folder: 'units', group: 'vehicles.tracked', label: 'Mine-Clearing Vehicle',
    build: buildMineClearing, requiredParts: ['body', 'turret', 'barrel', 'flail'],
  },
  recon: {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'HUMVEE Recon',
    build: buildRecon, requiredParts: ['body', 'turret', 'barrel'],
  },
  rockets: {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'MLRS',
    build: buildRockets, requiredParts: ['body', 'launcher', 'barrel'],
  },
  missiles: {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'SAM Launcher',
    build: buildMissiles, requiredParts: ['body', 'launcher', 'barrel', 'radar'],
  },
  'supply-truck': {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'Supply Truck',
    build: buildSupplyTruck, requiredParts: ['body', 'tailgate'],
  },
  'command-vehicle': {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'Mobile Command Vehicle',
    build: buildCommandVehicle, requiredParts: ['body', 'mast'],
  },
  aegis: {
    kind: 'unit', folder: 'units', group: 'vehicles.wheeled', label: 'Aegis',
    build: buildAegis, requiredParts: ['body', 'turret', 'barrel'],
  },
  infantry: {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Infantry',
    build: buildInfantry, requiredParts: ['body', 'head', 'arm.R'],
    // A man is ~200 voxels tall at the scale the vehicles are authored on, so the
    // 180-voxel footprint gate that catches 64³-scale mistakes does not apply.
    minSpan: 60,
  },
  'engineer': {
    kind: 'unit', folder: 'units', group: 'infantry.support', label: 'Engineer',
    build: buildEngineer, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'medic': {
    kind: 'unit', folder: 'units', group: 'infantry.support', label: 'Field Medic',
    build: buildMedic, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'rocket-infantry': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Rocket Infantry',
    build: buildRocketInfantry, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'aa-infantry': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Anti-Air Infantry',
    build: buildAaInfantry, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'sniper': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Sniper',
    build: buildSniper, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'grenadier': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Grenadier',
    build: buildGrenadier, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'flamethrower': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Flamethrower Trooper',
    build: buildFlamethrower, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'demolitionist': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Demolitionist',
    build: buildDemolitionist, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'commando': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Commando',
    build: buildCommando, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'officer': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Officer',
    build: buildOfficer, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'spy': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Spy',
    build: buildSpy, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'elite-hero': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Elite Hero',
    build: buildEliteHero, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'scout': {
    kind: 'unit', folder: 'units', group: 'infantry', label: 'Foot Recon Scout',
    build: buildScout, requiredParts: ['body', 'head', 'arm.R'],
    minSpan: 60,
  },
  'attack-dog': {
    kind: 'unit', folder: 'units', group: 'infantry.beasts', label: 'Attack Dog',
    build: buildAttackDog, requiredParts: ['body', 'head'],
    minSpan: 60,
  },
  'mech': {
    kind: 'unit', folder: 'units', group: 'infantry.walkers', label: 'Mech Infantry',
    build: buildMech, requiredParts: ['body', 'turret'],
    minSpan: 60,
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
  bomber: {
    kind: 'unit', folder: 'units', group: 'air.jet', label: 'Strategic Bomber',
    build: buildBomber, requiredParts: ['body', 'fin', 'tail-turret'],
    minSpan: 150,
  },
  copter: {
    kind: 'unit', folder: 'units', group: 'air.rotor', label: 'Attack Helicopter',
    build: buildCopter, requiredParts: ['body', 'rotor', 'gun'],
    // An aircraft is deliberately thin: the 180-voxel default exists to catch a
    // model authored for 64³, and 150 still fails one by a factor of two while
    // letting a fuselage be a fuselage.
    minSpan: 150,
  },
  fighter: {
    kind: 'unit', folder: 'units', group: 'air.jet', label: 'Fighter Jet',
    build: buildFighter, requiredParts: ['body', 'fin', 'stores'],
    // Airframes are thin on purpose; see the note on `copter`.
    minSpan: 150,
  },
  mpa: {
    kind: 'unit', folder: 'units', group: 'air.jet', label: 'Maritime Patrol Aircraft',
    build: buildMpa, requiredParts: ['body', 'fin', 'stores', 'boom'],
    minSpan: 150,
  },
  specter: {
    kind: 'unit', folder: 'units', group: 'air.jet', label: 'Gunship',
    build: buildSpecter, requiredParts: ['body', 'fin', 'guns'],
    minSpan: 150,
  },
  'transport-plane': {
    kind: 'unit', folder: 'units', group: 'air.jet', label: 'Heavy Transport',
    build: buildTransportPlane, requiredParts: ['body', 'fin', 'ramp'],
    minSpan: 150,
  },
  'lift-copter': {
    kind: 'unit', folder: 'units', group: 'air.rotor', label: 'Lift Copter',
    build: buildLiftCopter, requiredParts: ['body', 'rotor.front', 'rotor.rear'],
    minSpan: 150,
  },
  uav: {
    kind: 'unit', folder: 'units', group: 'air.rotor', label: 'Recon Drone',
    build: buildUav, requiredParts: ['body', 'sensor'],
    minSpan: 150,
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
