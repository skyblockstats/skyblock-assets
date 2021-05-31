const skyblockAssets = require('../build/index')
const assert = require('assert')
const path = require('path')
const fs = require('fs')

describe('skyblock-assets', () => {
    describe('#getTextureUrl()', () => {
        it('Checks every vanilla item', async() => {
            await skyblockAssets.waitUntilReady()
            const itemlessBlocks = new Set([
                'air', 'water', 'flowing_water', 'lava', 'flowing_lava', 'piston_head', 'double_stone_slab',
                'fire', 'redstone_wire', 'lit_furnace', 'standing_sign', 'wall_sign', 'lit_redstone_ore',
                'unlit_redstone_torch', 'portal', 'unpowered_repeater', 'powered_repeater', 'pumpkin_stem',
                'melon_stem', 'end_portal', 'lit_redstone_lamp', 'double_wooden_slab', 'cocoa', 'carrots',
                'potatoes', 'unpowered_comparator', 'powered_comparator', 'standing_banner', 'wall_banner',
                'daylight_detector_inverted', 'double_stone_slab2',

                'purpur_double_slab', 'end_gateway', 'frosted_ice', 'beetroots'
            ])
            for (const item of Object.values(skyblockAssets.minecraftIds)) {
                if (itemlessBlocks.has(item.slice('minecraft:'.length))) continue
                const itemTextureUrl = await skyblockAssets.getTextureUrl({
                    id: item,
                    nbt: {},
                    pack: 'vanilla',
                })
                assert.notStrictEqual(itemTextureUrl, skyblockAssets.baseUrl + '/renders/error.png', `Couldn't find texture for ${item}`)
                const itemTexturePath = path.join(__dirname, '..', itemTextureUrl.slice(skyblockAssets.baseUrl.length))
                await fs.promises.access(itemTexturePath, fs.F_OK)
            }
        })

        it('Make sure lit furnace is null', async() => {
            // not like anyone's actually gonna have this, but i want it to be 100% correct
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:lit_furnace',
                nbt: {},
                pack: 'vanilla',
            })
            assert.strictEqual(itemTextureUrl, skyblockAssets.baseUrl + '/renders/error.png')
        })
    })
})
