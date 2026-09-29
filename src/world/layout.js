// Fachada del nivel activo: todos los módulos del mundo consultan la geografía a través de estas
// referencias vivas, que cambian al cargar otra localidad (setLevel).
export const HALF = 500;
export const CELL = 2;
export const N = HALF * 2 / CELL + 1;

export let LEVEL = null;          // definición del nivel activo
export let KIND = 'salazar';      // 'salazar' (aventura del valle) o 'town' (localidad generada)
export let rx, zz, CONF, FA, FZ, riverHalfA, RIVER_HALF_Z;
export let riverInfo, valleyFloor, finalHeight, pathQuery, plazaMask, fieldInfo;
export let villageMask, meadowMask, iratiMask;
export let PLACES, MEADOW, PATHS, BRIDGES, POND_LEVEL, RIVERS, PONDS, SPECIAL_TREES, TREE_MIX, FAUNA, BOUNDARY, FOREST, TONE, MOD;

const noMask = () => 0;
export function setLevel(mod, def = null, kind = 'salazar') {
  LEVEL = def; KIND = kind;
  rx = mod.rx; zz = mod.zz; CONF = mod.CONF; FA = mod.FA; FZ = mod.FZ; riverHalfA = mod.riverHalfA; RIVER_HALF_Z = mod.RIVER_HALF_Z;
  riverInfo = mod.riverInfo; valleyFloor = mod.valleyFloor || (() => 0); finalHeight = mod.finalHeight; pathQuery = mod.pathQuery;
  plazaMask = mod.plazaMask || noMask; fieldInfo = mod.fieldInfo || (() => ({ mask: 0, type: 0, edge: 99 }));
  villageMask = mod.villageMask || noMask; meadowMask = mod.meadowMask || noMask; iratiMask = mod.iratiMask || noMask;
  PLACES = mod.PLACES || {}; MEADOW = mod.MEADOW || null; PATHS = mod.PATHS || []; BRIDGES = mod.BRIDGES || [];
  POND_LEVEL = mod.POND_LEVEL || (() => -Infinity);
  RIVERS = mod.RIVERS || null; PONDS = mod.PONDS || []; SPECIAL_TREES = mod.SPECIAL_TREES || null;
  TREE_MIX = mod.TREE_MIX || null; FAUNA = mod.FAUNA || null; BOUNDARY = mod.BOUNDARY || 462;
  FOREST = mod.FOREST ?? 0.5; TONE = mod.TONE || 'alpine'; MOD = mod;
}
