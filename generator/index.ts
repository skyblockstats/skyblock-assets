import { loadImage, createCanvas, Image } from 'canvas'
import { promises as fs, Dirent } from 'fs'
import { makeApng } from './apng'
import * as path from 'path'

type XYZArray = [ number, number, number ]
type XYXYArray = [ number, number, number, number ]

// TODO: generate renders for items with multiple layers (leather armor)

type Direction = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'

let vanillaDamages: { [ key: string ]: string }
let vanillaRenders: string[] = []

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
	let entries: Dirent[]
	try {
	    entries = await fs.readdir(dir, { withFileTypes: true })
	} catch {
		return []
	}
    for (const entry of entries) {
        const res = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            yield* getFiles(res)
        } else {
            yield res
        }
    }
}

/** Parse a key=value file */
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

/** Returns whether a file exists */
async function fileExists(fileDir: string): Promise<boolean> {
	try {
		await fs.access(fileDir)
		return true
	} catch {
		return false
	}
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

		if (model.textures)
			for (const [ key, value ] of Object.entries(model.textures)) {
				if (value.startsWith('#')) {
					const copyKey = value.substring(1)
					const copyValue = model.textures[copyKey]
					if (copyValue)
						model.textures[key] = copyValue
				}
			}

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
		previousPointerObj[previousPart][last] = value
	} else
		pointerObj[last] = value

	return obj
}

interface MatcherTextures {
	matcher: Matcher
	textures: { [ key: string ]: string }
}

async function createAPng(textureFileName: string, frameTime: number): Promise<Buffer> {
	const sourceImage = await loadImage(textureFileName)
	const frames = sourceImage.height / sourceImage.width
	const frameSize = sourceImage.width
	const frameBuffers = []

	for (let frameNumber = 0; frameNumber < frames; frameNumber ++) {
		const canvas = createCanvas(frameSize, frameSize)
		const ctx = canvas.getContext('2d')
		ctx.drawImage(sourceImage, 0, -frameNumber * frameSize)
		frameBuffers.push(canvas.toBuffer())
	}
	return await makeApng(frameBuffers, (index) => ({ numerator: frameTime, denominator: 20 * 1000 }))
}

async function getItemFromCIT(baseDir: string, outputDir: string, propertiesDir: string, vanillaDir: string): Promise<MatcherTextures> {
	const properties = await readPropertiesFile(propertiesDir)

	// It can be either `items` or `matchItems`, and it's split by spaces
	/** The Minecraft item ids that are allowed */
	const matchItems = (properties?.items ?? properties?.matchItems)
		?.split(' ')
		?.map(item => item.startsWith('minecraft:') ? item : `minecraft:${item}` )
	?? null

	const matcher: Matcher = {
		items: matchItems,
		damage: properties.damage,
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

				let newDirectory: string = path.join(path.dirname(propertiesDir), value as string)

				if (!value.startsWith('/') && !value.startsWith('./')) {
					if (await fileExists(path.join(baseDir, value)))
						newDirectory = path.join(baseDir, value)
				}

				newTextures[key] = newDirectory
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

	// we read the .png.mcmeta file to see if there's animations
	for (const [ textureName, textureFileName ] of Object.entries(textures)) {
		try {
			const textureProperties = await readJsonFile(textureFileName + '.mcmeta')
			const apng = await createAPng(textureFileName, textureProperties.animation.frametime)
			const apngDir = textureFileName.replace(/^packs\\/, 'renders\\')
			await fs.mkdir(path.dirname(apngDir), { recursive: true })
			await fs.writeFile(apngDir, apng)
			textures[textureName] = apngDir
		} catch {
			continue
		}
	}
	// console.log(textures)

	return {
		matcher,
		textures
	}
}


interface Matcher {
	type?: string
	items?: string[]
	damage?: number
	nbt?: {
		ExtraAttributes?: {
			id?: string
			[ key: string ]: any
		},
		[ key: string ]: any
	}
}


/** Combines an array of directories and returns a buffer */
async function combineLayers(directories: string[]): Promise<Buffer> {
	const sourceImages: Image[] = []

	for (const directory of directories) {
		const image = await loadImage(directory)
		sourceImages.push(image)
	}

	const canvas = createCanvas(sourceImages[0].width, sourceImages[0].height)
	const ctx = canvas.getContext('2d')

	for (const image of sourceImages) {
		ctx.drawImage(image, 0, 0)
	}
	return canvas.toBuffer()
}


async function addPack(packName: string) {
	const packSourceDir = `./packs/${packName}`
	const outputDir = `./matchers/`

	const vanillaDir = path.join(path.dirname(__dirname), './packs/vanilla')

	const matchers: MatcherTextures[] = []

	// add cit
	const customItemTextureDirs = await getFiles(`${packSourceDir}/mcpatcher/cit`)
	for await (const textureDir of customItemTextureDirs) {
		if (textureDir.endsWith('.properties')) {
			const item = await getItemFromCIT(packSourceDir, outputDir, textureDir, vanillaDir)
			matchers.push(item)
		}
	}

	const itemModelDirs = await getFiles(path.join(packSourceDir, 'models', 'item'))

	for await (const modelDir of itemModelDirs) {
		let itemName: string = path.basename(modelDir).split('.')[0]
		const model = await readFullModel(packSourceDir, `item/${itemName}`, path.join(vanillaDir, 'models'))
		if (model.textures) {
			const newTextures = {}
			for (let [ key, value ] of Object.entries(model.textures)) {
				if (!value.endsWith('.png')) value += '.png'
				newTextures[key] = path.join(packSourceDir, 'textures', value)
			}
			model.textures = { ...newTextures }

			let minecraftItemName: string
			let damage: number = 0

			const fileItemName = itemName

			// if possible, convert stuff like "pufferfish" to "fish" and 3
			if (vanillaDamages[itemName]) {
				const [ tempItemName, damageString ] = vanillaDamages[itemName].split(':')
				itemName = tempItemName
				try {
					damage = parseInt(damageString)
				} catch {
					damage = undefined
				}
			}

			minecraftItemName = `minecraft:${itemName}`

			if (vanillaRenders.includes(path.join('renders', 'vanilla', `${fileItemName}.png`))) {
				model.textures.texture = path.join('renders', 'vanilla', `${fileItemName}.png`)
			}

			else if (packName === 'vanilla' && !model.textures.texture && model.textures.layer1) {
				const layerDirs = []
				for (let i = 0; i < Object.keys(model.textures).length; i ++) {
					if (model.textures[`layer${i}`]) {
						layerDirs.push(model.textures[`layer${i}`])
					}
				}
				const combinedPngBuffer = await combineLayers(layerDirs)
				console.log(fileItemName)
				const combinedPngDir = path.join('renders', 'vanilla', `${fileItemName}.png`)
				// await fs.mkdir(path.dirname(apngDir), { recursive: true })
				await fs.writeFile(combinedPngDir, combinedPngBuffer)
				model.textures.texture = path.join('renders', 'vanilla', `${fileItemName}.png`)
			}

			matchers.push({
				matcher: {
					items: [ minecraftItemName ],
					damage: damage
				},
				textures: model.textures
			})
		}
	}

	// add vanilla skulls that weren't auto matched
	if (packName === 'vanilla') {
		matchers.push({
			matcher: { items: [ 'minecraft:skull' ], damage: 0 },
			textures: {
				texture: path.join('renders', 'vanilla', 'skeleton_skull.png')
			}
		})
		matchers.push({
			matcher: { items: [ 'minecraft:skull' ], damage: 1 },
			textures: {
				texture: path.join('renders', 'vanilla', 'wither_skeleton_skull.png')
			}
		})
		matchers.push({
			matcher: { items: [ 'minecraft:skull' ], damage: 2 },
			textures: {
				texture: path.join('renders', 'vanilla', 'zombie_head.png')
			}
		})
		matchers.push({
			matcher: { items: [ 'minecraft:skull' ], damage: 3 },
			textures: {
				texture: path.join('renders', 'vanilla', 'head.png')
			}
		})
		matchers.push({
			matcher: { items: [ 'minecraft:skull' ], damage: 4 },
			textures: {
				texture: path.join('renders', 'vanilla', 'creeper_head.png')
			}
		})
	}

	await writeJsonFile(path.join(outputDir, `${packName}.json`), matchers)
}

async function makeDir(dir) {
	try {
		await fs.rmdir(dir, { recursive: true })
	} catch {}
	await fs.mkdir(dir)
}

async function main() {
	vanillaDamages = await readJsonFile('data/vanilla_damages.json')

	for await (const dir of await getFiles('renders/vanilla'))
		vanillaRenders.push(dir)

	await makeDir('./textures')
	await makeDir(`./matchers`)

	await addPack('packshq')
	await addPack('furfsky')
	await addPack('vanilla')
}

main()

