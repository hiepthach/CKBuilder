## Builder Track Weekly Report — Week 7

**Name:** Hiep Thach  
**Week Ending:** 02-08-2026

---

### Courses Completed

- **Module 7: CKB Script Programming Series**
  - [Lesson 12: CKB-VM Deep Dive](https://website-sooty-chi-72.vercel.app/lessons/12-ckb-vm-deep-dive) — covering execution model, syscall architecture, cycle costs, and the RISC-V `rv64imc` instruction set.
  - [CKB RFC 0003: CKB-VM Specification](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0003-ckb-vm/0003-ckb-vm.md) — for the W^X memory model and ELF binary execution flow.
  - Explored advanced topics including cryptographic freedom, multi-language support for on-chain scripts, and the rationale behind CKB's RISC-V choice.
- **Advanced Script Programming Insights**
  - Read through the CKB Script Programming Series to gain deeper understanding of Nervos CKB's unique programming model.
  - Acquired new perspectives on writing efficient, production-ready smart contracts on CKB-VM.

---

### Key Learnings

- **CKB-VM Architecture**
  - CKB-VM is a pure software RISC-V interpreter (~3,000 lines of Rust) with strict sandbox isolation: no filesystem, no network, no randomness sources.
  - All scripts execute with deterministic results — a critical requirement for blockchain consensus.
  - The VM uses the `rv64imc` variant: 64-bit registers, base integer ISA, multiply/divide extension, and compressed instructions (25-30% smaller binary size).

- **Syscall System & Introspection**
  - Syscalls are the sole bridge for scripts to interact with external data (transaction info, cell data, block headers).
  - Key syscalls include `load_cell`, `load_cell_data`, `load_witness`, `load_tx_hash`, `load_script`, and introspection calls like `current_cycles` and `vm_version`.
  - CKB2023+ Hardfork introduced multi-VM support with `spawn` syscall for modular script architecture.

- **Cycle Cost Model**
  - Each RISC-V instruction executed in CKB-VM consumes a fixed number of cycles.
  - Signature verification is expensive: secp256k1 ~1.2M cycles, secp256r1 ~3M cycles, ed25519 ~2.5M cycles.
  - Hashing is relatively cheap: Blake2b-256 (32 bytes) only ~1,600 cycles — nearly 2x faster than SHA-256 on CKB-VM.

- **Script Optimization**
  - Custom `debug!` macro with `#[cfg(debug_assertions)]` completely eliminates debug syscalls in release builds.
  - Binary size can be reduced by 44%+ using `panic = "abort"`, `lto = true`, `opt-level = "z"`, and `strip = true`.
  - Cycle consumption can be cut by 65%+ by removing debug logging and applying release optimizations.

- **Molecule Serialization**
  - Molecule provides canonical, zero-copy, binary-compact serialization essential for CKB's consensus requirements.
  - Seven data types: `byte`, `array`, `struct` (fixed-size) and `vector`, `table`, `option`, `union` (dynamic-size).
  - Key rule: All multi-byte integers in headers use Little-Endian encoding for O(1) access on RISC-V.
  - Schema evolution: New fields can only be appended to the END of tables for backward compatibility.

---

### Exercises and Practical Work

#### 1. Molecule Serialization Practice

Applied Molecule serialization to the `hash-lock` contract from Week 5 to replace raw byte parsing with structured, zero-copy deserialization.

**Details:** [molecule_practice_simple_lock.md](molecule_practice_simple_lock.md)

**Evidence:** Deployed successfully on devnet — transaction confirmed on-chain. (See: [week5/simple_lock_project/logs/devnet/molecule/](week5/simple_lock_project/logs/devnet/molecule/))

#### 2. Script Optimization Practice

Applied optimization techniques from the CKB-VM Deep Dive to the `hash-lock` contract to reduce both binary size and cycle consumption.

**Details:** [ckb_vm_optimize_practice.md](ckb_vm_optimize_practice.md)

**Results measured with `ckb-debugger`:**

| Metric | Before | After | Improvement |
| :--- | ---: | ---: | ---: |
| **Binary Size** | 51,104 bytes | 28,352 bytes | **-44.5%** |
| **Cycle Count** | 32,506 cycles | 11,381 cycles | **-65.0%** |

**Evidence:** Build logs and cycle measurements captured. (See: [week5/simple_lock_project/logs/optimize_script/](week5/simple_lock_project/logs/optimize_script/))

---

### Verification Results

- **Molecule Practice**:
  - Contract deployed successfully on devnet with new Molecule-based witness structure.
  - Frontend correctly encodes witness data using CCC's Molecule codec.
  - Transaction committed on-chain: `0x84ef3632b429161a5a1e871d47fa1a23d8b94f4bf3fbbcef82921c1326bd2322`

- **Optimization Practice**:
  - Binary reduced from **51,104 → 28,352 bytes** (-44.5%).
  - Cycles reduced from **32,506 → 11,381** (-65.0%).
  - Separate debug/release build workflow verified via Makefile.

---

### Plan for Next Week (Week 8)

- **Capstone Project Kickoff**: Discuss with Neon to define the capstone project scope and objectives.
- **Initial Research**: Conduct preliminary research on the chosen capstone topic, explore relevant CKB patterns and existing solutions.
- **Weekly Report #8**: Document project proposal and initial research findings.
