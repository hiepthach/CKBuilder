/**
 * @fileoverview Main Application Component
 * 
 * This file contains the React frontend for the Simple Lock dApp.
 * It uses `@ckb-ccc/connector-react` for wallet connections and `@ckb-ccc/core` for interactions.
 * 
 * Wallet Connection Guide: https://docs.ckbccc.com/en/docs/guides/connect-wallets
 */

import React, { useState, useEffect } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { buildLockTx, buildUnlockTx, getHashLockConfig } from './lib/hash-lock';
import systemScripts from '../deployment/system-scripts.json';
import './index.css';

/**
 * Custom CCC Client for Devnet to support local CKB nodes.
 * Overrides the default scripts to use our local system scripts.
 */
class ClientDevnet extends ccc.ClientPublicTestnet {
  constructor() {
    super({ url: 'http://localhost:8114', fallbacks: [] });
  }

  get scripts() {
    const defaultScripts = super.scripts;
    return {
      ...defaultScripts,
      [ccc.KnownScript.Secp256k1Blake160]: {
        ...defaultScripts[ccc.KnownScript.Secp256k1Blake160],
        cellDeps: [
          {
            cellDep: ccc.CellDep.from(
              systemScripts.devnet.secp256k1_blake160_sighash_all.script.cellDeps[0].cellDep as any
            )
          }
        ]
      }
    };
  }
}

/**
 * The main React App component.
 * Manages the wallet state, network selection, and Hash Lock operations.
 */
function App() {
  const { wallet, open, disconnect, setClient } = ccc.useCcc();
  // ccc.useSigner() returns the browser wallet signer
  const browserSigner = ccc.useSigner();
  
  const [network, setNetwork] = useState<'Testnet' | 'Devnet'>('Testnet');
  const [devnetPrivateKey, setDevnetPrivateKey] = useState<string>('');
  const [devnetSigner, setDevnetSigner] = useState<ccc.Signer | null>(null);
  
  const [lockAmount, setLockAmount] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [unlockTransferAmount, setUnlockTransferAmount] = useState('');
  const [lockedCells, setLockedCells] = useState<ccc.Cell[]>([]);
  
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');

  // The active signer depends on the selected network
  const activeSigner = network === 'Devnet' ? devnetSigner : browserSigner;

  // Fetch recommended address and balance
  useEffect(() => {
    if (!activeSigner) {
      setAddress('');
      setBalance('');
      return;
    }
    
    const fetchInfo = async () => {
      try {
        const addr = await activeSigner.getRecommendedAddress();
        setAddress(addr);
      } catch (err) {
        console.error("Failed to get address:", err);
      }
      try {
        const bal = await activeSigner.getBalance();
        // Optionally shorten the balance string for display
        const balStr = ccc.fixedPointToString(bal);
        setBalance(balStr);
      } catch (err) {
        console.error("Failed to get balance:", err);
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 10000);
    return () => clearInterval(interval);
  }, [activeSigner]);

  // Network Switcher & Devnet Auto-Signer Logic
  useEffect(() => {
    if (network === 'Testnet') {
      setClient(new ccc.ClientPublicTestnet());
      setDevnetSigner(null);
    } else {
      // Devnet client (assumes local CKB node running on 8114)
      const client = new ClientDevnet();
      setClient(client);
      
      // If user has provided a private key, initialize the signer
      if (devnetPrivateKey && devnetPrivateKey.startsWith('0x') && devnetPrivateKey.length === 66) {
        try {
          const signer = new ccc.SignerCkbPrivateKey(client, devnetPrivateKey);
          setDevnetSigner(signer);
        } catch (err) {
          console.error("Invalid devnet private key", err);
          setDevnetSigner(null);
        }
      } else {
        setDevnetSigner(null);
      }
    }
  }, [network, devnetPrivateKey, setClient]);

  // Fetch locked cells periodically
  // Concept Reference for finding cells: https://docs.ckbccc.com/en/docs/concepts/client
  useEffect(() => {
    async function fetchLockedCells() {
      if (!activeSigner) return;
      try {
        const client = activeSigner.client;
        
        // Find cells locked by our Hash Lock script
        const config = getHashLockConfig(network === 'Testnet');
        const lockScript = ccc.Script.from({
          codeHash: config.codeHash,
          hashType: config.hashType,
          args: "0x", 
        });

        // NOTE: We search by prefix since we don't know the exact args (password hashes).
        const cells: ccc.Cell[] = [];
        for await (const cell of client.findCells({
          script: lockScript,
          scriptType: "lock",
          scriptSearchMode: "prefix"
        })) {
          cells.push(cell);
        }
        setLockedCells(cells);
      } catch (err) {
        console.error("Failed to fetch locked cells:", err);
      }
    }

    if (activeSigner) {
      fetchLockedCells();
      const interval = setInterval(fetchLockedCells, 10000);
      return () => clearInterval(interval);
    }
  }, [activeSigner]);

  /**
   * Handles the Lock action.
   * Calls `buildLockTx` to create the hash lock cell, signs it, and broadcasts it.
   */
  const handleLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSigner) return;
    setLoading(true);
    setStatus(null);

    try {
      const amountShannons = ccc.fixedPointFrom(lockAmount, 8);
      
      const tx = await buildLockTx(activeSigner, amountShannons, lockPassword, network === 'Testnet');
      const txHash = await activeSigner.sendTransaction(tx);
      
      setStatus({ type: 'success', message: `Successfully locked CKB! Tx Hash: ${txHash}` });
      setLockAmount('');
      setLockPassword('');
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.toString() });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the Unlock action for a specific cell.
   * Calls `buildUnlockTx` to consume the hash lock cell with the provided plaintext password.
   */
  const handleUnlock = async (e: React.FormEvent, cell: ccc.Cell) => {
    e.preventDefault();
    if (!activeSigner) return;
    setLoading(true);
    setStatus(null);

    try {
      const transferAmt = unlockTransferAmount ? ccc.fixedPointFrom(unlockTransferAmount, 8) : undefined;
      const tx = await buildUnlockTx(activeSigner, cell, unlockPassword, network === 'Testnet', recipientAddress, transferAmt);
      // Wait for wallet signature
      const signedTx = await activeSigner.signTransaction(tx);
      // Send to network
      const txHash = await activeSigner.client.sendTransaction(signedTx);
      
      setStatus({ type: 'success', message: `Successfully unlocked CKB! Tx Hash: ${txHash}` });
      setUnlockPassword('');
      setRecipientAddress('');
    } catch (err: any) {
      console.error(err);
      let errMsg = err.toString();
      if (errMsg.includes("ValidationFailure") || errMsg.includes("error code 7")) {
        errMsg = "Incorrect password! Hash mismatch.";
      }
      setStatus({ type: 'error', message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">My Hash Lock</div>
        <div className="controls">
          {network === 'Devnet' && (
            <input 
              type="password" 
              className="input-field" 
              style={{ width: '150px', margin: 0, padding: '0 1rem', height: '42px' }} 
              placeholder="Devnet Key" 
              value={devnetPrivateKey}
              onChange={(e) => setDevnetPrivateKey(e.target.value)}
            />
          )}
          <select 
            className="input-field select-field" 
            value={network} 
            onChange={(e) => setNetwork(e.target.value as any)}
            style={{ width: 'auto', margin: 0, padding: '0 2.5rem 0 1rem', height: '42px' }}
          >
            <option value="Testnet">Testnet</option>
            <option value="Devnet">Devnet (Local)</option>
          </select>
          {address && (
            <div 
              className="address-display" 
              onClick={() => {
                navigator.clipboard.writeText(address);
                alert("Copied address: " + address);
              }}
              style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0 1rem',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
              }}
              title="Click to copy CKB Address"
            >
              {balance && <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{balance} CKB</span>}
              {balance && <span style={{ opacity: 0.3 }}>|</span>}
              <span>{address.slice(0, 6)}...{address.slice(-6)}</span>
            </div>
          )}
          
          {network !== 'Devnet' && (
            <button 
              className={`btn ${wallet ? 'btn-outline' : ''}`}
              onClick={wallet ? disconnect : open}
              style={{ width: 'auto', margin: 0, padding: '0 1.5rem', height: '42px' }}
            >
              {wallet ? `Connected` : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {status && (
        <div className={`status-message ${status.type === 'error' ? 'status-error' : 'status-success'}`}>
          {status.message}
        </div>
      )}

      <div className="grid-2">
        <div className="glass-card">
          <h2 className="card-title">Lock CKB</h2>
          <form onSubmit={handleLock}>
            <div className="input-group">
              <label className="input-label">Amount (CKB)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="E.g., 100" 
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                required
                min="61" 
                step="0.00000001"
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Enter a strong password" 
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn" disabled={!activeSigner || loading}>
              {loading ? <div className="loader" /> : 'Lock Funds'}
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h2 className="card-title">Unlock CKB</h2>
          {lockedCells.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              No locked cells found.
            </div>
          ) : (
            lockedCells.map((cell, idx) => (
              <form key={idx} onSubmit={(e) => handleUnlock(e, cell)} style={{ marginBottom: '1.5rem' }}>
                <div className="info-row">
                  <span className="info-label">Capacity:</span>
                  <span className="info-value">{ccc.fixedPointToString(cell.cellOutput.capacity)} CKB</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tx Hash:</span>
                  <span className="info-value">{cell.outPoint.txHash.slice(0, 10)}...</span>
                </div>
                
                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label">Unlock Password</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Enter password to unlock" 
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Recipient Address (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Leave empty to withdraw to your wallet" 
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Transfer Amount (CKB) - Optional</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="Leave empty to transfer all locked CKB" 
                    value={unlockTransferAmount}
                    onChange={(e) => setUnlockTransferAmount(e.target.value)}
                    min="61"
                    step="0.00000001"
                  />
                </div>
                
                <button type="submit" className="btn btn-outline" disabled={!activeSigner || loading}>
                  {loading ? <div className="loader" /> : 'Unlock & Transfer'}
                </button>
              </form>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
