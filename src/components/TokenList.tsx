import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TokenInfo, fetchTokenBalances, formatTokenAmount } from "../utils/tokens";

interface TokenListProps {
    provider: ethers.BrowserProvider | null;
    userAddress: string;
    chainId: number;
    selectedTokens: TokenInfo[];
    onSelectionChange: (tokens: TokenInfo[]) => void;
}

const TokenList: React.FC<TokenListProps> = ({
    provider,
    userAddress,
    chainId,
    selectedTokens,
    onSelectionChange
}) => {
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        loadTokens();
    }, [provider, userAddress, chainId]);

    const loadTokens = async () => {
        if (!provider || !userAddress) return;
        setLoading(true);
        try {
            const fetched = await fetchTokenBalances(provider, userAddress, chainId);
            setTokens(fetched);
        } catch (error) {
            console.error("Error loading tokens:", error);
        }
        setLoading(false);
    };

    const toggleToken = (token: TokenInfo) => {
        const isSelected = selectedTokens.some(
            t => t.address.toLowerCase() === token.address.toLowerCase()
        );

        if (isSelected) {
            onSelectionChange(
                selectedTokens.filter(
                    t => t.address.toLowerCase() !== token.address.toLowerCase()
                )
            );
        } else {
            onSelectionChange([...selectedTokens, token]);
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            onSelectionChange([]);
        } else {
            onSelectionChange([...tokens]);
        }
        setSelectAll(!selectAll);
    };

    const isSelected = (token: TokenInfo): boolean => {
        return selectedTokens.some(
            t => t.address.toLowerCase() === token.address.toLowerCase()
        );
    };

    const filteredTokens = tokens.filter(
        t =>
            t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <span>Loading tokens...</span>
                </div>
            </div>
        );
    }

    if (tokens.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.empty}>
                    <span style={styles.emptyIcon}>📭</span>
                    <span>No tokens found with balance</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>Your Tokens</h3>
                <span style={styles.count}>
                    {selectedTokens.length}/{tokens.length} selected
                </span>
            </div>

            <div style={styles.searchRow}>
                <input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <button style={styles.selectAllBtn} onClick={handleSelectAll}>
                    {selectAll ? "Deselect All" : "Select All"}
                </button>
                <button style={styles.refreshBtn} onClick={loadTokens}>
                    🔄
                </button>
            </div>

            <div style={styles.list}>
                {filteredTokens.map((token, index) => (
                    <div
                        key={token.address}
                        style={{
                            ...styles.tokenRow,
                            ...(isSelected(token) ? styles.tokenRowSelected : {}),
                            animationDelay: `${index * 50}ms`
                        }}
                        onClick={() => toggleToken(token)}
                    >
                        <div style={styles.tokenLeft}>
                            <div style={styles.checkbox}>
                                {isSelected(token) ? "✓" : ""}
                            </div>
                            <div style={styles.tokenIcon}>
                                {token.logo ? (
                                    <img
                                        src={token.logo}
                                        alt={token.symbol}
                                        style={styles.tokenImg}
                                    />
                                ) : (
                                    <div style={styles.tokenPlaceholder}>
                                        {token.symbol.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div style={styles.tokenInfo}>
                                <span style={styles.tokenSymbol}>
                                    {token.symbol}
                                </span>
                                <span style={styles.tokenName}>
                                    {token.name}
                                </span>
                            </div>
                        </div>
                        <div style={styles.tokenRight}>
                            <span style={styles.tokenBalance}>
                                {formatTokenAmount(token.balance, token.decimals)}
                            </span>
                            <span style={styles.approvalStatus}>
                                {token.permit2Approved ? (
                                    <span style={styles.approved}>✓ Approved</span>
                                ) : (
                                    <span style={styles.notApproved}>
                                        Needs Approval
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: "rgba(255,255,255,0.03)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        marginBottom: "20px"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px"
    },
    title: {
        color: "#fff",
        margin: 0,
        fontSize: "18px"
    },
    count: {
        color: "#a5b4fc",
        fontSize: "14px",
        background: "rgba(165,180,252,0.1)",
        padding: "4px 12px",
        borderRadius: "12px"
    },
    searchRow: {
        display: "flex",
        gap: "8px",
        marginBottom: "16px"
    },
    searchInput: {
        flex: 1,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "10px 16px",
        color: "#fff",
        fontSize: "14px",
        outline: "none"
    },
    selectAllBtn: {
        background: "rgba(102,126,234,0.2)",
        color: "#a5b4fc",
        border: "1px solid rgba(102,126,234,0.3)",
        padding: "8px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "13px",
        whiteSpace: "nowrap"
    },
    refreshBtn: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "8px 12px",
        cursor: "pointer",
        fontSize: "16px"
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxHeight: "400px",
        overflowY: "auto"
    },
    tokenRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 16px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "12px",
        cursor: "pointer",
        border: "1px solid transparent",
        transition: "all 0.2s ease"
    },
    tokenRowSelected: {
        background: "rgba(102,126,234,0.1)",
        border: "1px solid rgba(102,126,234,0.3)"
    },
    tokenLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },
    checkbox: {
        width: "20px",
        height: "20px",
        borderRadius: "6px",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#667eea",
        fontSize: "12px",
        fontWeight: "bold"
    },
    tokenIcon: {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        overflow: "hidden"
    },
    tokenImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
    },
    tokenPlaceholder: {
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "16px"
    },
    tokenInfo: {
        display: "flex",
        flexDirection: "column"
    },
    tokenSymbol: {
        color: "#fff",
        fontWeight: "600",
        fontSize: "15px"
    },
    tokenName: {
        color: "#64748b",
        fontSize: "12px"
    },
    tokenRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
    },
    tokenBalance: {
        color: "#fff",
        fontWeight: "500",
        fontSize: "15px"
    },
    approvalStatus: {
        fontSize: "11px",
        marginTop: "2px"
    },
    approved: {
        color: "#4ade80"
    },
    notApproved: {
        color: "#fbbf24"
    },
    loading: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "40px",
        color: "#94a3b8"
    },
    spinner: {
        width: "20px",
        height: "20px",
        border: "2px solid rgba(255,255,255,0.1)",
        borderTop: "2px solid #667eea",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
    },
    empty: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "40px",
        color: "#64748b"
    },
    emptyIcon: {
        fontSize: "32px"
    }
};

export default TokenList;
