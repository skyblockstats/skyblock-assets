import minecraftIds from '../data/minecraft_ids.json'
import matchers from '../matchers.json'

export const baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main'



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

export interface Options {
	pack: 'ectoplasm' | 'furfsky_reborn' | 'furfsky' | 'hypixel+' | 'packshq' | 'rnbw' | 'vanilla' | 'worlds_and_beyond' | string
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
		if (typeof checkerValue === 'string' && checkerValue.startsWith('ipattern:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('ipattern:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern
					.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
					.replace(/\*/g, '.*') + '$',
				'i'
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('pattern:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('pattern:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern
					.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
					.replace(/\*/g, '.*') + '$',
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('iregex:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('iregex:'.length)
			checkerRegex = new RegExp(
				'^' + checkerPattern + '$',
				'i'
			)
		} else if (typeof checkerValue === 'string' && checkerValue.startsWith('regex:')) {
			// creating a bunch of regexps is fine since v8 caches them
			const checkerPattern: string = checkerValue.slice('regex:'.length)
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

function getTextures(options: Options): { [key: string]: string } {
	const splitId = options.id.split(/:(?=[^:]+$)/)
	if (minecraftIds[splitId[0]]) {
		options.damage = parseInt(splitId[1])
		options.id = minecraftIds[splitId[0]]
	} else if (options.damage == null && parseInt(splitId[1])) {
		options.id = splitId[0]
		options.damage = parseInt(splitId[1])
	}
	if (options.damage === undefined || isNaN(options.damage))
		options.damage = 0

	for (const packName in matchers as any) {
		// only check the matchers if we're checking this pack
		if (options.pack === packName) {
			const packMatchers = (matchers as any)[packName]
			for (const packMatcherData of packMatchers) {
				const packMatcher: Matcher = packMatcherData.matcher

				const matches = checkMatches(options, packMatcher)
				if (matches)
					return packMatcherData.textures
			}
		}
	}

	// couldn't find anything the first time, we'll try again but without damages
	for (const packName in matchers as any) {
		// only check the matchers if we're checking this pack
		if (options.pack === packName) {
			const packMatchers = (matchers as any)[packName]
			for (const packMatcherData of packMatchers) {
				const packMatcher: Matcher = packMatcherData.matcher
				packMatcher.d = undefined
				const matches = checkMatches(options, packMatcher)
				if (matches)
					return packMatcherData.textures
			}
		}
	}
}

/** Get the URL for the texture for a SkyBlock item */
export function getTextureUrl(options: Options): string {
	const textures = getTextures(options) ?? {}
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
		return getTextureUrl({
			...options,
			pack: 'vanilla'
		})
	}
	if (!texturePath)
		if (options.noNullTexture)
			return null
		else
			return baseUrl + '/renders/vanilla/error.png'
	else
		return baseUrl + '/' + texturePath.replace(/\\/g, '/')
}


