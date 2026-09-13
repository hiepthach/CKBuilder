## Builder Track Weekly Report — Week 13

**Name:** Hiep Thach
**Week Ending:** 13-09-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 13: Bug Fixes & Vellum Integration Design**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — fixed `meltCertificate` cross-certificate targeting bug, designed Vellum integration architecture, and implemented sample data for demo.

---

### Key Learnings

- **`meltCertificate` Bug Investigation & Fix**
  - Identified and fixed a critical bug where melting Certificate B could accidentally melt Certificate A.
  - Root causes: (1) Priority 3 iterated ALL certificates in cache building candidate IDs, (2) no DNA verification after finding a Spore cell, (3) cache deletion removed all entries with same txHash.
  - Fixed by: using only THIS certificate's cached data, adding DNA verification before melting, fixing cache deletion to only remove THIS certificate's entries.

- **Vellum Integration Design**
  - Designed integration architecture between Credora and Vellum for ecosystem interoperability.
  - Phase 1: `did:ckb` recipient support — completed, live on testnet.
  - Phase 2: Dual-output transaction — conceptual design for Spore DOB + Vellum Claim Cell in single transaction. Planned for implementation after Claim Cell protocol is deployed on testnet.

- **DNA Verification in Credential Flow**
  - Implemented strict DNA verification: confirm cell's DNA ID matches target certificate before melting.
  - Added `verifyCellDNA` helper to prevent cross-certificate melts.
  - Error messages now indicate pending/melted state clearly.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 13 Scope**

  **Completed Features:**
  - ✅ `meltCertificate` bug fix — cross-certificate targeting eliminated
  - ✅ DNA verification — prevents melting wrong certificate
  - ✅ Vellum integration design — Phase 1 (live) and Phase 2 (conceptual)
  - ✅ Sample data — CSV and JSON files for demo

  **Key Commits:**
  - `02dcf37` — fix: ensure meltCertificate targets only the specified certificate
  - `cf27b58` — fix: tighten DNA verification and remove unverified cell fallback
  - `3518225` — test: add regression tests and DNA fallback verification
  - `9693b00` — test: add failing tests for multi-certificate melt scenarios
  - `d0c4fe2` — feat(docs): add Vellum integration design
  - `f2355ea` — feat(docs): add comprehensive project report and demonstration guide

  **Documentation:**
  - [Project Report](https://github.com/hiepthach/Credora_CKB/blob/main/docs/PROJECT_REPORT.md) — comprehensive project report and demonstration guide
  - [Vellum Integration Design](https://github.com/hiepthach/Credora_CKB/blob/main/docs/Design_spec/09_Vellum_Integration_Design.md) — Phase 1 & 2 integration architecture
  - [Fix Plan: meltCertificate](https://github.com/hiepthach/Credora_CKB/blob/main/docs/superpowers/plans/2026-09-13-fix-melt-target-certificate.md) — full bug analysis and fix documentation

---

### Project Progress vs Schedule

| Week | Focus | Status |
|------|-------|--------|
| Week 9 | Project Setup & Provider Registration | ✅ Done |
| Week 10 | Certificate Issuance & View | ✅ Done |
| Week 11 | Verification & Extended Features | ✅ Done |
| Week 12 | Polish & Documentation | ✅ Done |
| Week 13 | Bug Fixes & Vellum Integration | ✅ Done |

---

### Plan for Next Week (Week 14)

- **DID UX Improvements & Feedback Implementation**
  - Gather and implement feedback from CKBuilders community
  - Enhance DID integration UX based on community suggestions
  - Continue Vellum Phase 2 prototype research
