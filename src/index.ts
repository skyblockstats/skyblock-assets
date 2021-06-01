import { promises as fs } from 'fs'
import * as path from 'path'

export const baseUrl = 'https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main'



export interface NBT {
	ExtraAttributes?: {
		id?: string
		[ key: string ]: string | number | any
	},
	display?: {
		Name?: string
	}
	[ key: string ]: string | number | any
}

interface Matcher {
	type: string
	items: string[]
	damage?: number
	nbt: NBT
}

export interface Options {
	pack: 'ectoplasn' | 'furfsky_reborn' | 'furfsky' | 'packshq' | 'rnbw' | 'vanilla' | string
	id: string
	damage?: number
	nbt: NBT
}

/** Read the contents of a json file */
async function readJsonFile(fileDir: string): Promise<any> {
	const fileContents = await fs.readFile(path.join(__dirname, fileDir), { encoding: 'utf8' })
	return JSON.parse(fileContents)
}

/** Get the matchers for a pack */
async function readPackMatchers(packName: string): Promise<any[]> {
	return await readJsonFile(`../matchers/${packName}.json`)
}

/** Get all the matchers for each pack */
async function readPacksMatchers(): Promise<{ [key: string]: any[] }> {
	const dirFiles = await fs.readdir(path.join(__dirname, '../matchers'))
	const matchers = {}
	for (const fileName of dirFiles) {
		const packName = fileName.slice(0, (fileName.length) - ('.json'.length))
		matchers[packName] = await readPackMatchers(packName)
	}
	return matchers
}

let matchers: { [key: string]: any[] } = {}
export let minecraftIds: { [key: string]: string } = {}

async function init() {
	matchers = await readPacksMatchers()
	minecraftIds = await readJsonFile('../data/minecraft_ids.json')
}

/** Check if all the values from checkerObj are the same in obj */
function objectsPartiallyMatch(obj: NBT, checkerObj: NBT): boolean {
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

async function checkMatches(options: Options, matcher: Matcher): Promise<boolean> {
	// check 'items'
	if (matcher.type === 'armor')
		return false
	if (matcher.items && !matcher.items.includes(options.id))
		return false
	if (options.damage !== undefined && matcher.damage != undefined && options.damage !== matcher.damage)
		return false
	// check nbt
	if (matcher.nbt) {
		if (!objectsPartiallyMatch(options.nbt, matcher.nbt))
			return false
	}
	return true
}

async function getTextures(options: Options): Promise<{ [key: string]: string }> {
	if (Object.keys(matchers).length === 0) {
		// no matchers found, continue in 200ms because it'll probably have the matchers by then
		await new Promise(resolve => setTimeout(resolve, 200))
	}
	if (minecraftIds[options.id.split(':')[0]]) {
		options.damage = parseInt(options.id.split(':')[1])
		options.id = minecraftIds[options.id.split(':')[0]]
	}
	if (options.damage === undefined || isNaN(options.damage))
		options.damage = 0

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

	// couldn't find anything the first time, we'll try again but without damages
	for (const packName in matchers) {
		// only check the matchers if we're checking this pack
		if (options.pack === packName) {
			const packMatchers = matchers[packName]
			for (const packMatcherData of packMatchers) {
				const packMatcher: Matcher = packMatcherData.matcher
				packMatcher.damage = undefined
				const matches = await checkMatches(options, packMatcher)
				if (matches)
					return packMatcherData.textures
			}
		}
	}
}

export async function waitUntilReady() {
	if (Object.keys(minecraftIds).length === 0) {
		// wait for it to init
		while (Object.keys(minecraftIds).length === 0)
			await new Promise(resolve => setTimeout(resolve, 50))
	}
}

/** Get the URL for the texture for a SkyBlock item */
export async function getTextureUrl(options: Options): Promise<string> {
	await waitUntilReady()
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
	if (!texturePath)
		return baseUrl + '/renders/vanilla/error.png'
	else
		return baseUrl + '/' + texturePath.replace(/\\/g, '/')
}

init()

