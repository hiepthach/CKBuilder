// ============================================================================
// RUST SYNTAX ANALYSIS IN MAIN.RS (For C/C++ Programmers)
// ============================================================================

// 1. #![cfg_attr(not(any(feature = "library", test)), no_std)]
// - `#![...]`: Configures the entire file (Inner Attribute).
//   Similar to global preprocessor directives in C/C++.
// - `any(feature = "library", test)`: Checks if we are compiling as a "library" OR running a "test".
// - `not(any(...))`: Negation. If NOT building as a library and NOT running tests.
// - `no_std`: Compiles in freestanding mode (without using Rust's standard library `std`), suitable for the bare-metal CKB VM.
#![cfg_attr(not(any(feature = "library", test)), no_std)]

// 2. #![cfg_attr(not(test), no_main)]
// - `not(test)`: If we are not running tests.
// - `no_main`: Directs the compiler that this program does not use the standard entry point `fn main()`.
//   In C/C++, when writing embedded applications or operating system kernels, we typically compile with the `-nostartfiles` flag and define the
//   entrypoint manually via a linker script or assembly bootstrap code. CKB VM does the same.
#![cfg_attr(not(test), no_main)]

// 3. #[cfg(any(feature = "library", test))]
// - `#[...]`: Attribute that only applies to the next line of code (Outer Attribute).
//   Equivalent to `#if defined(LIBRARY) || defined(TEST) ... #endif` in C/C++.
// - `extern crate alloc;`: Declares linkage to the dynamic memory allocator crate `alloc`.
#[cfg(any(feature = "library", test))]
extern crate alloc;

// 4. ckb_std::entry!(program_entry);
// - The exclamation mark `!` denotes a Macro Invocation (calling a macro).
//   Rust macros are safer than C/C++ macros because they perform syntax checking at the AST (Abstract Syntax Tree) level rather than simple raw text replacement.
// - `ckb_std::entry!(...)`: This macro defines the low-level entry point of the system (`_start` in a CKB RISC-V contract).
//   It sets up the necessary registers and then forwards the execution flow to the Rust function `program_entry`.
//   Equivalent to writing embedded C code with a custom hardware startup function: `extern "C" void _start() { exit(program_entry()); }`.
#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

// 5. ckb_std::default_alloc!(16384, 1258306, 64);
// - This macro defines the dynamic memory allocator (Heap Allocator) for the contract.
//   By default, in a `no_std` environment, malloc/free are not available. This macro initializes a "buddy-allocator" with:
//   * 16384 Bytes (16KB) of fixed static heap.
//   * 1258306 Bytes (~1.2MB) of dynamic heap.
//   * 64 Bytes as the minimum block size.
// - Equivalent to loading a custom memory library (handwritten `malloc`/`free`) into an embedded system in C/C++.
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

// 6. pub fn program_entry() -> i8 { ... }
// - `pub`: Public, allowing the function to be accessed from outside this crate.
// - `fn`: Keyword for declaring a function in Rust.
// - `program_entry()`: Function name.
// - `-> i8`: Defines the return type of the function.
//   `i8` is a signed 8-bit integer, completely equivalent to `int8_t` in C/C++.
// - This syntax is equivalent to: `extern "C" int8_t program_entry() { ... }` in C++.
pub fn program_entry() -> i8 {
    // 7. ckb_std::debug!("This is a sample contract!");
    // - This macro call is used to print debug log messages.
    //   Under the hood, it triggers a System Call (software interrupt number 2177) to pass this character string
    //   to the CKB VM debug port.
    //   Similar to calling a `printf` macro or outputting UART debug in C++ embedded systems.
    ckb_std::debug!("This is a sample contract!");

    // 8. A standalone `0` at the end of the function (without a semicolon `;`)
    // - In Rust, a block `{ ... }` returns the value of its last expression.
    //   If a value is written at the end of a function WITHOUT a trailing semicolon `;`, Rust interprets it as the return value of the function (Implicit Return).
    // - Completely equivalent to the `return 0;` statement in C/C++.
    //   Returning `0` signals to the CKB VM that the contract has validated successfully.
    0
}


