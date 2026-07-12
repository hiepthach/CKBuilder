# TinyDOB Frontend Workspace

This directory contains the React + TypeScript frontend dashboard and the off-chain transaction logic using the Common Chains Connector (CCC) SDK for the TinyDOB protocol built on Nervos CKB.

## Build Tooling

This project uses **Parcel** to bundle and run the web dashboard.

## Project Structure

- `src/App.tsx`: The main dashboard page built with React, styled in a premium dark mode frosted-glass theme. It manages the signer wallet connection, configuration inputs, DOB minting interface, and gallery list.
- `src/dob-client.ts`: Contains the off-chain transaction logic using the `@ckb-ccc/core` SDK, including DOB data serialization and molecule outpoint hashing.
- `src/deployment/scripts.json`: Contains the deployed contract information (code hash, tx hash, index). It is automatically updated upon deploying via `deploy.py` from the root folder.
- `test/`: Contains standalone Node.js test scripts (like `test-mint.js` and `check-balance.cjs`) for testing connections and transactions directly from the CLI.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run start
   ```
   *Serves the application locally at `http://localhost:1234` with hot module replacement (HMR) enabled.*

3. **Build the production package**:
   ```bash
   npm run build
   ```

4. **Verify TypeScript compilation**:
   ```bash
   npm run lint
   ```

## Local Devnet Integration

To ensure the web client does not encounter network connection issues with your local Devnet:
1. The dashboard is configured to connect to `http://localhost:28114` (the proxy RPC port). Do not use `127.0.0.1` as browsers may block connection to raw IPs, triggering a silent fallback to Aggron Testnet.
2. The contract variables (Tx Hash, Code Hash, Index) will automatically populate once you run the root `python3 deploy.py` script.
3. The default Account 3 private key (`0xf4a1fc19468b51ba9d1f0f5441fa3f4d91e625b2af105e1e37cc54bf9b19c0a1`) is pre-loaded for local testing.

## CLI Testing

You can run isolated CKB transactions using Node.js scripts in the `test/` directory:
- Run the minting pipeline from CLI:
  ```bash
  node test/test-mint.js
  ```
- Check the current Devnet balance of Account 3:
  ```bash
  node test/check-balance.cjs
  ```
For more details, see [test/README.md](test/README.md).

## Troubleshooting
For any issues regarding incorrect balances, TransactionFailedToResolve errors, or page refresh loop issues, please refer to the main [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) guide at the root of this workspace.
