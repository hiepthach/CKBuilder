# TinyDOB On-Chain Smart Contract Workspace

This directory contains the on-chain validation contract logic, written in Rust, for the TinyDOB (tDOB) protocol. It enforces transaction rules for minting, transferring, and burning DOB cells on the Nervos CKB blockchain.

## Workspace Structure

- `contracts/tiny-dob-script/`: The main Rust project for the validation script.
  - `src/main.rs`: Contains the entry point and core validation logic (Mint, Transfer, Burn rules).
- `tests/`: Integration test suite using `ckb-testtool` to verify contract rules in a simulated CKB-VM.
- `Makefile`: Automates building, testing, and cleaning the RISC-V target binary.
- `DEBUGGING.md`: Detailed guide for debugging the contract via GDB and VSCode.

## Protocol Validation Rules

The contract `tiny-dob-script` dynamically determines the lifecycle phase of a tDOB cell by inspecting the input and output count within the current script group:

### 1. Minting (0 Inputs, 1 Output in Script Group)
- **Rules**:
  - Validates that the transaction's first input `OutPoint` is unique.
  - Verifies that the 32-byte DOB ID (defined in the Type Script args) matches:
    $$\text{DOB\_ID} = \text{blake2b}(\text{first\_input\_outpoint} + \text{output\_index})$$
  - Ensures the cell output data is non-empty and follows the layout structure:
    `[1-byte content_type_len] + [content_type] + [content]`

### 2. Transferring (1 Input, 1 Output in Script Group)
- **Rules**:
  - Enforces the absolute immutability of the DOB.
  - Compares the input cell's data and the output cell's data in the script group. If they differ, validation fails with a data-modification error (`ERR_DATA_CHANGED`).

### 3. Burning / Melting (1 Input, 0 Outputs in Script Group)
- **Rules**:
  - Permits the cell's destruction so the owner can unlock and reclaim the occupied CKB capacity.

## Getting Started

### Prerequisites

Ensure you have the CKB compiler toolchain (specifically the RISC-V target `riscv64imac-unknown-none-elf` or a working Docker environment depending on your setup) and standard Rust/Cargo tools.

### Commands

*   **Build the Contract**:
    ```bash
    make build
    ```
    *Compiles the contract. The stripped RISC-V binary will be generated at `build/release/tiny-dob-script`.*

*   **Run Integration Tests**:
    ```bash
    make test
    ```
    *Runs the automated Rust tests under the `tests/` directory to verify Mint, Transfer, Burn, and validation error scenarios using `ckb-testtool`.*

*   **Clean Workspace**:
    ```bash
    make clean
    ```
    *Removes all compiled build targets and cargo caches.*

## Debugging

To debug RISC-V execution step-by-step or run a GDB session, please follow the detailed steps in [DEBUGGING.md](DEBUGGING.md).
