"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextureUrl = exports.getTextureDir = exports.baseUrl = exports.minecraftIds = void 0;
const minecraft_ids_json_1 = __importDefault(require("../data/minecraft_ids.json"));
exports.minecraftIds = minecraft_ids_json_1.default;
const matchers = __importStar(require("./matchers.json"));
exports.baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/1.2.1';
/** Check if all the values from checkerObj are the same in obj */
function objectsPartiallyMatch(obj, checkerObj) {
    for (const [attribute, checkerValue] of Object.entries(checkerObj)) {
        if (checkerValue === obj[attribute])
            continue;
        if (typeof checkerValue === 'object' && typeof obj[attribute] === 'object') {
            return objectsPartiallyMatch(obj[attribute], checkerValue);
        }
        let checkerRegex;
        // creating a bunch of regexps is fine since v8 caches them
        if (typeof checkerValue === 'string' && checkerValue.startsWith('ipattern:')) {
            const checkerPattern = checkerValue.slice('ipattern:'.length);
            checkerRegex = new RegExp('^' + checkerPattern
                .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                .replace(/\*/g, '.*') + '$', 'i');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('pattern:')) {
            const checkerPattern = checkerValue.slice('pattern:'.length);
            checkerRegex = new RegExp('^' + checkerPattern
                .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                .replace(/\*/g, '.*') + '$');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('iregex:')) {
            const checkerPattern = checkerValue.slice('iregex:'.length);
            checkerRegex = new RegExp('^' + checkerPattern + '$', 'i');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('regex:')) {
            const checkerPattern = checkerValue.slice('regex:'.length);
            checkerRegex = new RegExp('^' + checkerPattern + '$');
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
    // check 'items'
    if (matcher.t === 'armor')
        return false;
    if (matcher.i && !matcher.i.includes(options.id))
        return false;
    if (options.damage !== undefined && matcher.d != undefined && options.damage !== matcher.d)
        return false;
    // check nbt
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
    if (minecraft_ids_json_1.default[splitId[0]]) {
        damage = parseInt(splitId[1]);
        id = minecraft_ids_json_1.default[splitId[0]];
    }
    else if (options.damage == null && parseInt(splitId[1])) {
        id = splitId[0];
        damage = parseInt(splitId[1]);
    }
    if (damage === undefined || isNaN(damage))
        damage = 0;
    if (id.startsWith('minecraft:'))
        id = id.slice('minecraft:'.length);
    // we do this so we don't modify the user's options object that they passed
    const updatedOptions = {
        damage,
        id,
        nbt: options.nbt,
        pack: options.pack,
        noNullTexture: options.noNullTexture
    };
    for (const packName in matchers) {
        // only check the matchers if we're checking this pack
        if (updatedOptions.pack === packName) {
            const packMatchers = matchers[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = packMatcherData.m;
                const matches = checkMatches(updatedOptions, packMatcher);
                if (matches)
                    return packMatcherData.t;
            }
        }
    }
    // couldn't find anything the first time, we'll try again but without damages
    for (const packName in matchers) {
        // only check the matchers if we're checking this pack
        if (updatedOptions.pack === packName) {
            const packMatchers = matchers[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = {
                    ...packMatcherData.m,
                    d: undefined,
                };
                const matches = checkMatches(updatedOptions, packMatcher);
                if (matches)
                    return packMatcherData.t;
            }
        }
    }
}
/** Get the directory for the texture for a SkyBlock item */
function getTextureDir(options) {
    const textures = getTextures(options) ?? {};
    const shortTextureDir = textures.texture
        ?? textures.layer0
        ?? textures.fishing_rod
        ?? textures.leather_boots_overlay
        ?? textures.leather_chestplate_overlay
        ?? textures.leather_helmet_overlay
        ?? textures.leather_leggings_overlay
        ?? textures.leather_layer_1
        ?? textures.leather_layer_2;
    // if it can't find a texture for this pack, just check using vanilla
    if (!shortTextureDir && options.pack !== 'vanilla') {
        return getTextureDir({
            ...options,
            pack: 'vanilla'
        });
    }
    if (!shortTextureDir)
        if (options.noNullTexture)
            return null;
        else
            return 'renders/vanilla/error.png';
    else {
        const textureDir = `t/${options.pack}/${shortTextureDir}.png`;
        return textureDir.replace(/\\/g, '/');
    }
}
exports.getTextureDir = getTextureDir;
/** Get the URL for the texture for a SkyBlock item */
function getTextureUrl(options) {
    const textureDir = getTextureDir(options);
    if (!textureDir)
        return null;
    else
        return exports.baseUrl + '/' + textureDir;
}
exports.getTextureUrl = getTextureUrl;
