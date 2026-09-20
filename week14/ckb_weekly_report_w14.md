## Builder Track Weekly Report — Week 14

**Name:** Hiep Thach
**Week Ending:** 20-09-2026

**Live App:** [https://credora-ckb.vercel.app/](https://credora-ckb.vercel.app/)

---

### Courses Completed

- **Week 14: Community Feedback & UX Enhancements**
  - [Credora](https://github.com/hiepthach/Credora_CKB) — implemented theme toggle, exact CKB capacity calculation, UI improvements, and submitted project to CKBuilders showcase.

---

### Key Learnings

- **Exact CKB Capacity Calculation**
  - Implemented consensus-accurate capacity calculation for single and batch certificate issuance.
  - Real-time locked capacity preview for single minting with debounced updates.
  - Per-row and total estimation for batch issuance.
  - Follows CKB RFC 0017 / RFC 0022 specifications.

- **Theme Toggle & UI Improvements**
  - Implemented light/dark theme toggle with `useTheme` hook.
  - Updated styles for badges, buttons, and verification results.
  - Improved UI components: Alert, Modal, AccountMenu.
  - Comprehensive test coverage for new components.

- **Community Engagement**
  - Submitted Credora to [CKBuilders Projects Showcase](https://github.com/Nervos-Community-Catalyst/CKBuilder-projects/issues/36) for community feedback.
  - Seeking guidance on DID resolution UX, capacity/fee business model, and W3C VC alignment scope.
  - Requested feedback on feature prioritization: Vellum Claim Cell, Verified Issuer Registry, Soulbound DOB Policy, or Mainnet readiness.

---

### Exercises and Practical Work

- **Built [Credora](https://github.com/hiepthach/Credora_CKB) — Week 14 Scope**

  **Completed Features:**
  - ✅ Exact CKB capacity calculation — single and batch issuance
  - ✅ Theme toggle — light/dark mode with useTheme hook
  - ✅ UI improvements — badges, buttons, verification results, Alert, Modal
  - ✅ CKBuilders showcase submission — [#36](https://github.com/Nervos-Community-Catalyst/CKBuilder-projects/issues/36)

  **Key Commits:**
  - `2c239f6` — feat(capacity): implement exact CKB capacity calculation for single and batch issuance
  - `4714e48` — feat: implement theme toggle functionality and improve UI components
  - `f0afc0f` — feat: update theme styles for badges, buttons, and verification results

  **Documentation:**
  - [CKBuilders Showcase #36](https://github.com/Nervos-Community-Catalyst/CKBuilder-projects/issues/36) — project summary, current features, planned roadmap, and feedback request

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

---

### Plan for Next Week (Week 15)

- **Implement Community Feedback**
  - Review and prioritize feedback from CKBuilders community
  - Address DID resolution UX improvements
  - Continue Vellum Phase 2 prototype research
