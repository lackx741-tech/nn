import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

export interface WalletState {
    connected: boolean;
    address: string;
    chainId: number;
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    balance: string;
}

const initialState: WalletState = {
    connected: false,
    address: "",
    chainId: 0,
    provider: null,
    signer: null,
    balance: "0"
};

export async function connectMetaMask(): Promise<WalletState> {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
        throw new Error("No accounts found");
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const balance = ethers.formatEther(await provider.getBalance(address));

    return {
        connected: true,
        address: address,
        chainId: chainId,
        provider: provider,
        signer: signer,
        balance: balance
    };
}

export async function connectWalletConnect(): Promise<WalletState> {
    try {
        const { default: WalletConnectProvider } = await import(
            "@walletconnect/web3-provider"
        );

        const wcProvider = new WalletConnectProvider({
            rpc: {
                1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
                56: "https://bsc-dataseed1.binance.org",
                137: "https://polygon-rpc.com",
                42161: "https://arb1.arbitrum.io/rpc",
                10: "https://mainnet.optimism.io"
            }
        });

        await wcProvider.enable();

        const provider = new ethers.BrowserProvider(wcProvider);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const balance = ethers.formatEther(await provider.getBalance(address));

        return {
            connected: true,
            address: address,
            chainId: chainId,
            provider: provider,
            signer: signer,
            balance: balance
        };
    } catch (error) {
        console.error("WalletConnect error:", error);
        throw new Error("WalletConnect connection failed");
    }
}

export async function switchChain(
    provider: ethers.BrowserProvider,
    chainId: number
): Promise<void> {
    const hexChainId = "0x" + chainId.toString(16);

    try {
        await provider.send("wallet_switchEthereumChain", [
            { chainId: hexChainId }
        ]);
    } catch (switchError: any) {
        if (switchError.code === 4902) {
            const chainConfigs: Record<number, any> = {
                56: {
                    chainId: hexChainId,
                    chainName: "BNB Smart Chain",
                    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                    rpcUrls: ["https://bsc-dataseed1.binance.org"],
                    blockExplorerUrls: ["https://bscscan.com"]
                },
                137: {
                    chainId: hexChainId,
                    chainName: "Polygon",
                    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                    rpcUrls: ["https://polygon-rpc.com"],
                    blockExplorerUrls: ["https://polygonscan.com"]
                },
                42161: {
                    chainId: hexChainId,
                    chainName: "Arbitrum One",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
                    blockExplorerUrls: ["https://arbiscan.io"]
                },
                10: {
                    chainId: hexChainId,
                    chainName: "Optimism",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://mainnet.optimism.io"],
                    blockExplorerUrls: ["https://optimistic.etherscan.io"]
                },
                43114: {
                    chainId: hexChainId,
                    chainName: "Avalanche C-Chain",
                    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
                    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
                    blockExplorerUrls: ["https://snowtrace.io"]
                },
                8453: {
                    chainId: hexChainId,
                    chainName: "Base",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://mainnet.base.org"],
                    blockExplorerUrls: ["https://basescan.org"]
                }
            };

            if (chainConfigs[chainId]) {
                await provider.send("wallet_addEthereumChain", [
                    chainConfigs[chainId]
                ]);
            } else {
                throw new Error("Chain not supported");
            }
        } else {
            throw switchError;
        }
    }
}

export function listenForAccountChanges(
    callback: (accounts: string[]) => void
): void {
    if (window.ethereum) {
        window.ethereum.on("accountsChanged", callback);
    }
}

export function listenForChainChanges(
    callback: (chainId: string) => void
): void {
    if (window.ethereum) {
        window.ethereum.on("chainChanged", callback);
    }
}

export function listenForDisconnect(callback: () => void): void {
    if (window.ethereum) {
        window.ethereum.on("disconnect", callback);
    }
}

export function removeAllListeners(): void {
    if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
        window.ethereum.removeAllListeners("disconnect");
    }
}

export function shortenAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getInitialState(): WalletState {
    return { ...initialState };
}
