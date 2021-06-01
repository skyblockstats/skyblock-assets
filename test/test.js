const skyblockAssets = require('../build/index')
const assert = require('assert')
const path = require('path')
const fs = require('fs')

function assertIsPack(textureUrl, packName) {
    assert.ok(
        textureUrl.startsWith(`${skyblockAssets.baseUrl}/packs/${packName}/`)
        || textureUrl.startsWith(`${skyblockAssets.baseUrl}/renders/${packName}/`)
    )
}

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
                assert.ok(itemTextureUrl, skyblockAssets.baseUrl + '/renders/vanilla/error.png', `${item} doesn't even have an error texture???`)
                assert.notStrictEqual(itemTextureUrl, skyblockAssets.baseUrl + '/renders/vanilla/error.png', `Couldn't find texture for ${item}`)
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
            assert.strictEqual(itemTextureUrl, skyblockAssets.baseUrl + '/renders/vanilla/error.png')
        })

        it('Check SkyBlock menu on PacksHQ', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:nether_star',
                nbt: {
                    ExtraAttributes: {
                        id: 'SKYBLOCK_MENU'
                    },
                    display: {
                        Name: 'SkyBlock Menu (Right Click)'
                    }
                },
                pack: 'packshq',
            })
            assertIsPack(itemTextureUrl, 'packshq')
        })

        it('Check SkyBlock menu on Furfsky Reborn', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:nether_star',
                nbt: {
                    ExtraAttributes: {
                        id: 'SKYBLOCK_MENU'
                    },
                    display: {
                        Name: 'SkyBlock Menu (Right Click)'
                    }
                },
                pack: 'furfsky_reborn',
            })
            assertIsPack(itemTextureUrl, 'furfsky_reborn')
        })

        it('Check AOTD on PacksHQ', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:diamond_sword',
                nbt: {
                    ExtraAttributes: {
                        id: 'ASPECT_OF_THE_DRAGON'
                    },
                    display: {
                        Name: 'Legendary Aspect of the Dragons'
                    }
                },
                pack: 'packshq',
            })

            assertIsPack(itemTextureUrl, 'packshq')
        })

        it('Check minecraft:item:id', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:dye:3',
                pack: 'vanilla',
            })

            assert.strictEqual(itemTextureUrl, `${skyblockAssets.baseUrl}/packs/vanilla/textures/items/dye_powder_black.png`)
        })

        it('Check itemid:id', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: '351:3',
                pack: 'vanilla',
            })

            assert.strictEqual(itemTextureUrl, `${skyblockAssets.baseUrl}/packs/vanilla/textures/items/dye_powder_black.png`)
        })

        it('Check melon slice', async() => {
            const itemTextureUrl = await skyblockAssets.getTextureUrl({
                id: 'minecraft:melon',
                pack: 'vanilla',
            })

            assert.strictEqual(itemTextureUrl, `${skyblockAssets.baseUrl}/packs/vanilla/textures/items/melon.png`)
        })
    })
})
