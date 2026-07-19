# CCC SDK: Overview and Immediate Focus Areas

The [CCC SDK (CKBers' Codebase)](https://docs.ckbccc.com/) is the modern, official TypeScript SDK designed to abstract away the low-level complexities of the CKB Cell Model. 

This document provides a high-level overview of everything CCC can do, and then dives deep into the specific areas you need to focus on right now for integrating your smart contracts with a frontend dApp.

---

## 1. The Big Picture: What CCC Can Do

It is helpful to know the full capabilities of the SDK, even if you don't need them all immediately. CCC is designed to handle:

- **Universal Wallet Connectivity**: A unified `Signer` interface that allows your app to connect seamlessly with CKB (JoyID), EVM (MetaMask), BTC (UniSat, OKX), and Nostr wallets without changing your core logic.
- **Declarative Transaction Composition**: You declare the desired outputs, and CCC automatically handles finding the right UTXOs (inputs) and calculating network fees.
- **Chain Querying & Indexing**: APIs to fetch live cells, search transaction history, check balances, and read block data via a `Client`.
- **Protocol-Level SDKs**: Built-in packages to easily issue and transfer Fungible Tokens (`@ckb-ccc/udt`) and Digital Objects/NFTs (`@ckb-ccc/spore`).
- **Backend Automation**: Using `@ckb-ccc/shell` to run CKB scripts in Node.js for bots, automated testing, or server-side transactions using private keys.
- **Cryptography & Utilities**: Tools for parsing/converting Addresses (Bech32/Bech32m), generating mnemonics, decrypting keystores, and Blake2b hashing.
- **Interactive Prototyping**: The [CCC Playground](https://live.ckbccc.com/) allows you to write, test, and share CKB scripts directly in the browser with zero setup.


---

## 2. Immediate Focus Areas (Deep Dive)

At this stage, your primary goal is bridging the gap between your on-chain scripts (Rust/TS) and a frontend UI. You only need to focus on these core concepts and workflows.

### A. Core Primitives

Familiarize yourself with how CCC abstractions map to the CKB network:

- **Client** ([Client Concept Guide](https://docs.ckbccc.com/en/docs/concepts/client)): Connects your application to a CKB Node via JSON-RPC. Used to query the chain (e.g., getting balances, searching for live cells).
- **Signer** ([Signer Concept Guide](https://docs.ckbccc.com/en/docs/concepts/signer)): Represents a connected wallet. Provides methods to get the user's address and sign transactions.
- **Transaction** ([Transaction Concept Guide](https://docs.ckbccc.com/en/docs/concepts/transaction)): Represents a state transition. You will build these programmatically to interact with the blockchain.
- **Address** ([Address Concept Guide](https://docs.ckbccc.com/en/docs/concepts/address)): The string representation (bech32m) of a Lock Script.
- **Script** ([Cell Model Concept Guide](https://docs.ckbccc.com/en/docs/concepts/cell-model)): Represents programmable logic attached to cells (Lock or Type script). CCC provides helpers to easily construct these from hashes.

### B. Workflow 1: Connecting Wallets (Frontend)

To allow users to interact with your dApp, you need to connect their wallets. Refer to the [Connect Wallets Guide](https://docs.ckbccc.com/en/docs/guides/connect-wallets) for complete implementation details.
- **Key Package**: `@ckb-ccc/connector-react`
- **Action Items**:
  1. Wrap your React application with the `<CccProvider>`.
  2. Use the `useCcc()` hook to invoke the wallet connection modal and retrieve the `signer` object.
  3. Call `signer.getRecommendedAddress()` to display the user's CKB address.
  4. Use `client.getBalance()` to fetch and display their current CKB balance.

### C. Workflow 2: Composing and Sending Transactions

Master the declarative transaction building flow. This standard 4-step pattern is used for almost every on-chain interaction. Refer to the [Compose Transactions Guide](https://docs.ckbccc.com/en/docs/guides/compose-transactions) for detailed APIs.

1. **Initialize:** Define what you want to create (outputs).
   ```typescript
   const tx = ccc.Transaction.from({ 
       outputs: [{ lock: receiverLock, capacity: ccc.fixedPointFrom("100") }] 
   });
   ```
2. **Collect Inputs:** Let CCC automatically find enough UTXOs from the signer to cover the required capacity.
   ```typescript
   await tx.completeInputsByCapacity(signer);
   ```
3. **Calculate Fee:** Let CCC calculate the network fee and create a change output cell back to the sender.
   ```typescript
   await tx.completeFeeBy(signer);
   ```
4. **Sign & Broadcast:**
   ```typescript
   const txHash = await signer.sendTransaction(tx);
   ```

### D. Workflow 3: Interacting with Your Custom Smart Contract

Once you deploy a Rust/TS script on-chain, you will receive a `code_hash`. You must integrate this into your frontend transactions to use your contract. Learn more about scripts in the [Cell Model Guide](https://docs.ckbccc.com/en/docs/concepts/cell-model).

- **Action Items**:
  1. Construct a `ccc.Script` object using your contract's `code_hash`, `hashType`, and dynamic `args` (e.g., passing a public key hash or specific data).
  2. Build a transaction where the `outputs` utilize your custom script in the `lock` or `type` field.
  3. **Crucial Step:** Add a `CellDep` (Cell Dependency) to your transaction. This points to the `OutPoint` where your deployed contract code resides, allowing the CKB-VM to load and execute your logic during validation. Refer to [Transaction Cell Deps](https://docs.ckbccc.com/en/docs/concepts/transaction#advanced-adding-cell-dependencies) for more info.
     ```typescript
     tx.addCellDep({ outPoint: contractOutPoint, depType: "code" });
     ```

---

## 3. Advanced Topics (Read Later)

When you are comfortable with the basics and want to expand your dApp's capabilities, you can explore these advanced features:

- **Tokens & NFTs**: [UDT Tokens Guide](https://docs.ckbccc.com/en/docs/guides/udt-tokens) and [Spore Protocol Guide](https://docs.ckbccc.com/en/docs/guides/spore-protocol)
- **Backend Scripting**: [Node.js Backend Guide](https://docs.ckbccc.com/en/docs/guides/node-js-backend)
- **On-chain Data Decoding**: [SSRI Protocol](https://talk.nervos.org/t/en-cn-script-sourced-rich-information-script/8256/2)
- **Cross-chain Bitcoin Assets**: [RGB++ Protocol](https://rgbpp.com/docs/introduction)
