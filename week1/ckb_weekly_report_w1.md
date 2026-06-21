## Builder Track Weekly Report — Week 1

**Name:** Hiep Thach  
**Week Ending:** 06-14-2026 to 06-20-2026

### Courses Completed

- Read the [Introduction to Nervos CKB](https://docs.nervos.org/docs/ckb-fundamentals/nervos-blockchain) documentation.
- Read [Getting Started on CKB](https://docs.nervos.org/docs/getting-started/how-ckb-works).
- Completed the tutorials in the [Quick Start](https://docs.nervos.org/docs/getting-started/quick-start) section.
- Finished Module 1 of CKB Academy: [Basic Theory](https://academy.ckb.dev/courses/basic-theory).
- Completed the hands-on tutorial for CKB transfers: [CKB Transfer](https://docs.nervos.org/docs/dapp/transfer-ckb).

### Key Learnings

- Learned the core concepts of Nervos Blockchain and CKB. Unlike Bitcoin's UTXO model, CKB uses the Cell Model, which acts similarly to UTXOs but adds the capability to store arbitrary state/data. The Lock Script defines cell ownership.
- Understood the Cell structure and constraints regarding `capacity`, `lock`, `type`, and `data`.
- Understood CKB Scripts and how they execute within the virtual machine.
- Learned the transaction execution flow on CKB (destroying inputs and creating outputs).
- Learned how to construct and send the first CKB transaction on local devnet and testnet.

### Exercises and Practical Work

- Set up and ran a local CKB node.
- Executed CKB transfers on local devnet and testnet. Used `ckb-cli` to inspect cells and transactions.
- Successful testnet transaction: [View on Explorer](https://testnet.explorer.nervos.org/transaction/0xf5686e1593ee581c2b5cda616d51db78a864dbb9a70739d4179d2fdbbfa90d37).

### Plan for Next Week

- Complete CKB Academy Module 2 and Module 3.
- Complete the "Store Data on Cell" practical tutorial.
- Read through [CKB Networks](https://docs.nervos.org/docs/getting-started/ckb-networks) and [RPCs](https://docs.nervos.org/docs/getting-started/rpcs) documentation.
- Start learning Rust basics using the [Rust Book](https://doc.rust-lang.org/book/).
