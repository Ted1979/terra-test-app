import { LCDClient, MnemonicKey, Wallet } from "@terra-money/terra.js";
import { execute } from "./lib";
import { sign } from "./auth";

export const createMinter = async (
    lcd: LCDClient,
    wallet: Wallet,
    factoryAddress: string, 
    tokenAddress: string) => {

    console.log("execute 'create_minter'");

    const msg =     { 
        create_minter: { 
            nft_name: "Test NFT",
            nft_symbol: "TEST",
            owner: wallet.key.accAddress,
            price: { 
                info: { token: { contract_addr: tokenAddress } }, 
                amount: "100000000",
            },
            mint_cap: 100,
        },
    };

    const events = await execute(lcd, wallet, factoryAddress, msg);
    const minterAddress = events.find(ev => ev.minter_address)?.minter_address;
    const nftAddress = events.find(ev => ev.nft_address)?.nft_address;
    
    console.log(`execute done with minter_address: ${minterAddress}, nft_address : ${nftAddress}`);
    return [minterAddress, nftAddress];
}


export const addStage = async(
    lcd: LCDClient,
    wallet: Wallet,
    minterAddress: string, 
) => {
    console.log("execute 'register_stages'");

    const msg =     { 
        register_stages: { 
            stages: [{ 
                name: "Test Mint", 
                start_time: 0,
                end_time: 9999999999,
                limit: 100,
                description: "Basic Test Minting Schedule!",
            }]
        },
    };

    const events = await execute(lcd, wallet, minterAddress, msg);

    console.log(`execute done`);
}


export const reserve = async (
    lcd: LCDClient,
    wallet: Wallet,
    minterContractAddress: string,
    tokenContractAddress: string,
    signKey: MnemonicKey,
) => {
    console.log("execute 'reserve'");

    const owner = wallet.key.accAddress;
    const stage = "Test Mint";
    const stage_limit = 100;
    const contract_addr = minterContractAddress;
    
    const request = {
        owner,
        stage,
        stage_limit,
        contract_addr,
    };


    const sigBuf = sign(signKey, JSON.stringify(request));
    const sig = sigBuf.toString("base64");

    const msg = { 
        reserve: { 
            sig,
            request,
        },
    };

    // 토큰 트랜스퍼에 추가를 한다
    const tokenMsg = {
        send: {
            amount: "100000000",
            contract: minterContractAddress,
            msg: Buffer.from(JSON.stringify(msg), 'utf-8').toString('base64'),
        }
    }

    const events = await execute(lcd, wallet, tokenContractAddress, tokenMsg);
    const reservationId = Number(events.find((ev) => ev.reservation_id)?.reservation_id);
    
    console.log(`execute done with reservation_id ${reservationId }`);
    return reservationId;
}

export const claim = async(
    lcd: LCDClient,
    wallet: Wallet,
    minterContractAddress: string, 
    nftContractAddress: string,
    reservationId: number, 
    signKey: MnemonicKey, ) => {
    
    console.log("execute 'claim'");

    const contract_addr = nftContractAddress;
    const reservation_id = reservationId;
    const mint_metadata = {
        token_id: "test_"+reservationId.toString(),
        owner: wallet.key.accAddress,
        token_uri: null,
        extension: null,
    };

    const request = {
        reservation_id,
        contract_addr,
        mint_metadata,
    };

    // 인증키를 만들기
    const sigBuf = sign(signKey, JSON.stringify(request));
    const sig = sigBuf.toString("base64");


    // 메시지 전송
    const msg = {
        claim: {
            sig, 
            request,
        }
    };

    const events = await execute(lcd, wallet, minterContractAddress, msg);
    console.log(`execute done, 'claim' from reservation ${reservationId}`);
}