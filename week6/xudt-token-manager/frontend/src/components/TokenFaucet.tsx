"use client";

/**
 * @fileoverview Token Faucet component — allows users to claim/mint xUDT tokens.
 * The connected wallet acts as both the token issuer and recipient (simplified model).
 * Constructs a mint transaction using CCC SDK's KnownScript.XUdt standard.
 *
 * References:
 * - CCC UDT Package: https://docs.ckbccc.com/en/docs/packages/protocol-sdks/udt
 * - Compose Transactions: https://docs.ckbccc.com/en/docs/guides/compose-transactions
 */

import React, { useState } from "react";
import { useSigner } from "@ckb-ccc/connector-react";
import { mintXudt, FAUCET_AMOUNT, TOKEN_SYMBOL } from "@/lib/xudt";

interface TokenFaucetProps {
  onMintSuccess?: () => void;
}

export default function TokenFaucet({ onMintSuccess }: TokenFaucetProps) {
  const signer = useSigner();

  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleClaim = async () => {
    if (!signer) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setError("");
    setTxHash("");

    try {
      // 1. Mint tokens using the signer's lock as issuer
      const hash = await mintXudt(signer, FAUCET_AMOUNT);
      setTxHash(hash);

      // 2. Notify parent to refresh dashboard
      onMintSuccess?.();
    } catch (err: any) {
      console.error("Faucet claim failed:", err);
      setError(err.message || "Failed to mint tokens. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!signer) return null;

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <h2 style={{ marginBottom: "0.75rem" }}>Token Faucet</h2>
      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Claim free <strong>{TOKEN_SYMBOL}</strong> tokens for testing.
        Each claim mints{" "}
        <strong>
          {FAUCET_AMOUNT.toString()} {TOKEN_SYMBOL}
        </strong>{" "}
        to your connected wallet.
      </p>

      {error && (
        <div
          style={{
            color: "#ef4444",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        className="btn-accent"
        onClick={handleClaim}
        disabled={loading}
        style={{ width: "100%" }}
      >
        {loading
          ? "Minting..."
          : `Claim ${FAUCET_AMOUNT.toString()} ${TOKEN_SYMBOL}`}
      </button>

      {txHash && (
        <div className="alert-success" style={{ marginTop: "1.5rem" }}>
          <p style={{ color: "var(--success)", marginBottom: "0.5rem" }}>
            ✓ Tokens minted successfully!
          </p>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              wordBreak: "break-all",
              marginBottom: "0.5rem",
            }}
          >
            Tx: {txHash}
          </p>
          <a
            href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on CKB Explorer (Testnet) →
          </a>
        </div>
      )}
    </div>
  );
}
