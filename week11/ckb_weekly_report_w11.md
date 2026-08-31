## Builder Track Weekly Report — Week 11

**Name:** Hiep Thach
**Week Ending:** 30-08-2026

**Live App:** [https://ckb-credential-registry.vercel.app/](https://ckb-credential-registry.vercel.app/)

---

### Courses Completed

- **Week 11: Verification & Extended Features**
  - [CKB Credential Registry](https://github.com/hiepthach/CertifyCKB) — implemented certificate melting, batch issuance, template management, Spore SDK migration, and persistent cache.

---

### Key Learnings

- **Certificate Melting (Replacing Revocation)**
  - Replaced soft revocation with **certificate melting** — holders can destroy their DOB cell to reclaim CKB capacity.
  - `meltCertificate()` destroys the DOB cell on-chain; no data left behind.
  - Removed revocation logic from issuer, verifier, and decoder; updated all associated tests.
  - Updated documentation: Design specs, project analysis, and schedule.

- **Spore SDK Migration**
  - Migrated from `@spore-sdk/core` to `@ckb-ccc/spore` (CCC's official Spore integration).
  - Used `spore.createSpore()` and `spore.meltSpore()` instead of raw `ccc.Transaction`.
  - Cleaner API, better type safety, consistent with CCC ecosystem.

- **Persistent LocalCache**
  - Implemented `LocalCache` for persistent state management across sessions.
  - Certificates and clusters cached locally with deduplication logic.
  - Normalized storage by Spore ID for consistent retrieval.
  - Cache persistence survives page refreshes; invalidation handled on chain sync.

- **Batch Certificate Issuance**
  - Full batch issuance flow: CSV/JSON upload, entry validation, fee estimation.
  - `BatchPreview` component for reviewing entries before issuing.
  - Handles large batches with progress tracking.

- **Template Management (0 -> 50%)**
  - Certificate template service: create, read, update, delete templates.
  - Template management UI: `TemplateList` page and template application.
  - Visual config support for certificate field customization.

- **Refactoring: Mock → Cache**
  - Removed mock branches from source code; moved all mocking to test layer.
  - Renamed mock-related terminology to "cache" throughout the codebase.
  - Cleaner separation between production code and test doubles.

---

### Exercises and Practical Work

- **Built [CKB Credential Registry](https://github.com/hiepthach/CertifyCKB) — Week 11 Scope**

  **Completed Features:**
  - ✅ Certificate melting — holders can destroy certificates and reclaim CKB
  - ✅ Batch certificate issuance with CSV/JSON upload
  - ✅ Certificate template management (0 -> 50%)
  - ✅ Spore SDK migration to `@ckb-ccc/spore`
  - ✅ Persistent LocalCache for state management
  - ✅ Mock code removed from source, moved to test layer

  **Documentation:**
  - Updated all Design Specifications (Cluster, Encoder/Decoder, Certificate, Verification, UI)
  - Implementation Architecture documentation
  - Project schedule updated with new features

  **Test Coverage:** 182 tests maintained and updated for new flows.

---

### Project Progress vs Schedule

Based on [Project Schedule](https://github.com/hiepthach/CertifyCKB/tree/main/doc/Requirement_analysis/Project_Schedule.md):

| Week | Focus | Status |
|------|-------|--------|
| Week 9 | Project Setup & Provider Registration | ✅ Done |
| Week 10 | Certificate Issuance & View | ✅ Done |
| Week 11 | Verification & Extended Features | ✅ Done |
| Week 12 | Polish & Documentation | In Progress |

---

### Plan for Next Week (Week 12)

- **Polish & Documentation**
  - Final UI polish and responsive design improvements
  - Complete project documentation
  - Final verification of all flows on testnet
  - Prepare for capstone presentation
