# Molecule Practice on Simple Lock Project

This document outlines the practical implementation of **Molecule Serialization** on the `simple_lock_project` from Week 5. The goal of this practice was to replace raw byte parsing in the contract's witness with a structured, zero-copy Molecule schema.

## 1. Problem Statement (Before Molecule)
Initially, the `hash-lock` smart contract read the `lock` field of `WitnessArgs` as a raw byte array (the plaintext password / preimage). 
While this works for a single field, it is:
- **Not extensible**: Adding a signature or a message would require manual byte slicing.
- **Unsafe**: Manual slicing can cause "Out of Bounds" panics in the CKB-VM if the frontend sends malformed data.
- **Non-deterministic**: Without a standard serialization format, the transaction hash could vary.

## 2. Defining the Schema
We defined a structured schema to hold the preimage and an additional dummy message.

**File:** `ckb-rust-script/contracts/hash-lock/src/hash_lock.mol`
```molecule
array Byte32 [byte; 32];

table HashLockWitness {
    preimage: Byte32,
    message: byte,
}
```

We then compiled this schema into Rust bindings using `moleculec`:
```bash
~/.cargo/bin/moleculec --language rust --schema-file hash_lock.mol > hash_lock.rs
```

## 3. Smart Contract Integration (Rust)
We updated `main.rs` to leverage Molecule's zero-copy deserialization instead of raw bytes.

1. Added `molecule = { version = "0.9.2", default-features = false }` to `Cargo.toml`.
2. Parsed the payload directly from the witness slice:

```rust
// Parse the Molecule struct safely
let witness_payload = hash_lock::HashLockWitness::from_slice(lock_bytes.as_ref())
    .map_err(|_| {
        ckb_std::debug!("Error: Invalid HashLockWitness encoding!");
        Error::Encoding
    })?;

// Zero-copy extraction of the preimage
let preimage = witness_payload.preimage();
let preimage_bytes = preimage.as_slice();
```

*Benefit*: `from_slice` automatically validates the memory layout. Calling `preimage()` returns a pointer to the existing memory without allocating heap memory, saving valuable CKB-VM cycles.

## 4. Frontend Integration (TypeScript & CCC)
The frontend (`hash-lock.ts`) was updated to use `@ckb-ccc/core`'s built-in Molecule encoding to construct the transaction witness.

1. **Schema Definition in JS:**
```typescript
const HashLockWitness = ccc.mol.table({
  preimage: ccc.mol.Byte32,
  message: ccc.mol.Byte,
});
```

2. **Padding Data:**
Since our schema strictly defined `Byte32`, we added a padding function to ensure passwords shorter than 32 bytes are padded correctly before hashing and packing.

3. **Packing the Witness:**
```typescript
// Pack the data using the Molecule schema
const witnessPayload = HashLockWitness.encode({
  preimage: pwdBytes, // 32-byte padded password
  message: "0x00",    // Accompanying message
});

const witnessArgs = ccc.WitnessArgs.from({
  lock: witnessPayload,
});
```

## Conclusion
By implementing Molecule, we achieved:
- **Extensibility**: We can now easily add fields like `public_key` or `signature` to the schema.
- **Performance**: Zero-copy deserialization in Rust avoids expensive heap allocations.
- **Safety**: Molecule's auto-generated bindings strictly validate the byte array bounds before parsing.
- **Determinism**: The frontend and backend now agree on a canonical byte representation for the transaction hash.
