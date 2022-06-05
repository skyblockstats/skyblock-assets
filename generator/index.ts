// @ts-ignore This is outside the rootdir so technically it's illegal but also it's fine
import minecraftIds from '../data/minecraft_ids.json'
// @ts-ignore This is outside the rootdir so technically it's illegal but also it's fine
import vanillaDamages from '../data/vanilla_damages.json'
import { loadImage, createCanvas, Image } from 'canvas'
import { promises as fs, Dirent } from 'fs'
import { makeApng } from './apng'
import * as path from 'path'

type XYZArray = [number, number, number]
type XYXYArray = [number, number, number, number]

type Direction = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'

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
		[direction in Direction]: ModelFace
	}
}

const usefulTextures = [
	'texture',
	'layer0',
	'fishing_rod',
	'leather_boots_overlay',
	'leather_chestplate_overlay',
	'leather_helmet_overlay',
	'leather_leggings_overlay',
	'leather_layer_1',
	'leather_layer_2',
]

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
	[name: string]: string
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
async function readPropertiesFile(fileDir: string): Promise<{ [key: string]: any }> {
	const contents = {}
	let fileContents: string = await fs.readFile(fileDir, { encoding: 'utf8' })
	for (const line of fileContents.split('\n')) {
		const keyvalue = line.split('=', 2)
		if (keyvalue.length !== 2) continue
		const [key, value] = keyvalue
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
	await fs.writeFile(fileDir, JSON.stringify(contents), { encoding: 'utf8' })
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
	let model: Model
	try {
		model = await readModelJson(baseDir, modelName, vanillaModelsDir, backupDir)
	} catch (err) {
		console.warn(err)
		return {
			parent: null
		}
	}

	// if the model has a parent, merge it with this model
	if (model.parent && !model.parent.startsWith('builtin/') && model.parent !== 'item/generated') {
		const modelParentName = model.parent.startsWith('minecraft:') ? model.parent.slice('minecraft:'.length) : model.parent
		const modelParent = await readFullModel(baseDir, modelParentName, vanillaModelsDir, backupDir)

		deepAssign(model, modelParent)

		if (model.textures)
			for (const [key, value] of Object.entries(model.textures)) {
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
	} catch { }
	try {
		return await readJsonFile(path.join(vanillaModelsDir, modelNameJson))
	} catch { }
	if (backupDir)
		try {
			return await readJsonFile(path.join(backupDir, modelNameJson))
		} catch { }
	throw Error(`Couldn\'t find model. baseDir: ${baseDir}, modelName: ${modelName}, vanillaModelsDir: ${vanillaModelsDir}, backupDir: ${backupDir}`)
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
	/** Matcher */
	m: Matcher
	/** Texture */
	t: string
}

async function createAPng(textureFileName: string, frameTime: number): Promise<Buffer> {
	const sourceImage = await loadImage(textureFileName)
	const frames = sourceImage.height / sourceImage.width
	const frameSize = sourceImage.width
	const frameBuffers = []

	for (let frameNumber = 0; frameNumber < frames; frameNumber++) {
		const canvas = createCanvas(frameSize, frameSize)
		const ctx = canvas.getContext('2d')
		ctx.drawImage(sourceImage, 0, -frameNumber * frameSize)
		frameBuffers.push(canvas.toBuffer())
	}
	return await makeApng(frameBuffers, (index) => ({ numerator: frameTime, denominator: 20 * 1000 }))
}

async function makeAnimationFromMcmeta(textureFileName: string): Promise<string> {
	const textureProperties = await readJsonFile(textureFileName + '.mcmeta')
	const apng = await createAPng(textureFileName, textureProperties.animation.frametime)
	const apngDir = textureFileName.replace(/^packs\\/, 'renders\\')
	await fs.mkdir(path.dirname(apngDir), { recursive: true })
	await fs.writeFile(apngDir, apng)
	return apngDir
}

async function getItemFromCIT(baseDir: string, propertiesDir: string, vanillaDir: string): Promise<MatcherTextures | null> {
	const properties = await readPropertiesFile(propertiesDir)

	// It can be either `items` or `matchItems`, and it's split by spaces
	/** The Minecraft item ids that are allowed */
	const matchItems = (properties?.items ?? properties?.matchItems)
		?.split(' ')
		?.map(item => item.startsWith('minecraft:') ? item : `minecraft:${item}`)
		?? null

	const matcher: Matcher = {
		i: matchItems,
		d: properties.damage,
		n: properties.nbt,
		t: properties?.type ?? null
	}


	let textures: { [key: string]: string } = {}

	if (properties.model) {
		const model = await readFullModel(path.dirname(propertiesDir), properties.model, path.join(vanillaDir, 'models'), path.join(baseDir, './models'))

		if (model.textures) {
			const newTextures = {}
			for (let [key, value] of Object.entries(model.textures)) {
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

	const propertiesTexture: string | { [key: string]: string } = properties.texture

	if (typeof propertiesTexture === 'string') {
		let newTexture = path.join(path.dirname(propertiesDir), propertiesTexture)
		if (newTexture.endsWith('.png.png')) newTexture = newTexture.slice(0, newTexture.length - 4)
		else if (!newTexture.endsWith('.png')) newTexture += '.png'

		// if the file doesn't exist, try checking the parent directory
		if (!(await fileExists(newTexture))) {
			const parentDirectory = path.join(path.dirname(propertiesDir), '..', propertiesTexture)
			if (await fileExists(parentDirectory))
				newTexture = parentDirectory
		}

		textures.texture = newTexture
	} else if (propertiesTexture) {
		const newTextures = {}
		for (let [key, value] of Object.entries(propertiesTexture)) {
			if (value.endsWith('.png.png')) value = value.slice(0, value.length - 4)
			else if (!value.endsWith('.png')) value += '.png'
			newTextures[key] = path.join(path.dirname(propertiesDir), value as string)
		}
		textures = { ...newTextures }
	}

	// we read the .png.mcmeta file to see if there's animations
	for (const [textureName, textureFileName] of Object.entries(textures)) {
		try {
			const apngDir = await makeAnimationFromMcmeta(textureFileName)
			textures[textureName] = apngDir
		} catch {
			continue
		}
	}

	if (Object.keys(textures).length === 0) {
		// some properties are weird and just don't put a model or texture, so we just assume it's fine if we replace .properties with .png
		let textureDir = propertiesDir.replace(/(\.properties)$/, '.png')
		try {
			textureDir = await makeAnimationFromMcmeta(textureDir)
		} catch {
			// this texture is broken!!! or maybe the texture is a model or something idk.
			return null
		}

		textures.texture = textureDir
	}

	return {
		m: matcher,
		t: getUsedTexture(textures)
	}
}

interface NBT {
	ExtraAttributes?: {
		id?: string
		[key: string]: string | number | any
	},
	display?: {
		Name?: string
	}
	[key: string]: string | number | any
}


interface Matcher {
	/** Type */
	t?: string
	/** Items */
	i?: string[]
	/** Damage */
	d?: number
	/** NBT */
	n?: NBT
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

function integerToId(id: number): string {
	return id.toString(36)
}

/*
How it finds matchers:
- Check /mcpatcher/cit and get all the files that end in .properties
- Check /models/item and extract the entire models from there
	- Get the textures from here, these might be replaced
	- Extract the item name from the model file name
		- If the model file name is in vanilla_damages, use the one from there as the item name
		- If the model file name is in renders, use that as the texture
		- If the pack is vanilla and layer1 is a texture, render it as an apng
- If it's vanilla, manually add some
*/


function getUsedTexture(textures: { [key: string]: string }): string | null {
	return textures.texture
		?? textures.layer0

		?? textures.fishing_rod
		?? textures.leather_boots_overlay
		?? textures.leather_chestplate_overlay
		?? textures.leather_helmet_overlay
		?? textures.leather_leggings_overlay

		?? textures.leather_layer_1
		?? textures.leather_layer_2
}

async function addPack(packName: string) {
	const packSourceDir = `./packs/${packName}`

	const texturesDir = `./textures/${packName}`
	await makeDir(texturesDir)

	const vanillaDir = path.join(path.dirname(__dirname), './packs/vanilla')

	const matchers: MatcherTextures[] = []

	let itemIndex = 0


	/** Simply add an item to the list of matchers. Some details will be changed in order to make the matchers smaller. */
	async function addMatcherTextures(matcherTextures: MatcherTextures) {
		const newTextureDir = matcherTextures.t
		if (!newTextureDir)
			return

		// for (let [textureName, textureDirectory] of Object.entries(matcherTextures.t)) {/
		// if (!usefulTextures.includes(textureName)) {
		// 	delete newTextures[textureName]
		// 	continue
		// }
		const thisItemIndex = itemIndex++
		try {
			await fs.copyFile(newTextureDir, path.join(texturesDir, `${integerToId(thisItemIndex)}.png`))
		} catch (e) {
			// console.warn('Missing texture:', textureDirectory, matcherTextures)
			return
		}
		const newTextureId = integerToId(thisItemIndex)
		// newTextures[textureName] = integerToId(thisItemIndex)
		// }

		let newItems = matcherTextures.m.i
		if (!newItems) {
			console.warn('No items for matcher:', matcherTextures)
			return
		}

		// remove the minecraft: namespace from matcher items
		if (newItems)
			newItems = newItems
				.map(item => (item in minecraftIds) ? minecraftIds[item].replace(/^minecraft:/, '') : item)
				.map(item => item.replace(/^(minecraft:)+/, ''))

		matchers.push({
			t: newTextureId,
			m: {
				...matcherTextures.m,
				// sort so it's easier to compress or something idk
				i: newItems.sort()
			}
		})
	}

	// add cit
	const customItemTextureDirs = await getFiles(`${packSourceDir}/mcpatcher/cit`)
	for await (const textureDir of customItemTextureDirs) {
		if (textureDir.endsWith('.properties')) {
			const item = await getItemFromCIT(packSourceDir, textureDir, vanillaDir)
			if (item)
				await addMatcherTextures(item)
		}
	}

	const itemModelDirs = await getFiles(path.join(packSourceDir, 'models', 'item'))

	for await (const modelDir of itemModelDirs) {
		let itemName: string = path.basename(modelDir).split('.')[0]
		const model = await readFullModel(packSourceDir, `item/${itemName}`, path.join(vanillaDir, 'models'))

		const fileItemName = itemName

		let minecraftItemName: string = `minecraft:${itemName}`
		let damage: number = 0

		if (model.textures) {
			const newTextures = {}
			for (let [key, value] of Object.entries(model.textures)) {
				if (value.endsWith('.png.png')) value = value.slice(0, value.length - 4)
				else if (!value.endsWith('.png')) value += '.png'
				newTextures[key] = path.join(packSourceDir, 'textures', value)
			}
			model.textures = { ...newTextures }


			// if possible, convert stuff like "pufferfish" to "fish" and 3
			if (vanillaDamages[itemName]) {
				const [tempItemName, damageString] = vanillaDamages[itemName].split(':')
				itemName = tempItemName
				try {
					damage = parseInt(damageString)
				} catch {
					damage = undefined
				}
			}

			minecraftItemName = `minecraft:${itemName}`

			if (packName === 'vanilla' && !model.textures.texture && model.textures.layer1) {
				const layerDirs = []
				for (let i = 0; i < Object.keys(model.textures).length; i++) {
					if (model.textures[`layer${i}`]) {
						layerDirs.push(model.textures[`layer${i}`])
					}
				}
				const combinedPngBuffer = await combineLayers(layerDirs)
				const combinedPngDir = path.join('renders', 'vanilla', `${fileItemName}.png`)
				// await fs.mkdir(path.dirname(apngDir), { recursive: true })
				await fs.writeFile(combinedPngDir, combinedPngBuffer)
				model.textures.texture = path.join('renders', 'vanilla', `${fileItemName}.png`)
			}

		} else {
			model.textures = {}
		}
		if (vanillaRenders.includes(path.join('renders', 'vanilla', `${fileItemName}.png`))) {
			model.textures.texture = path.join('renders', 'vanilla', `${fileItemName}.png`)
		}

		await addMatcherTextures({
			m: {
				i: [minecraftItemName],
				d: damage
			},
			t: getUsedTexture(model.textures)
		})
	}

	/** Add an item to the matchers while potentially rendering the animation if necessary */
	async function addItemToMatchers(matcher: Matcher, textureDir: string) {
		try {
			textureDir = await makeAnimationFromMcmeta(textureDir)
		} catch { }
		await addMatcherTextures({
			m: matcher,
			t: textureDir
		})
	}

	// add wacky items that aren't in models
	if (packName === 'vanilla') {
		await addItemToMatchers(
			{ i: ['minecraft:skull'], d: 0 },
			path.join('renders', 'vanilla', 'skeleton_skull.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:skull'], d: 1 },
			path.join('renders', 'vanilla', 'wither_skeleton_skull.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:skull'], d: 2 },
			path.join('renders', 'vanilla', 'zombie_head.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:skull'], d: 3 },
			path.join('renders', 'vanilla', 'head.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:skull'], d: 4 },
			path.join('renders', 'vanilla', 'creeper_head.png')
		)
		// for some reason mojang decided to not put chests in models
		await addItemToMatchers(
			{ i: ['minecraft:chest'] },
			path.join('renders', 'vanilla', 'chest.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:ender_chest'] },
			path.join('renders', 'vanilla', 'ender_chest.png')
		)
		await addItemToMatchers(
			{ i: ['minecraft:trapped_chest'] },
			path.join('renders', 'vanilla', 'trapped_chest.png')
		)
	}

	await writeJsonFile(
		`matchers/${packName}.json`,
		{ dir: `textures/${packName}`, matchers }
	)

	return matchers
}

async function makeDir(dir) {
	try {
		await fs.rm(dir, { recursive: true })
	} catch { }
	await fs.mkdir(dir)
}

async function main() {
	for await (const dir of await getFiles('renders/vanilla'))
		vanillaRenders.push(dir)

	await makeDir('textures')
	await makeDir('matchers')

	await addPack('ectoplasm')
	await addPack('furfsky')
	await addPack('furfsky_reborn')
	await addPack('hypixel+')
	await addPack('packshq')
	await addPack('rnbw')
	await addPack('worlds_and_beyond')

	await addPack('vanilla')
}

main()

