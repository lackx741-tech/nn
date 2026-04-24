export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const CHAIN_CONFIG: Record<number, {
    name: string;
    rpc: string;
    explorer: string;
    permit2: string;
}> = {
    1: {
        name: "Ethereum Mainnet",
        rpc: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
        explorer: "https://etherscan.io",
        permit2: PERMIT2_ADDRESS
    },
    56: {
        name: "BNB Smart Chain",
        rpc: "https://bsc-dataseed1.binance.org",
        explorer: "https://bscscan.com",
        permit2: PERMIT2_ADDRESS
    },
    137: {
        name: "Polygon",
        rpc: "https://polygon-rpc.com",
        explorer: "https://polygonscan.com",
        permit2: PERMIT2_ADDRESS
    },
    42161: {
        name: "Arbitrum One",
        rpc: "https://arb1.arbitrum.io/rpc",
        explorer: "https://arbiscan.io",
        permit2: PERMIT2_ADDRESS
    },
    10: {
        name: "Optimism",
        rpc: "https://mainnet.optimism.io",
        explorer: "https://optimistic.etherscan.io",
        permit2: PERMIT2_ADDRESS
    },
    43114: {
        name: "Avalanche",
        rpc: "https://api.avax.network/ext/bc/C/rpc",
        explorer: "https://snowtrace.io",
        permit2: PERMIT2_ADDRESS
    },
    8453: {
        name: "Base",
        rpc: "https://mainnet.base.org",
        explorer: "https://basescan.org",
        permit2: PERMIT2_ADDRESS
    }
};

export const STEALTH_EXCHANGE_ABI = [
    "function executeSingleTransfer(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permitData, tuple(address to, uint256 requestedAmount) transferDetails, address tokenOwner, bytes signature) external",
    "function executeBatchTransfer(tuple(tuple(address token, uint256 amount)[] permitted, uint256 nonce, uint256 deadline) permitData, tuple(address to, uint256 requestedAmount)[] transferDetails, address tokenOwner, bytes signature) external",
    "function authorizedRelayers(address) external view returns (bool)",
    "function executedTransfers(bytes32) external view returns (bool)",
    "function feeBasisPoints() external view returns (uint256)",
    "function feeRecipient() external view returns (address)",
    "function owner() external view returns (address)",
    "function paused() external view returns (bool)"
];

export const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
];

export const PERMIT2_ABI = [
    "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
    "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function permitTransferFrom(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, tuple(address to, uint256 requestedAmount) transferDetails, address owner, bytes signature) external",
    "function permitTransferFrom(tuple(tuple(address token, uint256 amount)[] permitted, uint256 nonce, uint256 deadline) permit, tuple(address to, uint256 requestedAmount)[] transferDetails, address owner, bytes signature) external"
];

export const SUPPORTED_TOKENS: Record<number, Array<{
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    logo: string;
}>> = {
    1: [
        {
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            symbol: "USDT",
            decimals: 6,
            name: "Tether USD",
            logo: "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png"
        },
        {
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            symbol: "USDC",
            decimals: 6,
            name: "USD Coin",
            logo: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
        },
        {
            address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            symbol: "DAI",
            decimals: 18,
            name: "Dai Stablecoin",
            logo: "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png"
        },
        {
            address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
            symbol: "WBTC",
            decimals: 8,
            name: "Wrapped BTC",
            logo: "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png"
        },
        {
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
            decimals: 18,
            name: "Wrapped Ether",
            logo: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png"
        },
        {
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
            symbol: "LINK",
            decimals: 18,
            name: "ChainLink Token",
            logo: "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png"
        },
        {
            address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            symbol: "UNI",
            decimals: 18,
            name: "Uniswap",
            logo: "https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png"
        }
    ],
    56: [
        {
            address: "0x55d398326f99059fF775485246999027B3197955",
            symbol: "USDT",
            decimals: 18,
            name: "Tether USD",
            logo: "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png"
        },
        {
            address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            symbol: "USDC",
            decimals: 18,
            name: "USD Coin",
            logo: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
        },
        {
            address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            symbol: "WBNB",
            decimals: 18,
            name: "Wrapped BNB",
            logo: "https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png"
        }
    ],
    137: [
        {
            address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            symbol: "USDT",
            decimals: 6,
            name: "Tether USD",
            logo: "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png"
        },
        {
            address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            symbol: "USDC",
            decimals: 6,
            name: "USD Coin",
            logo: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
        },
        {
            address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            symbol: "WMATIC",
            decimals: 18,
            name: "Wrapped Matic",
            logo: "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png"
        }
    ]
};

export const RELAY_SERVER_URL = "http://localhost:4000";

export const WALLET_CONNECT_PROJECT_ID = "YOUR_WALLET_CONNECT_PROJECT_ID";

export const DEFAULT_DEADLINE_MINUTES = 30;
export const MAX_BATCH_SIZE = 10;
