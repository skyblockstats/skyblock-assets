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
    pack: 'vanilla' | 'packshq' | 'furfsky';
    id: string;
    nbt: NBT;
}
/** Get the URL for the texture for a SkyBlock item */
export declare function getTextureUrl(options: Options): Promise<string>;
