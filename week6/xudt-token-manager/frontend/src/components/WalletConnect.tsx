"use client";

/**
 * @fileoverview Wallet Connect component for the xUDT Token Manager dApp.
 * Displays wallet connection status, CKB address (Bech32m), and CKB balance.
 * Reference: https://docs.ckbccc.com/en/docs/guides/connect-wallets
 */

import React, { useEffect, useState } from "react";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import * as ccc from "@ckb-ccc/core";

export default function WalletConnect() {
  const { open, disconnect, wallet } = useCcc();
  const signer = useSigner();
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    if (!signer) {
      setAddress("");
      setBalance("0");
      return;
    }

    (async () => {
      // 1. Fetch the recommended CKB address (Bech32m encoded)
      const addr = await signer.getRecommendedAddress();
      setAddress(addr);

      // 2. Fetch balance in Shannon and convert to CKB display units
      const bal = await signer.getBalance();
      setBalance(ccc.fixedPointToString(bal));
    })();
  }, [signer]);

  if (wallet && signer) {
    return (
      <div className="glass-panel" style={{ width: "100%", padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div className="status-dot status-connected" />
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Wallet Connected</h2>
        </div>
        <div className="info-block">
          <div className="info-row">
            <span className="info-label">Wallet</span>
            <span className="info-value">{wallet.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Address</span>
            <span className="info-value" title={address}>
              {address.slice(0, 12)}...{address.slice(-8)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">CKB Balance</span>
            <span className="info-value">{balance} CKB</span>
          </div>
        </div>
        <button
          className="btn-outline"
          onClick={disconnect}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{ width: "100%", padding: "1.5rem", textAlign: "center" }}
    >
      <h2 style={{ fontSize: "1.25rem" }}>
        Connect your wallet to manage xUDT tokens
      </h2>
      <p style={{ marginBottom: "1.5rem" }}>
        Supports JoyID, MetaMask, UniSat, and OKX Wallet.
      </p>
      <button className="btn-primary" onClick={open}>
        Connect Wallet
      </button>
    </div>
  );
}
