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
const path_1 = require("path");
// stolen from https://stackoverflow.com/a/65415138
async function* getFiles(dir) {
    const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const res = path_1.resolve(dir, entry.name);
        if (entry.isDirectory()) {
            yield* getFiles(res);
        }
        else {
            yield res;
        }
    }
}
async function readJsonFile(fileDir) {
    const fileContents = await fs_1.promises.readFile(fileDir, { encoding: 'utf8' });
    return JSON.parse(fileContents);
}
async function writeJsonFile(fileDir, contents) {
    await fs_1.promises.writeFile(fileDir, contents, { encoding: 'utf8' });
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
async function readFullModel(baseDir, modelName) {
    let model = await readModelJson(baseDir, modelName);
    // if the model has a parent, merge it with this model
    if (model.parent && !model.parent.startsWith('builtin/')) {
        const modelParent = await readFullModel(baseDir, model.parent);
        deepAssign(model, modelParent);
        delete model.parent;
    }
    return model;
}
async function readModelJson(baseDir, modelName) {
    return await readJsonFile(`${baseDir}/models/${modelName}.json`);
}
async function addItemFromModel(baseDir, outputDir, modelName) {
    const model = await readFullModel(baseDir, modelName);
    const modelTextures = model.textures;
    console.log(modelTextures);
    const itemTexturePath = modelTextures.layer0;
    // writeJsonFile(baseDir + '')
    const textureBuffer = await fs_1.promises.readFile(`${baseDir}/textures/${itemTexturePath}.png`);
    const textureOutputDir = `${outputDir}/textures/${itemTexturePath}.png`;
    await fs_1.promises.mkdir(path.dirname(textureOutputDir), { recursive: true });
    await fs_1.promises.writeFile(textureOutputDir, textureBuffer);
    return {
        texture: textureOutputDir,
    };
}
async function addItemFromCIT(baseDir, outputDir, modelName) {
}
async function addItemWithMatcher(baseDir, outputDir, modelName, propertiesDir) {
}
async function addPack(packName) {
    await fs_1.promises.mkdir(`./textures/${packName}`);
    const packSourceDir = `./packs/${packName}`;
    const outputDir = `./textures/${packName}`;
    const customItemTextureDirs = await getFiles(`${packSourceDir}/mcpatcher/cit`);
    for await (const textureDir of customItemTextureDirs) {
        // console.log(textureDir)
    }
    // await addItemFromModel(packSourceDir, OutputDir, 'item/stick')
    // await addItemFromModel(packSourceDir, OutputDir, 'item/diamond_pickaxe')
}
async function main() {
    try {
        await fs_1.promises.rmdir('./textures', { recursive: true });
    }
    catch { }
    await fs_1.promises.mkdir('./textures');
    await addPack('packshq');
}
main();
