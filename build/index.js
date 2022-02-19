var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var src_exports = {};
__export(src_exports, {
  baseUrl: () => baseUrl,
  getTextureDir: () => getTextureDir,
  getTextureUrl: () => getTextureUrl,
  minecraftIds: () => import_minecraft_ids.default
});
var import_minecraft_ids = __toESM(require("../data/minecraft_ids.json"));
var import_matchers = __toESM(require("./matchers.json"));
const baseUrl = "https://raw.githubusercontent.com/skyblockstats/skyblock-assets/1.3.2";
function objectsPartiallyMatch(obj, checkerObj) {
  for (const [attribute, checkerValue] of Object.entries(checkerObj)) {
    if (checkerValue === obj[attribute])
      continue;
    if (typeof checkerValue === "object" && typeof obj[attribute] === "object") {
      return objectsPartiallyMatch(obj[attribute], checkerValue);
    }
    let checkerRegex;
    if (typeof checkerValue === "string" && checkerValue.startsWith("ipattern:")) {
      const checkerPattern = checkerValue.slice("ipattern:".length);
      checkerRegex = new RegExp("^" + checkerPattern.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
    } else if (typeof checkerValue === "string" && checkerValue.startsWith("pattern:")) {
      const checkerPattern = checkerValue.slice("pattern:".length);
      checkerRegex = new RegExp("^" + checkerPattern.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*") + "$");
    } else if (typeof checkerValue === "string" && checkerValue.startsWith("iregex:")) {
      const checkerPattern = checkerValue.slice("iregex:".length);
      checkerRegex = new RegExp("^" + checkerPattern + "$", "i");
    } else if (typeof checkerValue === "string" && checkerValue.startsWith("regex:")) {
      const checkerPattern = checkerValue.slice("regex:".length);
      checkerRegex = new RegExp("^" + checkerPattern + "$");
    }
    if (checkerRegex) {
      if (checkerRegex.test(obj[attribute]))
        return true;
    }
    return false;
  }
  return true;
}
function checkMatches(options, matcher) {
  if (matcher.t === "armor")
    return false;
  if (matcher.i && !matcher.i.includes(options.id))
    return false;
  if (options.damage !== void 0 && matcher.d != void 0 && options.damage !== matcher.d)
    return false;
  if (matcher.n) {
    if (!objectsPartiallyMatch(options.nbt, matcher.n))
      return false;
  }
  return true;
}
function getTextures(options) {
  const splitId = options.id.split(/:(?=[^:]+$)/);
  let damage = options.damage;
  let id = options.id;
  if (import_minecraft_ids.default[splitId[0]]) {
    damage = parseInt(splitId[1]);
    id = import_minecraft_ids.default[splitId[0]];
  } else if (options.damage == null && parseInt(splitId[1])) {
    id = splitId[0];
    damage = parseInt(splitId[1]);
  }
  if (damage === void 0 || isNaN(damage))
    damage = 0;
  if (id.startsWith("minecraft:"))
    id = id.slice("minecraft:".length);
  let pack;
  if (typeof options.pack === "string") {
    pack = import_matchers.default[options.pack];
  } else {
    pack = options.pack;
  }
  const updatedOptions = {
    damage,
    id,
    nbt: options.nbt,
    pack,
    noNullTexture: options.noNullTexture
  };
  for (const packMatcherData of updatedOptions.pack) {
    const packMatcher = packMatcherData.m;
    const matches = checkMatches(updatedOptions, packMatcher);
    if (matches)
      return packMatcherData.t;
  }
  for (const packMatcherData of updatedOptions.pack) {
    const packMatcher = {
      ...packMatcherData.m,
      d: void 0
    };
    const matches = checkMatches(updatedOptions, packMatcher);
    if (matches)
      return packMatcherData.t;
  }
}
function getTextureDir(options) {
  const textures = getTextures(options) ?? {};
  const shortTextureDir = textures.texture ?? textures.layer0 ?? textures.fishing_rod ?? textures.leather_boots_overlay ?? textures.leather_chestplate_overlay ?? textures.leather_helmet_overlay ?? textures.leather_leggings_overlay ?? textures.leather_layer_1 ?? textures.leather_layer_2;
  if (!shortTextureDir && options.pack !== "vanilla") {
    return getTextureDir({
      ...options,
      pack: "vanilla"
    });
  }
  if (!shortTextureDir)
    if (options.noNullTexture)
      return null;
    else
      return "renders/vanilla/error.png";
  else {
    const textureDir = `t/${options.pack}/${shortTextureDir}.png`;
    return textureDir.replace(/\\/g, "/");
  }
}
function getTextureUrl(options) {
  const textureDir = getTextureDir(options);
  if (!textureDir)
    return null;
  else
    return baseUrl + "/" + textureDir;
}
module.exports = __toCommonJS(src_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  baseUrl,
  getTextureDir,
  getTextureUrl,
  minecraftIds
});
