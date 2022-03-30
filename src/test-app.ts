import {
    MnemonicKey,
} from "@terra-money/terra.js";
import { 
    instantiate, 
    uploadContract, 
    initializeLCDClient, 
    initializeWallet 
} from "./lib";
import { sleep } from "./utils";
import config from "./config";
import { getPublicKey } from "./auth";
import { 
    createMinter,
    addStage,
    reserve,
    claim,
} from "./test-market";


export default async () => {
    const chain = {
        lcd: "https://bombay-lcd.terra.dev",
        chainID: "bombay-12",
    };

    const lcd = await initializeLCDClient(chain);
    const wallet = await initializeWallet(lcd, config.mnemonic);
    const signKey = new MnemonicKey({ mnemonic: config.signMnemonic });


    // wasm 코드를 체인에 업로드한다
    const tokenId = await uploadContract(lcd, wallet, './artifacts/cw20_base.wasm');
    const marketId = await uploadContract(lcd, wallet, './artifacts/market.wasm');
    const factoryCodeId = await uploadContract(lcd, wallet, './artifacts/market_factory.wasm');
    const minterCodeId = await uploadContract(lcd, wallet, './artifacts/market_minter.wasm');
    const nftCodeId = await uploadContract(lcd, wallet, './artifacts/nft.wasm');

    const msg = {
        owner: wallet.key.accAddress,
        nft_code_id: Number(nftCodeId),
        minter_code_id: Number(minterCodeId),
        auth_key: getPublicKey(signKey),
        fee_rate: "0.05",
    };
    const factoryAddress = await instantiate(lcd, wallet, factoryCodeId, msg);
    

    const instMsg = {
        name: 'Lifort Token',
        symbol: 'LIFORT',
        decimals: 9,
        initial_balances: [
            { address: wallet.key.accAddress, amount: '10000000000' },
        ],
        mint: {
            minter: wallet.key.accAddress,
            cap: '1000000000000',
        },
    };
    const tokenAddress = await instantiate(lcd, wallet, tokenId, instMsg);

    const [minterAddress, nftAddress] = await createMinter(lcd, wallet, factoryAddress, tokenAddress);
    if (!(minterAddress && nftAddress)) {
        console.error("address not acquired");
        return;
    }

    await addStage(lcd, wallet, minterAddress);

    const revId = await reserve(lcd, wallet, minterAddress, tokenAddress, signKey);
    await claim(lcd, wallet, minterAddress, nftAddress, revId, signKey);
}