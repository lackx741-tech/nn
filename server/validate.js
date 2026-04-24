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
