# CKBuilder — CKB Builder Track Journey

> A 12-week, hands-on learning program documenting my journey from CKB fundamentals to building a production-ready Capstone dApp on the Nervos Network.

## About

| | |
|---|---|
| **Program** | Community Keeps Building — Builder Track |
| **Duration** | 12 Weeks (June – September 2026) |
| **Developer** | Hiep Thach |
| **Reviewer** | Neon (Community Catalyst Lead) |

---

## Progress Overview

| Week | Topic | Status | Weekly Report |
|:---:|:---|:---:|:---:|
| 1 | CKB Foundations, Cell Model, First Transaction | Done | [Report](./week1/ckb_weekly_report_w1.md) |
| 2 | Cell Model Deep Dive, Transaction Building, Store Data on Cell | Done | [Report](./week2/ckb_weekly_report_w2.md) |
| 3 | CKB Scripts (Lock & Type), Fungible Token (xUDT) | Done | [Report](./week3/ckb_weekly_report_w3.md) |
| 4 | DOB/Spore Protocol, Rust Script Development, Debugging & Deployment | Done | [Report](./week4/ckb_weekly_report_w4.md) |
| 5 | L1 Developer Training, Simple Lock Script, CCC Playground | Done | [Report](./week5/ckb_weekly_report_w5.md) |
| 6 | CCC Mastery, Community Manuals | In Progress | — |
| 7–12 | Advanced Topics & Capstone Project | Planned | — |

---

## Tech Stack

| Category | Tools / Libraries |
|:---|:---|
| **Languages** | Rust (on-chain scripts), TypeScript, Python |
| **On-chain SDK** | `ckb-std`, `ckb-testtool` |
| **Off-chain SDK** | `@ckb-ccc/core` (CCC — Common CKB Component) |
| **Frontend** | React + TypeScript + Vite |
| **Dev Environment** | `offckb` (local devnet), CKB CLI |
| **Debugging** | `ckb-debugger`, GDB (via VS Code) |
| **Standards** | xUDT (Fungible Tokens), Spore / DOB (Digital Object Bundles) |

---

## Repository Structure

```
CKBuilder/
├── week1/                          # Foundations & First Transaction
│   ├── ckb_weekly_report_w1.md
│   ├── academy_basic_theory_summary.md
│   ├── ckb_concepts_summary.md
│   └── practice-transfer-ckb-guide.md
│
├── week2/                          # Cell Model & Store Data on Cell dApp
│   ├── ckb_weekly_report_w2.md
│   ├── academy_basic-operation.md
│   ├── store_data_on_cell_explanation.md
│   └── logs/                       # Screenshots & proofs
│
├── week3/                          # Scripts & Fungible Token (xUDT) dApp
│   ├── ckb_weekly_report_w3.md
│   └── logs/                       # Screenshots & proofs
│
├── week4/                          # DOB Protocol, Rust Script Dev & Debugging
│   ├── ckb_weekly_report_w4.md
│   ├── create_dob_explanation.md
│   └── tiny-dob-project/           # Full TinyDOB dApp implementation
│       └── README.md               # See tiny-dob-project for details
│
└── week5/                          # Custom Lock Script & Partial Transfers
    ├── ckb_weekly_report_w5.md
    ├── simple_lock_explanation.md
    └── simple_lock_project/        # Full My Hash Lock dApp implementation
        ├── ckb-rust-script/        # On-chain Hash Lock Rust contract
        ├── frontend/               # React + CCC SDK Frontend
        └── README.md               # See simple_lock_project for details
```

---

## Key Projects

### Week 5 — My Hash Lock dApp

A robust full-stack implementation of a **Custom Hash Lock Script** demonstrating UTXO Cell Model principles, network switching, and partial transfers.

**What was built:**
- A custom **Lock Script** in Rust (`hash-lock`), compiled to RISC-V.
- A **React + Vite** Glassmorphism frontend using **CCC SDK**.
- JoyID (WebAuthn) and MetaMask wallet integration on Public Testnet.
- **Partial Transfer Engine**: Logic to split consumed cells and automatically re-lock the change amount with the same hash lock password.

> See the full project at [week5/simple_lock_project](./week5/simple_lock_project/README.md).

### Week 4 — TinyDOB (tDOB) Protocol

The centerpiece of Month 1. A full-stack, from-scratch implementation of a **Digital Object Bundle (DOB)** protocol on CKB.

**What was built:**
- A custom **Type Script** in Rust, compiled to RISC-V and deployed to the local devnet.
- A full **React + TypeScript** frontend using the CCC SDK to mint, transfer, and burn DOBs.

> See the full project at [week4/tiny-dob-project](./week4/tiny-dob-project/README.md).

---

## Getting Started

### Prerequisites

```bash
# Install Node.js (v18+) and Rust
npm install -g @offckb/cli   # Local CKB devnet toolkit
cargo install ckb-debugger   # For debugging Rust scripts
```

### Running the Projects

Each project has its own comprehensive `README.md` containing specific build, deploy, and execution instructions. Please navigate to the respective project directories to run them:

- **Week 5 (My Hash Lock)**: Navigate to `week5/simple_lock_project/` and read the [README](./week5/simple_lock_project/README.md).
- **Week 4 (TinyDOB)**: Navigate to `week4/tiny-dob-project/` and read the [README](./week4/tiny-dob-project/README.md).

---

## Learning Resources

| Resource | Link |
|:---|:---|
| Nervos CKB Docs | [docs.nervos.org](https://docs.nervos.org) |
| CKB Academy | [academy.ckb.dev](https://academy.ckb.dev) |
| CCC SDK | [github.com/ckb-devrel/ccc](https://github.com/ckb-devrel/ccc) |
| Spore Protocol | [docs.spore.pro](https://docs.spore.pro) |
| Dapps with CKB Workshop | [YouTube Series](https://www.youtube.com/watch?v=iVjccs3z5q0&list=PLRke1-EE4VWFirxtxtXmW7enINVZP2Lk6) |

---


