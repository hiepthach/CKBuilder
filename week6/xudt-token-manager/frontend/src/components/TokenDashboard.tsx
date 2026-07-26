"use client";

/**
 * @fileoverview Token Dashboard component — displays user's xUDT token balance.
 * Queries all live cells matching the user's lock script and the xUDT type script,
 * then sums the uint128 amounts from each cell's output data.
 *
 * References:
 * - xUDT Standard: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0052-extensible-udt/0052-extensible-udt.md
 * - CCC findCells: https://docs.ckbccc.com/en/docs/guides/compose-transactions
 */

import React, { useCallback, useEffect, useState } from "react";
import { useSigner } from "@ckb-ccc/connector-react";
import {
  buildXudtTypeScript,
  getUdtBalance,
  TOKEN_SYMBOL,
} from "@/lib/xudt";

export default function TokenDashboard() {
  const signer = useSigner();

  const [balance, setBalance] = useState<string>("0");
  const [cellCount, setCellCount] = useState<number>(0);
  const [issuerHash, setIssuerHash] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const refreshBalance = useCallback(async () => {
    if (!signer) return;

    setLoading(true);
    setError("");

    try {
      const client = signer.client;

      // 1. Get the signer's lock script
      const { script: signerLock } = await signer.getRecommendedAddressObj();

      // 2. Build the xUDT type script for this user's token
      const xudtType = await buildXudtTypeScript(client, signerLock);

      // 3. Compute and display the issuer lock hash (xUDT args)
      const lockHash = signerLock.hash();
      setIssuerHash(lockHash);

      // 4. Query total token balance across all matching cells
      const { balance: bal, cellCount: count } = await getUdtBalance(
        client,
        signerLock,
        xudtType
      );

      setBalance(bal.toString());
      setCellCount(count);
    } catch (err: any) {
      console.error("Failed to fetch token balance:", err);
      setError(err.message || "Failed to fetch token balance");
    } finally {
      setLoading(false);
    }
  }, [signer]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  if (!signer) return null;

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Token Dashboard</h2>
        <button
          className="btn-outline"
          onClick={refreshBalance}
          disabled={loading}
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
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

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Token</span>
          <span className="stat-value token-badge">{TOKEN_SYMBOL}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Balance</span>
          <span className="stat-value">{balance}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">UDT Cells</span>
          <span className="stat-value">{cellCount}</span>
        </div>
      </div>

      {issuerHash && (
        <div className="info-block" style={{ marginTop: "1rem" }}>
          <div className="info-row">
            <span className="info-label">Issuer Lock Hash</span>
            <span
              className="info-value"
              title={issuerHash}
              style={{ fontSize: "0.7rem" }}
            >
              {issuerHash.slice(0, 12)}...{issuerHash.slice(-8)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
