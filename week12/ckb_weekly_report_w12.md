## Builder Track Weekly Report — Week 12

**Name:** Hiep Thach
**Week Ending:** 06-09-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 12: Polish & Documentation**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — completed rebranding to Credora, DID integration, integration tests, UI polish, and final documentation for capstone presentation.

---

### Key Learnings

- **DID Integration (`did:ckb`)**
  - Implemented `did:ckb` recipient support for certificate issuance — recipients can now receive certificates using their CKB DID.
  - Built `DidBadge` component to display DID on certificates.
  - Added DID resolution logic in `src/lib/did/` — integrates with certificate issuance and display.
  - Supports both wallet address and DID recipient formats.

- **Rebranding to Credora**
  - Complete brand refresh: project renamed from generic "CKB Credential Registry" to **Credora**.
  - Added `CredoraLogo` component with SVG favicon and app icon.
  - Updated all pages: landing, certificates, templates, clusters, verify.
  - Renamed "Cluster" to "Institution" for clarity and consistency across the application.

- **Integration Testing**
  - Added comprehensive integration tests for certificate lifecycle: create, mint, view, verify.
  - Added batch issuance integration tests covering full flow.
  - Added DID integration tests for resolver and certificate issuance.

- **UI Polish & Quality**
  - EmptyState coverage for TemplateList and Verify pages.
  - Route loading states with Spinner component.
  - Error formatting utility and Alert component with Next.js error boundaries.
  - Print styles for certificates with improved date formatting and modal size options.
  - Loading states for certificate details with wallet connection button.
  - Batch issuance error handling with detailed hints and summaries.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 12 Scope**

  **Completed Features:**
  - ✅ DID integration — `did:ckb` recipient support for certificate issuance
  - ✅ Credora branding — logo, favicon, metadata, institution naming
  - ✅ Integration tests — certificate lifecycle and batch issuance
  - ✅ UI polish — EmptyState, loading states, error handling, print styles

  **Next Actions:**
  - Demo materials — demo, sample recipients CSV/JSON, screencast guide
  - Receive feedback from CKBuilders community and implement improvements

  **Test Coverage:**
  - Unit tests, integration tests, UI component tests — all maintained and passing

---

### Capstone Project Summary

**Credora** — A verifiable credentials platform for course completion certificates built on Nervos CKB.

**Key Features:**
- Issue W3C VC-compliant course completion certificates
- Holder dashboard to view and manage certificates
- Batch certificate issuance with CSV/JSON upload
- Certificate template management
- Certificate verification with expiration checks
- Certificate melting to reclaim CKB capacity
- DID integration (`did:ckb`) for recipient identification
- Full on-chain storage via Spore Protocol

**Tech Stack:**
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- `@ckb-ccc/core`, `@ckb-ccc/connector-react`, `@ckb-ccc/spore`
- Vitest for testing

**Project Links:**
- [Repository](https://github.com/hiepthach/Credora_CKB)
- [Live App](https://credora-ckb.vercel.app/)

