import minecraftIds from '../data/minecraft_ids.json';
export { minecraftIds };
export declare const baseUrl = "https://raw.githubusercontent.com/skyblockstats/skyblock-assets/2.0.3";
export interface NBT {
    ExtraAttributes?: {
        id?: string;
        [key: string]: string | number | any;
    };
    display?: {
        Name?: string;
    };
    [key: string]: string | number | any;
}
interface Matcher {
    /** Type */
    t?: string;
    /** Items */
    i?: string[];
    /** Damage */
    d?: number;
    /** NBT */
    n?: NBT;
}
interface MatcherTextures {
    /** Matcher */
    m: Matcher;
    /** Texture */
    t: string;
}
declare type MatcherFile = {
    dir: string;
    matchers: MatcherTextures[];
};
export interface Options {
    packs: MatcherFile[];
    id: string;
    damage?: number;
    nbt: NBT;
    noNullTexture?: boolean;
}
/** Get the directory for the texture for a SkyBlock item */
export declare function getTextureDir(options: Options): string;
/** Get the URL for the texture for a SkyBlock item */
export declare function getTextureUrl(options: Options): string;
