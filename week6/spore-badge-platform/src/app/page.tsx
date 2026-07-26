"use client";

import React, { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import MintBadge from "@/components/MintBadge";
import BadgeGallery from "@/components/BadgeGallery";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMinted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="container">
      <h1>Spore Badge Platform</h1>
      <p style={{ textAlign: "center", marginBottom: "1rem" }}>
        Mint, view, and melt Spore DOBs on the Nervos CKB Testnet.
      </p>
      
      <WalletConnect />
      <MintBadge onMinted={handleMinted} />
      <BadgeGallery refreshTrigger={refreshTrigger} />
      
      <footer style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)" }}>
        Built with ❤️ using CCC SDK and Spore Protocol
      </footer>
    </main>
  );
}
