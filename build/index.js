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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextureUrl = exports.waitUntilReady = exports.minecraftIds = exports.baseUrl = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
exports.baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main';
/** Read the contents of a json file */
async function readJsonFile(fileDir) {
    const fileContents = await fs_1.promises.readFile(path.join(__dirname, fileDir), { encoding: 'utf8' });
    return JSON.parse(fileContents);
}
/** Get the matchers for a pack */
async function readPackMatchers(packName) {
    return await readJsonFile(`../matchers/${packName}.json`);
}
/** Get all the matchers for each pack */
async function readPacksMatchers() {
    const dirFiles = await fs_1.promises.readdir(path.join(__dirname, '../matchers'));
    const matchers = {};
    for (const fileName of dirFiles) {
        const packName = fileName.slice(0, (fileName.length) - ('.json'.length));
        matchers[packName] = await readPackMatchers(packName);
    }
    return matchers;
}
let matchers = {};
exports.minecraftIds = {};
async function init() {
    matchers = await readPacksMatchers();
    exports.minecraftIds = await readJsonFile('../data/minecraft_ids.json');
}
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
async function checkMatches(options, matcher) {
    // check 'items'
    if (matcher.type === 'armor')
        return false;
    if (matcher.items && !matcher.items.includes(options.id))
        return false;
    if (options.damage !== undefined && matcher.damage != undefined && options.damage !== matcher.damage)
        return false;
    // check nbt
    if (matcher.nbt) {
        if (!objectsPartiallyMatch(options.nbt, matcher.nbt))
            return false;
    }
    return true;
}
async function getTextures(options) {
    if (Object.keys(matchers).length === 0) {
        // no matchers found, continue in 200ms because it'll probably have the matchers by then
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    const splitId = options.id.split(/:(?=[^:]+$)/);
    if (exports.minecraftIds[splitId[0]]) {
        options.damage = parseInt(splitId[1]);
        options.id = exports.minecraftIds[splitId[0]];
    }
    else if (options.damage == null && parseInt(splitId[1])) {
        options.id = splitId[0];
        options.damage = parseInt(splitId[1]);
    }
    if (options.damage === undefined || isNaN(options.damage))
        options.damage = 0;
    for (const packName in matchers) {
        // only check the matchers if we're checking this pack
        if (options.pack === packName) {
            const packMatchers = matchers[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = packMatcherData.matcher;
                const matches = await checkMatches(options, packMatcher);
                if (matches)
                    return packMatcherData.textures;
            }
        }
    }
    // couldn't find anything the first time, we'll try again but without damages
    for (const packName in matchers) {
        // only check the matchers if we're checking this pack
        if (options.pack === packName) {
            const packMatchers = matchers[packName];
            for (const packMatcherData of packMatchers) {
                const packMatcher = packMatcherData.matcher;
                packMatcher.damage = undefined;
                const matches = await checkMatches(options, packMatcher);
                if (matches)
                    return packMatcherData.textures;
            }
        }
    }
}
async function waitUntilReady() {
    if (Object.keys(exports.minecraftIds).length === 0) {
        // wait for it to init
        while (Object.keys(exports.minecraftIds).length === 0)
            await new Promise(resolve => setTimeout(resolve, 50));
    }
}
exports.waitUntilReady = waitUntilReady;
/** Get the URL for the texture for a SkyBlock item */
async function getTextureUrl(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    await waitUntilReady();
    const textures = (_a = await getTextures(options)) !== null && _a !== void 0 ? _a : {};
    const texturePath = (_j = (_h = (_g = (_f = (_e = (_d = (_c = (_b = textures.texture) !== null && _b !== void 0 ? _b : textures.layer0) !== null && _c !== void 0 ? _c : textures.fishing_rod) !== null && _d !== void 0 ? _d : textures.leather_boots_overlay) !== null && _e !== void 0 ? _e : textures.leather_chestplate_overlay) !== null && _f !== void 0 ? _f : textures.leather_helmet_overlay) !== null && _g !== void 0 ? _g : textures.leather_leggings_overlay) !== null && _h !== void 0 ? _h : textures.leather_layer_1) !== null && _j !== void 0 ? _j : textures.leather_layer_2;
    // if it can't find a texture for this pack, just check using vanilla
    if (!texturePath && options.pack !== 'vanilla') {
        return await getTextureUrl({
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
init();
