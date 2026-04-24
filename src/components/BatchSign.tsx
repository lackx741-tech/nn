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
