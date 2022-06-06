# SkyBlock assets

TypeScript library for getting urls (hosted on GitHub) to Hypixel SkyBlock item images from several resource packs.

To generate and optimize the texture packs, run `npm run generate`. This requires [Oxipng](https://github.com/shssoichiro/oxipng) to be installed. Optimization will take a few minutes.

## Usage

First, import the packs that you want to use.
```ts
import vanilla from 'skyblock-assets/matchers/vanilla.json'
import packshq from 'skyblock-assets/matchers/packshq.json'
```
The reason you have to import the packs yourself is so the library uses less memory if you're not using every pack.

Then, you can use the `getTextureUrl` function to get the url of an item.
```ts
const itemTextureUrl = skyblockAssets.getTextureUrl({
	id: 'minecraft:nether_star',
	nbt: {
		ExtraAttributes: {
			id: 'SKYBLOCK_MENU'
		},
		display: {
			Name: 'SkyBlock Menu (Right Click)'
		}
	},
	packs: [ packshq, vanilla ],
})
```
The order in which you provide packs is the order in which they will be searched, so always put vanilla last.


## Pack versions

[Ectoplasm](https://hypixel.net/threads/2239953) - Completionist's Update\
[Furfsky Reborn](https://furfsky.net) - v1.5.1\
[Furfsky](https://hypixel.net/threads/2138599) - v1.7.1\
[PacksHQ](https://packshq.com) - v13\
[RNBW](https://hypixel.net/threads/3470904) - v0.7.0\
[Hypixel+](https://hypixel.net/threads/4174260) - v0.13.0\
[Worlds and Beyond](https://hypixel.net/threads/3597207) - v1.5

