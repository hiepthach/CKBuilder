# Practice: Optimize a CKB Smart Contract (Cycle & Binary Size)

> **Theory reference**: [CKB-VM Deep Dive](./ckb_vm_deep_dive.md)
> **Contract**: `CKBuilder/week5/simple_lock_project/ckb-rust-script`

---

## Objective

Apply optimization techniques from the **CKB-VM Deep Dive** lesson to a real Rust contract (`hash-lock`) built in Week 5. By the end of this exercise, you will understand:

- Why `debug!` macros waste Cycles in production.
- How to use a compile-time flag (`debug_assertions`) to toggle logs automatically.
- How to configure `Cargo.toml` for maximum Binary (ELF) size reduction.
- How to organize a `Makefile` with separate release and debug build targets.

---

## Contract Description: `hash-lock`

`hash-lock` is a **Lock Script** running on CKB-VM:

1. **Lock args** contains a 32-byte Blake2b-256 hash.
2. The spender provides the **preimage** (plaintext password) in `WitnessArgs.lock`.
3. The script hashes the preimage using Blake2b with personal string `"ckb-default-hash"`.
4. It compares the computed hash against the args hash. Match → return `0` (success). Mismatch → reject.

---

## Problems in the Original Code

### Problem 1: Debug Logs Active in Production Build

```rust
fn main() -> Result<(), Error> {
    ckb_std::debug!("Starting hash-lock verification...");
    ckb_std::debug!("Loaded script args, length: {}", args.len());
    // ... (9 debug! calls total)
}
```

**Why is this a problem?**
- Each `ckb_std::debug!` call executes **ECALL (Syscall #2177)** — the most expensive instruction type in CKB-VM, costing at least **500+ cycles** per call.
- 9 calls = at least **4,500 wasted cycles** for logging alone (not counting string formatting overhead).
- In production, CKB nodes discard debug output — you pay cycles and get nothing back.

### Problem 2: `debug-assertions = true` in Release Profile

```toml
[profile.release]
# ...
debug-assertions = true  # <-- Forces debug! to stay active even in release build
```

Even with `--release`, this flag forces the compiler to **keep all `debug!` calls** in the binary — completely defeating the purpose of a release build.

### Problem 3: Missing `panic = "abort"`

Without this, Rust compiles the full **stack unwinding machinery** (C++-style exception handling) into the ELF binary — even though a `no_std` contract never uses it.

---

## Changes Made

### Change 1: Custom Debug Macro Using `cfg(debug_assertions)`

**Added to `src/main.rs`:**

```rust
/// Custom debug macro — only emits syscalls when built with debug assertions.
/// - `make debug`  → debug_assertions = true  → logs are printed
/// - `make build`  → debug_assertions = false → logs vanish entirely (zero cost)
macro_rules! debug {
    ($($arg:tt)*) => {
        #[cfg(debug_assertions)]
        ckb_std::debug!($($arg)*);
    };
}
```

**All `ckb_std::debug!(...)` calls replaced with `debug!(...):`**

```rust
fn main() -> Result<(), Error> {
    debug!("Starting hash-lock verification...");
    // ...
    debug!("Verification successful!");
    Ok(())
}
```

**Benefit:** No manual commenting needed. The compiler eliminates the code entirely in release builds — zero overhead, zero cycles.

---

### Change 2: Optimize `Cargo.toml`

**Before:**
```toml
[profile.release]
overflow-checks = true
strip = true
opt-level = "z"
lto = true
codegen-units = 1
debug-assertions = true     # [BAD] Keeps logs in release build
```

**After:**
```toml
[profile.release]
overflow-checks = true
strip = true
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"             # [GOOD] Removes stack unwinding code
# debug-assertions removed → defaults to false in release
```

| Setting | Effect |
| :--- | :--- |
| `opt-level = "z"` | Optimize aggressively for smallest binary size |
| `lto = true` | Link-Time Optimization — removes dead code across crates |
| `codegen-units = 1` | Optimize the whole crate as a single unit |
| `strip = true` | Strip debug symbols from ELF output |
| `panic = "abort"` | Exclude stack unwinding machinery |

---

### Change 3: `Makefile` with Separate Build Targets

```makefile
# Release build: NO logs, smallest binary → for on-chain deployment
build:
    cargo build --target $(TARGET) --release -p hash-lock
    # → output: build/release/hash-lock

# Debug build: WITH logs, larger binary → for local development
debug:
    cargo build --target $(TARGET) -p hash-lock
    # → output: build/debug/hash-lock
```

**How it works:**
- `cargo build --release` → Cargo sets `debug_assertions = false` → `debug!` macro compiles to nothing.
- `cargo build` (no `--release`) → Cargo sets `debug_assertions = true` → `debug!` macro is active.

> **Key insight**: The Makefile just orchestrates. It is Cargo (rustc) that decides the value of `debug_assertions` based on the build profile. No extra flags needed — this is standard Rust behavior.

---

## Benchmark Results (Actual Measurements)

> Logs from: `CKBuilder/week5/simple_lock_project/logs/optimize_script/`

### Binary Size

| | Binary Size | Change |
| :--- | :---: | :---: |
| **Before** (with `debug-assertions = true`, no `panic = "abort"`) | **51,104 bytes** | — |
| **After** (optimized `Cargo.toml`) | **28,352 bytes** | **-44.5%** |

Reducing binary size by **~23 KB** means lower on-chain storage cost (less CKB Capacity required to deploy the script cell).

---

### Cycle Consumption

> Measured using `ckb-debugger --bin <binary>` on the same minimal input (no valid args → early exit at `InvalidArgsLength`).

| | Cycles | Change |
| :--- | :---: | :---: |
| **Before** | **32,506 cycles** | — |
| **After** | **11,381 cycles** | **-65.0%** |

**Breakdown of why cycles dropped:**
- The 9 `ckb_std::debug!` syscalls (Syscall #2177) are completely eliminated → saves ~4,500+ cycles of ECALL overhead.
- Smaller binary means fewer instruction-fetch cycles during ELF loading.
- Removal of unwinding code reduces the startup routine size.

---

### Measurement Commands

```bash
# Before optimization
make build    # → Binary size: 51104 bytes
ckb-debugger --bin target/riscv64imac-unknown-none-elf/release/hash-lock
# → Script log: Starting hash-lock verification...
# → Script log: Error: Invalid args length! Expected 32 bytes.
# → All cycles: 32506 (31.7K)

# After optimization
make build    # → Binary size: 28352 bytes
ckb-debugger --bin target/riscv64imac-unknown-none-elf/release/hash-lock
# → (no debug output)
# → All cycles: 11381 (11.1K)
```

---

## Key Takeaways

| Principle (from CKB-VM Deep Dive) | Application in this exercise |
| :--- | :--- |
| **Minimize Syscalls** | `#[cfg(debug_assertions)]` eliminates all `debug!` syscalls in release |
| **Minimize Binary Size** | `panic = "abort"`, `lto = true`, `opt-level = "z"`, `strip = true` |
| **Return Early** | `args.len() != 32` check runs before any heavy computation |
| **Debug Flag Pattern** | Custom `debug!` macro + Makefile with separate build targets |

---

## Files Modified

| File | Change |
| :--- | :--- |
| `contracts/hash-lock/src/main.rs` | Added custom `debug!` macro; replaced all `ckb_std::debug!` calls |
| `Cargo.toml` | Removed `debug-assertions = true`; added `panic = "abort"` |
| `Makefile` | Added `make debug` target |

---

> **Security Note**: The `hash-lock` contract is for educational purposes only.
> Hash-locks are vulnerable to front-running attacks in production environments.
