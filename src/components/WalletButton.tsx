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
