export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve, _reject ) => setTimeout(() => { resolve(); }, ms));
}
