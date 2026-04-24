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
