## Builder Track Weekly Report — Week 10

**Name:** Hiep Thach
**Week Ending:** 23-08-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 10: Certificate Issuance & View**
  - [CKB Credential Registry](https://github.com/hiepthach/Credora_CKB) — implemented certificate issuance and holder dashboard with full end-to-end flow.

---

### Key Learnings

- **W3C Verifiable Credentials Data Model**
  - Implemented `encodeCertificateDNA()` and `decodeCertificateDNA()` for encoding/decoding certificate data to W3C VC JSON format.
  - Certificate DNA includes: issuer, holder, issuance/expiration dates, credential subject (name, course, grade, etc.), and metadata.
  - Unique certificate ID generation using `generateCertificateId()`.

- **Certificate Issuance Flow**
  - Built full certificate issuance workflow from form submission to on-chain transaction.
  - Certificate issuance form supports course completion certificates with customizable fields.
  - Integrated with CCC SDK for on-chain certificate minting.

- **Holder Dashboard**
  - Implemented `getHolderCertificates()` to query all certificates by wallet address.
  - Certificate listing page shows all certificates held by the connected wallet.
  - Each certificate displays: course name, issuer, issuance date, expiration, and status (valid/expired/revoked).

- **Mock vs Production Filtering**
  - Filter mock certificates in production environments.
  - On-chain data is prioritized; mock data is only shown in development mode.

---

### Exercises and Practical Work

- **Built [CKB Credential Registry](https://github.com/hiepthach/Credora_CKB) — Week 10 Scope**

  **Completed Features:**
  - ✅ Can issue a course completion certificate
  - ✅ Holder can view all certificates in dashboard
  - ✅ Full issuance flow works end-to-end
  - ✅ Certificate shows on holder dashboard

  **Test Coverage (182 tests — all passing):**
  - Encoder, Decoder, Batch Issuance, Cluster Service, Verifier, Issuer, Template Service
  - UI Components: Button, Badge, Card, Input

---

### Project Progress vs Schedule

Based on [Project Schedule](https://github.com/hiepthach/Credora_CKB/tree/main/doc/Requirement_analysis/Project_Schedule.md):

| Week | Focus | Status |
|------|-------|--------|
| Week 9 | Project Setup & Provider Registration | ✅ Done |
| Week 10 | Certificate Issuance & View | ✅ Done |
| Week 11 | Verification & Extended Features | In Progress |
| Week 12 | Polish & Documentation | Planned |

---

### Plan for Next Week (Week 11)

- **Verification & Extended Features**
  - Complete verification flow with full W3C VC compliance checks
  - Batch issuance optimization for large certificate sets
  - Certificate template management UI
  - Extended cluster management features
