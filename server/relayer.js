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
