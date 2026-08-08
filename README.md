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
| 3 | CKB Scripts (Lock & Type), Fungible Token (xUDT), NFT Overview | Done | [Report](./week3/ckb_weekly_report_w3.md) |
| 4 | DOB/Spore Protocol, Rust Script Development, Debugging & Deployment | Done | [Report](./week4/ckb_weekly_report_w4.md) |
| 5 | L1 Developer Training, Simple Lock Script, CCC Playground | Done | [Report](./week5/ckb_weekly_report_w5.md) |
| 6 | CCC Mastery, Fiber Network, xUDT & Spore, Agentic Dev Skills | Done | [Report](./week6/ckb_weekly_report_w6.md) |
| 7 | CKB-VM Deep Dive, Script Optimization, Molecule Serialization | Done | [Report](./week7/ckb_weekly_report_w7.md) |
| 8 | Spore Protocol Deep Dive, DOB Rendering, NervosDAO | Done | [Report](./week8/ckb_weekly_report_w8.md) |
| 9–12 | Capstone Project: DOB Credential & Badge Protocol | In Progress | — |

---

## Capstone Project: DOB Credential & Badge Protocol (Week 9–12)

Verifiable credentials (course completions, event attendance, skill certifications, employment history) issued as Spore DOBs organized in Clusters.

**Key Features:**
- **Fully on-chain**: All credential data stored in Spore cells (DNA = credential metadata)
- **Holder-owned**: Credentials are NFTs owned by the recipient
- **Backed by locked CKB**: Issuing requires locking CKB, reclaimable by melting the credential
- **Zero transfer fees**: CKB's model allows free credential transfers
- **Cluster organization**: Issuers create Clusters; recipients hold DOBs

---

## Tech Stack

| Category | Tools / Libraries |
|:---|:---|
| **On-chain Languages** | Rust (ckb-std, ckb-testtool, ckb-debugger) |
| **Off-chain Languages** | TypeScript / JavaScript, Python |
| **On-chain SDK** | `ckb-std`, `ckb-testtool`, `ckb-debugger` |
| **Off-chain SDK** | `@ckb-ccc/core`, `@ckb-ccc/connector-react` |
| **Frontend** | React + TypeScript + Vite, Next.js |
| **Dev Environment** | `offckb` (local devnet), CKB CLI |
| **Serialization** | Molecule (zero-copy binary serialization) |
| **Standards** | xUDT (Fungible Tokens), Spore / DOB (NFTs), NervosDAO |
| **VM** | CKB-VM (RISC-V rv64imc) |

---

## Key Projects

### Week 8 — Spore Protocol & DOB Rendering Analysis

Deep dive into Spore Protocol architecture and DOB rendering system for credential design.

- **Spore Contract Analysis**: Comprehensive analysis of 4 Spore contracts (spore, cluster, cluster_proxy, cluster_agent) with dispatch flows and co-build verification
- **DOB-Decoder-Standalone-Server**: Analyzed the off-chain rendering service that decodes DNA into semantic traits using ckb-vm

> See details in [week8/ckb_weekly_report_w8.md](./week8/ckb_weekly_report_w8.md).

### Week 7 — CKB-VM Deep Dive & Script Optimization

Dived deep into CKB-VM architecture, syscalls, cycle costs, and applied optimization techniques to real contracts.

- Studied CKB-VM execution model, RISC-V `rv64imc` instruction set, W^X memory model, and syscall architecture
- Applied binary size optimization (**44.5% reduction**) and cycle optimization (**65% reduction**) to the `hash-lock` contract
- Practiced Molecule serialization with zero-copy deserialization for structured on-chain data

> See details in [week7/ckb_weekly_report_w7.md](./week7/ckb_weekly_report_w7.md).

### Week 6 — CCC SDK Deep Dive (Tip Jar, xUDT, Spore)

Practiced utilizing CCC SDK to interact with various layer 1 assets and protocols on CKB Testnet.

- **[Mini Tip Jar](./week6/mini-tip-jar/)**: A straightforward web app demonstrating how to connect JoyID and send CKB tips
- **[xUDT Token Manager](./week6/xudt-token-manager/)**: A management UI to act as a faucet, dashboard, and transfer interface for Extensible UDT (xUDT)
- **[Spore Badge Platform](./week6/spore-badge-platform/)**: A platform for creating and gallery-viewing on-chain badges using the Spore Protocol (DOBs)

### Week 5 — My Hash Lock dApp

A robust full-stack implementation of a **Custom Hash Lock Script** demonstrating UTXO Cell Model principles, network switching, and partial transfers.

- A custom **Lock Script** in Rust (`hash-lock`), compiled to RISC-V
- A **React + Vite** Glassmorphism frontend using **CCC SDK**
- JoyID (WebAuthn) and MetaMask wallet integration on Public Testnet
- **Partial Transfer Engine**: Logic to split consumed cells and automatically re-lock the change amount with the same hash lock password

> See the full project at [week5/simple_lock_project](./week5/simple_lock_project/README.md).

### Week 4 — TinyDOB (tDOB) Protocol

The centerpiece of Month 1. A full-stack, from-scratch implementation of a **Digital Object Bundle (DOB)** protocol on CKB.

- A custom **Type Script** in Rust, compiled to RISC-V and deployed to the local devnet
- A full **React + TypeScript** frontend using the CCC SDK to mint, transfer, and burn DOBs

> See the full project at [week4/tiny-dob-project](./week4/tiny-dob-project/README.md).

### Week 2 — Store Data on Cell

Analyzed and ran the Store Data on Cell dApp from Nervos documentation:

- Successfully deployed on both **Devnet** and **Testnet**
- Learned UTF-8 ↔ Hex encoding/decoding
- Understood the "Off-chain computing, on-chain verifying" model

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
├── week5/                          # Custom Lock Script & Partial Transfers
│   ├── ckb_weekly_report_w5.md
│   ├── simple_lock_explanation.md
│   └── simple_lock_project/        # Full My Hash Lock dApp implementation
│       ├── ckb-rust-script/        # On-chain Hash Lock Rust contract
│       ├── frontend/               # React + CCC SDK Frontend
│       └── README.md               # See simple_lock_project for details
│
├── week6/                          # CCC SDK Deep Dive, xUDT, and Spore DOBs
│   ├── ckb_weekly_report_w6.md
│   ├── mini-tip-jar/               # Tip Jar using CCC & React
│   ├── xudt-token-manager/         # xUDT Token Faucet & Manager UI
│   └── spore-badge-platform/       # Spore Protocol Badge Platform
│
├── week7/                          # CKB-VM Deep Dive, Script Optimization, Molecule
│   ├── ckb_weekly_report_w7.md
│   ├── ckb_vm_deep_dive.md         # Comprehensive CKB-VM guide
│   ├── ckb_vm_optimize_practice.md  # Script optimization practice
│   └── molecule_practice_simple_lock.md  # Molecule serialization practice
│
└── week8/                          # Spore Protocol Deep Dive & DOB Rendering
    ├── ckb_weekly_report_w8.md
    ├── ANALYSIS_spore_contract.md   # Spore contract architecture analysis
    └── DOB-Decoder-Standalone-Server_EXPLAINED.md  # DOB rendering analysis
```

---

## Learning Resources

| Resource | Link |
|:---|:---|
| Nervos CKB Docs | [docs.nervos.org](https://docs.nervos.org) |
| CKB Academy | [academy.ckb.dev](https://academy.ckb.dev) |
| CCC SDK | [github.com/ckb-devrel/ccc](https://github.com/ckb-devrel/ccc) |
| Spore Protocol | [docs.spore.pro](https://docs.spore.pro) |
| NervosDAO RFC | [RFC 0023](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md) |
| Dapps with CKB Workshop | [YouTube Series](https://www.youtube.com/watch?v=iVjccs3z5q0&list=PLRke1-EE4VWFirxtxtXmW7enINVZP2Lk6) |
| L1 Developer Training | [GitBook](https://nervos.gitbook.io/developer-training-course) |

---

## Getting Started

### Prerequisites

```bash
# Install Node.js (v18+) and Rust
npm install -g @offckb/cli   # Local CKB devnet toolkit
cargo install ckb-debugger   # For debugging Rust scripts
```

### Running the Projects

Each project has its own comprehensive `README.md` containing specific build, deploy, and execution instructions:

- **Week 5 (My Hash Lock)**: [week5/simple_lock_project/README.md](./week5/simple_lock_project/README.md)
- **Week 4 (TinyDOB)**: [week4/tiny-dob-project/README.md](./week4/tiny-dob-project/README.md)
- **Week 6 (Tip Jar)**: [week6/mini-tip-jar/README.md](./week6/mini-tip-jar/README.md)
- **Week 6 (xUDT Manager)**: [week6/xudt-token-manager/README.md](./week6/xudt-token-manager/README.md)
- **Week 6 (Spore Badge)**: [week6/spore-badge-platform/README.md](./week6/spore-badge-platform/README.md)

---

## License

MIT License
