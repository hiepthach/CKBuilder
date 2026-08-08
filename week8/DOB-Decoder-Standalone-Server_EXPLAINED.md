> **Source repo**: [sporeprotocol/dob-decoder-standalone-server](https://github.com/sporeprotocol/dob-decoder-standalone-server)

# DOB-Decoder-Standalone-Server — Detailed Explanation

## 1. Overview

This server provides a **DOB (Digital On-chain Bitmap) rendering service**: given a Spore ID on CKB, it automatically:

1. Fetches the Spore cell from the CKB network → retrieves **DNA** (a hex string describing the content)
2. Fetches the Cluster cell from the CKB network → retrieves **decoder metadata** (RISC-V decoder info and pattern)
3. Downloads (or loads from cache) the RISC-V decoder → runs it inside **ckb-vm** to decode the DNA → returns the rendered JSON traits

---

## 2. High-Level Operation

### Entry point: `main.rs`

```
main.rs
  ├── Read settings.toml
  ├── Create DOBDecoder (contains RPC client + settings)
  ├── Start JsonRpc server on localhost:8090
  └── Expose 4 RPC methods:
        dob_protocol_version() → Vec<String>
        dob_decode(spore_id) → String (JSON)
        dob_batch_decode([spore_ids]) → Vec<String>
        dob_raw_decode(spore_data, cluster_data) → String (JSON)
```

### Entry point: `server.rs`

`DecoderStandaloneServer` implements the `DecoderRpc` trait, exposing 4 RPC methods:

#### `dob_decode(hexed_spore_id)` — main method

```
1. Parse spore_id from hex → [u8; 32]
2. Check cache: if <cache>/{spore_id}.dob is valid → return directly
3. Call decoder.fetch_decode_ingredients(spore_id)
       → fetch Spore cell → get DNA + content + cluster_id
       → fetch Cluster cell → get dob_metadata
4. Call decoder.decode_dna(dna, dob_metadata)
       → parse dob_metadata.ver
         • ver=0 or None → decode_dob0_dna
         • ver=1         → decode_dob1_dna
5. Write result to cache
6. Return JSON: { render_output: "...", dob_content: {...} }
```

#### `dob_batch_decode([spore_ids])`

Calls `decode()` in parallel for each spore_id.

#### `dob_raw_decode(spore_data, cluster_data)`

Decodes directly from raw data (no CKB network query needed).

---

## 3. Core Modules

### 3.1 `client.rs` — RPC Client to CKB

Uses `reqwest` + `jsonrpc-core` to call 4 RPC methods:

| Method | Target | Purpose |
|---|---|---|
| `get_live_cell` | CKB node | Get decoder binary directly via out_point |
| `get_cells` | CKB Indexer | Find Cluster cell by type script |
| `get_transactions` | CKB Indexer | Find Spore cell by type script (find mint tx) |
| `get_transaction` | CKB node | Get Spore cell content from tx |

The `jsonrpc!` macro automatically builds the request body, sends HTTP POST, and parses JSON-RPC 2.0 responses.

### 3.2 `decoder/mod.rs` — Core Decoding Logic

**`fetch_decode_ingredients(spore_id)`**
```
1. Find Spore cell (indexer → get_transactions → get_transaction → outputs_data)
   - Try each ScriptId in settings.available_spores sequentially
   - Get output_data of the output with index = io_index
   - Decode molecule SporeData → extract content_type, cluster_id, content, dna
   - Validate content_type matches protocol_versions

2. Find Cluster cell (indexer → get_cells)
   - Try each ScriptId in settings.available_clusters sequentially
   - Get output_data → decode molecule ClusterData → parse JSON dob_metadata
   - Return ClusterDescriptionField
```

**`decode_dna(dna, dob_metadata)`**
- Parses `dob_metadata.dob.ver`:
  - **ver=0**: `decode_dob0_dna` — runs **1 decoder** only
  - **ver=1**: `decode_dob1_dna` — runs **a chain of decoders** in sequence, each decoder receives the previous decoder's output as its 3rd argument

### 3.3 `decoder/helpers.rs` — Helper Functions

| Function | Purpose |
|---|---|
| `decode_spore_data(bytes)` | Parse molecule `SporeData` → content_type, cluster_id, content, dna |
| `decode_spore_content(bytes)` | Parse content field: supports raw hex (prefix 0x00) or JSON with "dna" field |
| `fetch_dob_content(rpc, spore_id)` | Find and decode Spore cell from CKB network |
| `fetch_dob_metadata(rpc, cluster_id)` | Find and decode Cluster cell from CKB network |
| `decode_cluster_data(bytes)` | Parse molecule `ClusterData` → dob metadata JSON |
| `fetch_decoder_binary(rpc, search_option)` | Find decoder cell by type_id/script → return binary |
| `fetch_decoder_binary_directly(rpc, tx_hash, out_index)` | Get decoder binary directly via out_point |
| `parse_decoder_path(rpc, decoder, settings)` | **Most important**: resolve decoder path — 3 location types |

### 3.4 Decoder Location Resolution (`parse_decoder_path`)

```
DecoderLocationType  | Cache file format               | Source
---------------------|-----------------------------------|------------------------------
CodeHash             | code_hash_{blake2b_hash}.bin     | onchain_decoder_deployment.toml
TypeId               | type_id_{type_id_hash}.bin        | Find on-chain via indexer
TypeScript           | type_script_{script_hash}.bin     | Find on-chain via script
```

- If cache file already exists → use it directly
- If not → fetch from source, verify hash, write to cache

### 3.5 `vm.rs` — ckb-vm Executor

Embeds `ckb-vm` (with ASM backend) to run the RISC-V decoder binary:

```
1. Load decoder binary + args into VM
2. VM execute: decoder receives A0=DNA, A1=pattern (in Dob0)
              or A0=DNA, A1=pattern, A2=previous_output (in Dob1)
3. Decoder output via debug syscall (code=2177):
   - Continuously read bytes from memory at A0 until NULL terminator
   - Collect into String vector
4. VM returns exit_code + Vec<String> outputs
5. outputs[0] is the render result
```

---

## 4. Complete Data Flow

```
Client calls dob_decode(spore_id)
  │
  ▼
server.rs: decode() → cache check?
  │
  ├── [cache hit] → read_dob_from_cache() → return ServerDecodeResult
  │
  └── [cache miss]
        │
        ▼
      decoder/mod.rs: fetch_decode_ingredients()
        │
        ├── fetch_dob_content()
        │     Find Spore cell via indexer
        │     Decode SporeData molecule
        │     Return: content, dna, cluster_id
        │
        └── fetch_dob_metadata()
              Find Cluster cell via indexer
              Decode ClusterData molecule
              Return: ClusterDescriptionField { description, dob: {...} }
        │
        ▼
      decoder/mod.rs: decode_dna(dna, dob_metadata)
        │
        ├── dob.ver = 0 → decode_dob0_dna()
        │     ├── parse_decoder_path() → decoder binary path
        │     └── vm::execute_riscv_binary(dna, pattern)
        │           Run ckb-vm with 1 decoder
        │           Return: single JSON trait
        │
        └── dob.ver = 1 → decode_dob1_dna()
              ├── parse_decoder_path() for each decoder
              └── vm::execute_riscv_binary(dna, pattern, prev_output)
                    Run chain of decoders sequentially
                    Each decoder receives output from the previous one
                    Return: Vec<StandardDOBOutput>
        │
        ▼
      write_dob_to_cache() → /cache/{spore_id}.dob
        │
        ▼
      Return ServerDecodeResult { render_output, dob_content }
```

---

## 5. Cache Mechanism

Cache file format (3 lines, newline-separated):

```
Line 1: render_output (JSON string)
Line 2: dob_content (JSON object)
Line 3: expiration_timestamp (u64 Unix epoch, 0 = never expire)
```

Expiration: compares current time vs timestamp in file. If `now > timestamp` → cache miss.

---

## 6. DOB Protocol Versions

| Version | Decoder chain | Description |
|---|---|---|
| **DOB/0** (`ver=0`) | 1 decoder | Simple, 1 RISC-V binary decodes the entire DNA |
| **DOB/1** (`ver=1`) | N decoders | Pipeline: decoder_0 → decoder_1 → ... → decoder_N, each step receives output from the previous step |

Cluster `description` field contains JSON dob metadata:
```json
{
  "description": "...",
  "dob": {
    "ver": 1,
    "decoders": [
      { "decoder": { "type": "type_id", "hash": "..." }, "pattern": {...} },
      { "decoder": { "type": "type_id", "hash": "..." }, "pattern": {...} }
    ]
  }
}
```

---

## 7. Settings (`settings.toml`)

| Field | Meaning |
|---|---|
| `protocol_versions` | List of content-type prefixes allowed to serve (e.g. `["application/dob+json"]`) |
| `ckb_rpc` | CKB RPC URL |
| `rpc_server_address` | JsonRpc server bind address (e.g. `127.0.0.1:8090`) |
| `decoders_cache_directory` | Directory for caching decoder binaries |
| `dobs_cache_directory` | Directory for caching render results |
| `dobs_cache_expiration_sec` | TTL for DOB render cache |
| `onchain_decoder_deployment` | List of `{code_hash, tx_hash, out_index}` for fetching decoder binary when location=code_hash |
| `available_spores` | List of ScriptIds of Spore cell type (code_hash + hash_type) |
| `available_clusters` | List of ScriptIds of Cluster cell type |

---

## 8. Key Dependencies

| Crate | Role |
|---|---|
| `ckb-sdk` | Constants, types, RPC client helpers |
| `ckb-types` / `ckb-jsonrpc-types` | CKB type system |
| `ckb-vm` | RISC-V VM executor with ASM backend |
| `spore-types` | Molecule definitions for Spore/Cluster data structures |
| `jsonrpsee` | JsonRpc HTTP server |
| `reqwest` | HTTP client for CKB RPC calls |
| `serde` / `serde_json` | Serialization/deserialization |

---

## 9. DOB-Decoder-Standalone-Server in the Overall Architecture

### What is it?

**It is NOT a smart contract.** It is an **off-chain server** (Rust binary) that acts as a **rendering engine** for Spore DOB.

```
┌──────────────────────────────────────────────────────────────────┐
│                         CKB LAYER 1 (On-chain)                    │
│                                                                    │
│   ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│   │  Spore Cell  │   │Cluster Cell  │   │  Decoder Cell(s)  │   │
│   │  (DNA+data)  │   │(decoder meta)│   │  (RISC-V binary)  │   │
│   └──────────────┘   └──────────────┘   └───────────────────┘   │
│         ▲                  ▲                      ▲               │
│         │                  │                      │               │
└─────────┼──────────────────┼──────────────────────┼───────────────┘
          │                  │                      │
          │ get_transactions │ get_live_cell       │ get_cells
          │ get_transaction  │                      │
          │                  │                      │
┌─────────┼──────────────────┼──────────────────────┼───────────────┐
│         │                  │                      │               │
│  OFF-CHAIN SERVER (ckb-vm embedded, Rust binary)  │               │
│         │                  │                      │               │
│  ┌──────┴──────────────────┴──────────────────────┴───────┐     │
│  │           DOB-Decoder-Standalone-Server                 │     │
│  │                                                          │     │
│  │  1. Fetch Spore + Cluster from CKB via RPC             │     │
│  │  2. Resolve decoder binary (cache or on-chain)         │     │
│  │  3. Run RISC-V decoder in embedded ckb-vm              │     │
│  │  4. Return rendered traits (JSON)                      │     │
│  │                                                          │     │
│  │  JsonRpc API: dob_decode(), dob_batch_decode()         │     │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                     query rendered traits                        │
│                           │                                     │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │               FRONTEND / APP LAYER                       │  │
│  │  Display NFT traits for users, marketplaces, galleries  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### What is the DOB Protocol — Why is this server needed?

**DOB = Digital On-chain Bitmap**

In the Spore Protocol, each Spore cell contains:

```
Spore Cell:
  ├── content_type  → "application/dob+json"
  ├── content       → { dna: "0a1b2c3d..." }  ← hex string, essentially raw data
  └── cluster_id    → link to Cluster
```

**The problem:** DNA is just a hex byte string — it has no semantic structure. It **doesn't know** on its own what to render into (color, shape, attributes...). A **decoder** (RISC-V program) is needed to:
- Input: DNA string + pattern config
- Output: JSON traits (name, color, background, layers...)

**DOB versioning:**
- **DOB/0**: 1 decoder decodes the entire DNA
- **DOB/1**: Pipeline of multiple decoders, each decoder processes a part, output of the previous decoder is the input of the next

### Why must the decoder run in ckb-vm and not native?

```
On-chain Spore Cell (CKB)
  └── DNA: "0a1b2c3d..."  (immutable, verifiable)
              │
              │ decode?
              ▼
         ┌─────────────┐
         │  ckb-vm     │  ← Ensures determinism, reproducibility
         │  (RISC-V)   │     Same way CKB validator runs scripts
         └─────────────┘
              │
              ▼
         Rendered traits
```

**Reasons for using ckb-vm instead of native:**
1. **Determinism**: ckb-vm guarantees same input → same output, independent of OS/architecture
2. **Consistency with on-chain**: CKB smart contracts also run in ckb-vm → decoder behavior matches what contracts can verify
3. **Security**: Decoder is a RISC-V binary, running in a sandboxed VM

**But why not deploy the decoder as an on-chain smart contract?**
- Decoder can be complex, consuming many cycles → costly in fees
- Decoder may need to change/add new versions (DOB versioning)
- Rendering is a "view" operation — no need to settle on-chain

→ This is the **"on-chain data, off-chain compute"** pattern — keep data on CKB for verifiability, compute rendering off-chain for flexibility and cost savings.

### Comparison with Other NFT Metadata Models

| Aspect | Ethereum (ERC-721) | CKB / Spore DOB |
|---|---|---|
| Metadata location | Off-chain (IPFS/JSON URL) | On-chain (Cluster cell) |
| Metadata mutation | Update URL (centralized) | Cluster cell is immutable, but decoder can evolve |
| Rendering | Client decode or server decode | **ckb-vm decode on server** |
| Verifiability | Trust metadata provider | DNA + decoder are both on-chain verifiable |
| Decoder format | No standard | RISC-V binary, running in ckb-vm |

### End-to-End Flow for a CKB App Using DOB

```
[User]  →  "Show my Spore NFT #42"
              │
              ▼
[Frontend App]
   │
   │  HTTP POST: dob_decode("0xabcd...")
   ▼
[DOB-Decoder-Standalone-Server]     ← ckb-vm embedded
   │
   ├─ get_transactions(indexer) → find Spore mint tx
   ├─ get_transaction()         → get DNA from outputs_data
   ├─ get_cells(indexer)        → find Cluster cell
   ├─ get_live_cell()          → get decoder binary (if type_id)
   │
   ├─ [cache hit?] → skip decode
   │
   └─ ckb-vm: execute RISC-V decoder
          Args: [dna, pattern_config]
          Output: JSON traits
   │
   ▼
{RenderOutput: { "name": "Cyberpunk #42", "traits": {...} }}
   │
   ▼
[Frontend] → Display NFT with rendered traits
```

### Summary

| Question | Answer |
|---|---|
| **Contract or tool?** | Tool — standalone Rust binary, not a smart contract |
| **Runs on what platform?** | Any OS with Rust (Linux, macOS, Docker, cloud server) |
| **Architecture role?** | **Off-chain rendering layer** — compute layer that takes on-chain DNA + Cluster metadata, decodes via ckb-vm, returns JSON traits |
| **Who uses it?** | Frontend apps, marketplaces, wallets, gallery apps — any app that needs to display Spore NFTs |
| **Why ckb-vm?** | Ensures deterministic rendering, consistent with CKB execution model |
| **Pattern?** | On-chain data (CKB L1) + Off-chain compute (DOB server) |
