import { useState, useEffect, useCallback } from "react";
import { ccc } from "@ckb-ccc/core";
import {
  deserializeDobData,
  buildMintDobTx,
  buildTransferDobTx,
  buildBurnDobTx
} from "./dob-client";
import {
  Wallet,
  Cpu,
  Coins,
  Upload,
  Image as ImageIcon,
  Send,
  Flame,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Copy
} from "lucide-react";
import scriptsJson from "./deployment/scripts.json";
import "./App.css";

// Auto-load devnet contract config from scripts.json (updated after each deploy)

const DEVNET_RPC_URL = "http://localhost:28114"; // offckb proxy port

const DEVNET_SCRIPTS = {
  [ccc.KnownScript.Secp256k1Blake160]: {
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.Secp256k1Multisig]: {
    codeHash: "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 1,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.AnyoneCanPay]: {
    codeHash: "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 8,
          },
          depType: "code",
        },
      },
    ],
  },
  [ccc.KnownScript.OmniLock]: {
    codeHash: "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 7,
          },
          depType: "code",
        },
      },
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.XUdt]: {
    codeHash: "0x1a1e4fef34f5982906f745b048fe7b1089647e82346074e0f32c2ece26cf6b1e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 6,
          },
          depType: "code",
        },
      },
    ],
  },
  [ccc.KnownScript.NervosDao]: {
    codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 2,
          },
          depType: "code",
        },
      },
    ],
  },
};

interface DobCell {
  id: string;
  contentType: string;
  contentUrl: string;
  capacity: string;
  cell: ccc.Cell;
}

function App() {
  // Devnet-only: all config is fixed
  const network = "devnet" as const;
  const rpcUrl = DEVNET_RPC_URL;
  const [privateKey, setPrivateKey] = useState<string>(
    "0xf4a1fc19468b51ba9d1f0f5441fa3f4d91e625b2af105e1e37cc54bf9b19c0a1" // Default Devnet Account 0 (42,000,000 CKB)
  );
  const [signer, setSigner] = useState<ccc.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string>("");

  // Contract Configurations — auto-loaded dynamically from scripts.json
  const freshContract = scriptsJson.devnet["tiny-dob-script"];
  const [codeHash, setCodeHash] = useState<string>(freshContract?.codeHash ?? "");
  const [hashType, setHashType] = useState<ccc.HashType>((freshContract?.hashType as ccc.HashType) ?? "data2");
  const [contractTxHash, setContractTxHash] = useState<string>(freshContract?.cellDeps?.[0]?.cellDep?.outPoint?.txHash ?? "");
  const [contractIndex, setContractIndex] = useState<number>(freshContract?.cellDeps?.[0]?.cellDep?.outPoint?.index ?? 0);

  // Mint Panel States
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [contentType, setContentType] = useState<string>("");
  const [mintLoading, setMintLoading] = useState<boolean>(false);
  const [mintTxHash, setMintTxHash] = useState<string>("");
  const [mintError, setMintError] = useState<string>("");

  // Gallery States
  const [dobList, setDobList] = useState<DobCell[]>([]);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<string>("");

  // Transfer Form Overlay States
  const [transferTarget, setTransferTarget] = useState<DobCell | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferTxHash, setTransferTxHash] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");

  // Burn States
  const [burnTarget, setBurnTarget] = useState<DobCell | null>(null);
  const [burnLoading, setBurnLoading] = useState<boolean>(false);
  const [burnTxHash, setBurnTxHash] = useState<string>("");
  const [burnError, setBurnError] = useState<string>("");

  // (Devnet-only: no network switching needed)



  // Auto-sync contract states when scripts.json changes
  useEffect(() => {
    const freshContract = scriptsJson.devnet["tiny-dob-script"];
    if (freshContract) {
      setCodeHash(freshContract.codeHash);
      setHashType((freshContract.hashType as ccc.HashType) ?? "data2");
      setContractTxHash(freshContract.cellDeps?.[0]?.cellDep?.outPoint?.txHash ?? "");
      setContractIndex(freshContract.cellDeps?.[0]?.cellDep?.outPoint?.index ?? 0);
    }
  }, [scriptsJson]);

  // Disconnect wallet automatically when contract config changes to clear CCC client cache
  useEffect(() => {
    setSigner(null);
    setAddress("");
    setBalance("0");
    setDobList([]);
  }, [scriptsJson]);

  // Connect Signer Wallet
  const connectWallet = async () => {
    setConnecting(true);
    setConnectError("");
    try {
      let client: ccc.Client;
      if (network === "devnet") {
        client = new ccc.ClientPublicTestnet({
          url: rpcUrl,
          scripts: DEVNET_SCRIPTS as any,
        } as any);
      } else {
        client = new ccc.ClientPublicTestnet();
      }

      // Patch getFeeRateStatistics to handle empty fee rate statistics on fresh devnets
      const originalGetFeeRateStatistics = client.getFeeRateStatistics.bind(client);
      client.getFeeRateStatistics = async (blockRange) => {
        try {
          return await originalGetFeeRateStatistics(blockRange);
        } catch (err) {
          return { mean: ccc.numFrom(1000), median: ccc.numFrom(1000) };
        }
      };

      // Check client connectivity
      try {
        await client.getTip();
      } catch (err) {
        throw new Error(
          `RPC Node Connection Failed. Please make sure CKB Devnet node is running at ${rpcUrl}`
        );
      }

      const walletSigner = new ccc.SignerCkbPrivateKey(client, privateKey);
      // Use SDK's built-in secp256k1 address derivation (applies blake160(hash(pubkey)) correctly)
      const secp256k1AddrObj = await walletSigner.getAddressObjSecp256k1();
      const userAddr = secp256k1AddrObj.toString();

      setSigner(walletSigner);
      setAddress(userAddr);
      setConnecting(false);
    } catch (err: any) {
      console.error(err);
      setConnectError(err.message || "Failed to initialize private key signer");
      setConnecting(false);
    }
  };

  // Fetch Wallet Balance and tDOB Gallery cells
  const fetchBalanceAndGallery = useCallback(async () => {
    if (!signer) return;
    setGalleryLoading(true);
    setGalleryError("");
    try {
      const client = signer.client;
      // Use SDK's built-in secp256k1 lock (correctly applies blake160 hash of public key)
      const secp256k1AddrObj = await (signer as ccc.SignerCkbPrivateKey).getAddressObjSecp256k1();
      const secp256k1Script = secp256k1AddrObj.script;

      // Query balance
      const bal = await client.getBalanceSingle(secp256k1Script);
      setBalance(ccc.fixedPointToString(bal));

      // Query live cells matching our type script codeHash
      const newDobs: DobCell[] = [];

      for await (const cell of client.findCellsByLock(secp256k1Script)) {
        // Filter cells that contain our contract type script codeHash
        if (
          cell.cellOutput.type &&
          cell.cellOutput.type.codeHash === codeHash
        ) {
          try {
            const dataBytes = ccc.bytesFrom(cell.outputData);
            const { contentType: cType, content } = deserializeDobData(dataBytes);

            // Convert raw binary content array to data blob URL
            const arrayBuffer = content.buffer.slice(
              content.byteOffset,
              content.byteOffset + content.byteLength
            );
            const blob = new Blob([arrayBuffer as ArrayBuffer], { type: cType });
            const blobUrl = URL.createObjectURL(blob);

            newDobs.push({
              id: cell.cellOutput.type.args,
              contentType: cType,
              contentUrl: blobUrl,
              capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
              cell,
            });
          } catch (err) {
            console.error("Failed to parse DOB cell:", cell, err);
          }
        }
      }

      setDobList((prev) => {
        // Revoke old object URLs to prevent memory leaks
        prev.forEach((d) => {
          if (d.contentUrl.startsWith("blob:")) {
            URL.revokeObjectURL(d.contentUrl);
          }
        });
        return newDobs;
      });
      setGalleryLoading(false);
    } catch (err: any) {
      console.error(err);
      setGalleryError(err.message || "Failed to query indexer cells");
      setGalleryLoading(false);
    }
  }, [signer, codeHash]);

  // Trigger Refresh
  useEffect(() => {
    if (signer) {
      fetchBalanceAndGallery();
    }
  }, [signer, codeHash, fetchBalanceAndGallery]);

  // Handle Mint File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setContentType(selectedFile.type || "application/octet-stream");

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const arrayBuffer = event.target.result as ArrayBuffer;
        setFileData(new Uint8Array(arrayBuffer));
      }
    };
    reader.readAsArrayBuffer(selectedFile);

    // Create local image preview if file is an image
    if (selectedFile.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);
    } else {
      setFilePreview("");
    }
  };

  // Perform Minting Transaction
  const executeMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !fileData) return;
    setMintLoading(true);
    setMintError("");
    setMintTxHash("");

    try {
      const contractOutPoint = ccc.OutPoint.from({
        txHash: contractTxHash,
        index: contractIndex,
      });

      const txHash = await buildMintDobTx(
        signer,
        codeHash,
        hashType,
        contractOutPoint,
        contentType,
        fileData
      );

      setMintTxHash(txHash);
      setFile(null);
      setFileData(null);
      setFilePreview("");
      setContentType("");

      // Delay fetch to let node update the indexing state
      setTimeout(() => {
        fetchBalanceAndGallery();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setMintError(err.message || "Minting transaction failed");
    } finally {
      setMintLoading(false);
    }
  };

  // Perform Transfer Transaction
  const executeTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !transferTarget) return;
    setTransferLoading(true);
    setTransferError("");
    setTransferTxHash("");

    try {
      const contractOutPoint = ccc.OutPoint.from({
        txHash: contractTxHash,
        index: contractIndex,
      });

      const txHash = await buildTransferDobTx(
        signer,
        codeHash,
        hashType,
        contractOutPoint,
        transferTarget.id,
        recipientAddress
      );

      setTransferTxHash(txHash);
      setRecipientAddress("");

      setTimeout(() => {
        setTransferTarget(null);
        setTransferTxHash("");
        fetchBalanceAndGallery();
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setTransferError(err.message || "Transfer transaction failed");
    } finally {
      setTransferLoading(false);
    }
  };

  // Perform Burn Transaction
  const executeBurn = async () => {
    if (!signer || !burnTarget) return;
    setBurnLoading(true);
    setBurnError("");
    setBurnTxHash("");

    try {
      const contractOutPoint = ccc.OutPoint.from({
        txHash: contractTxHash,
        index: contractIndex,
      });

      const txHash = await buildBurnDobTx(
        signer,
        codeHash,
        hashType,
        contractOutPoint,
        burnTarget.id
      );

      setBurnTxHash(txHash);

      setTimeout(() => {
        setBurnTarget(null);
        setBurnTxHash("");
        fetchBalanceAndGallery();
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setBurnError(err.message || "Burn transaction failed");
    } finally {
      setBurnLoading(false);
    }
  };

  // Clipboard Copier
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="dashboard-container">
      {/* Dynamic Background Gradients */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Frosted Navigation Bar */}
      <header className="frosted-navbar">
        <div className="logo-group">
          <Cpu className="logo-icon" />
          <h1 className="logo-title">TinyDOB Workspace</h1>
        </div>
        <div className="network-settings-group">
          <div className="network-badge devnet-badge">⚡ Devnet</div>
          <div className="rpc-indicator">
            <span className="dot active"></span>
            <span className="rpc-text">{rpcUrl}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="workspace-grid">
        {/* Left Side Control Panel */}
        <section className="control-sidebar">
          {/* Signer Connection Card */}
          <div className="glass-card">
            <h2>
              <Wallet className="card-header-icon" />
              Signer Connection
            </h2>
            {!signer ? (
              <div className="form-group">
                <label>Signer Private Key (Hex)</label>
                <input
                  type="password"
                  placeholder="0x..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="glass-input"
                />
                <button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="action-button primary"
                >
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </button>
                {connectError && (
                  <div className="error-alert">
                    <AlertTriangle className="alert-icon" />
                    <span>{connectError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="connected-info">
                <div className="info-row">
                  <span className="label">Address</span>
                  <div className="copyable-hash">
                    <span className="hash-text">{address}</span>
                    <button onClick={() => copyToClipboard(address)} className="copy-icon-btn">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="info-row">
                  <span className="label">Balance</span>
                  <span className="value balance-value">
                    <Coins size={16} className="inline-icon" />
                    {Number(balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    CKB
                  </span>
                </div>
                <button onClick={() => setSigner(null)} className="action-button secondary">
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>

          {/* Contract Config Card */}
          <div className="glass-card">
            <h2>
              <Settings className="card-header-icon" />
              Contract Configuration
            </h2>
            <div className="form-group">
              <label>tDOB Script Code Hash</label>
              <input
                type="text"
                value={codeHash}
                onChange={(e) => setCodeHash(e.target.value)}
                className="glass-input code-font"
              />
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label>Hash Type</label>
                <select
                  value={hashType}
                  onChange={(e) => setHashType(e.target.value as ccc.HashType)}
                  className="glass-input"
                >
                  <option value="type">Type</option>
                  <option value="data">Data</option>
                  <option value="data1">Data1</option>
                  <option value="data2">Data2</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contract Cell Output Index</label>
                <input
                  type="number"
                  value={contractIndex}
                  onChange={(e) => setContractIndex(Number(e.target.value))}
                  className="glass-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Contract Deploy Tx Hash</label>
              <input
                type="text"
                value={contractTxHash}
                onChange={(e) => setContractTxHash(e.target.value)}
                className="glass-input code-font"
              />
            </div>
            <span className="help-text">
              Note: The OutPoint (Deploy Tx Hash + Index) is required to resolve contract dependencies.
            </span>
          </div>

        </section>

        {/* Middle Column for Minting */}
        <section className="mint-column">
          {/* DOB Minting Card */}
          <div className="glass-card mint-card">
            <h2>
              <Upload className="card-header-icon" />
              Mint tDOB Cell
            </h2>
            <form onSubmit={executeMint} className="form-group">
              <label className="drag-drop-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden-file-input"
                  disabled={!signer || mintLoading}
                />
                {filePreview ? (
                  <div className="preview-container">
                    <img src={filePreview} alt="Upload preview" className="preview-image" />
                    <span className="file-name">{file?.name}</span>
                  </div>
                ) : (
                  <div className="drag-prompt">
                    <ImageIcon className="upload-icon" />
                    <span>Upload Image file</span>
                    <span className="sub-prompt">PNG, JPG, SVG up to 50KB</span>
                  </div>
                )}
              </label>

              <div className="form-group">
                <label>Content MIME Type</label>
                <input
                  type="text"
                  placeholder="e.g. image/png"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="glass-input"
                  disabled={!signer || mintLoading}
                />
              </div>

              <button
                type="submit"
                disabled={!signer || !fileData || mintLoading}
                className="action-button primary"
              >
                {mintLoading ? "Minting DOB Cell..." : "Mint DOB"}
              </button>

              {mintTxHash && (
                <div className="success-alert">
                  <CheckCircle2 className="alert-icon" />
                  <div className="alert-content">
                    <div className="alert-title">Mint Successful!</div>
                    <div className="copyable-hash">
                      <span className="hash-text">{mintTxHash}</span>
                      <button type="button" onClick={() => copyToClipboard(mintTxHash)} className="copy-icon-btn">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mintError && (
                <div className="error-alert">
                  <AlertTriangle className="alert-icon" />
                  <div className="alert-content">
                    <span>{mintError}</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Right Side Collection Gallery */}
        <section className="collection-gallery">
          <div className="gallery-header">
            <h2>
              <ImageIcon className="card-header-icon" />
              My tDOB Collection
            </h2>
            <button
              onClick={fetchBalanceAndGallery}
              disabled={!signer || galleryLoading}
              className="refresh-button"
              title="Refresh Gallery"
            >
              <RefreshCw className={`refresh-icon ${galleryLoading ? "spinning" : ""}`} />
            </button>
          </div>

          {galleryError && (
            <div className="error-alert" style={{ marginBottom: "16px" }}>
              <AlertTriangle className="alert-icon" />
              <span>{galleryError}</span>
            </div>
          )}

          {!signer ? (
            <div className="empty-state-box">
              <Wallet size={48} className="empty-icon" />
              <h3>Signer Wallet Disconnected</h3>
              <p>Connect your CKB wallet above to inspect your custom DOB assets.</p>
            </div>
          ) : galleryLoading ? (
            <div className="empty-state-box">
              <RefreshCw size={48} className="empty-icon spinning" />
              <h3>Loading Collection...</h3>
              <p>Scanning indexer for live cells matching contract code hash.</p>
            </div>
          ) : dobList.length === 0 ? (
            <div className="empty-state-box">
              <ImageIcon size={48} className="empty-icon" />
              <h3>No TinyDOB Cells Found</h3>
              <p>Try uploading and minting your first image on CKB above!</p>
            </div>
          ) : (
            <div className="dob-grid">
              {dobList.map((dob) => (
                <article key={dob.id} className="dob-card">
                  <div className="dob-image-container">
                    <img src={dob.contentUrl} alt="DOB Content" className="dob-image" />
                  </div>
                  <div className="dob-details">
                    <div className="dob-id-row">
                      <span className="dob-id-label">DOB ID:</span>
                      <div className="copyable-hash">
                        <span className="hash-text font-mono">{dob.id}</span>
                        <button onClick={() => copyToClipboard(dob.id)} className="copy-icon-btn">
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="dob-stat-row">
                      <span className="label">Mime Type</span>
                      <span className="value font-mono">{dob.contentType}</span>
                    </div>
                    <div className="dob-stat-row">
                      <span className="label">Capacity</span>
                      <span className="value font-mono">{Number(dob.capacity).toLocaleString()} CKB</span>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => setTransferTarget(dob)}
                        className="action-button card-btn primary"
                      >
                        <Send size={14} className="inline-icon" />
                        Transfer
                      </button>
                      <button
                        onClick={() => setBurnTarget(dob)}
                        className="action-button card-btn danger"
                      >
                        <Flame size={14} className="inline-icon" />
                        Burn
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Transfer Overlay Modal */}
      {transferTarget && (
        <div className="modal-backdrop">
          <div className="glass-card modal-card">
            <h2>
              <Send className="card-header-icon" />
              Transfer TinyDOB
            </h2>
            <p className="modal-subtitle">
              You are transferring tDOB: <span className="font-mono text-white">{transferTarget.id.slice(0, 16)}...</span>
            </p>
            <form onSubmit={executeTransfer} className="form-group">
              <label>Recipient CKB Address</label>
              <input
                type="text"
                placeholder="ckt1..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="glass-input"
                required
                disabled={transferLoading}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setTransferTarget(null)}
                  className="action-button secondary"
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-button primary"
                  disabled={transferLoading}
                >
                  {transferLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>

              {transferTxHash && (
                <div className="success-alert">
                  <CheckCircle2 className="alert-icon" />
                  <div>
                    <div className="alert-title">Transfer Successful!</div>
                    <span className="hash-text font-mono">{transferTxHash.slice(0, 24)}...</span>
                  </div>
                </div>
              )}

              {transferError && (
                <div className="error-alert">
                  <AlertTriangle className="alert-icon" />
                  <span>{transferError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Burn Overlay Modal */}
      {burnTarget && (
        <div className="modal-backdrop">
          <div className="glass-card modal-card">
            <h2>
              <Flame className="card-header-icon text-red" />
              Melt/Burn DOB Cell
            </h2>
            <div className="warning-box">
              <AlertTriangle className="warning-icon" />
              <div>
                <strong>CRITICAL WARNING: This action is permanent!</strong>
                <p>
                  Burning this cell will consume the DOB state permanently. The capacity occupied by this cell ({burnTarget.capacity} CKB) will be completely refunded to your wallet.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setBurnTarget(null)}
                className="action-button secondary"
                disabled={burnLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeBurn}
                className="action-button danger"
                disabled={burnLoading}
              >
                {burnLoading ? "Melting Cell..." : "Yes, Melt DOB"}
              </button>
            </div>

            {burnTxHash && (
              <div className="success-alert">
                <CheckCircle2 className="alert-icon" />
                <div>
                  <div className="alert-title">DOB Burned Successfully!</div>
                  <span className="hash-text font-mono">Refunding Capacity: {burnTarget.capacity} CKB</span>
                </div>
              </div>
            )}

            {burnError && (
              <div className="error-alert">
                <AlertTriangle className="alert-icon" />
                <span>{burnError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
