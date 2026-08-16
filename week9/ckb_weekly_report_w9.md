## Builder Track Weekly Report — Week 9

**Name:** Hiep Thach
**Week Ending:** 16-08-2026

---

### Courses Completed

- **Week 9: Project Setup & Provider Registration**
  - [CKB Credential Registry](https://github.com/hiepthach/CertifyCKB) — initialized the capstone project scaffold, configured CKB devnet, and built the course provider registration flow via Spore Clusters.

---

### Key Learnings

- **Next.js 14 App Router with TypeScript**
  - Set up a new Next.js project using the App Router structure (`src/app/`, `src/components/`, `src/lib/`, `src/types/`).
  - Integrated TypeScript for type safety across the entire stack.
  - Configured Tailwind CSS with custom theme tokens and dark mode support.

- **CCC SDK & Spore SDK Integration**
  - Installed and configured `@ckb-ccc/core`, `@ckb-ccc/connector-react`, and `@spore-sdk/core`.
  - Set up `CccProvider` at the app root to enable wallet connection throughout the app.
  - Configured OffCKB devnet (`http://localhost:28114`) for local development.

- **Multi-Wallet Support**
  - Implemented wallet connection supporting JoyID, MetaMask, and WalletConnect via `@ckb-ccc/connector-react`.
  - Built `useWallet` and `useNetwork` custom React hooks to abstract wallet state and network switching.
  - Wallet address is displayed in the app header once connected.

- **Spore Cluster as Issuer Identity**
  - Understood Spore Cluster cells as the issuer organization boundary — each course provider creates one Cluster.
  - Cluster cells store configuration: name, description, provider info, certificate policy (transferable, expiration default, revocation enabled).
  - Cluster ownership is enforced by the Spore lock script — only the owner can create DOBs within the Cluster.
  - Implemented `createCluster()` service using the Spore SDK.

- **Frontend Architecture**
  - Built a modular component structure: base UI (`Button`, `Badge`, `Card`, `Input`, `Modal`, `Spinner`, `EmptyState`) + feature components (`WalletConnect`, `ClusterForm`, `ClusterList`).
  - Service layer in `src/lib/credentials/` for clean separation between UI and business logic.

---

### Exercises and Practical Work

- **Built [CKB Credential Registry](https://github.com/hiepthach/CertifyCKB) — Week 9 Scope**
  - Project scaffold: Next.js 14, TypeScript, Tailwind CSS, ESLint
  - CCC SDK + Spore SDK integration with OffCKB devnet
  - Multi-wallet connection (JoyID, MetaMask, WalletConnect)
  - `ClusterService` — createCluster, listClusters
  - Cluster creation form and provider dashboard UI

  **Project Documents:**
  - [Requirement Analysis](https://github.com/hiepthach/CertifyCKB/tree/main/doc/Requirement_analysis/Project_Analysis.md) — project overview, feature spec, data architecture, technical decisions
  - [Design Specs](https://github.com/hiepthach/CertifyCKB/tree/main/doc/Design_spec) — detailed specifications for Cluster, Encoder/Decoder, Certificate, Verification, Template, Batch Issuance, CKB Client, and UI Components

---

### Project Progress vs Schedule

Based on [Project Schedule](https://github.com/hiepthach/CertifyCKB/tree/main/doc/Requirement_analysis/Project_Schedule.md):

| Week | Focus | Status |
|------|-------|--------|
| Week 9 | Project Setup & Provider Registration | ✅ Done |
| Week 10 | Certificate Issuance & View | Planned |
| Week 11 | Verification & Extended Features | Planned |
| Week 12 | Polish & Documentation | Planned |

---

### Plan for Next Week (Week 10)

- **Certificate Issuance & View**
  - Define certificate interfaces (W3C VC Data Model)
  - Implement `encodeCertificateDNA()` — encode certificate data to W3C VC JSON
  - Implement `decodeCertificateDNA()` — decode and validate credential DNA
  - Implement `issueCertificate()` — create Spore DOB for a student
  - Build certificate issuance form UI
  - Implement `getHolderCertificates()` — query certificates by wallet
  - Build holder dashboard to view certificates
