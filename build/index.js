"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextureUrl = exports.getTextureDir = exports.baseUrl = exports.minecraftIds = void 0;
// @ts-ignore This is outside the rootdir so technically it's illegal but also it's fine
const minecraft_ids_json_1 = __importDefault(require("../data/minecraft_ids.json"));
exports.minecraftIds = minecraft_ids_json_1.default;
// @ts-ignore This is outside the rootdir so technically it's illegal but also it's fine
const vanilla_damages_json_1 = __importDefault(require("../data/vanilla_damages.json"));
exports.baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/2.0.11';
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
    let idWithoutNamespace = options.id.startsWith('minecraft:') ? options.id.slice('minecraft:'.length) : options.id;
    const splitId = idWithoutNamespace.split(/:(?=[^:]+$)/);
    let damage = options.damage;
    let id = options.id;
    if (idWithoutNamespace in vanilla_damages_json_1.default && damage === undefined) {
        [id, damage] = vanilla_damages_json_1.default[idWithoutNamespace].split(':');
    }
    else if (minecraft_ids_json_1.default[splitId[0]]) {
        damage = parseInt(splitId[1]);
        id = minecraft_ids_json_1.default[splitId[0]];
    }
    else if (options.damage == null && parseInt(splitId[1])) {
        id = splitId[0];
        damage = parseInt(splitId[1]);
    }
    if (damage === undefined || isNaN(damage))
        damage = 0;
    // we don't use idWithoutNamespace because it might've changed
    id = id.startsWith('minecraft:') ? id.slice('minecraft:'.length) : id;
    // we do this so we don't modify the user's options object that they passed
    const updatedOptions = {
        damage,
        id,
        nbt: options.nbt,
        packs: options.packs,
        noNullTexture: options.noNullTexture
    };
    for (const pack of updatedOptions.packs) {
        for (const packMatcherData of pack.matchers) {
            const packMatcher = packMatcherData.m;
            const matches = checkMatches(updatedOptions, packMatcher);
            if (matches)
                return { texture: packMatcherData.t, dir: pack.dir };
        }
    }
    for (const pack of updatedOptions.packs) {
        for (const packMatcherData of pack.matchers) {
            const packMatcher = {
                ...packMatcherData.m,
                d: undefined,
            };
            const matches = checkMatches(updatedOptions, packMatcher);
            if (matches)
                return { texture: packMatcherData.t, dir: pack.dir };
        }
    }
}
/** Get the directory for the texture for a SkyBlock item */
function getTextureDir(options) {
    const { dir, texture } = getTextures(options) ?? { dir: '', texture: null };
    if (!texture)
        if (options.noNullTexture)
            return null;
        else
            return 'renders/vanilla/error.png';
    else {
        const textureDir = `${dir}/${texture}.png`;
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
