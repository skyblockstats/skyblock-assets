const skyblockAssets = require('../build/index')
const assert = require('assert')

describe('skyblock-assets', () => {
    describe('#getTextureUrl()', () => {
        it('Checks every vanilla item', async() => {
            await skyblockAssets.waitUntilReady()
            const texturelessItems = new Set([ 'minecraft:air' ])
            for (const item of Object.values(skyblockAssets.minecraftIds)) {
                if (texturelessItems.has(item)) continue
                const itemTextureUrl = await skyblockAssets.getTextureUrl({
                    id: item,
                    nbt: {},
                    pack: 'vanilla',
                })
                console.log(item, itemTextureUrl)
                assert.ok(itemTextureUrl, `Couldn't find texture for ${item}`)
            }
        })
    })
})
