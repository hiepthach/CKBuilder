## Builder Track Weekly Report — Week 17

**Name:** Hiep Thach
**Week Ending:** 11-10-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 17: Issuer Identity Governance & Multi-DID Wallet Selection**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — researched and resolved issuer identity governance challenges: implemented multi-DID wallet selection, zero-DID onboarding guidance, and Cluster-level DID binding to support real-world educational organization workflows.

---

### Key Learnings

- **Identity Governance for Institutional Issuers (Concern 3 from Week 16 Walkthrough)**
  - Analyzed the gap in the existing `findIssuerDid` helper: it silently picked `records[0]` from the DID list, creating an ambiguity risk when a wallet controls multiple DIDs (e.g., a faculty member managing both a personal DID and an institution's DID simultaneously).
  - Designed a 3-case UX model for DID selection: `> 1 DID` → dropdown selector, `= 1 DID` → auto-select with confirmation badge, `= 0 DID` → onboarding callout with direct link to Vellum DID registrar.

- **`listIssuerDids` — Full DID List Query**
  - Implemented `listDidsByLock` and `listIssuerDids` in `src/lib/did/index.ts`, returning the complete list of `did:ckb` identities controlled by the wallet's lock script.
  - Applied backward-compatible design: kept the existing `findIssuerDid` (single result) for legacy code paths while the new functions expose the full array.

- **Cluster-Level DID Binding for Course Providers**
  - Extended `ClusterDescription` (the Spore Cluster metadata JSON) with an optional `issuerDid?: string` field, storing the bound organizational identity alongside the course name and description.
  - When creating certificates within a bound cluster, `CertificateForm` automatically pre-populates and locks the `issuerDid` field, removing the need for repeated manual selection and preventing accidental DID mismatches at the per-certificate level.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 17 Scope**

  **Completed Features:**
  - ✅ `listDidsByLock` and `listIssuerDids` helpers in `src/lib/did/index.ts` — full multi-DID wallet query (merged in PR #3)
  - ✅ `useWallet` hook extended with `issuerDids: string[]` and `isLoadingIssuerDids: boolean`
  - ✅ `CertificateForm` multi-DID UX: dropdown selector (`> 1 DID`), auto-select badge (`= 1 DID`), onboarding callout with Vellum link (`0 DID`)
  - ✅ Cluster metadata `issuerDid?: string` optional field in `ClusterDescription` type and `cluster.ts` parser
  - ✅ `ClusterForm` optional DID dropdown binding (only from wallet's own `issuerDids`, prevents DID impersonation)
  - ✅ `CertificateForm` auto-populates and pre-selects the issuerDid when issuing from a cluster with a bound DID (merged in PR #4)
  - ✅ Test suite expanded to **44 test suites and 425 tests passing (100%)**

  **In Progress:**
  - 🔄 Cross-platform navigation & badge integration with Vellum builder profiles (awaiting Vellum M2 frontend deployment)
  - 🔄 E2E Vellum dashboard indexing verification & `credora.course.v1` schema registration

  **Key Commits:**
  - `4bf8731` — feat(did): add listDidsByLock and listIssuerDids helper functions
  - `51a03e7` — feat(wallet): expose issuerDids and isLoadingIssuerDids in useWallet
  - `d141d7f` — feat(ui): add multi-DID selector and 0-DID onboarding CTA in CertificateForm
  - `17ef6c4` — Merge pull request #3 from hiepthach/feature/multi-did-selection
  - `2182928` — feat(cluster): support optional issuerDid in Cluster metadata
  - `9ca39cd` — feat(ui): add optional issuerDid selector in ClusterForm
  - `c5782d2` — feat(issue): auto-populate and pre-select cluster's bound issuerDid in CertificateForm
  - `d5365fd` — Merge pull request #4 from hiepthach/feature/cluster-did-binding

---

### Project Progress vs Schedule

| Week | Focus | Status |
|------|-------|--------|
| Week 9 | Project Setup & Provider Registration | ✅ Done |
| Week 10 | Certificate Issuance & View | ✅ Done |
| Week 11 | Verification & Extended Features | ✅ Done |
| Week 12 | Polish & Documentation | ✅ Done |
| Week 13 | Bug Fixes & Vellum Integration | ✅ Done |
| Week 14 | Community Feedback & UX | ✅ Done |
| Week 15 | Vellum Phase 2 M1 | ✅ Done |
| Week 16 | Vellum Phase 2 Completion & Atomic Melt | ✅ Done |
| Week 17 | Issuer Identity Governance & Multi-DID Selection | ✅ Done |

---

### Plan

- **E2E Vellum Dashboard Verification & Schema Registration**
  - Verify that Claim Cells minted by Credora are correctly indexed on [dashboard.usevellum.xyz](https://dashboard.usevellum.xyz)
  - Check that Vellum Reputation Engine (Policy v5) scores `credora.course.v1` claims
  - Submit `credora.course.v1` schema manifest to Vellum Schema Registry


