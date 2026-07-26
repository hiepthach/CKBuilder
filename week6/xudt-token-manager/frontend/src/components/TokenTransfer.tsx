"use client";

/**
 * @fileoverview Token Transfer component — sends xUDT tokens to another address.
 * Constructs a transfer transaction that collects sender's UDT cells, creates
 * a recipient output cell, and optionally creates a change UDT cell.
 *
 * References:
 * - xUDT Transfer: https://docs.ckbccc.com/en/docs/packages/protocol-sdks/udt
 * - Cell Capacity: https://docs.nervos.org/docs/tech-explanation/cell-model
 */

import React, { useState } from "react";
import { useSigner } from "@ckb-ccc/connector-react";
import {
  transferXudt,
  buildXudtTypeScript,
  TOKEN_SYMBOL,
  MIN_UDT_CAPACITY_CKB,
} from "@/lib/xudt";

interface TokenTransferProps {
  onTransferSuccess?: () => void;
}

export default function TokenTransfer({ onTransferSuccess }: TokenTransferProps) {
  const signer = useSigner();

  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      setError("Please connect your wallet first.");
      return;
    }

    const tokenAmount = BigInt(amount);
    if (tokenAmount <= 0n) {
      setError("Token amount must be greater than 0.");
      return;
    }

    setLoading(true);
    setError("");
    setTxHash("");

    try {
      const client = signer.client;

      // 1. Get the signer's lock script to construct the xUDT type script
      const { script: signerLock } = await signer.getRecommendedAddressObj();

      // 2. Build the xUDT type script using signer's lock hash as issuer
      const xudtType = await buildXudtTypeScript(client, signerLock);

      // 3. Execute the transfer
      const hash = await transferXudt(signer, xudtType, recipient, tokenAmount);
      setTxHash(hash);

      // 4. Notify parent to refresh dashboard
      onTransferSuccess?.();
    } catch (err: any) {
      console.error("Transfer failed:", err);
      setError(err.message || "Failed to transfer tokens. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!signer) return null;

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <h2 style={{ marginBottom: "0.75rem" }}>Transfer Tokens</h2>
      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Send <strong>{TOKEN_SYMBOL}</strong> tokens to another CKB address.
        Each UDT cell requires a minimum of{" "}
        <strong>{MIN_UDT_CAPACITY_CKB} CKB</strong> capacity for on-chain
        storage.
      </p>

      <form onSubmit={handleTransfer}>
        <div className="form-group">
          <label className="form-label">Recipient Address (Testnet)</label>
          <input
            type="text"
            className="form-input"
            placeholder="ckt1..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Token Amount ({TOKEN_SYMBOL})
          </label>
          <input
            type="number"
            min="1"
            step="1"
            className="form-input"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

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
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? "Sending..." : `Send ${TOKEN_SYMBOL}`}
        </button>
      </form>

      {txHash && (
        <div className="alert-success" style={{ marginTop: "1.5rem" }}>
          <p style={{ color: "var(--success)", marginBottom: "0.5rem" }}>
            ✓ Tokens transferred successfully!
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
