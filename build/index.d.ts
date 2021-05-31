export declare const baseUrl = "https://raw.githubusercontent.com/skyblockstats/skyblock-assets/main";
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
export interface Options {
    pack: 'ectoplasn' | 'furfsky_reborn' | 'furfsky' | 'packshq' | 'rnbw' | 'vanilla' | string;
    id: string;
    damage?: number;
    nbt: NBT;
}
export declare let minecraftIds: {
    [key: string]: string;
};
export declare function waitUntilReady(): Promise<void>;
/** Get the URL for the texture for a SkyBlock item */
export declare function getTextureUrl(options: Options): Promise<string>;
