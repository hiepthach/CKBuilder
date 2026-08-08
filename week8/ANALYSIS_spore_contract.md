# Spore Contract Analysis

> **Source:** [sporeprotocol/spore-contract](https://github.com/sporeprotocol/spore-contract)

## 1. Overview

Spore is an NFT protocol on CKB, consisting of 4 main contracts:

| Contract | Function |
|---|---|
| `spore` | Create / transfer / burn NFT (Spore cell) |
| `cluster` | Groups Spore cells together |
| `cluster_proxy` | Lock Proxy — allows cluster ownership without cluster in the same transaction |
| `cluster_agent` | Agent cell — replaces cluster in a transaction |

---

## 2. Architecture Overview

```mermaid
graph TB
    subgraph "CKB Transaction"
        TX["Transaction"]
        TX --> INPUTS["Inputs"]
        TX --> OUTPUTS["Outputs"]
        TX --> DEPS["CellDeps"]
    end

    subgraph "4 Spore Contracts"
        SPORE["spore<br/>NFT"]
        CLUSTER["cluster<br/>groups Spores"]
        PROXY["cluster_proxy<br/>lock proxy"]
        AGENT["cluster_agent<br/>agent"]
    end

    subgraph "Lib (shared)"
        ERRORS["errors<br/>Error enum"]
        TYPES["types<br/>Molecule types"]
        UTILS["utils<br/>helpers"]
    end

    subgraph "Spore Extension"
        MUTANT["mutant<br/>Lua extension"]
    end

    SPORE <--> CLUSTER
    SPORE --> MUTANT
    CLUSTER --> MUTANT
    AGENT --> CLUSTER
    AGENT -.-> PROXY

    TX --> SPORE
    TX --> CLUSTER
    TX --> PROXY
    TX --> AGENT
```

**Common processing flow across all contracts:**

1. **Count** — count cells of the same type in Input / Output
2. **Dispatch** — classify operation based on (input_count, output_count)
3. **Validate** — check data, args, ownership, MIME
4. **Co-build** — verify action from co-build script
5. **Done** — return Ok() or Error

---

## 3. Folder Structure

```
spore-contract/
├── contracts/
│   ├── spore/
│   │   ├── build.rs
│   │   └── src/
│   │       ├── main.rs          # entry point, no_std setup
│   │       ├── entry.rs         # Mint / Transfer / Burn logic
│   │       └── hash.rs          # whitelist code hashes
│   ├── cluster/
│   │   ├── build.rs
│   │   └── src/
│   │       ├── main.rs
│   │       ├── entry.rs
│   │       └── hash.rs
│   ├── cluster_proxy/
│   │   ├── build.rs
│   │   └── src/
│   │       ├── main.rs
│   │       ├── entry.rs
│   │       └── hash.rs
│   ├── cluster_agent/
│   │   ├── build.rs
│   │   └── src/
│   │       ├── main.rs
│   │       ├── entry.rs
│   │       └── hash.rs
│   └── spore_extension_lua/
│       ├── build.rs
│       └── src/
│           ├── main.rs
│           ├── entry.rs         # Lua VM extension
│           └── error.rs
├── lib/
│   ├── build/                   # molecule generated code
│   ├── errors/                  # Error enum definitions
│   ├── types/
│   │   ├── generated/           # Mol types: SporeData, ClusterData, Action...
│   │   └── schemas/
│   │       └── spore.mol        # Mol schema
│   └── utils/                   # Shared helpers (MIME, type_id, find_cell...)
├── tests/                        # Capsule integration tests
├── deployment/                   # Deployment scripts
├── docs/                         # RFC, versions history
├── Cargo.toml                     # Workspace root
├── capsule.toml                  # Capsule build config
└── rust-toolchain
```

---

## 4. Spore Contract (`contracts/spore/src/entry.rs`)

### 4.1 Data Structure

```rust
SporeData {
    content: Vec<u8>,        // blob content
    content_type: String,    // MIME type, e.g. "image/png"
    cluster_id: Opt<Byte32>, // cluster this spore belongs to
}
```

- Serialized using **Molecule**.
- **Spore ID** = **type_id** (derived from script args).

### 4.2 Entry Point — Dispatch by cell count

```mermaid
flowchart TD
    START["entry()"]
    Q{"(input_count, output_count)"}

    START --> Q
    Q -->|"0, 1"| MINT["Mint"]
    Q -->|"1, 0"| BURN["Burn"]
    Q -->|"1, 1"| TRANSFER["Transfer"]
    Q -->|"_"| ERR["❌ Reject"]
```

### 4.3 Mint (0 input, 1 output)

```mermaid
flowchart TD
    START["Mint Spore"]
    V1["Validate data<br/>content & content_type not empty"]
    V2["Verify Spore ID<br/>= type_id"]
    V3["Parse MIME<br/>validate multipart if needed"]
    V4["Check cluster ownership<br/>Cluster / Agent / Lock Proxy mode"]
    V5["Run mutant extensions<br/>if any"]
    V6["Verify co-build action<br/>MintSpore"]
    END["✅ Pass / ❌ Error"]

    START --> V1 --> V2 --> V3 --> V4 --> V5 --> V6 --> END
```

### 4.4 Transfer (1 input, 1 output)

```mermaid
flowchart TD
    START["Transfer Spore"]
    V1["Verify data unchanged<br/>input_data == output_data"]
    V2["Run mutant extensions<br/>if any"]
    V3["Verify co-build action<br/>TransferSpore"]
    END["✅ Pass / ❌ Error"]

    START --> V1 --> V2 --> V3 --> END
```

### 4.5 Burn (1 input, 0 output)

```mermaid
flowchart TD
    START["Burn Spore"]
    V1["Check immortal flag<br/>immortal=true → reject"]
    V2["Run mutant extensions<br/>if any"]
    V3["Verify co-build action<br/>BurnSpore"]
    END["✅ Pass / ❌ Error"]

    START --> V1 --> V2 --> V3 --> END
```

### 4.6 Mutant Extension

```mermaid
flowchart TD
    START["verify_extension()"]
    LOOP{"For each mutant<br/>declared in MIME"}
    V1["Find mutant cell<br/>in CellDeps"]
    V2["Check payment<br/>if Mint operation"]
    V3["Call mutant contract<br/>exec_cell()"]
    LOOP2["Next mutant?"]
    END["✅ All passed<br/>❌ Any failed"]

    START --> LOOP
    LOOP -->|"more"| V1 --> V2 --> V3 --> LOOP2
    LOOP2 -->|"yes"| V1
    LOOP2 -->|"done"| END
    LOOP -->|"none"| END
```

---

## 5. Cluster Contract (`contracts/cluster/src/entry.rs`)

### 5.1 Data Structure

```rust
ClusterDataV2 {
    name: String,
    description: String,
    mutant_id: Opt<Byte32>,
}
```

### 5.2 Operations

```mermaid
flowchart TD
    START["entry()"]
    Q{"(input_count, output_count)"}

    START --> Q

    Q -->|"0, 1"| MINT["Mint Cluster"]
    Q -->|"1, 1"| TRANSFER["Transfer Cluster"]
    Q -->|"1, 0"| BURN["❌ Reject<br/>Cluster cannot be burned"]
    Q -->|"_"| ERR["❌ Error"]

    MINT --> M1["Validate data<br/>name not empty"]
    MINT --> M2["Verify Cluster ID<br/>= type_id"]
    MINT --> M3["Check mutant dep<br/>if mutant_id set"]
    MINT --> M4["Verify co-build action<br/>MintCluster"]
    M1 & M2 & M3 & M4 --> END["✅ Pass / ❌ Error"]

    TRANSFER --> T1["Verify data unchanged"]
    TRANSFER --> T2["Verify co-build action<br/>TransferCluster"]
    T1 & T2 --> END
```

---

## 6. Cluster Proxy Contract (`contracts/cluster_proxy/src/entry.rs`)

Type script: `data = cluster_id (32 bytes)`, `args = Proxy ID (type_id)`.

```mermaid
flowchart TD
    START["entry()"]
    Q{"(input_count, output_count)"}

    START --> Q

    Q -->|"0, 1"| MINT["Mint Proxy"]
    Q -->|"1, 1"| TRANSFER["Transfer Proxy"]
    Q -->|"1, 0"| BURN["Burn Proxy"]
    Q -->|"_"| ERR["❌ Error"]

    MINT --> M1["Load cluster_id from data<br/>verify cluster in deps"]
    MINT --> M2["Verify args format<br/>32 or 40 bytes"]
    MINT --> M3["Verify Proxy ID<br/>= type_id"]
    MINT --> M4["Check cluster/ownership<br/>in transaction I/O"]
    MINT --> M5["Verify co-build action<br/>MintProxy"]
    M1 & M2 & M3 & M4 & M5 --> END["✅ Pass / ❌ Error"]

    TRANSFER --> T1["Verify data unchanged"]
    TRANSFER --> T2["Verify co-build action<br/>TransferProxy"]
    T1 & T2 --> END

    BURN --> B1["Verify co-build action<br/>BurnProxy"]
    B1 --> END
```

---

## 7. Cluster Agent Contract (`contracts/cluster_agent/src/entry.rs`)

```mermaid
flowchart TD
    START["entry()"]
    Q{"(input_count, output_count)"}

    START --> Q

    Q -->|"0, 1"| MINT["Mint Agent"]
    Q -->|"1, 1"| TRANSFER["Transfer Agent"]
    Q -->|"1, 0"| BURN["Burn Agent"]
    Q -->|"_"| ERR["❌ Error"]

    MINT --> M1["Find proxy cell in deps<br/>type = ClusterProxy"]
    MINT --> M2["Verify proxy exists<br/>in Input & Output"]
    MINT --> M3["Check payment<br/>if args has payment field"]
    MINT --> M4["Check no conflict<br/>no duplicate agent in output"]
    MINT --> M5["Verify co-build action<br/>MintAgent"]
    M1 & M2 & M3 & M4 & M5 --> END["✅ Pass / ❌ Error"]

    TRANSFER --> T1["Verify data unchanged<br/>& not empty"]
    TRANSFER --> T2["Verify co-build action<br/>TransferAgent"]
    T1 & T2 --> END

    BURN --> B1["Verify co-build action<br/>BurnAgent"]
    B1 --> END
```

---

## 8. Relationships Between the 4 Contracts

```mermaid
graph TB
    S["Spore"]
    C["Cluster"]
    P["Cluster Proxy"]
    A["Cluster Agent"]
    M["Mutant Extension"]

    S -->|"cluster_id"| C
    S -->|"mime.mutants[]"| M
    C -->|"mutant_id"| M
    A -->|"args=cluster_id"| C
    A -.->|"uses in deps"| P
```

**3 Ownership modes when Spore belongs to a cluster:**

| Mode | Condition | When to use |
|---|---|---|
| Cluster | Cluster cell in both Input & Output | Spore + Cluster in same transaction |
| Agent | Agent cell in both Input & Output | Agent replaces cluster |
| Lock Proxy | Cluster lock hash matches | No cluster/agent needed |

---

## 9. Co-build Action Verification

Each operation verifies the action from the co-build script — ensuring transaction data matches the signed intent:

```rust
MintSpore      { spore_id, data_hash, to: SporeAddress }
TransferSpore  { spore_id, from: SporeAddress, to: SporeAddress }
BurnSpore      { spore_id, from: SporeAddress }
MintCluster    { cluster_id, data_hash, to: SporeAddress }
TransferCluster { cluster_id, from: SporeAddress, to: SporeAddress }
MintProxy      { proxy_id, cluster_id, to: SporeAddress }
TransferProxy  { proxy_id, cluster_id, from, to }
BurnProxy      { proxy_id, cluster_id, from }
MintAgent      { agent_id, cluster_id, proxy_id, to }
TransferAgent  { agent_id, from, to }
BurnAgent      { agent_id, from }
```

- `SporeAddress` = blake2b(lock_script + flags)
- `data_hash` = blake2b(cell_data)

---

## 10. Type ID Mechanism

```
Spore ID = blake2b(input_cell_ptr + output_cell_ptr + type_script)
```

The contract verifies that script args match the computed type_id — ensuring the ID is unique and cannot be forged.

---

## 11. Key Security Checks

1. **Immutable fields** — Transfer must not modify data (input == output)
2. **No conflict** — 1 cell of the same type per group
3. **No multi-spend** — 1 input of the same type
4. **Immortal NFT** — `immortal=true` → cannot be burned
5. **Mutant payment** — minting with mutant requires sufficient CKB payment
6. **Co-build action** — every op verifies action from co-build script
7. **Spore address** — validates `from/to` address is correct
