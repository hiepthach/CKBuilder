# Test & Utility Scripts (dApp Web Test Scripts)

This directory contains standalone Node.js test scripts and scenarios used to verify functionalities and validate CKB Devnet or Testnet RPC connections.

## File Index

### 1. `test-mint.js`
- **Purpose**: Directly executes a DOB Mint transaction on the local Devnet via terminal to isolate front-end/UI issues.
- **Details**: Dynamically loads configuration from `web/src/deployment/scripts.json`, reads the local `images(1).jpg` image, calculates the unique DOB ID on-chain, and submits the transaction signed by Account 3.
- **Usage**:
  ```bash
  node test-mint.js
  ```

### 2. `check-balance.cjs`
- **Purpose**: Directly queries the account balance of Account 3 from the Devnet RPC node (`http://localhost:28114`) to verify balance correctness.
- **Usage**:
  ```bash
  node check-balance.cjs
  ```


## Sample Assets
- `images(1).jpg`: A sample JPEG image used to test image serialisation, uploading, and DOB minting.
