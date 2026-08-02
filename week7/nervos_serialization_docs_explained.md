# Detailed Explanation of Nervos CKB Serialization Standards (Molecule)

This document summarizes and explains all core chapters and concepts related to **Serialization (Molecule)** from the official Nervos Network technical documentation (Nervos Docs & RFC 0008).

---

## 📋 TABLE OF CONTENTS

- [Chapter 1: Overview & Core Design Principles](#chapter-1-overview--core-design-principles)
- [Chapter 2: Data Type System & Memory Layout in Detail](#chapter-2-data-type-system--memory-layout-in-detail)
- [Chapter 3: Standard CKB Data Structures (`blockchain.mol`)](#chapter-3-standard-ckb-data-structures-blockchainmol)
- [Chapter 4: The `.mol` Schema Language & Code Generation](#chapter-4-the-mol-schema-language--code-generation)
- [Chapter 5: On-Chain (Rust) & Off-Chain (TypeScript) Practice](#chapter-5-on-chain-rust--off-chain-typescript-practice)
- [Chapter 6: Comparison Table & Common Gotchas (Best Practices)](#chapter-6-comparison-table--common-gotchas-best-practices)

---

## Chapter 1: Overview & Core Design Principles

### 1.1. What is Serialization in Nervos CKB?
In the Nervos CKB system, every data object — from blocks, transactions, scripts, cell outputs to custom cell data — must be converted from memory objects into a **flat byte array (`Uint8Array` / `Vec<u8>`)** in order to:
1. Store state persistently on-chain.
2. Transmit data between nodes in the P2P network.
3. Serve as input for calculating cryptographic hashes (`blake2b`).

CKB uses **two main serialization formats**:
- **Molecule**: A standardized binary format used for on-chain state, transactions, the P2P network, and CKB-VM contracts.
- **JSON / JSON-RPC**: A text format used for RPC communication between clients/dApps and CKB Nodes.

### 1.2. Why can't popular formats be used for Blockchain?
On a decentralized blockchain network like CKB, the most important requirement for serialization is **Absolute Canonicalization**: Given the same input data, **any node anywhere in the world must encode it into exactly the same sequence of bytes**.

If two nodes produce different byte sequences for the same transaction object, the resulting hash (`blake2b`) will differ $\rightarrow$ The network loses consensus (Consensus failure)!

Popular industry standards fail this requirement:
- **JSON**: `{ "a": 1, "b": 2 }` and `{ "b": 2, "a": 1 }` have the same meaning but produce different bytes. JSON allows flexible whitespace, decimals (`1` vs `1.0`), and unordered properties.
- **Protocol Buffers (Protobuf)**: Allows omitting fields (optional), repeating fields out of order, or encoding integers as Varints with multiple valid representations. Two different Protobuf encoders might produce different bytes for the same message.
- **MessagePack / CBOR**: Although they are compact binary formats, they still allow multiple valid byte representations for the same value.

### 1.3. The Four Design Goals of Molecule
Nervos built **Molecule** around 4 main pillars:

```
+-----------------------------------------------------------------------+
|                    THE FOUR GOALS OF MOLECULE                         |
+-------------------+-------------------+---------------+---------------+
|  Canonicalization | Zero-Copy Access  | Binary Compact| Schema-Driven |
| (Unique Encoding) | (Read without copy)| (Small Size) | (.mol file)   |
+-------------------+-------------------+---------------+---------------+
```

1. **Canonicalization (Unique Encoding)**: Every value has exactly one unique byte sequence representation.
2. **Zero-Copy / Partial Reading**: CKB-VM contracts can read individual data fields by jumping directly to memory offsets without wasting resources to decode (deserialize) the entire object.
3. **Binary Compact**: Removes unnecessary bytes (like field names or delimiters) to reduce CKB storage costs (`capacity`).
4. **Schema-Driven**: All data types are clearly declared in a `.mol` file, generating static source code at compile time.

---

## Chapter 2: Data Type System & Memory Layout in Detail

Molecule precisely defines **7 data types**, divided into 2 groups: **Fixed-Size** and **Dynamic-Size**.

### 2.1. Primitive Type

#### `byte`
- The most basic unit representing an 8-bit unsigned integer (`u8`).
- **Memory Layout**: No Header. Takes exactly 1 byte.
- Example: The value `0x42` is encoded as `[42]`.

---

### 2.2. Fixed-Size Types
Byte size is determined at **Compile-time**. **No Header**, data is stored continuously.

#### `array`
- A fixed sequence of $N$ elements of the same fixed-size data type.
- Size = $N \times \text{sizeof}(\text{item})$.
- **Memory Layout**: `[item_0] [item_1] ... [item_N-1]`
- Schema Example:
  ```mol
  array Byte32 [byte; 32]; // Always 32 bytes
  array Uint64 [byte; 8];  // Always 8 bytes
  ```

#### `struct`
- A fixed collection of fields. **All fields inside a struct must be Fixed-size** (`byte`, `array`, or another `struct`).
- Size = Total size of all fields.
- **Memory Layout**: Fields are placed adjacently in declaration order.
- Schema Example:
  ```mol
  struct TokenInfo {
      name:         Byte32,   // 32 bytes (offset 0..32)
      symbol:       Byte32,   // 32 bytes (offset 32..64)
      decimals:     byte,     //  1 byte  (offset 64)
      total_supply: Uint128,  // 16 bytes (offset 65..81)
  }
  // Fixed size: 81 bytes.
  ```
- **Zero-Copy Advantage**: To read `decimals`, the CKB-VM jumps straight to `data[64]`. To read `total_supply`, it reads the slice `data[65..81]`. This happens in $O(1)$ time with 0 wasted cycles!

---

### 2.3. Dynamic-Size Types
Size changes flexibly at **Runtime**. Must have a **Header** indicating the length or position (offset) of the elements.

#### `vector` (FixVec and DynVec)
Use the `vector` keyword in the schema. The compiler automatically chooses the encoding variant:

1. **FixVec (Fixed elements)**:
   - Used when the element type is Fixed-size (e.g., `vector Bytes <byte>;`).
   - **Header**: 4 bytes Little-Endian integer representing the **number of elements (`item_count`)**.
   - **Memory Layout**: `[item_count (4B)] [item_0] [item_1] ...`

2. **DynVec (Dynamic elements)**:
   - Used when the element type is Dynamic-size (e.g., `vector BytesVec <Bytes>;`).
   - **Header**: 
     - First 4 bytes: **Total size (`full-size`)** Little-Endian.
     - Next $N \times 4$ bytes: **`offset`** index table (starting position of each element).
   - **Memory Layout**: `[full_size (4B)] [offset_0 (4B)] [offset_1 (4B)] ... [item_0 data] [item_1 data] ...`

#### `table`
- A table-like structure for fields with **dynamic size** or mixed sizes.
- **Memory Layout**: Similar to DynVec!
  - 4 bytes: `full-size` (Total length of the entire table)
  - $N \times 4$ bytes: `offset` index table for each field.
  - Followed by the actual data of each field.
- **Schema Evolution Feature**: You can add new fields to the **END** of a `table` in future versions. When an older contract reads the new table, it will stop at the last offset it knows and safely ignore the extra data without crashing or throwing an error.

#### `option`
- Represents a value that may exist (`Some`) or may not (`None`).
- **No wasted Tag Bytes!**
  - `None`: 0 bytes (empty sequence).
  - `Some(x)`: Raw bytes of `x`.

#### `union`
- Represents a variable type (Tagged Union / Enum).
- **Header**: 4 bytes Little-Endian integer representing the **`item_id`** (data type index).
- **Memory Layout**: `[item_id (4B)] [inner_item_bytes...]`

---

### 2.4. Summary of Memory Layout & Byte-Order Rules

| Data Type | Category | Header | Body |
| :--- | :--- | :--- | :--- |
| **`byte`** | Fixed | *(None)* | 1 byte value |
| **`array`** | Fixed | *(None)* | $N$ items sequentially |
| **`struct`** | Fixed | *(None)* | Fields sequentially by order |
| **`vector` (FixVec)** | Dynamic | `item_count` (4B LE) | Items sequentially |
| **`vector` (DynVec)** | Dynamic | `full_size` (4B LE) + `offset_0..N-1` (4B LE each) | Item data sequentially |
| **`table`** | Dynamic | `full_size` (4B LE) + `offset_field0..N-1` (4B LE each) | Field data sequentially |
| **`option`** | Dynamic | *(None)* | `0 bytes` (None) or raw bytes (Some) |
| **`union`** | Dynamic | `item_id` (4B LE) | Inner element data |

> 📌 **IMPORTANT GOLDEN RULE**:
> All multi-byte integers in Headers (`full_size`, `offset`, `item_count`, `item_id`) are encoded in **Little-Endian (LE)**. Because CKB-VM uses RISC-V architecture which natively runs Little-Endian, CKB contracts can read integers directly from RAM without wasting cycles to reverse bytes.

---

## Chapter 3: Standard CKB Data Structures (`blockchain.mol`)

All core Nervos CKB objects are defined using Molecule in the standard `blockchain.mol` file:

```mol
// 1. Script Structure (Lock script or Type script)
table Script {
    code_hash: Byte32,   // Blake2b hash of the script code
    hash_type: byte,     // 0x00=Data, 0x01=Type, 0x02=Data1, 0x04=Data2
    args:      Bytes,    // Parameters passed into the script
}

// 2. Cell Output Structure (Cell Information)
table CellOutput {
    capacity: Uint64,    // CKB storage capacity (1 CKB = 10^8 Shannons)
    lock:     Script,    // Lock script (ownership)
    type_:    ScriptOpt, // Optional Type script (state logic)
}

// 3. Cell Reference Index
struct OutPoint {
    tx_hash: Byte32,   // Hash of the transaction that created the Cell
    index:   Uint32,   // Output position within that transaction
}

struct CellInput {
    since:           Uint64,    // Time-lock constraint
    previous_output: OutPoint,  // The consumed Cell
}

// 4. Raw Transaction Content
table RawTransaction {
    version:      Uint32,
    cell_deps:    CellDepVec,
    header_deps:  Byte32Vec,
    inputs:       CellInputVec,
    outputs:      CellOutputVec,
    outputs_data: BytesVec,
}

// 5. Complete Transaction with Signatures
table Transaction {
    raw:       RawTransaction,
    witnesses: BytesVec,         // Contains signatures (e.g., Secp256k1) and proofs
}
```

---

## Chapter 4: The `.mol` Schema Language & Code Generation

### 4.1. `.mol` Schema Syntax
- **Type Name**: Use `PascalCase` (e.g., `TokenMetadata`, `CellOutput`). Type names must be unique within a schema file.
- **Field Name**: Use `snake_case` (e.g., `code_hash`, `total_supply`).

### 4.2. `moleculec` Compiler
`moleculec` is the official compiler written in Rust. It reads `.mol` files and generates supporting source code for multiple languages:

- **Rust**: `moleculec --language rust --schema-file schema.mol > schema.rs`
  - Runtime libraries: `molecule` crate and `ckb-types`.
- **C**: `moleculec --language c --schema-file schema.mol > schema.h`
  - For contracts written in C using `ckb-c-stdlib`.
- **JavaScript / TypeScript**:
  - Use `moleculec-es` or built-in Codecs from SDKs like Lumos (`@ckb-lumos/codec`) and CCC (`@ckb-ccc/core`).

---

## Chapter 5: On-Chain (Rust) & Off-Chain (TypeScript) Practice

### 5.1. Writing On-Chain Smart Contracts (Rust CKB-VM)

Below is a contract checking Cell Data that follows the `TokenInfo` Molecule structure:

```rust
#![no_std]
#![no_main]

use ckb_std::high_level::{load_cell_data, load_script};
use ckb_std::ckb_constants::Source;
use ckb_types::prelude::*;

const TOKEN_INFO_SIZE: usize = 81;

#[no_mangle]
pub fn main() -> Result<(), i8> {
    // 1. Load Cell Data from the first Output in the Script Group
    let cell_data = load_cell_data(0, Source::GroupOutput).map_err(|_| -1)?;

    // 2. Check Byte length (Zero-copy guard)
    if cell_data.len() != TOKEN_INFO_SIZE {
        return Err(-4); // CKB_INVALID_DATA error code
    }

    // 3. Directly read 'decimals' field at offset 64 (O(1) time)
    let decimals = cell_data[64];
    if decimals > 18 {
        return Err(-2); // Decimals exceed limit
    }

    // 4. Read 'total_supply' field from offset 65..81 (Convert from Little-Endian)
    let supply_bytes: [u8; 16] = cell_data[65..81].try_into().unwrap();
    let total_supply = u128::from_le_bytes(supply_bytes);

    if total_supply == 0 {
        return Err(-3); // Total supply cannot be 0
    }

    Ok(())
}
```

### 5.2. Off-Chain Data Encoding (TypeScript dApp)

Example encoding a `TokenInfo` struct (81 bytes) in TypeScript to put into `cell_data`:

```typescript
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export function packTokenInfo(info: TokenInfo): Uint8Array {
  const buffer = new Uint8Array(81);

  // 1. Field name: Byte32 (offset 0..32)
  const nameBytes = new TextEncoder().encode(info.name);
  buffer.set(nameBytes.slice(0, 32), 0);

  // 2. Field symbol: Byte32 (offset 32..64)
  const symbolBytes = new TextEncoder().encode(info.symbol);
  buffer.set(symbolBytes.slice(0, 32), 32);

  // 3. Field decimals: byte (offset 64)
  buffer[64] = info.decimals;

  // 4. Field total_supply: Uint128 Little-Endian (offset 65..81)
  let val = info.totalSupply;
  for (let i = 0; i < 16; i++) {
    buffer[65 + i] = Number(val & 0xffn);
    val >>= 8n;
  }

  return buffer;
}
```

---

## Chapter 6: Comparison Table & Common Gotchas (Best Practices)

### 6.1. Detailed Format Comparison Table

| Criterion | JSON | Protocol Buffers | Molecule (Struct) | Molecule (Table) |
| :--- | :--- | :--- | :--- | :--- |
| **Byte Size** | Large (~80B) | Small (~35B) | Fixed (81B) | Small + Header (~45B) |
| **Canonical** | ❌ No | ❌ No |  100% Unique |  100% Unique |
| **Zero-Copy Access** | ❌ No (Parse all) | ⚠️ Parser dependent |  $O(1)$ Access |  Read via Offset Table |
| **CKB-VM Optimized** | ❌ Wastes too many Cycles | ❌ Can alter Hash |  Highly Optimized |  Optimized for dynamic data |
| **Schema Evolution** | Hard to manage | Supported | ❌ Cannot change length |  Add fields at END |

---

### 6.2. 6 Golden Rules for CKB Developers

1. **Always remember the Little-Endian rule**: Any integer passed into a Molecule encoder must be converted to a Little-Endian byte sequence before encoding.
2. **Distinguish between empty FixVec and empty DynVec**:
   - Empty `FixVec` is **4 bytes** long: `[00 00 00 00]` (`item_count = 0`).
   - Empty `DynVec` / `table` is **4 bytes** long: `[04 00 00 00]` (`full_size = 4`).
   - *Note*: Don't use `data.is_empty()` to check for an empty Cell!
3. **Table Schema Evolution Rule**: You can only append new fields to the **END** of a `table`'s field list. Never delete or reorder existing fields.
4. **Check Byte length before Zero-copy**: In Rust contracts, always verify `cell_data.len() == EXPECTED_SIZE` before accessing a slice to prevent Out-Of-Bounds errors.
5. **Use auto-generated code tools**: Rely on `moleculec` instead of manually encoding bytes to avoid miscalculating header offsets.
6. **`CKB_INVALID_DATA` (Error 4)**: The standard convention when Molecule decoding fails in a contract is to return error `-4` (or `CKB_INVALID_DATA`), making debugging on `ckb-debugger` much clearer.
