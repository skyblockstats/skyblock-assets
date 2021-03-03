import { promises as fs } from 'fs'

async function addPack(packname: string) {
	
}

async function main() {
	try {
		await fs.rmdir('./textures')
	} catch {}
	await fs.mkdir('./textures')

	await addPack('vanilla')
}

main()