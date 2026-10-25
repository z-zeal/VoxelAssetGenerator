/**
 * Army ("nation") layer — completely separate from team colour and from the CO
 * `faction` field.
 *
 * One entry point resolves every unit stat read in the simulation:
 *
 *   unitDef(state, owner, type, data?) -> resolved unit definition
 *
 * `standard` always returns the raw data/units.json object by identity, so the
 * original game (and every existing save/scenario/test) behaves exactly as it
 * did before armies existed. Other armies apply per-unit deltas:
 *   - scalars replace,
 *   - plain objects deep-merge (future nested tables),
 *   - arrays replace.
 *
 * The same module also owns the small style table used by both renderers. The
 * values mirror data/armies.json `style` blocks; tests assert they never drift.
 */

export const DEFAULT_ARMY = 'standard';

export const ARMY_IDS = ['standard', 'allies', 'soviets', 'empire', 'legion'];

/**
 * Presentation identity per army. `hull: null` means "use the player's team
 * colour" (the original look), which keeps Standard byte-identical.
 */
export const ARMY_STYLES = {
  standard: {
    id: 'standard', hull: null, hullDark: null, trim: null,
    insignia: 'none', silhouette: 'standard',
  },
  allies: {
    id: 'allies', hull: '#7d8a5a', hullDark: '#5a6642', trim: '#dfe6ea',
    insignia: 'star-roundel', silhouette: 'sleek',
  },
  soviets: {
    id: 'soviets', hull: '#7a3b30', hullDark: '#4d2520', trim: '#e0b94a',
    insignia: 'red-star', silhouette: 'slab',
  },
  empire: {
    id: 'empire', hull: '#cfc9b6', hullDark: '#8c8670', trim: '#2f4a7a',
    insignia: 'sun-disc', silhouette: 'angular',
  },
  legion: {
    id: 'legion', hull: '#a58a5a', hullDark: '#6e5a38', trim: '#2b2b2b',
    insignia: 'chevron', silhouette: 'improvised',
  },
};

export const armyStyle = armyId => ARMY_STYLES[armyId] ?? ARMY_STYLES[DEFAULT_ARMY];

/* ------------------------------------------------------------- registry --- */

let registry = {units: null, armies: null};
const warned = new Set();
let warnedForUnits = null;

const isPlainObject = v => v != null && typeof v === 'object' && !Array.isArray(v);

const cloneValue = v => {
  if (Array.isArray(v)) return v.map(cloneValue);
  if (isPlainObject(v)) {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = cloneValue(x);
    return out;
  }
  return v;
};

/** Deep merge `src` into `target` (arrays replace, plain objects recurse). */
function mergeInto(target, src) {
  for (const [key, value] of Object.entries(src)) {
    if (isPlainObject(value) && isPlainObject(target[key])) mergeInto(target[key], value);
    else target[key] = cloneValue(value);
  }
  return target;
}

/** Warn once per unknown override id so future units do not spam the console. */
function warnUnknownOverrides(units, armies) {
  if (!units || !armies || warnedForUnits === units) return;
  warnedForUnits = units;
  for (const [armyId, army] of Object.entries(armies)) {
    if (!army || armyId === DEFAULT_ARMY) continue;
    for (const type of Object.keys(army.unitOverrides ?? {})) {
      if (units[type]) continue;
      const key = `${armyId}:${type}`;
      if (warned.has(key)) continue;
      warned.add(key);
      // eslint-disable-next-line no-console
      console.warn(`[armies] Unknown unit override "${type}" in army "${armyId}" — ignored.`);
    }
  }
}

/** Register the loaded data tables (main.js, tests, or any embedder). */
export function configureArmies(data) {
  if (!data) return;
  if (data.units) {
    if (registry.units !== data.units) warnedForUnits = null;
    registry.units = data.units;
  }
  if (data.armies) registry.armies = data.armies;
  warnUnknownOverrides(registry.units, registry.armies);
}

export const registeredUnits = () => registry.units;
export const registeredArmies = () => registry.armies;

/* ------------------------------------------------------------ resolution --- */

// base unit object -> army id -> resolved object (per unit type handled by map).
const resolveCache = new WeakMap();

export function resolveArmyUnit(base, army, type) {
  if (!base) return undefined;
  const armyId = army?.id ?? DEFAULT_ARMY;
  if (armyId === DEFAULT_ARMY) return base;
  const override = army?.unitOverrides?.[type];
  const displayName = army?.displayNames?.[type];
  if (!override && !displayName) return base;

  let byArmy = resolveCache.get(base);
  if (!byArmy) {
    byArmy = new Map();
    resolveCache.set(base, byArmy);
  }
  let byType = byArmy.get(armyId);
  if (!byType) {
    byType = new Map();
    byArmy.set(armyId, byType);
  }
  const cached = byType.get(type);
  if (cached) return cached;

  const resolved = cloneValue(base);
  if (displayName) resolved.name = displayName;
  if (override && isPlainObject(override)) mergeInto(resolved, override);
  byType.set(type, resolved);
  return resolved;
}

const validArmyId = id => typeof id === 'string' && ARMY_IDS.includes(id);

export function armyIdFor(state, owner) {
  const raw = state?.players?.[owner]?.army;
  // Data-driven: any non-empty id is honoured here; unitDef() falls back to the
  // authored base stats when that army is not present in the loaded table.
  return typeof raw === 'string' && raw ? raw : DEFAULT_ARMY;
}

/** Resolved army record for a seat (id + all authored fields). */
export function armyDefinition(state, owner, d = null) {
  const id = armyIdFor(state, owner);
  const armies = d?.armies ?? registry.armies ?? {};
  const authored = armies[id] ?? {};
  return {id, ...authored, style: {...(authored.style ?? armyStyle(id))}};
}

export const armyShort = id =>
  (registry.armies?.[id]?.short) ?? id.slice(0, 2).toUpperCase();

/**
 * THE single entry point for unit stats.
 * Pass `d` whenever the caller has the data bundle; the last registered bundle
 * is used otherwise (unit tests and DOM-free tooling).
 */
export function unitDef(state, owner, type, d = null) {
  const units = d?.units ?? registry.units;
  const base = units?.[type];
  if (!base) return undefined;
  const armyId = armyIdFor(state, owner);
  if (armyId === DEFAULT_ARMY) return base;
  const armies = d?.armies ?? registry.armies ?? {};
  const army = armies[armyId];
  if (!army) return base;
  warnUnknownOverrides(units, armies);
  return resolveArmyUnit(base, {id: armyId, ...army}, type);
}

/** Resolve for a unit instance that carries its own stamped `army`. */
export function unitDefFor(unit, d = null) {
  const units = d?.units ?? registry.units;
  const base = units?.[unit?.type];
  if (!base) return undefined;
  const armyId = validArmyId(unit?.army) ? unit.army : DEFAULT_ARMY;
  if (armyId === DEFAULT_ARMY) return base;
  const armies = d?.armies ?? registry.armies ?? {};
  const army = armies[armyId];
  if (!army) return base;
  warnUnknownOverrides(units, armies);
  return resolveArmyUnit(base, {id: armyId, ...army}, unit.type);
}

/* ---------------------------------------------------- availability rules --- */

/**
 * Build-menu gate. `unavailable[]` removes a type for that army, `armyOnly`
 * makes a unit exclusive to one army, and any other army's `uniqueUnits[]`
 * removes it from this army's menu.
 */
export function isUnitAvailableToArmy(armies, armyId, type, baseDef = null) {
  const army = armies?.[armyId];
  if (baseDef?.armyOnly && baseDef.armyOnly !== armyId) return false;
  if (Array.isArray(army?.unavailable) && army.unavailable.includes(type)) return false;
  for (const [otherId, other] of Object.entries(armies ?? {})) {
    if (otherId === armyId || otherId === DEFAULT_ARMY) continue;
    if (Array.isArray(other?.uniqueUnits) && other.uniqueUnits.includes(type)) return false;
  }
  return true;
}

export const isUnitUnavailable = (armies, armyId, type, baseDef = null) =>
  !isUnitAvailableToArmy(armies, armyId, type, baseDef);

/** Every army id present in a live match (for lazy sheet loading). */
export const armiesInMatch = state => {
  const ids = new Set((state?.players ?? []).map(p => p?.army ?? DEFAULT_ARMY));
  ids.add(DEFAULT_ARMY);
  return [...ids];
};

/* --------------------------------------------------------- presentation --- */

const fmtDelta = n => `${n < 0 ? '−' : '+'}${Math.abs(n).toLocaleString('en-US')}`;

/**
 * One-line stat summary for the seat card, computed as NET DELTAS against the
 * base unit table (not raw override values), e.g. "−500 G · +1 move".
 */
export function armyStatSummary(army, unitsTable = null) {
  if (!army || army.id === DEFAULT_ARMY || !army.unitOverrides) return 'No stat changes';
  const units = unitsTable ?? registry.units ?? {};
  const parts = [];
  let netCost = 0, costCount = 0, move = 0, vision = 0;
  for (const [type, override] of Object.entries(army.unitOverrides)) {
    const base = units[type];
    if (Number.isFinite(override?.cost)) {
      netCost += base && Number.isFinite(base.cost) ? override.cost - base.cost : override.cost;
      costCount++;
    }
    if (Number.isFinite(override?.move)) move += base ? override.move - (base.move ?? 0) : override.move;
    if (Number.isFinite(override?.vision)) vision += base ? override.vision - (base.vision ?? 0) : override.vision;
  }
  if (costCount && netCost) parts.push(`${fmtDelta(netCost)} G on ${costCount} unit${costCount === 1 ? '' : 's'}`);
  if (move) parts.push(`${move > 0 ? '+' : '−'}${Math.abs(move)} move`);
  if (vision) parts.push(`${vision > 0 ? '+' : '−'}${Math.abs(vision)} vision`);
  const off = (army.unavailable ?? []).length;
  if (off) parts.push(`−${off} unavailable`);
  if ((army.uniqueUnits ?? []).length) parts.push(`${army.uniqueUnits.length} unique`);
  return parts.join(' · ') || 'Cosmetic army';
}

/** Display name for a unit type under a seat's army. */
export function unitDisplayName(state, owner, type, d = null) {
  return unitDef(state, owner, type, d)?.name ?? (d?.units ?? registry.units)?.[type]?.name ?? type;
}

/**
 * Resolves the voxel model ID (`manifest.models` key) for a unit type + army.
 * Standard falls back to the base unit type (`tank`), while playable factions
 * resolve `<unit>--<armyId>` (`tank--allies`, `tank--soviets`, `tank--empire`, `tank--legion`).
 */
export function unitSheetKey(type, armyId) {
  if (!type) return type;
  if (type.includes('--')) return type;
  if (!armyId || armyId === DEFAULT_ARMY || !ARMY_STYLES[armyId]) return type;
  return `${type}--${armyId}`;
}

/**
 * Resolves the voxel model ID (`manifest.models` key) for a building/structure type + army.
 * Standard or neutral falls back to the base building id (`hq`, `base`, `barracks`, etc.),
 * while playable factions resolve `<building>--<armyId>` (`hq--allies`, `barracks--soviets`, etc.).
 */
export function buildingSheetKey(type, armyId) {
  if (!type) return type;
  if (type.includes('--')) return type;
  if (!armyId || armyId === DEFAULT_ARMY || !ARMY_STYLES[armyId]) return type;
  return `${type}--${armyId}`;
}

/**
 * Resolves the voxel model ID (`manifest.models` key) for a wall or gate fortification + army.
 */
export function fortificationSheetKey(type, armyId) {
  if (!type) return type;
  const validFaction = armyId && armyId !== DEFAULT_ARMY && ARMY_STYLES[armyId];
  if (type === 'wall' || type === 'wall-standard') {
    return validFaction ? `wall-${armyId}` : 'wall-standard';
  }
  if (type === 'wall-gate' || type === 'wall-end' || type === 'wall-corner' || type === 'wall-t' || type === 'wall-cross') {
    return validFaction ? `${type}-${armyId}` : type;
  }
  return type;
}

/**
 * Resolves the active army ID (`standard`, `allies`, `soviets`, `empire`, `legion`)
 * for a unit, building, or owned structure from `entity.army` or its owner's faction in `map`/`state`.
 */
export function resolveEntityArmy(stateOrMap, entity) {
  if (!entity) return DEFAULT_ARMY;
  if (entity.army && ARMY_STYLES[entity.army]) return entity.army;
  const owner = entity.owner;
  if (owner != null && owner !== 'n') {
    const fromArmies = stateOrMap?.armies?.[owner] ?? stateOrMap?.armies?.[String(owner)];
    if (fromArmies && ARMY_STYLES[fromArmies]) return fromArmies;
    const fromPlayers = stateOrMap?.players?.[owner]?.army ?? stateOrMap?.players?.[String(owner)]?.army;
    if (fromPlayers && ARMY_STYLES[fromPlayers]) return fromPlayers;
  }
  if (stateOrMap?.defaultArmy && ARMY_STYLES[stateOrMap.defaultArmy]) return stateOrMap.defaultArmy;
  return DEFAULT_ARMY;
}

/* ------------------------------------------------------------ migration --- */

/**
 * Idempotent save/custom-map migration: every seat gets a valid army (default
 * `standard`) and every unit/owned property is stamped with its owner's army so
 * renderers can work from a single record. Mutates and returns `saved`.
 */
export function normalizeArmyState(saved) {
  if (!saved || !Array.isArray(saved.players)) return saved;
  for (const p of saved.players) {
    if (!p) continue;
    if (!validArmyId(p.army)) p.army = DEFAULT_ARMY;
  }
  for (const u of saved.units ?? []) {
    if (!u) continue;
    if (!validArmyId(u.army)) u.army = saved.players[u.owner]?.army ?? DEFAULT_ARMY;
  }
  for (const prop of saved.properties ?? []) {
    if (!prop) continue;
    if (!validArmyId(prop.army)) {
      prop.army = (prop.owner != null && prop.owner !== 'n')
        ? (saved.players[prop.owner]?.army ?? DEFAULT_ARMY)
        : DEFAULT_ARMY;
    }
  }
  return saved;
}

