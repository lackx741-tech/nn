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
