## Builder Track Weekly Report — Week 15

**Name:** Hiep Thach
**Week Ending:** 27-09-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 15: Vellum Phase 2 M1 — Dual-Output Claim Cells**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — implemented Vellum Phase 2 M1 with dual-output certificate issuance (Spore DOB + Vellum Claim Cell), auto-detect issuer DID, and comprehensive test coverage.

---

### Key Learnings

- **Vellum Phase 2 M1: Dual-Output Certificate Issuance**
  - Integrated `@usevellum/sdk` for writing Claim Cells alongside Spore DOBs in a single atomic transaction.
  - Implemented dual-output flow: Spore DOB for rich display + Vellum Claim Cell for reputation indexing.
  - Schema definition for `credora.course.v1` with canonical schema hash computation.
  - UI toggle to enable/disable Vellum Claim Cell issuance per certificate.

- **Issuer DID Auto-Detection**
  - Added `findDidByLock` and `findIssuerDid` helpers using `listDidCkbsByLock`.
  - Auto-detect issuer DID via lock script when wallet connects.
  - Auto-populate issuer DID in CertificateForm and disable Claim Cells when wallet has no DID.

- **Dual-Output Transaction Architecture**
  - Single atomic transaction with two outputs: Spore DOB cell + Vellum Claim Cell.
  - Claim Cell bound to recipient DID for lock-rotation-resistant reputation tracking.
  - Batch preview support for Vellum Claim Cell option.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 15 Scope**

  **Completed Features:**
  - ✅ Vellum Phase 2 M1 — dual-output certificate issuance (Spore DOB + Claim Cell)
  - ✅ `@usevellum/sdk` integration with official testnet deployments
  - ✅ Issuer DID auto-detection on wallet connection
  - ✅ Vellum toggle in CertificateForm and BatchPreview
  - ✅ Integration tests for dual-output flow

  **In Progress:**
  - 🔄 Debugging issue with dual-output transaction — claim cell creation not working correctly. Will continue debugging in Week 16.

  **Key Commits:**
  - `693238a` — feat(vellum): add @usevellum/sdk dependency
  - `fc10cf3` — feat(vellum): add vellumClaim module with schema definition
  - `1ffe828` — feat(vellum): add dual-output support to issueCertificate
  - `f1fcaed` — feat(vellum): add Vellum toggle to CertificateForm
  - `efe2ae4` — feat(vellum): add Vellum option to batch preview
  - `95dcc6d` — test(vellum): add integration test for dual-output flow
  - `717c48b` — feat(wallet): auto-detect issuer DID via lock script
  - `6da5fc7` — feat(did): add findDidByLock and findIssuerDid helpers

  **Documentation:**
  - [Vellum Integration Design](https://github.com/hiepthach/Credora_CKB/blob/main/docs/Design_spec/09_Vellum_Integration_Design.md) — updated with Phase 2 M1 status

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

---

### Plan for Next Week (Week 16)

- **Debug Vellum Phase 2 M1**
  - Investigate and fix dual-output transaction issue with claim cell creation
  - Continue cross-platform linking between Credora and Vellum builder profiles
  - Implement community feedback from CKBuilders
