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
