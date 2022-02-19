import minecraftIds from './data/minecraft_ids.json'
export { minecraftIds }

export const baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/2.0.0'

export interface NBT {
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

interface MatcherTextures {
	/** Matcher */
	m: Matcher
	/** Textures */
	t: { [key: string]: string }
}

type MatcherFile = { dir: string, matchers: MatcherTextures[] }

export interface Options {
	packs: MatcherFile[]
	id: string
	damage?: number
	nbt: NBT
	noNullTexture?: boolean
}

/** Check if all the values from checkerObj are the same in obj */
function objectsPartiallyMatch(obj: NBT, checkerObj: NBT): boolean {
	for (const [attribute, checkerValue] of Object.entries(checkerObj)) {
		if (checkerValue === obj[attribute]) continue

		if (typeof checkerValue === 'object' && typeof obj[attribute] === 'object') {
			return objectsPartiallyMatch(obj[attribute], checkerValue)
		}

		let checkerRegex: RegExp
		// creating a bunch of regexps is fine since v8 caches them
		if (typeof checkerValue === 'string' && checkerValue.startsWith('ipattern:')) {
			const checkerPattern = checkerValue.slice('ipattern:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern
					.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
					.replace(/\*/g, '.*') + '$',
				'i'
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('pattern:')) {
			const checkerPattern = checkerValue.slice('pattern:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern
					.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
					.replace(/\*/g, '.*') + '$',
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('iregex:')) {
			const checkerPattern = checkerValue.slice('iregex:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern + '$',
				'i'
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('regex:')) {
			const checkerPattern = checkerValue.slice('regex:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern + '$',
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

function checkMatches(options: Options, matcher: Matcher): boolean {
	// check 'items'
	if (matcher.t === 'armor')
		return false
	if (matcher.i && !matcher.i.includes(options.id))
		return false
	if (options.damage !== undefined && matcher.d != undefined && options.damage !== matcher.d)
		return false
	// check nbt
	if (matcher.n) {
		if (!objectsPartiallyMatch(options.nbt, matcher.n))
			return false
	}
	return true
}

function getTextures(options: Options): { dir: string, textures: { [key: string]: string } } {
	const splitId = options.id.split(/:(?=[^:]+$)/)

	let damage: null | number = options.damage
	let id: string = options.id

	if (minecraftIds[splitId[0]]) {
		damage = parseInt(splitId[1])
		id = minecraftIds[splitId[0]]
	} else if (options.damage == null && parseInt(splitId[1])) {
		id = splitId[0]
		damage = parseInt(splitId[1])
	}
	if (damage === undefined || isNaN(damage))
		damage = 0
	
	if (id.startsWith('minecraft:'))
		id = id.slice('minecraft:'.length)
	
	// we do this so we don't modify the user's options object that they passed
	const updatedOptions: Options = {
		damage,
		id,
		nbt: options.nbt,
		packs: options.packs,
		noNullTexture: options.noNullTexture
	}

	for (const pack of updatedOptions.packs) {
		for (const packMatcherData of pack.matchers) {
			const packMatcher: Matcher = packMatcherData.m

			const matches = checkMatches(updatedOptions, packMatcher)
			if (matches)
				return { textures: packMatcherData.t, dir: pack.dir }
		}
	}

	for (const pack of updatedOptions.packs) {
		for (const packMatcherData of pack.matchers) {
			const packMatcher: Matcher = {
				...packMatcherData.m,
				d: undefined,
			}
			const matches = checkMatches(updatedOptions, packMatcher)
			if (matches)
				return { textures: packMatcherData.t, dir: pack.dir }
		}
	}
}

/** Get the directory for the texture for a SkyBlock item */
export function getTextureDir(options: Options): string {
	const { dir, textures } = getTextures(options) ?? { dir: '', textures: {} }
	const shortTextureDir: string = textures.texture
		?? textures.layer0

		?? textures.fishing_rod
		?? textures.leather_boots_overlay
		?? textures.leather_chestplate_overlay
		?? textures.leather_helmet_overlay
		?? textures.leather_leggings_overlay

		?? textures.leather_layer_1
		?? textures.leather_layer_2
	
	if (!shortTextureDir)
		if (options.noNullTexture)
			return null
		else
			return 'renders/vanilla/error.png'
	else {
		const textureDir = `${dir}/${shortTextureDir}.png`
		return textureDir.replace(/\\/g, '/')
	}
}

/** Get the URL for the texture for a SkyBlock item */
export function getTextureUrl(options: Options): string {
	const textureDir = getTextureDir(options)
	if (!textureDir)
		return null
	else
		return baseUrl + '/' + textureDir
}


