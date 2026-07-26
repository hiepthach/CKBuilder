import React from "react";
import WalletConnect from "@/components/WalletConnect";
import TipJarForm from "@/components/TipJarForm";

export default function Home() {
  return (
    <main className="container">
      <h1>CKB Mini Tip Jar</h1>
      <p style={{ textAlign: "center", marginBottom: "2rem" }}>
        Connect your wallet and send tips directly on the Nervos CKB Testnet.
      </p>
      
      <WalletConnect />
      <TipJarForm />
      
      <footer style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)" }}>
        Built with ❤️ using CCC SDK
      </footer>
    </main>
  );
}
