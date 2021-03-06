import { promises as fs } from 'fs'
import * as path from 'path'
type XYZArray = [ number, number, number ]
type XYXYArray = [ number, number, number, number ]

type Direction = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'

interface ModelFace {
	uv: XYXYArray,
	texture: string,
	rotation?: number,
	cullface?: Direction
}

interface ModelDisplay {
	rotation: XYZArray
	translation: XYZArray
	scale: XYZArray
}

interface ModelElement {
	__comment?: string
	from: XYZArray
	to: XYZArray
	faces: {
		[ direction in Direction ]: ModelFace
	}
}

interface ModelTextures {
	layer0?: string
	layer1?: string
	texture?: string
	all?: string
	bottom?: string
	top?: string
	end?: string
	side?: string
	cross?: string
	rail?: string
	particle?: string
	body?: string
	[ name: string ]: string
}

interface Model {
	parent: string
	textures?: ModelTextures
	display?: {
		thirdperson?: ModelDisplay
		firstperson?: ModelDisplay
		gui?: ModelDisplay
	}
	elements?: ModelElement[]
}


// stolen from https://stackoverflow.com/a/65415138
async function* getFiles(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
        // const res = path.resolve(dir, entry.name)
        const res = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            yield* getFiles(res)
        } else {
            yield res
        }
    }
}

async function readPropertiesFile(fileDir: string): Promise<{ [ key: string]: any }> {
	const contents = {}
	const fileContents = await fs.readFile(fileDir, { encoding: 'utf8' })
	for (const line of fileContents.split('\n')) {
		const [ key, value ] = line.split('=', 2)
		if (!value) continue
		contents[key] = value.trim()
	}

	const dotNotationContents = {}
	for (const property of Object.keys(contents)) {
		setDotNotationAttribute(dotNotationContents, property, contents[property])
	}
	return dotNotationContents
}

async function readJsonFile(fileDir: string): Promise<any> {
	const fileContents = await fs.readFile(fileDir, { encoding: 'utf8' })
	return JSON.parse(fileContents)
}

async function writeJsonFile(fileDir: string, contents: any): Promise<void> {
	await fs.writeFile(fileDir, JSON.stringify(contents, null, 2), { encoding: 'utf8' })
}

function deepAssign(target, ...sources) {
	for (const source of sources) {
		for (const k in source) {
			const vs = source[k], vt = target[k]
			if (Object(vs) == vs && Object(vt) === vt)
				target[k] = deepAssign(vt, vs)
			else
				if (!target[k])
					target[k] = source[k]
		}
	}
	return target
}

async function readFullModel(baseDir: string, modelName: string, vanillaModelsDir: string, backupDir?: string): Promise<Model> {
	let model = await readModelJson(baseDir, modelName, vanillaModelsDir, backupDir)

	// if the model has a parent, merge it with this model
	if (model.parent && !model.parent.startsWith('builtin/')) {
		const modelParentName = model.parent.startsWith('minecraft:') ? model.parent.slice('minecraft:'.length) : model.parent
		const modelParent = await readFullModel(baseDir, modelParentName, vanillaModelsDir, backupDir)
		deepAssign(model, modelParent)
		delete model.parent
	}
	return model
}

async function readModelJson(baseDir: string, modelName: string, vanillaModelsDir: string, backupDir?: string): Promise<Model> {
	const modelNameJson = modelName.endsWith('.json') ? modelName : modelName + '.json'
	// it's always one of these
	try {
		return await readJsonFile(path.join(baseDir, modelNameJson))
	} catch {}
	try {
		return await readJsonFile(path.join(vanillaModelsDir, modelNameJson))
	} catch {}
	if (backupDir)
		return await readJsonFile(path.join(backupDir, modelNameJson))
	else
		throw Error(`Couldn\'t find model. baseDir: ${baseDir}, modelName: ${modelName}, vanillaModelsDir: ${vanillaModelsDir}`)
}


// async function addItemFromModel(baseDir: string, outputDir: string, modelName: string, vanillaModelsDir: string) {
// 	const model = await readFullModel(`${baseDir}/models`, modelName, vanillaModelsDir)
// 	const modelTextures: ModelTextures = model.textures
// 	const itemTexturePath = modelTextures.layer0
// 	// writeJsonFile(baseDir + '')
// 	const textureBuffer = await fs.readFile(`${baseDir}/textures/${itemTexturePath}.png`)
// 	const textureOutputDir = `${outputDir}/textures/${itemTexturePath}.png`
// 	try {
// 		await fs.mkdir(path.dirname(textureOutputDir), { recursive: true })
// 	} catch {}
// 	await fs.writeFile(textureOutputDir, textureBuffer)
// 	return {
// 		texture: textureOutputDir,
// 	}
// }


function setDotNotationAttribute(obj: any, path: string, value: any) {
	let pointerObj = obj
	const parts = path.split('.')

	let previousPointerObj = obj
	let previousPart: string = parts[0]

	const last = parts.pop()
	for (const part of parts) {
		previousPointerObj = pointerObj
		previousPart = part
		if (!pointerObj[part]) pointerObj[part] = {}
		pointerObj = pointerObj[part]
	}
	if (typeof pointerObj === 'string') {
		previousPointerObj[previousPart] = {}
		previousPointerObj[previousPart][previousPart] = pointerObj
		Object.assign(previousPointerObj[previousPart], value)
	} else
		pointerObj[last] = value
	return obj
}

async function getItemFromCIT(baseDir: string, outputDir: string, propertiesDir: string, vanillaDir: string) {
	const properties = await readPropertiesFile(propertiesDir)

	const matchItems = (properties?.items ?? properties?.matchItems)?.split(' ') ?? null

	const matcher: Matcher = {
		items: matchItems, // TODO: is this actually split by commas?
		nbt: properties.nbt,
		type: properties?.type ?? null
	}

	let textures: { [ key: string]: string } = {}
	
	if (properties.model) {
		const model = await readFullModel(path.dirname(propertiesDir), properties.model, path.join(vanillaDir, 'models'), path.join(baseDir, './models'))
		if (model.textures) {
			const newTextures = {}
			for (let [ key, value ] of Object.entries(model.textures)) {
				if (!value.endsWith('.png')) value += '.png'
				newTextures[key] = path.join(path.dirname(propertiesDir), value as string)
			}
			textures = { ...newTextures }
		}
	}
	const propertiesTexture: string | { [ key: string ]: string} = properties.texture
	if (typeof propertiesTexture === 'string') {
		let newTexture = path.join(path.dirname(propertiesDir), propertiesTexture)
		if (!newTexture.endsWith('.png')) newTexture += '.png'
		textures.texture = newTexture
	} else if (propertiesTexture) {
		const newTextures = {}
		for (let [ key, value ] of Object.entries(propertiesTexture)) {
			if (!value.endsWith('.png')) value += '.png'
			newTextures[key] = path.join(path.dirname(propertiesDir), value as string)
		}
		textures = { ...newTextures }
	}
	return {
		matcher,
		textures
	}
}


interface Matcher {
	type: string
	items: string[]
	nbt: {
		ExtraAttributes?: {
			id?: string
			[ key: string ]: any
		},
		[ key: string ]: any
	}
}

async function addPack(packName: string) {
	const packSourceDir = `./packs/${packName}`
	const outputDir = `./matchers/`

	const vanillaDir = path.join(path.dirname(__dirname), './packs/vanilla')

	const matchers = []

	// add cit
	const customItemTextureDirs = await getFiles(`${packSourceDir}/mcpatcher/cit`)
	for await (const textureDir of customItemTextureDirs) {
		if (textureDir.endsWith('.properties')) {
			const item = await getItemFromCIT(packSourceDir, outputDir, textureDir, vanillaDir)
			matchers.push(item)
		}
	}
	// await addItemFromModel(packSourceDir, outputDir, 'item/stick')
	// await addItemFromModel(packSourceDir, outputDir, 'item/diamond_pickaxe')

	await writeJsonFile(path.join(outputDir, `${packName}.json`), matchers)
}

async function makeDir(dir) {
	try {
		await fs.rmdir(dir, { recursive: true })
	} catch {}
	await fs.mkdir(dir)
}

async function main() {
	await makeDir('./textures')
	await makeDir(`./matchers`)

	await addPack('packshq')
	await addPack('furfsky')
}

main()