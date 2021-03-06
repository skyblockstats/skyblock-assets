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
const fs_1 = require("fs");
const path = __importStar(require("path"));
// stolen from https://stackoverflow.com/a/65415138
async function* getFiles(dir) {
    const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        // const res = path.resolve(dir, entry.name)
        const res = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* getFiles(res);
        }
        else {
            yield res;
        }
    }
}
async function readPropertiesFile(fileDir) {
    const contents = {};
    const fileContents = await fs_1.promises.readFile(fileDir, { encoding: 'utf8' });
    for (const line of fileContents.split('\n')) {
        const [key, value] = line.split('=', 2);
        if (!value)
            continue;
        contents[key] = value.trim();
    }
    const dotNotationContents = {};
    for (const property of Object.keys(contents)) {
        setDotNotationAttribute(dotNotationContents, property, contents[property]);
    }
    return dotNotationContents;
}
async function readJsonFile(fileDir) {
    const fileContents = await fs_1.promises.readFile(fileDir, { encoding: 'utf8' });
    return JSON.parse(fileContents);
}
async function writeJsonFile(fileDir, contents) {
    await fs_1.promises.writeFile(fileDir, JSON.stringify(contents, null, 2), { encoding: 'utf8' });
}
function deepAssign(target, ...sources) {
    for (const source of sources) {
        for (const k in source) {
            const vs = source[k], vt = target[k];
            if (Object(vs) == vs && Object(vt) === vt)
                target[k] = deepAssign(vt, vs);
            else if (!target[k])
                target[k] = source[k];
        }
    }
    return target;
}
async function readFullModel(baseDir, modelName, vanillaModelsDir, backupDir) {
    let model = await readModelJson(baseDir, modelName, vanillaModelsDir, backupDir);
    // if the model has a parent, merge it with this model
    if (model.parent && !model.parent.startsWith('builtin/')) {
        const modelParentName = model.parent.startsWith('minecraft:') ? model.parent.slice('minecraft:'.length) : model.parent;
        const modelParent = await readFullModel(baseDir, modelParentName, vanillaModelsDir, backupDir);
        deepAssign(model, modelParent);
        delete model.parent;
    }
    return model;
}
async function readModelJson(baseDir, modelName, vanillaModelsDir, backupDir) {
    const modelNameJson = modelName.endsWith('.json') ? modelName : modelName + '.json';
    // it's always one of these
    try {
        return await readJsonFile(path.join(baseDir, modelNameJson));
    }
    catch { }
    try {
        return await readJsonFile(path.join(vanillaModelsDir, modelNameJson));
    }
    catch { }
    if (backupDir)
        return await readJsonFile(path.join(backupDir, modelNameJson));
    else
        throw Error(`Couldn\'t find model. baseDir: ${baseDir}, modelName: ${modelName}, vanillaModelsDir: ${vanillaModelsDir}`);
}
async function addItemFromModel(baseDir, outputDir, modelName, vanillaModelsDir) {
    const model = await readFullModel(`${baseDir}/models`, modelName, vanillaModelsDir);
    const modelTextures = model.textures;
    const itemTexturePath = modelTextures.layer0;
    // writeJsonFile(baseDir + '')
    const textureBuffer = await fs_1.promises.readFile(`${baseDir}/textures/${itemTexturePath}.png`);
    const textureOutputDir = `${outputDir}/textures/${itemTexturePath}.png`;
    try {
        await fs_1.promises.mkdir(path.dirname(textureOutputDir), { recursive: true });
    }
    catch { }
    await fs_1.promises.writeFile(textureOutputDir, textureBuffer);
    return {
        texture: textureOutputDir,
    };
}
function setDotNotationAttribute(obj, path, value) {
    let pointerObj = obj;
    const parts = path.split('.');
    let previousPointerObj = obj;
    let previousPart = parts[0];
    const last = parts.pop();
    for (const part of parts) {
        previousPointerObj = pointerObj;
        previousPart = part;
        if (!pointerObj[part])
            pointerObj[part] = {};
        pointerObj = pointerObj[part];
    }
    if (typeof pointerObj === 'string') {
        previousPointerObj[previousPart] = {};
        previousPointerObj[previousPart][previousPart] = pointerObj;
        Object.assign(previousPointerObj[previousPart], value);
    }
    else
        pointerObj[last] = value;
    return obj;
}
async function getItemFromCIT(baseDir, outputDir, propertiesDir, vanillaDir) {
    var _a, _b, _c, _d;
    const properties = await readPropertiesFile(propertiesDir);
    const matchItems = (_c = (_b = ((_a = properties === null || properties === void 0 ? void 0 : properties.items) !== null && _a !== void 0 ? _a : properties === null || properties === void 0 ? void 0 : properties.matchItems)) === null || _b === void 0 ? void 0 : _b.split(' ')) !== null && _c !== void 0 ? _c : null;
    const matcher = {
        items: matchItems,
        nbt: properties.nbt,
        type: (_d = properties === null || properties === void 0 ? void 0 : properties.type) !== null && _d !== void 0 ? _d : null
    };
    let textures = {};
    if (properties.model) {
        const model = await readFullModel(path.dirname(propertiesDir), properties.model, path.join(vanillaDir, 'models'), path.join(baseDir, './models'));
        if (model.textures) {
            const newTextures = {};
            for (let [key, value] of Object.entries(model.textures)) {
                if (!value.endsWith('.png'))
                    value += '.png';
                newTextures[key] = path.join(path.dirname(propertiesDir), value);
            }
            textures = { ...newTextures };
        }
    }
    const propertiesTexture = properties.texture;
    if (typeof propertiesTexture === 'string') {
        let newTexture = path.join(path.dirname(propertiesDir), propertiesTexture);
        if (!newTexture.endsWith('.png'))
            newTexture += '.png';
        textures.texture = newTexture;
    }
    else if (propertiesTexture) {
        const newTextures = {};
        for (let [key, value] of Object.entries(propertiesTexture)) {
            if (!value.endsWith('.png'))
                value += '.png';
            newTextures[key] = path.join(path.dirname(propertiesDir), value);
        }
        textures = { ...newTextures };
    }
    return {
        matcher,
        textures
    };
}
async function addPack(packName) {
    try {
        await fs_1.promises.rmdir(`./textures/${packName}`, { recursive: true });
    }
    catch { }
    await fs_1.promises.mkdir(`./textures/${packName}`);
    const packSourceDir = `./packs/${packName}`;
    const outputDir = `./textures/${packName}`;
    const vanillaDir = path.join(path.dirname(__dirname), './packs/vanilla');
    const matchers = [];
    // add cit
    const customItemTextureDirs = await getFiles(`${packSourceDir}/mcpatcher/cit`);
    for await (const textureDir of customItemTextureDirs) {
        if (textureDir.endsWith('.properties')) {
            const item = await getItemFromCIT(packSourceDir, outputDir, textureDir, vanillaDir);
            matchers.push(item);
        }
    }
    // await addItemFromModel(packSourceDir, outputDir, 'item/stick')
    // await addItemFromModel(packSourceDir, outputDir, 'item/diamond_pickaxe')
    await writeJsonFile(path.join(outputDir, 'matchers.json'), matchers);
}
async function main() {
    try {
        await fs_1.promises.rmdir('./textures', { recursive: true });
    }
    catch { }
    await fs_1.promises.mkdir('./textures');
    await addPack('packshq');
    await addPack('furfsky');
}
main();
