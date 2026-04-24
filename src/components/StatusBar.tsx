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
