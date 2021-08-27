export const ARTVOTE_CONTRACT_ADDRESS = '0x21949551655Ac8D4e166D05D4bf971495988824F';
export const CKETH_ADDRESS = '0x57E5b107Acf6E78eD7e4d4b83FF76C041d3307b7';
export const SUDT_ADDRESS = '0x1900D8ecFC133DE9197d9C2305B22f56c6559bDc';

export const formatNumber = (number: string, ndecimals: number) => {
    if (number.length > ndecimals) {
        return `${number.substring(0, number.length - ndecimals)}.${number
            .substring(number.length - ndecimals)
            .replace(/0+/, '')}`;
    }
    const nzeros = ndecimals - number.length;
    const newnumber = `0.${String('0').repeat(nzeros)}${number.replace(/0+/, '')}`;
    return newnumber;
};
