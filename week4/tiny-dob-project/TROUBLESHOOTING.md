# Encountered Issues & Resolutions (Troubleshooting)

This document summarizes all the issues and bugs encountered during the development of the Tiny DOB project, along with their root causes and solutions.

## 1. Node Script `test-mint.js` Failures
- **Symptoms**: The script failed with errors like "Cannot find module `@ckb-ccc/core`", missing `fs` library, or module/format errors.
- **Root Cause**: The script was run standalone without proper npm setup and dependencies installed, and it contained hardcoded configuration values that diverged from the active Devnet node.
- **Resolution**:
  - Installed all required npm dependencies in the folder.
  - Converted the script to support ES Modules syntax (using `import` and handling `.js` extensions).
  - Updated the code to dynamically read contract properties (`txHash`, `codeHash`, etc.) from `src/deployment/scripts.json` generated automatically by `offckb`.
  - Used `path` and `fileURLToPath` to resolve the `scripts.json` and `images(1).jpg` paths relative to the script's directory so it runs from any current working directory.

## 2. `offckb deploy` Fails Due to Git Status (Dirty Repository)
- **Symptoms**: Running `offckb deploy` resulted in errors complaining about a dirty git repository (working directory containing uncommitted changes).
- **Root Cause**: The underlying Cargo toolchain of Rust enforces a clean git workspace before packaging and deploying scripts.
- **Resolution**: Added temporary build folders (like `ckb-rust-script/build/*`) to the `.gitignore` file to ensure they do not pollute the git state, or committed outstanding changes.

## 3. Critical Issue: `TransactionFailedToResolve: Resolve failed Unknown(OutPoint)`
- **Symptoms**: The Node test script ran successfully, but on the Web UI (`App.tsx`), despite entering the correct Tx Hash, the browser threw the error `TransactionFailedToResolve: Resolve failed Unknown(OutPoint(0x...00000000))` and displayed an incorrect balance (`157,279.00 CKB` instead of 41+ million CKB).
- **Root Cause**:
  - The `@ckb-ccc/core` library's `ClientPublicTestnet` implements an automatic fallback mechanism.
  - The browser (due to extension filters like Brave Shields or CORS policies) blocked network requests sent to the IP address `http://127.0.0.1:28114`.
  - When the local RPC call failed, the CCC Client silently fell back to the public Aggron Testnet (`https://testnet.ckb.dev`) in the background.
  - Since the Devnet transaction didn't exist on Testnet, the outpoint was unknown. The balance of `157,279.00 CKB` was the actual Testnet balance of Account 3.
- **Resolution**:
  - Changed `DEVNET_RPC_URL` from `http://127.0.0.1:28114` to `http://localhost:28114`.
  - Using `localhost` is treated as a secure context by browsers, allowing requests to pass through and avoiding the network error that triggers the Testnet fallback.

## 4. Browser stuck on cached JS (HMR broken by Type errors)
- **Symptoms**: Code changes were saved, but the browser persistently threw the same errors.
- **Root Cause**: Attempts to dynamically patch abstract classes (`ClientJsonRpc`) introduced type errors. These TypeScript compiler errors caused Parcel's background compilation process to fail, meaning the browser was never served the new bundle and remained stuck on the old cached version in memory.
- **Resolution**:
  - Reverted to standard `ccc.ClientPublicTestnet` usage from the official Nervos docs.
  - Fixed all TypeScript compilation warnings, ensuring the terminal outputted `✨ Built in...` and forced a hard refresh of the page (`Ctrl + F5`).

## 5. Infinite Re-rendering Loop on Gallery (Blinking UI)
- **Symptoms**: The "My tDOB Collection" gallery flashed rapidly and sent thousands of repeating requests to the local CKB node.
- **Root Cause**: A React Hook circular dependency. The `fetchBalanceAndGallery` function was recreated whenever `dobList` changed because `dobList` was in its dependency array. Inside `fetchBalanceAndGallery`, `setDobList(...)` was called.
  - Fetch -> Update State (`dobList`) -> Recreate Function -> Trigger `useEffect` -> Fetch -> ...
- **Resolution**:
  - Removed `dobList` from the `useCallback` dependency array.
  - Used the functional update style (`setDobList(prev => ...)`) to clean up blob URLs without capturing `dobList` in the hook closure.
