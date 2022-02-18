"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextureUrl = exports.baseUrl = void 0;
const minecraft_ids_json_1 = __importDefault(require("../data/minecraft_ids.json"));
const matchers_json_1 = __importDefault(require("../matchers.json"));
exports.baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main';
/** Check if all the values from checkerObj are the same in obj */
function objectsPartiallyMatch(obj, checkerObj) {
    for (const [attribute, checkerValue] of Object.entries(checkerObj)) {
        if (checkerValue === obj[attribute])
            continue;
        if (typeof checkerValue === 'object' && typeof obj[attribute] === 'object') {
            return objectsPartiallyMatch(obj[attribute], checkerValue);
        }
        let checkerRegex;
        if (typeof checkerValue === 'string' && checkerValue.startsWith('ipattern:')) {
            // creating a bunch of regexps is fine since v8 caches them
            const checkerPattern = checkerValue.slice('ipattern:'.length);
            checkerRegex = new RegExp('^' + checkerPattern
                .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                .replace(/\*/g, '.*') + '$', 'i');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('pattern:')) {
            // creating a bunch of regexps is fine since v8 caches them
            const checkerPattern = checkerValue.slice('pattern:'.length);
            checkerRegex = new RegExp('^' + checkerPattern
                .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                .replace(/\*/g, '.*') + '$');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('iregex:')) {
            // creating a bunch of regexps is fine since v8 caches them
            const checkerPattern = checkerValue.slice('iregex:'.length);
            checkerRegex = new RegExp('^' + checkerPattern + '$', 'i');
        }
        else if (typeof checkerValue === 'string' && checkerValue.startsWith('regex:')) {
            // creating a bunch of regexps is fine since v8 caches them
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
    if (minecraft_ids_json_1.default[splitId[0]]) {
        options.damage = parseInt(splitId[1]);
        options.id = minecraft_ids_json_1.default[splitId[0]];
    }
    else if (options.damage == null && parseInt(splitId[1])) {
        options.id = splitId[0];
        options.damage = parseInt(splitId[1]);
    }
    if (options.damage === undefined || isNaN(options.damage))
        options.damage = 0;
    for (const packName in matchers_json_1.default) {
        // only check the matchers if we're checking this pack
        if (options.pack === packName) {
            const packMatchers = matchers_json_1.default[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = packMatcherData.matcher;
                const matches = checkMatches(options, packMatcher);
                if (matches)
                    return packMatcherData.textures;
            }
        }
    }
    // couldn't find anything the first time, we'll try again but without damages
    for (const packName in matchers_json_1.default) {
        // only check the matchers if we're checking this pack
        if (options.pack === packName) {
            const packMatchers = matchers_json_1.default[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = packMatcherData.matcher;
                packMatcher.d = undefined;
                const matches = checkMatches(options, packMatcher);
                if (matches)
                    return packMatcherData.textures;
            }
        }
    }
}
/** Get the URL for the texture for a SkyBlock item */
function getTextureUrl(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const textures = (_a = getTextures(options)) !== null && _a !== void 0 ? _a : {};
    const texturePath = (_j = (_h = (_g = (_f = (_e = (_d = (_c = (_b = textures.texture) !== null && _b !== void 0 ? _b : textures.layer0) !== null && _c !== void 0 ? _c : textures.fishing_rod) !== null && _d !== void 0 ? _d : textures.leather_boots_overlay) !== null && _e !== void 0 ? _e : textures.leather_chestplate_overlay) !== null && _f !== void 0 ? _f : textures.leather_helmet_overlay) !== null && _g !== void 0 ? _g : textures.leather_leggings_overlay) !== null && _h !== void 0 ? _h : textures.leather_layer_1) !== null && _j !== void 0 ? _j : textures.leather_layer_2;
    // if it can't find a texture for this pack, just check using vanilla
    if (!texturePath && options.pack !== 'vanilla') {
        return getTextureUrl({
            ...options,
            pack: 'vanilla'
        });
    }
    if (!texturePath)
        if (options.noNullTexture)
            return null;
        else
            return exports.baseUrl + '/renders/vanilla/error.png';
    else
        return exports.baseUrl + '/' + texturePath.replace(/\\/g, '/');
}
exports.getTextureUrl = getTextureUrl;
