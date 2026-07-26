# Mini Tip Jar - Troubleshooting & Known Issues

This document outlines the two primary errors encountered during the integration of the JoyID wallet using the CCC SDK, along with their root causes and solutions for future reference.

---

## 1. `Resolve failed Unknown(OutPoint)` Error with JoyID

**Error Message:**
```text
TransactionFailedToResolve: Resolve failed Unknown(OutPoint(0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc926300000000))
```

**Context:** 
The donation transaction worked flawlessly (100% success rate) with MetaMask but failed consistently when using JoyID.

**Root Cause:**
* The older version of the `@ckb-ccc/core` library (version `0.0.12`) hardcoded an outdated `CellDep` address for JoyID on the Testnet (`0x4dcf...`).
* This specific CellDep address no longer exists (it was pruned or is unknown) on the current CKB Testnet chain (block height ~21 million).
* When the CKB Node verified the transaction, it could not find this CellDep and consequently rejected the transaction.
* MetaMask continued to work because it relies on the OmniLock / Secp256k1 scripts, which are fundamental scripts from the Genesis block and have never changed.

**Solution:**
* Upgrade the CCC SDK libraries to their latest versions:
  * `@ckb-ccc/core`: `^1.18.1`
  * `@ckb-ccc/connector-react`: `^1.1.6`
* In the updated versions, the JoyID Testnet `CellDep` has been correctly updated to the currently active address (`0x4a596d31...`).

---

## 2. `error code 7` (Invalid Signature)

**Error Message:**
```text
Client request error TransactionFailedToVerify: Verification failed Script(TransactionScriptError { source: Inputs[0].Lock, cause: ValidationFailure: see error code 7 on page ... })
```

**Context:**
This occurred when attempting to manually separate the transaction signing (sign) and broadcasting steps specifically for JoyID.

**Root Cause:**
* Problematic code snippet:
  ```typescript
  // Incorrect:
  await signer.signTransaction(tx); // Returns a NEW signed Transaction, but the return value is ignored
  const hash = await signer.client.sendTransaction(tx); // Broadcasts the original, UNSIGNED tx
  ```
* The `signer.signTransaction(tx)` method for JoyID does not directly mutate the original `tx` object. Instead, it **returns a completely new `Transaction` object** containing the signature.
* The previous code ignored this return value and proceeded to broadcast the original `tx` (which lacked the signature), leading the CKB Node to throw an invalid signature error (error code 7).

**Solution:**
* The best and standard approach is to combine the signing and broadcasting processes using the `signer`'s `sendTransaction` method:
  ```typescript
  // Correct:
  const hash = await signer.sendTransaction(tx);
  ```
* This method automatically and correctly handles the entire flow (sign -> get result -> broadcast) for all supported wallet types (MetaMask, JoyID, UniSat, etc.).
