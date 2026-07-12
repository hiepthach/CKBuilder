// ============================================================================
// RUST SYNTAX ANALYSIS IN LIB.RS (For C/C++ Programmers)
// ============================================================================

// 1. #![cfg_attr(...)]
// - The `#![...]` syntax (with an exclamation mark) is an "Inner Attribute", which applies configuration to the ENTIRE current file/crate.
//   In C/C++, it is similar to defining a global preprocessor directive (global macro/pragma) at the top of a file.
// - `cfg_attr(condition, attribute)` works like a conditional statement: "If `condition` is met, apply `attribute`".
// - `not(feature = "library")`: Checks if we are NOT compiling as a library ("library").
// - `no_std`: Directs the Rust compiler not to link to the standard library (`std`).
//   This is equivalent to the `-nostdlib` or `-ffreestanding` flag in C/C++. In bare-metal environments like
//   CKB VM, where we don't have an OS, a file system, or standard stdout, using `no_std` is mandatory.
#![cfg_attr(not(feature = "library"), no_std)]

// 2. #![allow(special_module_name)]
// - `#![allow(...)]` is used to disable compiler warnings for a specific error/rule (linter).
//   Similar to `#pragma GCC diagnostic ignored "-W..."` in C/C++.
// - `special_module_name` allows declaring a submodule with a name that conflicts with a special keyword (here, the `main` module).
#![allow(special_module_name)]

// 3. #![allow(unused_attributes)]
// - Disables warnings about declaring attributes that are not used in the code.
#![allow(unused_attributes)]

// 4. #[cfg(feature = "library")]
// - The `#[...]` syntax (without an exclamation mark) is an "Outer Attribute", which only applies to the ELEMENT IMMEDIATELY BELOW it (here, `mod main;`).
//   It is equivalent to `#ifdef FEATURE_LIBRARY ... #endif` in C/C++ preprocessing.
// - This line means: only compile the `mod main;` line if the `feature = "library"` flag is enabled.
#[cfg(feature = "library")]
// 5. mod main;
// - Declares a submodule named `main`. Rust will look for a `main.rs` (or `main/mod.rs`) file at the same level to compile.
//   In C/C++, this is similar to importing another source file as a child namespace: `namespace main { #include "main.h" }`.
mod main;

// 6. pub use main::program_entry;
// - `pub`: Public (equivalent to the `public:` keyword in C++ classes, or not using `static` for functions in C).
//   It allows other files/crates to call this element.
// - `use`: Imports a path/symbol. Similar to `using namespace` or creating an alias in C++.
// - `pub use main::program_entry`: Re-exports the `program_entry` function from the `main` module to the public scope of this library.
//   This allows external test processes to invoke this function directly.
#[cfg(feature = "library")]
pub use main::program_entry;

// 7. extern crate alloc;
// - In a bare-metal `no_std` environment, we do not have the standard library `std`, but we can still use the dynamic allocation library `alloc`
//   (containing dynamic data types like `Vec`, `String`, `Box`, similar to `std::vector`, `std::string` in C++).
// - This line declares linkage to the `alloc` crate to use the dynamic memory allocator.
extern crate alloc;
