"use client";

import React, { useState } from "react";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import * as ccc from "@ckb-ccc/core";

/**
 * @fileoverview Tip Jar Form component for composing and sending CKB transactions with embedded data messages.
 * Reference: https://docs.ckbccc.com/en/docs/guides/compose-transactions
 */
export default function TipJarForm() {
  const signer = useSigner();

  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [message, setMessage] = useState<string>("Great job!");
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setError("");
    setTxHash("");

    try {
      const client = signer.client;

      // 1. Decode recipient address to lock script
      const recipientAddr = await ccc.Address.fromString(recipient, client);

      // 2. Encode message to Hex for output data
      const hexData = ccc.hexFrom(Buffer.from(message, "utf-8"));

      // 3. Construct transaction output
      const tx = ccc.Transaction.from({
        outputs: [
          {
            lock: recipientAddr.script,
            capacity: ccc.fixedPointFrom(amount),
          },
        ],
        outputsData: [hexData],
      });

      // 4. Complete inputs by capacity (automatically finds UTXOs)
      await tx.completeInputsByCapacity(signer);

      // 5. Calculate and complete network fee (creates change output)
      await tx.completeFeeBy(signer, 1000);

      // 6. Sign and broadcast transaction via signer
      // signer.sendTransaction handles both signing and broadcasting correctly
      // for all wallet types (JoyID, MetaMask, UniSat, etc.)
      const hash = await signer.sendTransaction(tx);
      setTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during the transaction.");
    } finally {
      setLoading(false);
    }
  };

  if (!signer) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>Send a Tip</h2>
      <form onSubmit={handleDonate}>
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
          <label className="form-label">Amount (CKB)</label>
          <input
            type="number"
            min="62"
            step="1"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Message</label>
          <input
            type="text"
            className="form-input"
            placeholder="Keep up the good work!"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Processing..." : "Donate Now"}
        </button>
      </form>

      {txHash && (
        <div className="alert-success">
          <p style={{ color: "var(--success)" }}>Transaction Sent Successfully!</p>
          <a
            href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on CKB Explorer (Testnet)
          </a>
        </div>
      )}
    </div>
  );
}
