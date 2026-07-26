"use client";

/**
 * @fileoverview Main page for the Mini xUDT Token Faucet & Balance Manager dApp.
 * Composes WalletConnect, TokenDashboard, TokenFaucet, and TokenTransfer components
 * with a tab-based navigation pattern.
 *
 * Reference: https://docs.ckbccc.com/en/docs/packages/protocol-sdks/udt
 */

import React, { useState, useCallback } from "react";
import WalletConnect from "@/components/WalletConnect";
import TokenDashboard from "@/components/TokenDashboard";
import TokenFaucet from "@/components/TokenFaucet";
import TokenTransfer from "@/components/TokenTransfer";
import { useSigner } from "@ckb-ccc/connector-react";

type Tab = "faucet" | "dashboard" | "transfer";

export default function Home() {
  const signer = useSigner();
  const [activeTab, setActiveTab] = useState<Tab>("faucet");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRefresh = useCallback(() => {
    // Force remount of TokenDashboard to re-query balance
    setRefreshKey((k) => k + 1);
    setActiveTab("dashboard");
  }, []);

  return (
    <main className="container">
      <h1>xUDT Token Manager</h1>
      <p className="subtitle">
        Mint, view, and transfer xUDT fungible tokens on the CKB Testnet.
      </p>

      <WalletConnect />

      {signer && (
        <>
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === "faucet" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("faucet")}
            >
              🪙 Faucet
            </button>
            <button
              className={`tab-btn ${activeTab === "dashboard" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              📊 Dashboard
            </button>
            <button
              className={`tab-btn ${activeTab === "transfer" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("transfer")}
            >
              📤 Transfer
            </button>
          </div>

          {activeTab === "faucet" && (
            <TokenFaucet onMintSuccess={handleRefresh} />
          )}
          {activeTab === "dashboard" && (
            <TokenDashboard key={refreshKey} />
          )}
          {activeTab === "transfer" && (
            <TokenTransfer onTransferSuccess={handleRefresh} />
          )}
        </>
      )}

      <footer className="footer">
        Built with CCC SDK &bull; Week 6 &bull; CKB Builder
      </footer>
    </main>
  );
}
