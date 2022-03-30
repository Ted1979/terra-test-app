import { RawKey } from "@terra-money/terra.js";

export function sign(key: RawKey, document: string): Buffer;
export function sign(key: RawKey, document: Buffer): Buffer;
export function sign(key: RawKey, document: string | Buffer): Buffer {

    let payload = typeof(document) === "string" ? Buffer.from(document) : document;
    const { signature } = key.ecdsaSign(payload);
    return Buffer.from(signature);
}

export const getPublicKey = (key: RawKey ): String =>  {
    if (!key.publicKey) {
        throw new Error("public key is not exists");
    }

    const data = key.publicKey.toData();
    if (data["@type"] !== '/cosmos.crypto.secp256k1.PubKey') {
        throw new Error("key is not secp256k1 key type");
    }
    
    return data.key;
}