// @ts-check
/**
 * Material palette. Every voxel stores one byte: an index into this table.
 * Index 0 is air. Colours are authored in sRGB; the shader linearises them.
 *
 * Per-material parameters (all 0..1):
 *   jitter   per-voxel brightness variation (gives each small voxel its own tone)
 *   sway     wind displacement amplitude (foliage, wisteria, grass)
 *   emissive self illumination strength (paper lamps, shoji glow)
 *   leaf     back-light transmission (petals and leaves glowing against the sunset)
 *   spec     specular sharpness (wet stone, lacquer, ceramic, brass)
 */

/** @typedef {{ name: string, color: [number, number, number], jitter: number, sway: number, emissive: number, leaf: number, spec: number }} Material */

/** @type {Material[]} */
export const MATERIALS = [];
/** @type {Record<string, number>} */
export const M = Object.create(null);

/**
 * @param {string} name
 * @param {string} hex
 * @param {Partial<Omit<Material, 'name' | 'color'>>} [opts]
 */
function def(name, hex, opts = {}) {
  const n = parseInt(hex.slice(1), 16);
  const color = /** @type {[number, number, number]} */ ([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  M[name] = MATERIALS.length;
  MATERIALS.push({ name, color, jitter: opts.jitter ?? 0.08, sway: opts.sway ?? 0, emissive: opts.emissive ?? 0, leaf: opts.leaf ?? 0, spec: opts.spec ?? 0 });
}

def("AIR", "#000000");
def("WATER", "#2c6f86", { jitter: 0, spec: 1 });

// diorama base strata
def("SOIL_TOP", "#4a3424", { jitter: 0.12 });
def("SOIL", "#3b2a1f", { jitter: 0.14 });
def("CLAY", "#6b4a34", { jitter: 0.12 });
def("ROCK_LAYER", "#5c5651", { jitter: 0.16 });
def("ROOT", "#2b1d15", { jitter: 0.1 });

// ground cover
def("GRASS_1", "#5f7f3a", { jitter: 0.14 });
def("GRASS_2", "#6f8f41", { jitter: 0.14 });
def("GRASS_3", "#4f6e33", { jitter: 0.14 });
def("GRASS_DRY", "#8d8a4a", { jitter: 0.12 });
def("MOSS_1", "#3f6b2d", { jitter: 0.16 });
def("MOSS_2", "#55803a", { jitter: 0.16 });
def("MOSS_3", "#2f5524", { jitter: 0.16 });
def("MOSS_GOLD", "#86913f", { jitter: 0.14 });
def("TUFT_1", "#6e9a3e", { jitter: 0.16, sway: 0.55, leaf: 0.35 });
def("TUFT_2", "#88ad48", { jitter: 0.16, sway: 0.6, leaf: 0.4 });
def("TUFT_3", "#56813a", { jitter: 0.16, sway: 0.5, leaf: 0.3 });
def("CLOVER", "#4d7d36", { jitter: 0.14 });

// gravel, stones
def("GRAVEL_1", "#d7d0c0", { jitter: 0.1 });
def("GRAVEL_2", "#c4bcab", { jitter: 0.1 });
def("GRAVEL_RAKE", "#ece6d6", { jitter: 0.06 });
def("PEBBLE_1", "#8f877b", { jitter: 0.18 });
def("PEBBLE_2", "#a69c8b", { jitter: 0.18 });
def("PEBBLE_3", "#6e675e", { jitter: 0.18 });
def("STONE_1", "#7d7a74", { jitter: 0.12, spec: 0.15 });
def("STONE_2", "#6a6862", { jitter: 0.12, spec: 0.15 });
def("STONE_3", "#8f8b82", { jitter: 0.12, spec: 0.15 });
def("STONE_DARK", "#4e4c49", { jitter: 0.12, spec: 0.2 });
def("STONE_WARM", "#8a7e6c", { jitter: 0.12, spec: 0.1 });
def("SLATE_1", "#5f625f", { jitter: 0.08, spec: 0.25 });
def("SLATE_2", "#707270", { jitter: 0.08, spec: 0.25 });
def("POND_BED", "#3e4a3e", { jitter: 0.2 });
def("POND_DEEP", "#2a3633", { jitter: 0.2 });
def("SAND", "#b9a67f", { jitter: 0.1 });

// timber
def("WOOD_DARK", "#3a281d", { jitter: 0.07 });
def("WOOD", "#6b4b33", { jitter: 0.08 });
def("WOOD_MID", "#81593a", { jitter: 0.08 });
def("WOOD_LIGHT", "#a37a52", { jitter: 0.07 });
def("WOOD_AGED", "#5a4a3c", { jitter: 0.1 });
def("WOOD_BRIDGE", "#8a6142", { jitter: 0.08 });
def("WOOD_RAIL", "#5e3f2b", { jitter: 0.06 });

// house
def("TILE_1", "#3c4148", { jitter: 0.07, spec: 0.35 });
def("TILE_2", "#474c54", { jitter: 0.07, spec: 0.35 });
def("TILE_3", "#31353b", { jitter: 0.07, spec: 0.35 });
def("TILE_RIDGE", "#2a2d32", { jitter: 0.05, spec: 0.4 });
def("TILE_MOSS", "#4c5a3c", { jitter: 0.12, spec: 0.1 });
def("PLASTER", "#d9cdb4", { jitter: 0.04 });
def("SHOJI", "#f3dcaa", { jitter: 0.02, emissive: 0.32 });
def("SHOJI_DIM", "#e8cf9c", { jitter: 0.02, emissive: 0.16 });
def("SHOJI_FRAME", "#4a3322", { jitter: 0.04 });
def("TATAMI", "#b4a46a", { jitter: 0.06 });
def("FOUNDATION", "#77726a", { jitter: 0.12 });
def("NOREN", "#2e4a6b", { jitter: 0.04, sway: 0.2 });
def("NOREN_MARK", "#e9e0cc", { jitter: 0.02, sway: 0.2 });

// lights
def("LAMP_PAPER", "#ffd59a", { jitter: 0.02, emissive: 1.0 });
def("LAMP_RED", "#e0503a", { jitter: 0.02, emissive: 0.55 });
def("LAMP_FRAME", "#2b1e16", { jitter: 0.03 });
def("LANTERN_GLOW", "#ffc477", { jitter: 0.02, emissive: 1.0 });
def("CANDLE", "#fff1c9", { jitter: 0, emissive: 1.0 });

// wisteria and vines
def("WISTERIA_1", "#9c7ad0", { jitter: 0.14, sway: 0.7, leaf: 0.6 });
def("WISTERIA_2", "#b597e2", { jitter: 0.14, sway: 0.75, leaf: 0.65 });
def("WISTERIA_3", "#7a5ab6", { jitter: 0.14, sway: 0.7, leaf: 0.55 });
def("WISTERIA_TIP", "#e3d4f5", { jitter: 0.1, sway: 0.8, leaf: 0.7 });
def("VINE", "#4b6b2f", { jitter: 0.16, sway: 0.35, leaf: 0.45 });
def("VINE_LIGHT", "#6a8b3a", { jitter: 0.16, sway: 0.4, leaf: 0.5 });

// sakura
def("BARK_DARK", "#3b2b25", { jitter: 0.12 });
def("BARK", "#56403a", { jitter: 0.12 });
def("SAKURA_1", "#f4bccb", { jitter: 0.12, sway: 0.45, leaf: 0.85 });
def("SAKURA_2", "#eea2b8", { jitter: 0.12, sway: 0.45, leaf: 0.85 });
def("SAKURA_3", "#fad6de", { jitter: 0.1, sway: 0.5, leaf: 0.9 });
def("SAKURA_4", "#dd88a3", { jitter: 0.12, sway: 0.45, leaf: 0.8 });
def("SAKURA_CORE", "#c46a88", { jitter: 0.12, sway: 0.3, leaf: 0.6 });

// maple
def("MAPLE_1", "#c8381f", { jitter: 0.14, sway: 0.4, leaf: 0.9 });
def("MAPLE_2", "#e05a26", { jitter: 0.14, sway: 0.45, leaf: 0.9 });
def("MAPLE_3", "#a3261d", { jitter: 0.14, sway: 0.4, leaf: 0.85 });
def("MAPLE_4", "#ef8a32", { jitter: 0.14, sway: 0.45, leaf: 0.95 });
def("MAPLE_BARK", "#3e2e28", { jitter: 0.1 });

// bamboo
def("BAMBOO_1", "#7f9a45", { jitter: 0.08, sway: 0.15, spec: 0.3 });
def("BAMBOO_2", "#94ab52", { jitter: 0.08, sway: 0.15, spec: 0.3 });
def("BAMBOO_OLD", "#a39a5a", { jitter: 0.08, sway: 0.15, spec: 0.25 });
def("BAMBOO_NODE", "#5d7334", { jitter: 0.06, sway: 0.15 });
def("BAMBOO_LEAF_1", "#5e8a3a", { jitter: 0.16, sway: 0.8, leaf: 0.6 });
def("BAMBOO_LEAF_2", "#7aa346", { jitter: 0.16, sway: 0.85, leaf: 0.65 });
def("BAMBOO_LEAF_3", "#456f2f", { jitter: 0.16, sway: 0.75, leaf: 0.55 });
def("BAMBOO_CUT", "#d8c98d", { jitter: 0.04 });

// torii, shrine
def("TORII_RED", "#c2361f", { jitter: 0.06, spec: 0.3 });
def("TORII_RED_DARK", "#8f2617", { jitter: 0.06, spec: 0.3 });
def("TORII_BLACK", "#1f1a18", { jitter: 0.04, spec: 0.3 });
def("SHIDE", "#f4f0e4", { jitter: 0.02, sway: 0.5, leaf: 0.5 });
def("ROPE", "#c9b27a", { jitter: 0.08 });

// water plants
def("LILYPAD_1", "#4f8a3c", { jitter: 0.12, spec: 0.35 });
def("LILYPAD_2", "#63a046", { jitter: 0.12, spec: 0.35 });
def("LILYPAD_3", "#3c6f31", { jitter: 0.12, spec: 0.35 });
def("LOTUS_PINK", "#f3a7c2", { jitter: 0.1, leaf: 0.7 });
def("LOTUS_WHITE", "#fbeef0", { jitter: 0.06, leaf: 0.7 });
def("LOTUS_HEART", "#f2cf52", { jitter: 0.06 });
def("REED", "#6b8a3e", { jitter: 0.14, sway: 0.6, leaf: 0.4 });
def("IRIS", "#5a4cc0", { jitter: 0.1, sway: 0.4, leaf: 0.5 });

// flowers, ferns, mushrooms
def("FLOWER_WHITE", "#f6f2e6", { jitter: 0.06, sway: 0.35, leaf: 0.5 });
def("FLOWER_YELLOW", "#f2c94c", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("FLOWER_ORANGE", "#ef8f3c", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("FLOWER_RED", "#d6453d", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("FLOWER_PINK", "#f08cb2", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("FLOWER_BLUE", "#6f8fe0", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("FLOWER_VIOLET", "#9a6fd6", { jitter: 0.08, sway: 0.35, leaf: 0.5 });
def("HYDRANGEA_1", "#7f95e6", { jitter: 0.14, sway: 0.15, leaf: 0.4 });
def("HYDRANGEA_2", "#a58ee6", { jitter: 0.14, sway: 0.15, leaf: 0.4 });
def("HYDRANGEA_3", "#c6b8f0", { jitter: 0.12, sway: 0.15, leaf: 0.45 });
def("SHRUB_1", "#3f6a30", { jitter: 0.16, sway: 0.12, leaf: 0.3 });
def("SHRUB_2", "#4f7d36", { jitter: 0.16, sway: 0.12, leaf: 0.3 });
def("AZALEA_1", "#e2557d", { jitter: 0.12, sway: 0.12, leaf: 0.5 });
def("AZALEA_2", "#f07a9a", { jitter: 0.12, sway: 0.12, leaf: 0.5 });
def("FERN_1", "#4e8a3a", { jitter: 0.16, sway: 0.5, leaf: 0.55 });
def("FERN_2", "#6aa446", { jitter: 0.16, sway: 0.55, leaf: 0.6 });
def("FERN_3", "#3b6e2e", { jitter: 0.16, sway: 0.45, leaf: 0.5 });
def("MUSH_RED", "#c8402e", { jitter: 0.08, spec: 0.2 });
def("MUSH_DOT", "#f3ead6", { jitter: 0.04 });
def("MUSH_BROWN", "#9a6a43", { jitter: 0.08 });
def("MUSH_STEM", "#e6dcc4", { jitter: 0.04 });

// props
def("TABLE", "#5a3b26", { jitter: 0.05, spec: 0.35 });
def("CERAMIC", "#e8e2d3", { jitter: 0.03, spec: 0.6 });
def("CERAMIC_GREEN", "#6f8f7a", { jitter: 0.04, spec: 0.6 });
def("TEAPOT", "#3d3530", { jitter: 0.04, spec: 0.55 });
def("TEA", "#7d8a3a", { jitter: 0.02, spec: 0.6 });
def("CUSHION", "#8c3b3b", { jitter: 0.05 });
def("CUSHION_2", "#3d5a7a", { jitter: 0.05 });
def("CAT_1", "#e08a3c", { jitter: 0.08 });
def("CAT_2", "#c86f2a", { jitter: 0.08 });
def("CAT_LIGHT", "#f4d6a6", { jitter: 0.06 });
def("CAT_DARK", "#2b2220", { jitter: 0.04 });
def("CAT_PINK", "#e79a9a", { jitter: 0.04 });
def("CRANE_RED", "#e04a43", { jitter: 0.04, sway: 0.5, leaf: 0.5 });
def("CRANE_YELLOW", "#f2c552", { jitter: 0.04, sway: 0.5, leaf: 0.5 });
def("CRANE_BLUE", "#5d8fd8", { jitter: 0.04, sway: 0.5, leaf: 0.5 });
def("CRANE_PINK", "#f39ac0", { jitter: 0.04, sway: 0.5, leaf: 0.5 });
def("CRANE_WHITE", "#f6f1e6", { jitter: 0.03, sway: 0.5, leaf: 0.5 });
def("CRANE_GREEN", "#6cbf8a", { jitter: 0.04, sway: 0.5, leaf: 0.5 });
def("STRING", "#d8c9a8", { jitter: 0.02, sway: 0.45 });
def("BRASS", "#c89b4a", { jitter: 0.04, spec: 0.85 });
def("BRASS_DARK", "#7d5a2a", { jitter: 0.04, spec: 0.6 });
def("IRON", "#2c2c2e", { jitter: 0.04, spec: 0.5 });
def("GLASS", "#9fd0e0", { jitter: 0, spec: 1, emissive: 0.15 });
def("BAMBOO_PIPE", "#a8a253", { jitter: 0.06, spec: 0.3 });

// boundary wall
def("WALL_1", "#7a746b", { jitter: 0.14, spec: 0.08 });
def("WALL_2", "#6a645c", { jitter: 0.14, spec: 0.08 });
def("WALL_3", "#8c857a", { jitter: 0.14, spec: 0.08 });
def("WALL_MORTAR", "#a59c8c", { jitter: 0.08 });
def("WALL_CAP", "#3a3e44", { jitter: 0.06, spec: 0.35 });
def("WALL_PLASTER", "#cfc3a8", { jitter: 0.05 });

// koi (dynamic models only)
def("KOI_ORANGE", "#f07a2a", { jitter: 0.06, spec: 0.5 });
def("KOI_RED", "#d63a2a", { jitter: 0.06, spec: 0.5 });
def("KOI_WHITE", "#f6f1ea", { jitter: 0.04, spec: 0.5 });
def("KOI_GOLD", "#f4c04a", { jitter: 0.06, spec: 0.6 });
def("KOI_BLACK", "#1d1b1c", { jitter: 0.04, spec: 0.5 });

if (MATERIALS.length > 255) throw new Error("palette overflow");

/**
 * Packs the palette into a 256×2 RGBA8 texture payload.
 * Row 0: rgb colour, a = jitter. Row 1: r = sway, g = emissive, b = leaf, a = spec.
 */
export function paletteTextureData() {
  const data = new Uint8Array(256 * 2 * 4);
  MATERIALS.forEach((m, i) => {
    data.set([m.color[0], m.color[1], m.color[2], Math.round(m.jitter * 255)], i * 4);
    data.set([Math.round(m.sway * 255), Math.round(m.emissive * 255), Math.round(m.leaf * 255), Math.round(m.spec * 255)], (256 + i) * 4);
  });
  return data;
}

/** @param {number} id */
export const isEmissive = (id) => (MATERIALS[id]?.emissive ?? 0) > 0;
