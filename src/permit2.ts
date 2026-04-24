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
