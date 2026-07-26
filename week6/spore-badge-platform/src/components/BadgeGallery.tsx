"use client";

import React, { useEffect, useState } from "react";
import { useSigner } from "@ckb-ccc/connector-react";
import * as ccc from "@ckb-ccc/core";
import { spore } from "@ckb-ccc/spore";
import { unpackToRawSporeData } from "@ckb-ccc/spore/advanced";

interface SporeItem {
  outPoint: ccc.OutPoint;
  cell: ccc.Cell;
  contentType: string;
  content: ccc.BytesLike;
}

export default function BadgeGallery({ refreshTrigger }: { refreshTrigger: number }) {
  const signer = useSigner();
  const [spores, setSpores] = useState<SporeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [meltingId, setMeltingId] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    if (!signer) {
      setSpores([]);
      return;
    }

    const fetchSpores = async () => {
      setLoading(true);
      try {
        const client = signer.client;
        const lock = await signer.getRecommendedAddressObj();
        
        const sporeScripts = Object.values(spore.getSporeScriptInfos(client)).filter(s => !!s);
        
        // Find ALL cells belonging to the user
        const cells = client.findCells({
          script: lock.script,
          scriptType: "lock",
          scriptSearchMode: "exact",
        });

        const foundSpores: SporeItem[] = [];
        for await (const cell of cells) {
          const typeScript = cell.cellOutput.type;
          if (!typeScript) continue;

          // Check if this cell's type script matches any predefined Spore script
          const isSpore = sporeScripts.some((scriptInfo: any) => {
            return typeScript.codeHash === scriptInfo.codeHash && typeScript.hashType === scriptInfo.hashType;
          });

          if (isSpore) {
            try {
              // Parse SporeData from outputData
              const sporeData = unpackToRawSporeData(cell.outputData);
              foundSpores.push({
                outPoint: cell.outPoint,
                cell,
                contentType: sporeData.contentType,
                content: sporeData.content,
              });
            } catch (e) {
              // Not a valid spore data or corrupted
              console.warn("Invalid spore data", e);
            }
          }
        }
        
        setSpores(foundSpores);
      } catch (err) {
        console.error("Failed to fetch spores", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpores();
  }, [signer, refreshTrigger, internalRefresh]);

  const handleMelt = async (item: SporeItem) => {
    if (!signer) return;
    const txId = ccc.hexFrom(item.outPoint.txHash) + item.outPoint.index.toString(16);
    setMeltingId(txId);
    try {
      // Create Melt Action
      const { tx } = await spore.meltSpore({
        signer,
        id: item.cell.cellOutput.type?.args!,
      });
      
      await tx.completeFeeBy(signer);
      const txHash = await signer.sendTransaction(tx);
      console.log("Melted spore tx:", txHash);
      
      // Optimistically remove from UI
      setSpores(prev => prev.filter(s => s.outPoint.txHash !== item.outPoint.txHash || s.outPoint.index !== item.outPoint.index));
      alert(`Spore Melted! TxHash: ${txHash}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to melt spore");
    } finally {
      setMeltingId(null);
    }
  };

  const renderContent = (item: SporeItem) => {
    const rawBytes = ccc.bytesFrom(item.content);
    if (item.contentType.startsWith("image/")) {
      // Create object URL from Uint8Array
      const blob = new Blob([rawBytes as any], { type: item.contentType });
      const url = URL.createObjectURL(blob);
      return <img src={url} alt="Spore Badge" className="badge-image" />;
    } else {
      const text = new TextDecoder().decode(rawBytes);
      return <div className="badge-metadata">{text}</div>;
    }
  };

  if (!signer) return null;

  return (
    <div className="glass-panel" style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2>Your Badge Gallery</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {loading && <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</span>}
          <button 
            className="btn-outline" 
            onClick={() => setInternalRefresh(prev => prev + 1)}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {spores.length === 0 && !loading ? (
        <p style={{ textAlign: "center", padding: "2rem 0" }}>No Spore badges found in your wallet.</p>
      ) : (
        <div className="gallery-grid">
          {spores.map((item) => {
            const txId = ccc.hexFrom(item.outPoint.txHash) + item.outPoint.index.toString(16);
            const isMelting = meltingId === txId;
            const capacity = ccc.fixedPointToString(item.cell.cellOutput.capacity);
            
            return (
              <div key={txId} className="badge-card">
                <div style={{ flexGrow: 1 }}>
                  {renderContent(item)}
                </div>
                
                <div className="info-block" style={{ margin: "1rem 0", padding: "0.75rem" }}>
                  <div className="info-row">
                    <span className="info-label">Type</span>
                    <span className="info-value" style={{ fontSize: "0.75rem" }}>{item.contentType}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Capacity</span>
                    <span className="info-value" style={{ fontSize: "0.75rem" }}>{capacity} CKB</span>
                  </div>
                </div>

                <button 
                  className="btn-danger" 
                  onClick={() => handleMelt(item)}
                  disabled={isMelting}
                >
                  {isMelting ? "Melting..." : "Burn & Refund CKB"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
