"use client";

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
      try {
        const addr = await signer.getRecommendedAddress();
        setAddress(addr);
        const bal = await signer.getBalance();
        setBalance(ccc.fixedPointToString(bal));
      } catch (err) {
        console.error("Failed to get wallet info:", err);
      }
    })();
  }, [signer]);

  if (wallet && signer) {
    return (
      <div className="glass-panel" style={{ width: "100%" }}>
        <h2>Wallet Connected</h2>
        <div className="info-block">
          <div className="info-row">
            <span className="info-label">Wallet</span>
            <span className="info-value">{wallet.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Address</span>
            <span className="info-value">
              {address.slice(0, 10)}...{address.slice(-8)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Balance</span>
            <span className="info-value">{balance} CKB</span>
          </div>
        </div>
        <button className="btn-outline" onClick={disconnect} style={{ width: "100%", marginTop: "0.5rem" }}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ width: "100%", textAlign: "center" }}>
      <h2>Connect your wallet</h2>
      <p style={{ marginBottom: "1.5rem" }}>Supports JoyID, MetaMask, UniSat, and OKX.</p>
      <button className="btn-primary" onClick={open}>
        Connect Wallet
      </button>
    </div>
  );
}
