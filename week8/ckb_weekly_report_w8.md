## Builder Track Weekly Report — Week 8

**Name:** Hiep Thach
**Week Ending:** 08-08-2026

---

### Courses Completed

- **Spore Protocol Deep Dive**
  - [Spore Protocol Documentation](https://docs.spore.pro/) — deep analysis of the Spore NFT protocol architecture, covering all 4 contracts: spore, cluster, cluster_proxy, and cluster_agent.
  - Studied the Mint/Transfer/Burn dispatch flow and co-build action verification pattern.
- **DOB (Digital On-chain Bitmap) Protocol**
  - [DOB Protocol](https://docs.spore.pro/dob/Introduction) — explored the DOB rendering system: how DNA (hex string) is decoded into semantic traits using RISC-V decoders running in ckb-vm.
  - Understood the "on-chain data, off-chain compute" pattern for scalable NFT metadata rendering.
- **NervosDAO**
  - [RFC 0023: DAO Deposit Withdraw](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md) — studied the NervosDAO mechanism, a decentralized savings protocol on CKB that compensates for state rent.
  - Understood how deposits lock CKB, compensation cells calculate dividends, and the withdraw process works.

---

### Key Learnings

- **Spore Contract Architecture**
  - Spore is an NFT protocol with 4 complementary contracts working together:
    - `spore`: Core NFT — create, transfer, burn Spore cells (containing content + DNA)
    - `cluster`: Groups related Spores together with metadata
    - `cluster_proxy`: Lock proxy — enables cluster ownership without requiring the cluster cell in the same transaction
    - `cluster_agent`: Agent cell — replaces cluster in a transaction for more flexible ownership modes
  - All operations dispatch based on (input_count, output_count): Mint (0,1), Transfer (1,1), Burn (1,0)
  - Type ID is derived from transaction structure, ensuring unique IDs that cannot be forged.

- **DOB Protocol & Rendering**
  - DOB = Digital On-chain Bitmap — DNA is an opaque hex string that requires a RISC-V decoder to render into meaningful traits.
  - DOB/0: Single decoder processes entire DNA
  - DOB/1: Pipeline of decoders, each receiving output from the previous decoder
  - Decoders run in ckb-vm (embedded in the DOB-Decoder-Standalone-Server) to ensure deterministic, reproducible rendering.

- **On-chain Data + Off-chain Compute Pattern**
  - Spore cells store immutable DNA on CKB L1 — verifiable and permanent
  - Rendering happens off-chain in the DOB-Decoder-Standalone-Server using ckb-vm
  - This separation keeps on-chain data minimal and verifiable while allowing complex, evolving rendering logic off-chain

- **Cluster Metadata & Decoder Resolution**
  - Cluster cells contain JSON metadata including decoder configuration (type_id, code_hash, or type_script)
  - Decoder binaries can be fetched from on-chain cells (type_id) or cached locally (code_hash)
  - Cache mechanism ensures efficient repeated decoding of the same Spore

- **NervosDAO**
  - Depositors lock CKB in NervosDAO to receive compensation (dividends) that offsets state rent.
  - Withdrawal is a two-phase process: request withdraw → wait for finalization → claim compensation.
  - The protocol ensures long-term depositors are rewarded proportionally to their deposit duration.

---

### Exercises and Practical Work

#### 1. Spore Contract Analysis

Documented a comprehensive analysis of the Spore protocol contracts with Mermaid diagrams showing:

- Architecture overview (all 4 contracts + shared lib + mutant extension)
- Dispatch flow for each contract (Mint/Transfer/Burn)
- Type ID mechanism
- Co-build action verification pattern
- Security checks (immutable fields, no conflict, immortal NFT, etc.)

**Details:** [ANALYSIS_spore_contract.md](ANALYSIS_spore_contract.md)

#### 2. DOB-Decoder-Standalone-Server Deep Dive

Analyzed the off-chain rendering service that powers Spore DOB rendering:

- 4 RPC methods: `dob_protocol_version()`, `dob_decode()`, `dob_batch_decode()`, `dob_raw_decode()`
- Complete data flow: CKB RPC → fetch Spore/Cluster → resolve decoder → ckb-vm execute → JSON output
- Cache mechanism with TTL
- Why ckb-vm (determinism, consistency with on-chain execution, sandboxed security)

**Details:** [DOB-Decoder-Standalone-Server_EXPLAINED.md](DOB-Decoder-Standalone-Server_EXPLAINED.md)

---

### Project Selection for Week 9-12: DOB Credential & Badge Protocol

After exploring various project ideas suggested by Neon, selected **DOB Credential & Badge Protocol** as the capstone project.

**Project Summary:**

Verifiable credentials (course completions, event attendance, skill certifications, employment history) issued as Spore DOBs organized in Clusters.

- **Fully on-chain**: All credential data stored in Spore cells (DNA = credential metadata)
- **Holder-owned**: Credentials are NFTs owned by the recipient
- **Backed by locked CKB**: Issuing requires locking CKB, reclaimable by melting the credential
- **Zero transfer fees**: CKB's model allows free credential transfers
- **Cluster organization**: Issuers create Clusters; recipients hold DOBs

**Target use cases:**
- Online course certificates (completion proofs)
- Event attendance badges
- Professional skill certifications
- Employment history verification

---

### Plan for Next Week (Week 9)

- **Project Planning**: Break down the DOB Credential & Badge Protocol into manageable phases, define milestones and deliverables.
- **Environment Setup**: Initialize project repository, configure build tools, set up devnet environment.
- **Technical Research & Specification**: Research existing credential standards (W3C VC, blockcerts), design the credential schema and architecture, write detailed specification document.
