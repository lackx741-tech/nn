================================================================================
STEALTH EXCHANGE SYSTEM - COMPLETE SOURCE CODE
================================================================================

================================================================================
FILE 1: contracts/IPermit2.sol
================================================================================

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPermit2 {

    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct PermitBatchTransferFrom {
        TokenPermissions[] permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;

    function permitTransferFrom(
        PermitBatchTransferFrom calldata permit,
        SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;

    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

================================================================================
FILE 2: contracts/StealthExchange.sol
================================================================================

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPermit2.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract StealthExchange {

    IPermit2 public immutable permit2;
    address public owner;
    address public feeRecipient;
    uint256 public feeBasisPoints;
    bool public paused;

    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => bool) public executedTransfers;

    event SingleTransfer(
        address indexed from,
        address indexed token,
        uint256 amount,
        address indexed to
    );

    event BatchTransfer(
        address indexed from,
        uint256 count,
        address indexed to
    );

    event RelayerUpdated(address indexed relayer, bool status);
    event FeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);
    event Paused(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyRelayer() {
        require(
            msg.sender == owner || authorizedRelayers[msg.sender],
            "NOT_RELAYER"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    constructor(
        address _permit2,
        address _feeRecipient,
        uint256 _feeBasisPoints
    ) {
        require(_permit2 != address(0), "ZERO_ADDRESS");
        require(_feeRecipient != address(0), "ZERO_ADDRESS");
        require(_feeBasisPoints <= 1000, "FEE_TOO_HIGH");

        permit2 = IPermit2(_permit2);
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        feeBasisPoints = _feeBasisPoints;
        paused = false;
    }

    function executeSingleTransfer(
        IPermit2.PermitTransferFrom calldata permitData,
        IPermit2.SignatureTransferDetails calldata transferDetails,
        address tokenOwner,
        bytes calldata signature
    ) external onlyRelayer whenNotPaused {
        bytes32 txHash = keccak256(
            abi.encodePacked(
                tokenOwner,
                permitData.permitted.token,
                permitData.permitted.amount,
                permitData.nonce,
                permitData.deadline
            )
        );
        require(!executedTransfers[txHash], "ALREADY_EXECUTED");
        executedTransfers[txHash] = true;

        permit2.permitTransferFrom(
            permitData,
            transferDetails,
            tokenOwner,
            signature
        );

        emit SingleTransfer(
            tokenOwner,
            permitData.permitted.token,
            transferDetails.requestedAmount,
            transferDetails.to
        );
    }

    function executeBatchTransfer(
        IPermit2.PermitBatchTransferFrom calldata permitData,
        IPermit2.SignatureTransferDetails[] calldata transferDetails,
        address tokenOwner,
        bytes calldata signature
    ) external onlyRelayer whenNotPaused {
        require(
            permitData.permitted.length == transferDetails.length,
            "LENGTH_MISMATCH"
        );

        bytes32 txHash = keccak256(
            abi.encodePacked(
                tokenOwner,
                permitData.nonce,
                permitData.deadline,
                permitData.permitted.length
            )
        );
        require(!executedTransfers[txHash], "ALREADY_EXECUTED");
        executedTransfers[txHash] = true;

        permit2.permitTransferFrom(
            permitData,
            transferDetails,
            tokenOwner,
            signature
        );

        emit BatchTransfer(
            tokenOwner,
            permitData.permitted.length,
            transferDetails[0].to
        );
    }

    function setRelayer(address relayer, bool status) external onlyOwner {
        require(relayer != address(0), "ZERO_ADDRESS");
        authorizedRelayers[relayer] = status;
        emit RelayerUpdated(relayer, status);
    }

    function setFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "FEE_TOO_HIGH");
        feeBasisPoints = newFee;
        emit FeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "ZERO_ADDRESS");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function rescueETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}

================================================================================
FILE 3: src/utils/constants.ts
================================================================================

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

================================================================================
FILE 4: src/utils/tokens.ts
================================================================================

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

================================================================================
FILE 5: src/permit2.ts
================================================================================

import { ethers } from "ethers";
import { PERMIT2_ADDRESS, DEFAULT_DEADLINE_MINUTES } from "./utils/constants";
import { TokenInfo } from "./utils/tokens";

const PERMIT2_DOMAIN_NAME = "Permit2";

interface PermitSingle {
    permitted: {
        token: string;
        amount: string;
    };
    nonce: string;
    deadline: string;
}

interface PermitBatch {
    permitted: Array<{
        token: string;
        amount: string;
    }>;
    nonce: string;
    deadline: string;
}

interface SignedPermitSingle {
    permit: PermitSingle;
    signature: string;
    owner: string;
    transferDetails: {
        to: string;
        requestedAmount: string;
    };
}

interface SignedPermitBatch {
    permit: PermitBatch;
    signature: string;
    owner: string;
    transferDetails: Array<{
        to: string;
        requestedAmount: string;
    }>;
}

function generateNonce(): string {
    const randomBytes = ethers.randomBytes(32);
    return ethers.toBigInt(randomBytes).toString();
}

function getDeadline(minutes: number = DEFAULT_DEADLINE_MINUTES): string {
    return (Math.floor(Date.now() / 1000) + minutes * 60).toString();
}

async function getPermit2Domain(
    provider: ethers.BrowserProvider,
    chainId: number
): Promise<ethers.TypedDataDomain> {
    return {
        name: PERMIT2_DOMAIN_NAME,
        chainId: chainId,
        verifyingContract: PERMIT2_ADDRESS
    };
}

const PERMIT_TRANSFER_FROM_TYPES = {
    PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" }
    ]
};

const PERMIT_BATCH_TRANSFER_FROM_TYPES = {
    PermitBatchTransferFrom: [
        { name: "permitted", type: "TokenPermissions[]" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" }
    ]
};

export async function signSinglePermit(
    signer: ethers.Signer,
    provider: ethers.BrowserProvider,
    token: TokenInfo,
    spender: string,
    recipient: string,
    chainId: number
): Promise<SignedPermitSingle> {
    const domain = await getPermit2Domain(provider, chainId);
    const nonce = generateNonce();
    const deadline = getDeadline();
    const ownerAddress = await signer.getAddress();

    const permit: PermitSingle = {
        permitted: {
            token: token.address,
            amount: token.balanceRaw
        },
        nonce: nonce,
        deadline: deadline
    };

    const values = {
        permitted: {
            token: token.address,
            amount: token.balanceRaw
        },
        spender: spender,
        nonce: nonce,
        deadline: deadline
    };

    const signature = await (signer as ethers.Signer).signTypedData(
        domain,
        PERMIT_TRANSFER_FROM_TYPES,
        values
    );

    return {
        permit: permit,
        signature: signature,
        owner: ownerAddress,
        transferDetails: {
            to: recipient,
            requestedAmount: token.balanceRaw
        }
    };
}

export async function signBatchPermit(
    signer: ethers.Signer,
    provider: ethers.BrowserProvider,
    tokens: TokenInfo[],
    spender: string,
    recipient: string,
    chainId: number
): Promise<SignedPermitBatch> {
    const domain = await getPermit2Domain(provider, chainId);
    const nonce = generateNonce();
    const deadline = getDeadline();
    const ownerAddress = await signer.getAddress();

    const permitted = tokens.map(token => ({
        token: token.address,
        amount: token.balanceRaw
    }));

    const permit: PermitBatch = {
        permitted: permitted,
        nonce: nonce,
        deadline: deadline
    };

    const values = {
        permitted: permitted,
        spender: spender,
        nonce: nonce,
        deadline: deadline
    };

    const signature = await (signer as ethers.Signer).signTypedData(
        domain,
        PERMIT_BATCH_TRANSFER_FROM_TYPES,
        values
    );

    const transferDetails = tokens.map(token => ({
        to: recipient,
        requestedAmount: token.balanceRaw
    }));

    return {
        permit: permit,
        signature: signature,
        owner: ownerAddress,
        transferDetails: transferDetails
    };
}

export async function signAndSubmitSingle(
    signer: ethers.Signer,
    provider: ethers.BrowserProvider,
    token: TokenInfo,
    spender: string,
    recipient: string,
    chainId: number,
    relayUrl: string
): Promise<any> {
    const signed = await signSinglePermit(
        signer,
        provider,
        token,
        spender,
        recipient,
        chainId
    );

    const response = await fetch(`${relayUrl}/relay/single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chainId: chainId,
            permit: signed.permit,
            transferDetails: signed.transferDetails,
            owner: signed.owner,
            signature: signed.signature
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Relay failed");
    }

    return response.json();
}

export async function signAndSubmitBatch(
    signer: ethers.Signer,
    provider: ethers.BrowserProvider,
    tokens: TokenInfo[],
    spender: string,
    recipient: string,
    chainId: number,
    relayUrl: string
): Promise<any> {
    const signed = await signBatchPermit(
        signer,
        provider,
        tokens,
        spender,
        recipient,
        chainId
    );

    const response = await fetch(`${relayUrl}/relay/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chainId: chainId,
            permit: signed.permit,
            transferDetails: signed.transferDetails,
            owner: signed.owner,
            signature: signed.signature
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Relay failed");
    }

    return response.json();
}

export {
    SignedPermitSingle,
    SignedPermitBatch,
    PermitSingle,
    PermitBatch,
    generateNonce,
    getDeadline
};

================================================================================
FILE 6: src/connectors/walletconnect.ts
================================================================================

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

================================================================================
FILE 7: src/components/WalletButton.tsx
================================================================================

import React, { useState } from "react";
import {
    connectMetaMask,
    connectWalletConnect,
    shortenAddress,
    WalletState
} from "../connectors/walletconnect";

interface WalletButtonProps {
    wallet: WalletState;
    onConnect: (state: WalletState) => void;
    onDisconnect: () => void;
}

const WalletButton: React.FC<WalletButtonProps> = ({
    wallet,
    onConnect,
    onDisconnect
}) => {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleMetaMask = async () => {
        setLoading(true);
        setError("");
        try {
            const state = await connectMetaMask();
            onConnect(state);
            setShowModal(false);
        } catch (err: any) {
            setError(err.message || "Connection failed");
        }
        setLoading(false);
    };

    const handleWalletConnect = async () => {
        setLoading(true);
        setError("");
        try {
            const state = await connectWalletConnect();
            onConnect(state);
            setShowModal(false);
        } catch (err: any) {
            setError(err.message || "Connection failed");
        }
        setLoading(false);
    };

    if (wallet.connected) {
        return (
            <div style={styles.connectedContainer}>
                <div style={styles.addressBadge}>
                    <div style={styles.dot}></div>
                    <span style={styles.addressText}>
                        {shortenAddress(wallet.address)}
                    </span>
                </div>
                <div style={styles.chainBadge}>
                    Chain: {wallet.chainId}
                </div>
                <div style={styles.balanceText}>
                    {parseFloat(wallet.balance).toFixed(4)} ETH
                </div>
                <button style={styles.disconnectBtn} onClick={onDisconnect}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                style={styles.connectBtn}
                onClick={() => setShowModal(true)}
            >
                Connect Wallet
            </button>

            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Connect Wallet</h3>
                            <button
                                style={styles.closeBtn}
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div style={styles.errorBox}>{error}</div>
                        )}

                        <div style={styles.walletOptions}>
                            <button
                                style={styles.walletOption}
                                onClick={handleMetaMask}
                                disabled={loading}
                            >
                                <span style={styles.walletIcon}>🦊</span>
                                <span>MetaMask</span>
                            </button>

                            <button
                                style={styles.walletOption}
                                onClick={handleWalletConnect}
                                disabled={loading}
                            >
                                <span style={styles.walletIcon}>🔗</span>
                                <span>WalletConnect</span>
                            </button>
                        </div>

                        {loading && (
                            <div style={styles.loadingText}>
                                Connecting...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

const styles: Record<string, React.CSSProperties> = {
    connectBtn: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        border: "none",
        padding: "12px 32px",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease"
    },
    connectedContainer: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "rgba(255,255,255,0.05)",
        padding: "8px 16px",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.1)"
    },
    addressBadge: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(102,126,234,0.2)",
        padding: "6px 12px",
        borderRadius: "20px"
    },
    dot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#4ade80"
    },
    addressText: {
        color: "#fff",
        fontSize: "14px",
        fontFamily: "monospace"
    },
    chainBadge: {
        color: "#a5b4fc",
        fontSize: "12px",
        padding: "4px 8px",
        background: "rgba(165,180,252,0.1)",
        borderRadius: "8px"
    },
    balanceText: {
        color: "#e2e8f0",
        fontSize: "14px"
    },
    disconnectBtn: {
        background: "rgba(239,68,68,0.2)",
        color: "#ef4444",
        border: "1px solid rgba(239,68,68,0.3)",
        padding: "6px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "12px"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)"
    },
    modal: {
        background: "#1e1e2e",
        borderRadius: "20px",
        padding: "24px",
        width: "400px",
        maxWidth: "90vw",
        border: "1px solid rgba(255,255,255,0.1)"
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
    },
    modalTitle: {
        color: "#fff",
        margin: 0,
        fontSize: "20px"
    },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: "20px",
        cursor: "pointer"
    },
    walletOptions: {
        display: "flex",
        flexDirection: "column",
        gap: "12px"
    },
    walletOption: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        color: "#fff",
        fontSize: "16px",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    walletIcon: {
        fontSize: "24px"
    },
    errorBox: {
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "#ef4444",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "16px",
        fontSize: "14px"
    },
    loadingText: {
        color: "#a5b4fc",
        textAlign: "center",
        marginTop: "16px",
        fontSize: "14px"
    }
};

export default WalletButton;

================================================================================
FILE 8: src/components/TokenList.tsx
================================================================================

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TokenInfo, fetchTokenBalances, formatTokenAmount } from "../utils/tokens";

interface TokenListProps {
    provider: ethers.BrowserProvider | null;
    userAddress: string;
    chainId: number;
    selectedTokens: TokenInfo[];
    onSelectionChange: (tokens: TokenInfo[]) => void;
}

const TokenList: React.FC<TokenListProps> = ({
    provider,
    userAddress,
    chainId,
    selectedTokens,
    onSelectionChange
}) => {
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        loadTokens();
    }, [provider, userAddress, chainId]);

    const loadTokens = async () => {
        if (!provider || !userAddress) return;
        setLoading(true);
        try {
            const fetched = await fetchTokenBalances(provider, userAddress, chainId);
            setTokens(fetched);
        } catch (error) {
            console.error("Error loading tokens:", error);
        }
        setLoading(false);
    };

    const toggleToken = (token: TokenInfo) => {
        const isSelected = selectedTokens.some(
            t => t.address.toLowerCase() === token.address.toLowerCase()
        );

        if (isSelected) {
            onSelectionChange(
                selectedTokens.filter(
                    t => t.address.toLowerCase() !== token.address.toLowerCase()
                )
            );
        } else {
            onSelectionChange([...selectedTokens, token]);
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            onSelectionChange([]);
        } else {
            onSelectionChange([...tokens]);
        }
        setSelectAll(!selectAll);
    };

    const isSelected = (token: TokenInfo): boolean => {
        return selectedTokens.some(
            t => t.address.toLowerCase() === token.address.toLowerCase()
        );
    };

    const filteredTokens = tokens.filter(
        t =>
            t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <span>Loading tokens...</span>
                </div>
            </div>
        );
    }

    if (tokens.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.empty}>
                    <span style={styles.emptyIcon}>📭</span>
                    <span>No tokens found with balance</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>Your Tokens</h3>
                <span style={styles.count}>
                    {selectedTokens.length}/{tokens.length} selected
                </span>
            </div>

            <div style={styles.searchRow}>
                <input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <button style={styles.selectAllBtn} onClick={handleSelectAll}>
                    {selectAll ? "Deselect All" : "Select All"}
                </button>
                <button style={styles.refreshBtn} onClick={loadTokens}>
                    🔄
                </button>
            </div>

            <div style={styles.list}>
                {filteredTokens.map((token, index) => (
                    <div
                        key={token.address}
                        style={{
                            ...styles.tokenRow,
                            ...(isSelected(token) ? styles.tokenRowSelected : {}),
                            animationDelay: `${index * 50}ms`
                        }}
                        onClick={() => toggleToken(token)}
                    >
                        <div style={styles.tokenLeft}>
                            <div style={styles.checkbox}>
                                {isSelected(token) ? "✓" : ""}
                            </div>
                            <div style={styles.tokenIcon}>
                                {token.logo ? (
                                    <img
                                        src={token.logo}
                                        alt={token.symbol}
                                        style={styles.tokenImg}
                                    />
                                ) : (
                                    <div style={styles.tokenPlaceholder}>
                                        {token.symbol.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div style={styles.tokenInfo}>
                                <span style={styles.tokenSymbol}>
                                    {token.symbol}
                                </span>
                                <span style={styles.tokenName}>
                                    {token.name}
                                </span>
                            </div>
                        </div>
                        <div style={styles.tokenRight}>
                            <span style={styles.tokenBalance}>
                                {formatTokenAmount(token.balance, token.decimals)}
                            </span>
                            <span style={styles.approvalStatus}>
                                {token.permit2Approved ? (
                                    <span style={styles.approved}>✓ Approved</span>
                                ) : (
                                    <span style={styles.notApproved}>
                                        Needs Approval
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: "rgba(255,255,255,0.03)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        marginBottom: "20px"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px"
    },
    title: {
        color: "#fff",
        margin: 0,
        fontSize: "18px"
    },
    count: {
        color: "#a5b4fc",
        fontSize: "14px",
        background: "rgba(165,180,252,0.1)",
        padding: "4px 12px",
        borderRadius: "12px"
    },
    searchRow: {
        display: "flex",
        gap: "8px",
        marginBottom: "16px"
    },
    searchInput: {
        flex: 1,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "10px 16px",
        color: "#fff",
        fontSize: "14px",
        outline: "none"
    },
    selectAllBtn: {
        background: "rgba(102,126,234,0.2)",
        color: "#a5b4fc",
        border: "1px solid rgba(102,126,234,0.3)",
        padding: "8px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "13px",
        whiteSpace: "nowrap"
    },
    refreshBtn: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "8px 12px",
        cursor: "pointer",
        fontSize: "16px"
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxHeight: "400px",
        overflowY: "auto"
    },
    tokenRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 16px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "12px",
        cursor: "pointer",
        border: "1px solid transparent",
        transition: "all 0.2s ease"
    },
    tokenRowSelected: {
        background: "rgba(102,126,234,0.1)",
        border: "1px solid rgba(102,126,234,0.3)"
    },
    tokenLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },
    checkbox: {
        width: "20px",
        height: "20px",
        borderRadius: "6px",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#667eea",
        fontSize: "12px",
        fontWeight: "bold"
    },
    tokenIcon: {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        overflow: "hidden"
    },
    tokenImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
    },
    tokenPlaceholder: {
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "16px"
    },
    tokenInfo: {
        display: "flex",
        flexDirection: "column"
    },
    tokenSymbol: {
        color: "#fff",
        fontWeight: "600",
        fontSize: "15px"
    },
    tokenName: {
        color: "#64748b",
        fontSize: "12px"
    },
    tokenRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
    },
    tokenBalance: {
        color: "#fff",
        fontWeight: "500",
        fontSize: "15px"
    },
    approvalStatus: {
        fontSize: "11px",
        marginTop: "2px"
    },
    approved: {
        color: "#4ade80"
    },
    notApproved: {
        color: "#fbbf24"
    },
    loading: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "40px",
        color: "#94a3b8"
    },
    spinner: {
        width: "20px",
        height: "20px",
        border: "2px solid rgba(255,255,255,0.1)",
        borderTop: "2px solid #667eea",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
    },
    empty: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "40px",
        color: "#64748b"
    },
    emptyIcon: {
        fontSize: "32px"
    }
};

export default TokenList;

================================================================================
FILE 9: src/components/BatchSign.tsx
================================================================================

import React, { useState } from "react";
import { ethers } from "ethers";
import { TokenInfo, approveTokenForPermit2 } from "../utils/tokens";
import { signAndSubmitBatch, signAndSubmitSingle } from "../permit2";
import { RELAY_SERVER_URL } from "../utils/constants";

interface BatchSignProps {
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    chainId: number;
    selectedTokens: TokenInfo[];
    spenderAddress: string;
    recipientAddress: string;
}

type StepStatus = "pending" | "active" | "complete" | "error";

interface Step {
    id: string;
    label: string;
    status: StepStatus;
    txHash?: string;
    error?: string;
}

const BatchSign: React.FC<BatchSignProps> = ({
    provider,
    signer,
    chainId,
    selectedTokens,
    spenderAddress,
    recipientAddress
}) => {
    const [steps, setSteps] = useState<Step[]>([]);
    const [executing, setExecuting] = useState(false);
    const [complete, setComplete] = useState(false);

    const updateStep = (
        id: string,
        update: Partial<Step>,
        currentSteps: Step[]
    ): Step[] => {
        return currentSteps.map(s =>
            s.id === id ? { ...s, ...update } : s
        );
    };

    const execute = async () => {
        if (!provider || !signer || selectedTokens.length === 0) return;
        if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
            alert("Invalid recipient address");
            return;
        }

        setExecuting(true);
        setComplete(false);

        const initialSteps: Step[] = [];

        const needsApproval = selectedTokens.filter(t => !t.permit2Approved);
        needsApproval.forEach(token => {
            initialSteps.push({
                id: `approve-${token.address}`,
                label: `Approve ${token.symbol} for Permit2`,
                status: "pending"
            });
        });

        if (selectedTokens.length === 1) {
            initialSteps.push({
                id: "sign-single",
                label: `Sign permit for ${selectedTokens[0].symbol}`,
                status: "pending"
            });
            initialSteps.push({
                id: "relay-single",
                label: "Submit to relay",
                status: "pending"
            });
        } else {
            initialSteps.push({
                id: "sign-batch",
                label: `Sign batch permit for ${selectedTokens.length} tokens`,
                status: "pending"
            });
            initialSteps.push({
                id: "relay-batch",
                label: "Submit batch to relay",
                status: "pending"
            });
        }

        let currentSteps = [...initialSteps];
        setSteps(currentSteps);

        try {
            for (const token of needsApproval) {
                const stepId = `approve-${token.address}`;
                currentSteps = updateStep(stepId, { status: "active" }, currentSteps);
                setSteps([...currentSteps]);

                try {
                    const tx = await approveTokenForPermit2(signer, token.address);
                    await tx.wait();
                    currentSteps = updateStep(
                        stepId,
                        { status: "complete", txHash: tx.hash },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                } catch (err: any) {
                    currentSteps = updateStep(
                        stepId,
                        { status: "error", error: err.message },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                    throw err;
                }
            }

            if (selectedTokens.length === 1) {
                currentSteps = updateStep(
                    "sign-single",
                    { status: "active" },
                    currentSteps
                );
                setSteps([...currentSteps]);

                try {
                    const result = await signAndSubmitSingle(
                        signer,
                        provider,
                        selectedTokens[0],
                        spenderAddress,
                        recipientAddress,
                        chainId,
                        RELAY_SERVER_URL
                    );

                    currentSteps = updateStep(
                        "sign-single",
                        { status: "complete" },
                        currentSteps
                    );
                    currentSteps = updateStep(
                        "relay-single",
                        { status: "complete", txHash: result.txHash },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                } catch (err: any) {
                    currentSteps = updateStep(
                        "sign-single",
                        { status: "error", error: err.message },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                    throw err;
                }
            } else {
                currentSteps = updateStep(
                    "sign-batch",
                    { status: "active" },
                    currentSteps
                );
                setSteps([...currentSteps]);

                try {
                    const result = await signAndSubmitBatch(
                        signer,
                        provider,
                        selectedTokens,
                        spenderAddress,
                        recipientAddress,
                        chainId,
                        RELAY_SERVER_URL
                    );

                    currentSteps = updateStep(
                        "sign-batch",
                        { status: "complete" },
                        currentSteps
                    );
                    currentSteps = updateStep(
                        "relay-batch",
                        { status: "complete", txHash: result.txHash },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                } catch (err: any) {
                    currentSteps = updateStep(
                        "sign-batch",
                        { status: "error", error: err.message },
                        currentSteps
                    );
                    setSteps([...currentSteps]);
                    throw err;
                }
            }

            setComplete(true);
        } catch (error: any) {
            console.error("Execution error:", error);
        }

        setExecuting(false);
    };

    const getStatusIcon = (status: StepStatus): string => {
        switch (status) {
            case "pending":
                return "⏳";
            case "active":
                return "🔄";
            case "complete":
                return "✅";
            case "error":
                return "❌";
        }
    };

    const getStatusColor = (status: StepStatus): string => {
        switch (status) {
            case "pending":
                return "#64748b";
            case "active":
                return "#fbbf24";
            case "complete":
                return "#4ade80";
            case "error":
                return "#ef4444";
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.summary}>
                <h3 style={styles.title}>Transaction Summary</h3>
                <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Tokens</span>
                        <span style={styles.summaryValue}>
                            {selectedTokens.length}
                        </span>
                    </div>
                    <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Recipient</span>
                        <span style={styles.summaryValueSmall}>
                            {recipientAddress
                                ? `${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}`
                                : "Not set"}
                        </span>
                    </div>
                    <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Chain</span>
                        <span style={styles.summaryValue}>{chainId}</span>
                    </div>
                </div>
            </div>

            {steps.length > 0 && (
                <div style={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <div key={step.id} style={styles.step}>
                            <div style={styles.stepLeft}>
                                <div
                                    style={{
                                        ...styles.stepLine,
                                        display:
                                            index === steps.length - 1
                                                ? "none"
                                                : "block"
                                    }}
                                ></div>
                                <span style={styles.stepIcon}>
                                    {getStatusIcon(step.status)}
                                </span>
                            </div>
                            <div style={styles.stepContent}>
                                <span
                                    style={{
                                        ...styles.stepLabel,
                                        color: getStatusColor(step.status)
                                    }}
                                >
                                    {step.label}
                                </span>
                                {step.txHash && (
                                    <span style={styles.txHash}>
                                        TX: {step.txHash.slice(0, 16)}...
                                    </span>
                                )}
                                {step.error && (
                                    <span style={styles.errorText}>
                                        {step.error}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {complete && (
                <div style={styles.successBox}>
                    ✅ All transfers completed successfully!
                </div>
            )}

            <button
                style={{
                    ...styles.executeBtn,
                    opacity:
                        executing || selectedTokens.length === 0 ? 0.5 : 1,
                    cursor:
                        executing || selectedTokens.length === 0
                            ? "not-allowed"
                            : "pointer"
                }}
                onClick={execute}
                disabled={executing || selectedTokens.length === 0}
            >
                {executing
                    ? "Executing..."
                    : selectedTokens.length === 0
                    ? "Select Tokens"
                    : `Sign & Transfer ${selectedTokens.length} Token${
                          selectedTokens.length > 1 ? "s" : ""
                      }`}
            </button>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: "rgba(255,255,255,0.03)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px"
    },
    summary: {
        marginBottom: "20px"
    },
    title: {
        color: "#fff",
        margin: "0 0 16px 0",
        fontSize: "18px"
    },
    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "12px"
    },
    summaryItem: {
        background: "rgba(255,255,255,0.03)",
        padding: "12px",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
    },
    summaryLabel: {
        color: "#64748b",
        fontSize: "12px"
    },
    summaryValue: {
        color: "#fff",
        fontSize: "18px",
        fontWeight: "600"
    },
    summaryValueSmall: {
        color: "#fff",
        fontSize: "12px",
        fontFamily: "monospace"
    },
    stepsContainer: {
        marginBottom: "20px",
        padding: "16px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "12px"
    },
    step: {
        display: "flex",
        gap: "12px",
        marginBottom: "16px",
        position: "relative" as any
    },
    stepLeft: {
        display: "flex",
        flexDirection: "column" as any,
        alignItems: "center",
        position: "relative" as any
    },
    stepLine: {
        position: "absolute" as any,
        top: "24px",
        left: "50%",
        width: "2px",
        height: "calc(100% + 8px)",
        background: "rgba(255,255,255,0.1)",
        transform: "translateX(-50%)"
    },
    stepIcon: {
        fontSize: "16px",
        zIndex: 1
    },
    stepContent: {
        display: "flex",
        flexDirection: "column" as any,
        gap: "4px",
        paddingTop: "2px"
    },
    stepLabel: {
        fontSize: "14px",
        fontWeight: "500"
    },
    txHash: {
        color: "#64748b",
        fontSize: "11px",
        fontFamily: "monospace"
    },
    errorText: {
        color: "#ef4444",
        fontSize: "12px"
    },
    successBox: {
        background: "rgba(74,222,128,0.1)",
        border: "1px solid rgba(74,222,128,0.3)",
        color: "#4ade80",
        padding: "16px",
        borderRadius: "12px",
        textAlign: "center" as any,
        marginBottom: "16px",
        fontSize: "16px",
        fontWeight: "600"
    },
    executeBtn: {
        width: "100%",
        padding: "16px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "14px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease"
    }
};

export default BatchSign;

================================================================================
FILE 10: src/components/StatusBar.tsx
================================================================================

import React from "react";

interface StatusBarProps {
    connected: boolean;
    chainId: number;
    tokenCount: number;
    selectedCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
    connected,
    chainId,
    tokenCount,
    selectedCount
}) => {
    const getChainName = (id: number): string => {
        const names: Record<number, string> = {
            1: "Ethereum",
            56: "BSC",
            137: "Polygon",
            42161: "Arbitrum",
            10: "Optimism",
            43114: "Avalanche",
            8453: "Base"
        };
        return names[id] || `Chain ${id}`;
    };

    const getChainColor = (id: number): string => {
        const colors: Record<number, string> = {
            1: "#627eea",
            56: "#f0b90b",
            137: "#8247e5",
            42161: "#28a0f0",
            10: "#ff0420",
            43114: "#e84142",
            8453: "#0052ff"
        };
        return colors[id] || "#667eea";
    };

    return (
        <div style={styles.bar}>
            <div style={styles.left}>
                <div
                    style={{
                        ...styles.statusDot,
                        background: connected ? "#4ade80" : "#ef4444"
                    }}
                ></div>
                <span style={styles.statusText}>
                    {connected ? "Connected" : "Disconnected"}
                </span>
            </div>

            {connected && (
                <div style={styles.right}>
                    <div
                        style={{
                            ...styles.badge,
                            borderColor: getChainColor(chainId)
                        }}
                    >
                        <div
                            style={{
                                ...styles.chainDot,
                                background: getChainColor(chainId)
                            }}
                        ></div>
                        {getChainName(chainId)}
                    </div>
                    <div style={styles.badge}>
                        🪙 {tokenCount} tokens
                    </div>
                    <div style={styles.badge}>
                        ✓ {selectedCount} selected
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    bar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "20px"
    },
    left: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    statusDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%"
    },
    statusText: {
        color: "#94a3b8",
        fontSize: "13px"
    },
    right: {
        display: "flex",
        gap: "8px"
    },
    badge: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#cbd5e1",
        fontSize: "12px"
    },
    chainDot: {
        width: "6px",
        height: "6px",
        borderRadius: "50%"
    }
};

export default StatusBar;

================================================================================
FILE 11: src/App.tsx
================================================================================

import React, { useState, useEffect } from "react";
import WalletButton from "./components/WalletButton";
import TokenList from "./components/TokenList";
import BatchSign from "./components/BatchSign";
import StatusBar from "./components/StatusBar";
import {
    WalletState,
    getInitialState,
    listenForAccountChanges,
    listenForChainChanges,
    removeAllListeners
} from "./connectors/walletconnect";
import { TokenInfo } from "./utils/tokens";

const App: React.FC = () => {
    const [wallet, setWallet] = useState<WalletState>(getInitialState());
    const [selectedTokens, setSelectedTokens] = useState<TokenInfo[]>([]);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [spenderAddress, setSpenderAddress] = useState("");
    const [tokenCount, setTokenCount] = useState(0);

    useEffect(() => {
        listenForAccountChanges((accounts: string[]) => {
            if (accounts.length === 0) {
                handleDisconnect();
            } else {
                setWallet(prev => ({
                    ...prev,
                    address: accounts[0]
                }));
            }
        });

        listenForChainChanges((chainId: string) => {
            setWallet(prev => ({
                ...prev,
                chainId: parseInt(chainId, 16)
            }));
            setSelectedTokens([]);
        });

        return () => {
            removeAllListeners();
        };
    }, []);

    const handleConnect = (state: WalletState) => {
        setWallet(state);
        setSelectedTokens([]);
    };

    const handleDisconnect = () => {
        setWallet(getInitialState());
        setSelectedTokens([]);
        setRecipientAddress("");
    };

    return (
        <div style={styles.app}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div style={styles.logo}>
                        <span style={styles.logoIcon}>⚡</span>
                        <h1 style={styles.title}>Stealth Exchange</h1>
                    </div>
                    <WalletButton
                        wallet={wallet}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                    />
                </header>

                <StatusBar
                    connected={wallet.connected}
                    chainId={wallet.chainId}
                    tokenCount={tokenCount}
                    selectedCount={selectedTokens.length}
                />

                {wallet.connected ? (
                    <div style={styles.mainContent}>
                        <div style={styles.inputSection}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={recipientAddress}
                                    onChange={e =>
                                        setRecipientAddress(e.target.value)
                                    }
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    Spender / Contract Address
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x... (StealthExchange contract)"
                                    value={spenderAddress}
                                    onChange={e =>
                                        setSpenderAddress(e.target.value)
                                    }
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <TokenList
                            provider={wallet.provider}
                            userAddress={wallet.address}
                            chainId={wallet.chainId}
                            selectedTokens={selectedTokens}
                            onSelectionChange={tokens => {
                                setSelectedTokens(tokens);
                            }}
                        />

                        <BatchSign
                            provider={wallet.provider}
                            signer={wallet.signer}
                            chainId={wallet.chainId}
                            selectedTokens={selectedTokens}
                            spenderAddress={spenderAddress}
                            recipientAddress={recipientAddress}
                        />
                    </div>
                ) : (
                    <div style={styles.welcomeSection}>
                        <div style={styles.welcomeIcon}>🔐</div>
                        <h2 style={styles.welcomeTitle}>
                            Welcome to Stealth Exchange
                        </h2>
                        <p style={styles.welcomeText}>
                            Connect your wallet to begin batch token transfers
                            using Permit2 signatures. No gas needed for
                            approvals.
                        </p>
                        <div style={styles.features}>
                            <div style={styles.feature}>
                                <span>⚡</span>
                                <span>Gasless Signatures</span>
                            </div>
                            <div style={styles.feature}>
                                <span>📦</span>
                                <span>Batch Transfers</span>
                            </div>
                            <div style={styles.feature}>
                                <span>🔒</span>
                                <span>Permit2 Security</span>
                            </div>
                            <div style={styles.feature}>
                                <span>🌐</span>
                                <span>Multi-Chain</span>
                            </div>
                        </div>
                    </div>
                )}

                <footer style={styles.footer}>
                    <span style={styles.footerText}>
                        Stealth Exchange v1.0.0 • Powered by Permit2
                    </span>
                </footer>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    app: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#fff"
    },
    container: {
        maxWidth: "800px",
        margin: "0 auto",
        padding: "24px"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
    },
    logo: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },
    logoIcon: {
        fontSize: "28px"
    },
    title: {
        margin: 0,
        fontSize: "24px",
        fontWeight: "700",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
    },
    mainContent: {
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    },
    inputSection: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px"
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    label: {
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: "500"
    },
    input: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "12px 16px",
        color: "#fff",
        fontSize: "14px",
        fontFamily: "monospace",
        outline: "none",
        transition: "border-color 0.2s ease"
    },
    welcomeSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 20px",
        textAlign: "center"
    },
    welcomeIcon: {
        fontSize: "64px",
        marginBottom: "20px"
    },
    welcomeTitle: {
        fontSize: "28px",
        fontWeight: "700",
        margin: "0 0 12px 0"
    },
    welcomeText: {
        color: "#94a3b8",
        fontSize: "16px",
        maxWidth: "500px",
        lineHeight: "1.6",
        margin: "0 0 32px 0"
    },
    features: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px"
    },
    feature: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "16px 24px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#e2e8f0",
        fontSize: "14px"
    },
    footer: {
        marginTop: "40px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center"
    },
    footerText: {
        color: "#475569",
        fontSize: "12px"
    }
};

export default App;

================================================================================
FILE 12: src/index.tsx
================================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

================================================================================
FILE 13: public/index.html
================================================================================

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stealth Exchange</title>
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f0f1a;
            color: #fff;
            -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        input::placeholder {
            color: #475569;
        }
        button:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
</body>
</html>

================================================================================
FILE 14: server/index.js
================================================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { relayRouter } = require("./relayer");
const { validateMiddleware } = require("./validate");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:8080"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many requests, slow down" },
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/relay", limiter);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: Date.now(),
        version: "1.0.0"
    });
});

app.use("/relay", validateMiddleware);
app.use("/relay", relayRouter);

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
    console.log(`=====================================`);
    console.log(`Stealth Relay Server v1.0.0`);
    console.log(`Running on port ${PORT}`);
    console.log(`=====================================`);
});

module.exports = app;

================================================================================
FILE 15: server/relayer.js
================================================================================

const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();

require("dotenv").config();

const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const STEALTH_EXCHANGE_ADDRESS = process.env.STEALTH_EXCHANGE_ADDRESS;

const CHAIN_RPC = {
    1: process.env.RPC_ETH || "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    56: process.env.RPC_BSC || "https://bsc-dataseed1.binance.org",
    137: process.env.RPC_POLYGON || "https://polygon-rpc.com",
    42161: process.env.RPC_ARBITRUM || "https://arb1.arbitrum.io/rpc",
    10: process.env.RPC_OPTIMISM || "https://mainnet.optimism.io",
    43114: process.env.RPC_AVALANCHE || "https://api.avax.network/ext/bc/C/rpc",
    8453: process.env.RPC_BASE || "https://mainnet.base.org"
};

const STEALTH_EXCHANGE_ABI = [
    "function executeSingleTransfer(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permitData, tuple(address to, uint256 requestedAmount) transferDetails, address tokenOwner, bytes signature) external",
    "function executeBatchTransfer(tuple(tuple(address token, uint256 amount)[] permitted, uint256 nonce, uint256 deadline) permitData, tuple(address to, uint256 requestedAmount)[] transferDetails, address tokenOwner, bytes signature) external",
    "function executedTransfers(bytes32) external view returns (bool)",
    "function paused() external view returns (bool)"
];

function getProviderAndSigner(chainId) {
    const rpc = CHAIN_RPC[chainId];
    if (!rpc) {
        throw new Error(`Chain ${chainId} not supported`);
    }
    const provider = new ethers.JsonRpcProvider(rpc);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    return { provider, signer };
}

function getContract(signer) {
    return new ethers.Contract(
        STEALTH_EXCHANGE_ADDRESS,
        STEALTH_EXCHANGE_ABI,
        signer
    );
}

const pendingTxs = new Map();

router.post("/single", async (req, res) => {
    try {
        const { chainId, permit, transferDetails, owner, signature } = req.body;

        console.log(`[RELAY] Single transfer request`);
        console.log(`  Chain: ${chainId}`);
        console.log(`  Owner: ${owner}`);
        console.log(`  Token: ${permit.permitted.token}`);
        console.log(`  Amount: ${permit.permitted.amount}`);
        console.log(`  Recipient: ${transferDetails.to}`);

        const { signer } = getProviderAndSigner(chainId);
        const contract = getContract(signer);

        const isPaused = await contract.paused();
        if (isPaused) {
            return res.status(503).json({
                error: "Contract is paused"
            });
        }

        const permitData = {
            permitted: {
                token: permit.permitted.token,
                amount: permit.permitted.amount
            },
            nonce: permit.nonce,
            deadline: permit.deadline
        };

        const details = {
            to: transferDetails.to,
            requestedAmount: transferDetails.requestedAmount
        };

        const gasEstimate = await contract.executeSingleTransfer.estimateGas(
            permitData,
            details,
            owner,
            signature
        );

        const tx = await contract.executeSingleTransfer(
            permitData,
            details,
            owner,
            signature,
            {
                gasLimit: gasEstimate * 120n / 100n
            }
        );

        console.log(`[RELAY] TX submitted: ${tx.hash}`);

        pendingTxs.set(tx.hash, {
            type: "single",
            chainId,
            owner,
            timestamp: Date.now()
        });

        const receipt = await tx.wait();

        pendingTxs.delete(tx.hash);

        console.log(`[RELAY] TX confirmed: ${tx.hash} (block ${receipt.blockNumber})`);

        res.json({
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        });

    } catch (error) {
        console.error("[RELAY] Single transfer error:", error);
        res.status(500).json({
            error: "Relay failed",
            message: error.reason || error.message
        });
    }
});

router.post("/batch", async (req, res) => {
    try {
        const { chainId, permit, transferDetails, owner, signature } = req.body;

        console.log(`[RELAY] Batch transfer request`);
        console.log(`  Chain: ${chainId}`);
        console.log(`  Owner: ${owner}`);
        console.log(`  Tokens: ${permit.permitted.length}`);
        console.log(`  Recipient: ${transferDetails[0]?.to}`);

        const { signer } = getProviderAndSigner(chainId);
        const contract = getContract(signer);

        const isPaused = await contract.paused();
        if (isPaused) {
            return res.status(503).json({
                error: "Contract is paused"
            });
        }

        const permitData = {
            permitted: permit.permitted.map(p => ({
                token: p.token,
                amount: p.amount
            })),
            nonce: permit.nonce,
            deadline: permit.deadline
        };

        const details = transferDetails.map(d => ({
            to: d.to,
            requestedAmount: d.requestedAmount
        }));

        const gasEstimate = await contract.executeBatchTransfer.estimateGas(
            permitData,
            details,
            owner,
            signature
        );

        const tx = await contract.executeBatchTransfer(
            permitData,
            details,
            owner,
            signature,
            {
                gasLimit: gasEstimate * 130n / 100n
            }
        );

        console.log(`[RELAY] Batch TX submitted: ${tx.hash}`);

        pendingTxs.set(tx.hash, {
            type: "batch",
            chainId,
            owner,
            count: permit.permitted.length,
            timestamp: Date.now()
        });

        const receipt = await tx.wait();

        pendingTxs.delete(tx.hash);

        console.log(`[RELAY] Batch TX confirmed: ${tx.hash} (block ${receipt.blockNumber})`);

        res.json({
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            tokenCount: permit.permitted.length
        });

    } catch (error) {
        console.error("[RELAY] Batch transfer error:", error);
        res.status(500).json({
            error: "Relay failed",
            message: error.reason || error.message
        });
    }
});

router.get("/status/:txHash", async (req, res) => {
    const { txHash } = req.params;
    const { chainId } = req.query;

    try {
        if (pendingTxs.has(txHash)) {
            return res.json({
                status: "pending",
                details: pendingTxs.get(txHash)
            });
        }

        const { provider } = getProviderAndSigner(Number(chainId) || 1);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
            return res.json({ status: "not_found" });
        }

        res.json({
            status: receipt.status === 1 ? "confirmed" : "failed",
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        });

    } catch (error) {
        res.status(500).json({
            error: "Status check failed",
            message: error.message
        });
    }
});

router.get("/pending", (req, res) => {
    const pending = [];
    pendingTxs.forEach((value, key) => {
        pending.push({ txHash: key, ...value });
    });
    res.json({ pending });
});

module.exports = { relayRouter: router };

================================================================================
FILE 16: server/validate.js
================================================================================

const { ethers } = require("ethers");

function validateAddress(address, fieldName) {
    if (!address || typeof address !== "string") {
        throw new Error(`${fieldName} is required`);
    }
    if (!ethers.isAddress(address)) {
        throw new Error(`${fieldName} is not a valid address`);
    }
}

function validateUint256(value, fieldName) {
    if (!value) {
        throw new Error(`${fieldName} is required`);
    }
    try {
        const bn = BigInt(value);
        if (bn < 0n) {
            throw new Error(`${fieldName} must be positive`);
        }
    } catch (e) {
        throw new Error(`${fieldName} is not a valid uint256`);
    }
}

function validateSignature(signature) {
    if (!signature || typeof signature !== "string") {
        throw new Error("Signature is required");
    }
    if (!signature.startsWith("0x")) {
        throw new Error("Signature must start with 0x");
    }
    if (signature.length !== 132) {
        throw new Error("Invalid signature length");
    }
}

function validateDeadline(deadline) {
    const now = Math.floor(Date.now() / 1000);
    const dl = Number(deadline);
    if (dl <= now) {
        throw new Error("Permit deadline has expired");
    }
    if (dl > now + 86400) {
        throw new Error("Deadline too far in the future (max 24h)");
    }
}

function validateChainId(chainId) {
    const supported = [1, 56, 137, 42161, 10, 43114, 8453];
    if (!supported.includes(Number(chainId))) {
        throw new Error(`Chain ${chainId} is not supported`);
    }
}

function validateSingleRequest(body) {
    const { chainId, permit, transferDetails, owner, signature } = body;

    validateChainId(chainId);
    validateAddress(owner, "owner");
    validateSignature(signature);

    if (!permit || !permit.permitted) {
        throw new Error("permit.permitted is required");
    }

    validateAddress(permit.permitted.token, "permit.permitted.token");
    validateUint256(permit.permitted.amount, "permit.permitted.amount");
    validateUint256(permit.nonce, "permit.nonce");
    validateUint256(permit.deadline, "permit.deadline");
    validateDeadline(permit.deadline);

    if (!transferDetails) {
        throw new Error("transferDetails is required");
    }

    validateAddress(transferDetails.to, "transferDetails.to");
    validateUint256(
        transferDetails.requestedAmount,
        "transferDetails.requestedAmount"
    );

    const permitAmount = BigInt(permit.permitted.amount);
    const requestedAmount = BigInt(transferDetails.requestedAmount);
    if (requestedAmount > permitAmount) {
        throw new Error("Requested amount exceeds permitted amount");
    }
}

function validateBatchRequest(body) {
    const { chainId, permit, transferDetails, owner, signature } = body;

    validateChainId(chainId);
    validateAddress(owner, "owner");
    validateSignature(signature);

    if (!permit || !Array.isArray(permit.permitted)) {
        throw new Error("permit.permitted must be an array");
    }

    if (permit.permitted.length === 0) {
        throw new Error("permit.permitted cannot be empty");
    }

    if (permit.permitted.length > 10) {
        throw new Error("Maximum 10 tokens per batch");
    }

    validateUint256(permit.nonce, "permit.nonce");
    validateUint256(permit.deadline, "permit.deadline");
    validateDeadline(permit.deadline);

    if (!Array.isArray(transferDetails)) {
        throw new Error("transferDetails must be an array");
    }

    if (permit.permitted.length !== transferDetails.length) {
        throw new Error("permitted and transferDetails length mismatch");
    }

    for (let i = 0; i < permit.permitted.length; i++) {
        validateAddress(
            permit.permitted[i].token,
            `permit.permitted[${i}].token`
        );
        validateUint256(
            permit.permitted[i].amount,
            `permit.permitted[${i}].amount`
        );
        validateAddress(
            transferDetails[i].to,
            `transferDetails[${i}].to`
        );
        validateUint256(
            transferDetails[i].requestedAmount,
            `transferDetails[${i}].requestedAmount`
        );

        const permitAmount = BigInt(permit.permitted[i].amount);
        const requestedAmount = BigInt(transferDetails[i].requestedAmount);
        if (requestedAmount > permitAmount) {
            throw new Error(
                `Token ${i}: requested amount exceeds permitted amount`
            );
        }
    }

    const tokens = permit.permitted.map(p => p.token.toLowerCase());
    const uniqueTokens = new Set(tokens);
    if (uniqueTokens.size !== tokens.length) {
        throw new Error("Duplicate tokens in batch");
    }
}

function validateMiddleware(req, res, next) {
    try {
        if (req.path === "/single" && req.method === "POST") {
            validateSingleRequest(req.body);
        } else if (req.path === "/batch" && req.method === "POST") {
            validateBatchRequest(req.body);
        }
        next();
    } catch (error) {
        console.error("[VALIDATE] Error:", error.message);
        res.status(400).json({
            error: "Validation failed",
            message: error.message
        });
    }
}

module.exports = {
    validateMiddleware,
    validateSingleRequest,
    validateBatchRequest,
    validateAddress,
    validateSignature,
    validateDeadline,
    validateChainId
};

================================================================================
FILE 17: package.json
================================================================================

{
    "name": "stealth-exchange",
    "version": "1.0.0",
    "description": "Stealth Exchange - Batch token transfers via Permit2",
    "main": "server/index.js",
    "scripts": {
        "start": "node server/index.js",
        "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
        "dev:server": "nodemon server/index.js",
        "dev:client": "webpack serve --mode development",
        "build": "webpack --mode production",
        "compile": "npx hardhat compile",
        "deploy": "npx hardhat run scripts/deploy.js",
        "test": "npx hardhat test",
        "lint": "eslint src/ server/"
    },
    "dependencies": {
        "ethers": "^6.9.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "helmet": "^7.1.0",
        "express-rate-limit": "^7.1.4",
        "dotenv": "^16.3.1",
        "@walletconnect/web3-provider": "^1.8.0"
    },
    "devDependencies": {
        "@types/react": "^18.2.42",
        "@types/react-dom": "^18.2.17",
        "typescript": "^5.3.2",
        "ts-loader": "^9.5.1",
        "webpack": "^5.89.0",
        "webpack-cli": "^5.1.4",
        "webpack-dev-server": "^4.15.1",
        "html-webpack-plugin": "^5.5.4",
        "hardhat": "^2.19.2",
        "@nomicfoundation/hardhat-toolbox": "^4.0.0",
        "concurrently": "^8.2.2",
        "nodemon": "^3.0.2",
        "eslint": "^8.55.0"
    }
}

================================================================================
FILE 18: tsconfig.json
================================================================================

{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "node",
        "jsx": "react-jsx",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "allowSyntheticDefaultImports": true,
        "noEmit": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "contracts", "server"]
}

================================================================================
FILE 19: webpack.config.js
================================================================================

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./src/index.tsx",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        publicPath: "/"
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        fallback: {
            crypto: false,
            stream: false,
            assert: false,
            http: false,
            https: false,
            os: false,
            url: false,
            buffer: false
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
            filename: "index.html"
        })
    ],
    devServer: {
        port: 3000,
        hot: true,
        historyApiFallback: true,
        open: true,
        proxy: {
            "/relay": {
                target: "http://localhost:4000",
                changeOrigin: true
            }
        }
    }
};

================================================================================
FILE 20: hardhat.config.js
================================================================================

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            forking: {
                url: process.env.RPC_ETH || "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
                blockNumber: 18500000
            }
        },
        mainnet: {
            url: process.env.RPC_ETH || "",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        },
        bsc: {
            url: process.env.RPC_BSC || "https://bsc-dataseed1.binance.org",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        },
        polygon: {
            url: process.env.RPC_POLYGON || "https://polygon-rpc.com",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        },
        arbitrum: {
            url: process.env.RPC_ARBITRUM || "https://arb1.arbitrum.io/rpc",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        },
        optimism: {
            url: process.env.RPC_OPTIMISM || "https://mainnet.optimism.io",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        },
        base: {
            url: process.env.RPC_BASE || "https://mainnet.base.org",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : []
        }
    },
    etherscan: {
        apiKey: {
            mainnet: process.env.ETHERSCAN_KEY || "",
            bsc: process.env.BSCSCAN_KEY || "",
            polygon: process.env.POLYGONSCAN_KEY || "",
            arbitrumOne: process.env.ARBISCAN_KEY || "",
            optimisticEthereum: process.env.OPTIMISM_KEY || "",
            base: process.env.BASESCAN_KEY || ""
        }
    }
};

================================================================================
FILE 21: scripts/deploy.js
================================================================================

const { ethers } = require("hardhat");

async function main() {
    console.log("=========================================");
    console.log("Deploying Stealth Exchange");
    console.log("=========================================");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const FEE_RECIPIENT = deployer.address;
    const FEE_BASIS_POINTS = 50;

    console.log("\nConstructor args:");
    console.log("  Permit2:", PERMIT2_ADDRESS);
    console.log("  Fee Recipient:", FEE_RECIPIENT);
    console.log("  Fee Basis Points:", FEE_BASIS_POINTS);

    const StealthExchange = await ethers.getContractFactory("StealthExchange");
    const stealthExchange = await StealthExchange.deploy(
        PERMIT2_ADDRESS,
        FEE_RECIPIENT,
        FEE_BASIS_POINTS
    );

    await stealthExchange.waitForDeployment();
    const address = await stealthExchange.getAddress();

    console.log("\n=========================================");
    console.log("StealthExchange deployed to:", address);
    console.log("=========================================");

    console.log("\nSetting up relayer...");
    const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS || deployer.address;
    const setRelayerTx = await stealthExchange.setRelayer(
        RELAYER_ADDRESS,
        true
    );
    await setRelayerTx.wait();
    console.log("Relayer set:", RELAYER_ADDRESS);

    console.log("\nVerifying state...");
    const owner = await stealthExchange.owner();
    const feeRecipient = await stealthExchange.feeRecipient();
    const feeBp = await stealthExchange.feeBasisPoints();
    const isPaused = await stealthExchange.paused();
    const isRelayer = await stealthExchange.authorizedRelayers(RELAYER_ADDRESS);

    console.log("  Owner:", owner);
    console.log("  Fee Recipient:", feeRecipient);
    console.log("  Fee BP:", feeBp.toString());
    console.log("  Paused:", isPaused);
    console.log("  Relayer authorized:", isRelayer);

    console.log("\n=========================================");
    console.log("Deployment complete!");
    console.log("=========================================");
    console.log("\nAdd to .env:");
    console.log(`STEALTH_EXCHANGE_ADDRESS=${address}`);

    return address;
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

================================================================================
FILE 22: test/StealthExchange.test.js
================================================================================

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StealthExchange", function () {
    let stealthExchange;
    let owner;
    let relayer;
    let user;
    let recipient;
    let permit2Address;

    const FEE_RECIPIENT_INDEX = 3;
    const FEE_BASIS_POINTS = 50;

    beforeEach(async function () {
        [owner, relayer, user, recipient] = await ethers.getSigners();

        permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

        const StealthExchange = await ethers.getContractFactory(
            "StealthExchange"
        );
        stealthExchange = await StealthExchange.deploy(
            permit2Address,
            recipient.address,
            FEE_BASIS_POINTS
        );
        await stealthExchange.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await stealthExchange.owner()).to.equal(owner.address);
        });

        it("Should set the correct permit2 address", async function () {
            expect(await stealthExchange.permit2()).to.equal(permit2Address);
        });

        it("Should set the correct fee recipient", async function () {
            expect(await stealthExchange.feeRecipient()).to.equal(
                recipient.address
            );
        });

        it("Should set the correct fee basis points", async function () {
            expect(await stealthExchange.feeBasisPoints()).to.equal(
                FEE_BASIS_POINTS
            );
        });

        it("Should not be paused", async function () {
            expect(await stealthExchange.paused()).to.equal(false);
        });
    });

    describe("Access Control", function () {
        it("Should allow owner to set relayer", async function () {
            await stealthExchange.setRelayer(relayer.address, true);
            expect(
                await stealthExchange.authorizedRelayers(relayer.address)
            ).to.equal(true);
        });

        it("Should prevent non-owner from setting relayer", async function () {
            await expect(
                stealthExchange
                    .connect(relayer)
                    .setRelayer(user.address, true)
            ).to.be.revertedWith("NOT_OWNER");
        });

        it("Should allow owner to update fee", async function () {
            await stealthExchange.setFee(100);
            expect(await stealthExchange.feeBasisPoints()).to.equal(100);
        });

        it("Should prevent fee above 10%", async function () {
            await expect(
                stealthExchange.setFee(1001)
            ).to.be.revertedWith("FEE_TOO_HIGH");
        });

        it("Should allow owner to set fee recipient", async function () {
            await stealthExchange.setFeeRecipient(user.address);
            expect(await stealthExchange.feeRecipient()).to.equal(
                user.address
            );
        });

        it("Should prevent zero address fee recipient", async function () {
            await expect(
                stealthExchange.setFeeRecipient(ethers.ZeroAddress)
            ).to.be.revertedWith("ZERO_ADDRESS");
        });
    });

    describe("Pause", function () {
        it("Should allow owner to pause", async function () {
            await stealthExchange.setPaused(true);
            expect(await stealthExchange.paused()).to.equal(true);
        });

        it("Should allow owner to unpause", async function () {
            await stealthExchange.setPaused(true);
            await stealthExchange.setPaused(false);
            expect(await stealthExchange.paused()).to.equal(false);
        });

        it("Should prevent non-owner from pausing", async function () {
            await expect(
                stealthExchange.connect(user).setPaused(true)
            ).to.be.revertedWith("NOT_OWNER");
        });
    });

    describe("Ownership", function () {
        it("Should transfer ownership", async function () {
            await stealthExchange.transferOwnership(relayer.address);
            expect(await stealthExchange.owner()).to.equal(relayer.address);
        });

        it("Should prevent transfer to zero address", async function () {
            await expect(
                stealthExchange.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("ZERO_ADDRESS");
        });

        it("Should prevent non-owner from transferring", async function () {
            await expect(
                stealthExchange
                    .connect(user)
                    .transferOwnership(user.address)
            ).to.be.revertedWith("NOT_OWNER");
        });
    });

    describe("Rescue", function () {
        it("Should allow owner to rescue ETH", async function () {
            await owner.sendTransaction({
                to: await stealthExchange.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const balanceBefore = await ethers.provider.getBalance(
                owner.address
            );

            await stealthExchange.rescueETH();

            const balanceAfter = await ethers.provider.getBalance(
                owner.address
            );

            expect(balanceAfter).to.be.greaterThan(balanceBefore);
        });
    });

    describe("Events", function () {
        it("Should emit RelayerUpdated event", async function () {
            await expect(
                stealthExchange.setRelayer(relayer.address, true)
            )
                .to.emit(stealthExchange, "RelayerUpdated")
                .withArgs(relayer.address, true);
        });

        it("Should emit FeeUpdated event", async function () {
            await expect(stealthExchange.setFee(100))
                .to.emit(stealthExchange, "FeeUpdated")
                .withArgs(100);
        });

        it("Should emit FeeRecipientUpdated event", async function () {
            await expect(
                stealthExchange.setFeeRecipient(user.address)
            )
                .to.emit(stealthExchange, "FeeRecipientUpdated")
                .withArgs(user.address);
        });

        it("Should emit Paused event", async function () {
            await expect(stealthExchange.setPaused(true))
                .to.emit(stealthExchange, "Paused")
                .withArgs(true);
        });
    });
});

================================================================================
FILE 23: .env.example
================================================================================

# Relayer
RELAYER_PRIVATE_KEY=0x_your_relayer_private_key_here
RELAYER_ADDRESS=0x_your_relayer_address_here

# Deployed Contract
STEALTH_EXCHANGE_ADDRESS=0x_deployed_contract_address

# Deployer
DEPLOYER_PRIVATE_KEY=0x_your_deployer_private_key_here

# RPC Endpoints
RPC_ETH=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_BSC=https://bsc-dataseed1.binance.org
RPC_POLYGON=https://polygon-rpc.com
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io
RPC_AVALANCHE=https://api.avax.network/ext/bc/C/rpc
RPC_BASE=https://mainnet.base.org

# Block Explorer API Keys
ETHERSCAN_KEY=your_etherscan_api_key
BSCSCAN_KEY=your_bscscan_api_key
POLYGONSCAN_KEY=your_polygonscan_api_key
ARBISCAN_KEY=your_arbiscan_api_key
OPTIMISM_KEY=your_optimism_api_key
BASESCAN_KEY=your_basescan_api_key

# Server
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# WalletConnect
WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

================================================================================
SETUP INSTRUCTIONS
================================================================================

1. Clone/create the folder structure as shown above.

2. Install dependencies:
   $ npm install

3. Copy .env.example to .env and fill in your keys:
   $ cp .env.example .env

4. Compile contracts:
   $ npm run compile

5. Run tests:
   $ npm run test

6. Deploy contract (choose network):
   $ npx hardhat run scripts/deploy.js --network mainnet
   $ npx hardhat run scripts/deploy.js --network bsc
   $ npx hardhat run scripts/deploy.js --network polygon

7. Update .env with deployed contract address.

8. Start development:
   $ npm run dev

   This starts both the relay server (port 4000) and
   the webpack dev server (port 3000) concurrently.

9. Production build:
   $ npm run build
   $ npm start

================================================================================
HOW IT WORKS
================================================================================

1. User connects wallet (MetaMask or WalletConnect).

2. Frontend detects chain and fetches ERC20 token balances.

3. User selects tokens they want to transfer.

4. User enters a recipient address.

5. If any token needs Permit2 approval, user signs an
   on-chain approval transaction first.

6. Frontend builds a Permit2 typed data structure
   (single or batch) and prompts the user to sign it.
   This is an off-chain signature (no gas).

7. The signed permit + signature is sent to the relay
   server via HTTP POST.

8. The relay server validates the request, then submits
   the transaction on-chain using the relayer wallet.

9. The StealthExchange contract calls Permit2's
   permitTransferFrom to move tokens from the user's
   wallet to the recipient in a single transaction.

10. The relay server returns the transaction hash and
    confirmation details to the frontend.

================================================================================
SECURITY NOTES
================================================================================

- The relayer wallet pays gas. Fund it with native tokens.
- Each permit has a deadline. Expired permits are rejected.
- Each permit has a unique nonce. Replay is prevented by
  the executedTransfers mapping in the contract.
- The contract can be paused by the owner.
- Only authorized relayers can call execute functions.
- Input validation occurs both client-side and server-side.
- Rate limiting is applied to relay endpoints.
- Token rescue functions exist for stuck tokens/ETH.

================================================================================
END OF FILE
================================================================================
```
