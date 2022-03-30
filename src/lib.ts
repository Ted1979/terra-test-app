import * as fs from "fs";
import { 
    LCDClient, 
    MnemonicKey, 
    Wallet, 
    MsgExecuteContract,
    MsgStoreCode,
    isTxError,
    getContractEvents,
    getCodeId,
    MsgInstantiateContract,
    getContractAddress,
} from "@terra-money/terra.js";
import { sleep } from "./utils";

interface ChainInfo {
    lcd: string;
    chainID: string;
}

export async function initializeLCDClient(chain: ChainInfo) {
    // 서버로부터 데이터를 받아온다
    const terra = new LCDClient({URL: chain.lcd, chainID: chain.chainID });
    return terra;
}

export async function initializeWallet(lcd: LCDClient, mnemonic: string) {
    const mk = new MnemonicKey({ mnemonic });
    const wallet = lcd.wallet(mk);
    return wallet;
}

async function confirmTx(lcd: LCDClient, txHash: string) {
    while(true) {
        try {
            const txInfo = await lcd.tx.txInfo(txHash);
            if (txInfo) {
                return txInfo;
            }
        } catch(_err: any) {
        }
        
        await sleep(1000);
    }
}


export async function execute<T extends object>(
    lcd: LCDClient,
    wallet: Wallet, 
    contractAddress: string, 
    message: T, 
    logging?: boolean) {
    
    const execute = new MsgExecuteContract(
        wallet.key.accAddress,
        contractAddress,
        message,
    );
    
    const executeTx = await wallet.createAndSignTx({
        msgs: [execute],
    });

    const executeTxResult = await lcd.tx.broadcastSync(executeTx);
    if (isTxError(executeTxResult)) {
        throw new Error(
            `execute transfer failed. code: ${executeTxResult.code}, codespace: ${executeTxResult.codespace}, raw_log: ${executeTxResult.raw_log}`
        );
    }

    const txInfo = await confirmTx(lcd, executeTxResult.txhash);
    const events = getContractEvents(txInfo);
    if (logging) {
        console.log(events);
    }

    await sleep(2000);
    return events;
}


export async function uploadContract(lcd: LCDClient, wallet: Wallet, filePath: string, logging?: boolean) {
    console.log(`uploading code : ${filePath}`);

    const storeCode = new MsgStoreCode(
        wallet.key.accAddress,
        fs.readFileSync(filePath).toString('base64')
    );

    const storeCodeTx = await wallet.createAndSignTx({
        msgs: [storeCode]
    });
    const storeCodeTxResult = await lcd.tx.broadcastSync(storeCodeTx);
    if (isTxError(storeCodeTxResult)) {
        throw new Error(
            `store code failed. code: ${storeCodeTxResult.code}, codespace: ${storeCodeTxResult.codespace}, raw_log: ${storeCodeTxResult.raw_log}`
        );
    }

    const txInfo = await confirmTx(lcd, storeCodeTxResult.txhash);

    if (logging) {
        const events = getContractEvents(txInfo);
        console.log(events);
    }

    const codeId = getCodeId(txInfo);
    console.log(`uploading complete, codeId is ${codeId}`);
    await sleep(2000);
    return codeId;
}


export async function instantiate<T extends object>(lcd: LCDClient, wallet: Wallet, codeId: string, message: T, logging?: boolean) {
    console.log(`instantiating code : ${codeId}`);

    const instantiate = new MsgInstantiateContract(
        wallet.key.accAddress,
        undefined,
        +codeId,
        message,
        { uluna: 10000000 },
    );

    const instantiateTx = await wallet.createAndSignTx({
        msgs: [instantiate],
    });
    const instantiateTxResult = await lcd.tx.broadcastSync(instantiateTx);
    if (isTxError(instantiateTxResult)) {
        throw new Error(
            `instantiate failed. code: ${instantiateTxResult.code}, codespace: ${instantiateTxResult.codespace}, raw_log: ${instantiateTxResult.raw_log}`
        );
    }
    const txInfo = await confirmTx(lcd, instantiateTxResult.txhash);

    if (logging) {
        const events = getContractEvents(txInfo);
        console.log(events);
    }

    const contractAddress = getContractAddress(txInfo);
    console.log(`instantiating complete, contract address is ${contractAddress}`);
    await sleep(2000);
    return contractAddress;
}
