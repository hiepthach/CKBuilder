"use client";

import React, { useState } from "react";
import { useSigner } from "@ckb-ccc/connector-react";
import * as ccc from "@ckb-ccc/core";
import { spore } from "@ckb-ccc/spore";

export default function MintBadge({ onMinted }: { onMinted: () => void }) {
  const signer = useSigner();
  const [contentType, setContentType] = useState<string>("text/plain");
  const [textContent, setTextContent] = useState<string>("CKB Builder Week 6");
  const [fileContent, setFileContent] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    setError("");
    setTxHash("");

    try {
      let contentBuffer: Uint8Array;
      if (contentType.startsWith("image/") && fileContent) {
        const arrayBuffer = await fileContent.arrayBuffer();
        contentBuffer = new Uint8Array(arrayBuffer);
      } else {
        contentBuffer = ccc.bytesFrom(textContent, "utf8");
      }

      // 1. Prepare Spore Data
      // Note: According to the CCC source, the sporeData uses contentType and content.
      const sporeData = {
        contentType,
        content: contentBuffer,
        clusterId: undefined,
      };

      // 2. Create the Spore
      const { tx } = await spore.createSpore({
        signer,
        data: sporeData,
      });

      // 3. Complete Fee and Sign
      await tx.completeFeeBy(signer);
      const hash = await signer.sendTransaction(tx);
      
      setTxHash(hash);
      onMinted(); // Refresh gallery
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to mint Spore");
    } finally {
      setLoading(false);
    }
  };

  if (!signer) return null;

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <h2>Mint New Badge (Spore DOB)</h2>
      <form onSubmit={handleMint}>
        <div className="form-group">
          <label className="form-label">Content Type</label>
          <select 
            className="form-input" 
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            <option value="text/plain">Text (text/plain)</option>
            <option value="application/json">JSON Metadata (application/json)</option>
            <option value="image/png">Image (image/png)</option>
            <option value="image/jpeg">Image (image/jpeg)</option>
          </select>
        </div>

        {contentType.startsWith("image/") ? (
          <div className="form-group">
            <label className="form-label">Upload Image</label>
            <input 
              type="file" 
              accept="image/*"
              className="form-input"
              onChange={(e) => setFileContent(e.target.files?.[0] || null)}
              required
            />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Content Data</label>
            <textarea
              className="form-input"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              required
            />
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Minting on-chain..." : "Mint Badge"}
        </button>
      </form>

      {txHash && (
        <div className="alert-success">
          <p>Successfully Minted Spore!</p>
          <p style={{ fontSize: "0.8rem", margin: "0.5rem 0" }}>
            Note: It takes a few seconds for the transaction to be confirmed on-chain. 
            Click the <strong>Refresh</strong> button in the gallery to see your new badge.
          </p>
          <a
            href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </a>
        </div>
      )}
    </div>
  );
}
