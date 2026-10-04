## Builder Track Weekly Report — Week 16

**Name:** Hiep Thach
**Week Ending:** 04-10-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 16: Vellum Phase 2 Completion & Atomic Claim Cell Melt**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — resolved dual-output issuance issues, implemented complete lifecycle management with atomic melting of Spore DOBs and Vellum Claim Cells, enhanced DID resolution, and polished UI error feedback.

---

### Key Learnings

- **Debugging Vellum Dual-Output Issuance**
  - Identified that `writeClaim()` from `@usevellum/sdk` returns an updated transaction instance that must be reassigned rather than relying on in-place mutation.
  - Sanitized claim payloads by stripping `undefined` fields to prevent CBOR serialization errors and schema hash mismatches during on-chain verification.

- **Vellum Claim Cell Melt & Lifecycle Management**
  - Designed the destruction lifecycle for Vellum Claim Cells: consuming the Claim Cell as a transaction input without producing an output cell, thereby reclaiming locked CKB capacity (~350 CKB) back to the holder.
  - Developed `findClaimBySporeId` utilizing `@usevellum/sdk` `readClaims()` with subject DID and canonical schema hash filters to locate associated Claim Cells.
  - Solved recipient DID mismatch during melting: certificates store recipient address in `credentialSubject.id`, but Claim Cells are indexed by `did:ckb`. Implemented caching of `subjectDid` and a 3-tier resolution fallback (cached DID → subject ID DID → holder lock script resolution via `findDidByLock`).

- **Single Atomic Melt Transaction Architecture**
  - Engineered `buildAtomicMeltTransaction` combining Spore DOB melt input and Vellum Claim Cell input in a single atomic transaction.
  - Included required Claim Type and DID Lock `cellDeps` with deduplication for on-chain script validation during Claim Cell consumption.
  - Ensures atomic execution: either both cells are consumed and all CKB capacity (~1,250 CKB total) is returned to the user, or the entire transaction fails without partial state divergence.
  - Implemented automatic fallback to standard Spore melt for legacy certificates or certificates issued without Vellum Claim Cells.

- **UI / UX Error Handling & Resilience**
  - Improved error presentation and alert styling across issuance, verification, and management pages to provide clearer feedback for transaction and script failures.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 16 Scope**

  **Completed Features:**
  - ✅ Resolved Vellum Phase 2 dual-output issuance transaction bug (merged in PR #1)
  - ✅ Claim Cell lookup by Spore ID (`findClaimBySporeId`)
  - ✅ Independent and cellDeps-aware Claim Cell melt (`meltVellumClaim`, `meltVellumClaimWithCellDeps`)
  - ✅ Cached and fallback DID resolution from holder lock script (`findDidByLock`)
  - ✅ Combined single atomic melt transaction for Spore DOB + Vellum Claim Cell (`buildAtomicMeltTransaction`, merged in PR #2)
  - ✅ Backward compatibility fallback for certificates without Claim Cells
  - ✅ UI error message styling improvements across multiple components
  - ✅ Comprehensive test suite with 43 test suites and 412 unit/integration tests passing

  **In Progress:**
  - 🔄 Cross-platform navigation & badge integration with Vellum builder profiles (awaiting Vellum M2 frontend deployment)

  **Key Commits:**
  - `dd93079` — fix(vellum): assign updated tx from writeClaim and strip undefined from claim payload
  - `e1763bf` — Merge pull request #1 from hiepthach/feature/vellum-phase2
  - `cdb09c8` — fix(vellum): use subjectDid from cache when melting Claim Cell
  - `d87e5cb` — fix(vellum): resolve DID from lock script when subjectDid not in cache
  - `48b1013` — feat(melt): add meltVellumClaimWithCellDeps for proper script execution
  - `1c63fe2` — feat(melt): add buildAtomicMeltTransaction for combined spore + claim melt
  - `c596a28` — feat(melt): use atomic transaction for spore + claim melt
  - `1522503` — feat: Enhance Vellum Claim Cell integration with melt functionality
  - `aafc56d` — Merge pull request #2 from hiepthach/feature/melt-vellum-claim
  - `9474565` — style: Improve error message styling across multiple components

  **Documentation:**
  - [Vellum Integration Design Spec](https://github.com/hiepthach/Credora_CKB/blob/main/docs/Design_spec/09_Vellum_Integration_Design.md) — updated with Phase 2 completion, melt architecture, sequence diagrams, and bug resolution details

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

---

### Plan for Next Week (Week 17)

- **Multi-DID Wallet Selection & Cluster Binding**
  - Upgrade DID query to retrieve full wallet DID list (`listIssuerDids`) instead of defaulting to `records[0]`.
  - Enhance `CertificateForm` UX: Add DID selector dropdown for multi-DID wallets and onboarding callout/guidance for 0-DID wallets when Vellum toggle is active.
  - Support optional `issuerDid` binding at Cluster level while preserving Standard Mode (pure Spore DOB without DID requirement, zero onboarding friction).


