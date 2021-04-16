import { promises as fs } from 'fs'

const baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main'

export interface NBT {
	ExtraAttributes?: {
		id?: string
		[ key: string ]: string | number | any
	},
	[ key: string ]: string | number | any
}

interface Matcher {
	type: string
	items: string[]
	nbt: NBT
}

export interface Options {
	pack: 'vanilla' | 'packshq' | 'furfsky'
	id: string
	nbt: NBT
}

/** Read the contents of a json file */
async function readJsonFile(fileDir: string): Promise<any> {
	const fileContents = await fs.readFile(fileDir, { encoding: 'utf8' })
	return JSON.parse(fileContents)
}

/** Get the matchers for a pack */
async function readPackMatchers(packName: string): Promise<any[]> {
	return await readJsonFile(`matchers/${packName}.json`)
}

/** Get all the matchers for each pack */
async function readPacksMatchers(): Promise<{ [key: string]: any[] }> {
	const dirFiles = await fs.readdir('matchers')
	const matchers = {}
	for (const fileName of dirFiles) {
		const packName = fileName.slice(0, (fileName.length) - ('.json'.length))
		matchers[packName] = await readPackMatchers(packName)
	}
	return matchers
}

let matchers: { [key: string]: any[] } = {}

async function init() {
	matchers = await readPacksMatchers()
}

/** Check if all the values from checkerObj are the same in obj */
function objectsPartiallyMatch(obj: NBT, checkerObj: NBT) {
	for (const [ attribute, checkerValue ] of Object.entries(checkerObj)) {
		if (checkerValue === obj[attribute]) continue

		if (typeof checkerValue === 'object' && typeof obj[attribute] === 'object') {
			return objectsPartiallyMatch(obj[attribute], checkerValue)
		}
		
		let checkerRegex: RegExp
		if (typeof checkerValue === 'string' && checkerValue.startsWith('ipattern:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('ipattern:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern
				.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
				.replace(/\*/g, '.*') + '$'
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('iregex:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('iregex:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern + '$'
			)
		}
		if (checkerRegex) {
			if (checkerRegex.test(obj[attribute]))
				return true
		}

		return false
	}
	return true
}

async function checkMatches(options: Options, matcher: Matcher) {
	// check 'items'
	if (matcher.items && !matcher.items.includes(options.id))
		return false
	// check nbt
	if (matcher.nbt) {
		if (!objectsPartiallyMatch(options.nbt, matcher.nbt))
			return false
	}
	return true
}

async function getTextures(options: Options): Promise<{ [key: string]: string }> {
	for (const packName in matchers) {
		// only check the matchers if we're checking this pack
		if (options.pack === packName) {
			const packMatchers = matchers[packName]
			for (const packMatcherData of packMatchers) {
				const packMatcher: Matcher = packMatcherData.matcher

				const matches = await checkMatches(options, packMatcher)
				if (matches)
					return packMatcherData.textures
			}
		}
	}
}

/** Get the URL for the texture for a SkyBlock item */
export async function getTextureUrl(options: Options) {
	const textures = await getTextures(options) ?? {}
	const texturePath: string = textures.texture
		?? textures.layer0

		?? textures.fishing_rod
		?? textures.leather_boots_overlay
		?? textures.leather_chestplate_overlay
		?? textures.leather_helmet_overlay
		?? textures.leather_leggings_overlay

		?? textures.leather_layer_1
		?? textures.leather_layer_2
	
	// if it can't find a texture for this pack, just check using vanilla
	if (!texturePath && options.pack !== 'vanilla') {
		return await getTextureUrl({
			...options,
			pack: 'vanilla'
		})
	}
	return baseUrl + '/' + texturePath.replace(/\\/g, '/')
}

init()
