import { ethers } from "ethers";
import { ERC20_ABI, PERMIT2_ADDRESS, SUPPORTED_TOKENS } from "./constants";

export interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    logo: string;
    balance: string;
    balanceRaw: string;
    allowance: string;
    permit2Approved: boolean;
}

export async function fetchTokenBalances(
    provider: ethers.BrowserProvider,
    userAddress: string,
    chainId: number
): Promise<TokenInfo[]> {
    const tokens = SUPPORTED_TOKENS[chainId] || [];
    const results: TokenInfo[] = [];

    for (const token of tokens) {
        try {
            const contract = new ethers.Contract(
                token.address,
                ERC20_ABI,
                provider
            );

            const [balance, allowance] = await Promise.all([
                contract.balanceOf(userAddress),
                contract.allowance(userAddress, PERMIT2_ADDRESS)
            ]);

            const balanceFormatted = ethers.formatUnits(balance, token.decimals);
            const permit2Approved = allowance > 0n;

            results.push({
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                name: token.name,
                logo: token.logo,
                balance: balanceFormatted,
                balanceRaw: balance.toString(),
                allowance: allowance.toString(),
                permit2Approved: permit2Approved
            });
        } catch (error) {
            console.error(`Error fetching ${token.symbol}:`, error);
            results.push({
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                name: token.name,
                logo: token.logo,
                balance: "0",
                balanceRaw: "0",
                allowance: "0",
                permit2Approved: false
            });
        }
    }

    return results.filter(t => parseFloat(t.balance) > 0);
}

export async function approveTokenForPermit2(
    signer: ethers.Signer,
    tokenAddress: string
): Promise<ethers.TransactionResponse> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const maxUint256 = ethers.MaxUint256;
    const tx = await contract.approve(PERMIT2_ADDRESS, maxUint256);
    return tx;
}

export async function checkPermit2Allowance(
    provider: ethers.BrowserProvider,
    tokenAddress: string,
    ownerAddress: string
): Promise<bigint> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance = await contract.allowance(ownerAddress, PERMIT2_ADDRESS);
    return allowance;
}

export function formatTokenAmount(
    amount: string,
    decimals: number
): string {
    const num = parseFloat(amount);
    if (num === 0) return "0";
    if (num < 0.0001) return "<0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + "K";
    return (num / 1000000).toFixed(2) + "M";
}

export async function fetchCustomToken(
    provider: ethers.BrowserProvider,
    tokenAddress: string,
    userAddress: string
): Promise<TokenInfo | null> {
    try {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        const [name, symbol, decimals, balance, allowance] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals(),
            contract.balanceOf(userAddress),
            contract.allowance(userAddress, PERMIT2_ADDRESS)
        ]);

        return {
            address: tokenAddress,
            symbol: symbol,
            decimals: Number(decimals),
            name: name,
            logo: "",
            balance: ethers.formatUnits(balance, Number(decimals)),
            balanceRaw: balance.toString(),
            allowance: allowance.toString(),
            permit2Approved: allowance > 0n
        };
    } catch (error) {
        console.error("Error fetching custom token:", error);
        return null;
    }
}
