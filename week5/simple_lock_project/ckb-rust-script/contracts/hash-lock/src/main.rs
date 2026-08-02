//! Hash Lock Script — On-chain verification logic
//!
//! This lock script implements a simple hash-based lock on the CKB VM.
//! - Lock args contain a 32-byte Blake2b-256 hash
//! - To unlock, the spender must provide the preimage in `WitnessArgs.lock`
//! - The script hashes the preimage and compares it to the expected hash
//! - Returns 0 (success) if they match, error code otherwise
//!
//! Reference for Simple Lock architecture: https://docs.nervos.org/docs/dapp/simple-lock
//! Reference for CKB VM Execution: https://docs.nervos.org/docs/concepts/ckb-vm
//!
//! Security Note: This is for educational purposes only.
//! Hash locks are vulnerable to front-running attacks in production.

#![no_std]
#![cfg_attr(not(test), no_main)]

use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    default_alloc,
    error::SysError,
    high_level::{load_script, load_witness_args},
};
use blake2b_ref::Blake2bBuilder;
use molecule::prelude::Entity;

#[allow(dead_code)]
#[allow(unused_imports)]
mod hash_lock;
// Allocate memory (required for no_std environment)
ckb_std::entry!(program_entry);
default_alloc!(4096, 2048, 64);

/// Program entry point
fn program_entry() -> i8 {
    // Call main and handle errors
    match main() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

/// Custom error types for our script
#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing = 2,
    LengthNotEnough = 3,
    Encoding = 4,
    // Add custom errors below
    InvalidArgsLength = 5,
    WitnessEmpty = 6,
    HashMismatch = 7,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::ItemMissing,
            SysError::LengthNotEnough(_) => Self::LengthNotEnough,
            SysError::Encoding => Self::Encoding,
            SysError::Unknown(err_code) => panic!("unexpected sys error {}", err_code),
            _ => panic!("unexpected sys error"),
        }
    }
}

/// Main validation function executed by CKB VM.
/// 
/// It performs the following steps:
/// 1. Extracts the expected hash from the script's `args`.
/// 2. Loads the `WitnessArgs` for the current input group.
/// 3. Extracts the preimage (plaintext password) from `WitnessArgs.lock`.
/// 4. Computes the Blake2b hash of the preimage using `ckb-default-hash`.
/// 5. Compares the computed hash with the expected hash.
fn main() -> Result<(), Error> {
    ckb_std::debug!("Starting hash-lock verification...");

    // 1. Load the script args
    // The script args should exactly be the 32-byte expected hash.
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    ckb_std::debug!("Loaded script args, length: {}", args.len());
    
    if args.len() != 32 {
        ckb_std::debug!("Error: Invalid args length! Expected 32 bytes.");
        return Err(Error::InvalidArgsLength);
    }
    let expected_hash = args.as_ref();

    // 2. Load WitnessArgs from the first witness in the input group
    ckb_std::debug!("Loading witness args from group input 0...");
    let witness_args = load_witness_args(0, Source::GroupInput)?;

    // 3. Extract the preimage from the `lock` field of the WitnessArgs
    let lock_bytes: Bytes = witness_args
        .lock()
        .to_opt()
        .ok_or_else(|| {
            ckb_std::debug!("Error: Witness args lock field is empty!");
            Error::WitnessEmpty
        })?
        .unpack();
    
    // Parse the Molecule struct
    let witness_payload = hash_lock::HashLockWitness::from_slice(lock_bytes.as_ref())
        .map_err(|_| {
            ckb_std::debug!("Error: Invalid HashLockWitness encoding!");
            Error::Encoding
        })?;
    
    let preimage = witness_payload.preimage();
    let preimage_bytes = preimage.as_slice();
    ckb_std::debug!("Extracted preimage, length: {}", preimage_bytes.len());

    // 4. Hash the preimage using CKB's default Blake2b hasher
    let mut actual_hash = [0u8; 32];
    let mut blake2b = Blake2bBuilder::new(32).personal(b"ckb-default-hash").build();
    blake2b.update(preimage_bytes);

    blake2b.finalize(&mut actual_hash);
    
    ckb_std::debug!("Expected hash: {:?}", expected_hash);
    ckb_std::debug!("Actual hash: {:?}", actual_hash);

    // 5. Compare the hashes
    if actual_hash != expected_hash {
        ckb_std::debug!("Error: Hash mismatch!");
        return Err(Error::HashMismatch);
    }

    ckb_std::debug!("Verification successful!");
    // Hash matches, unlock successful!
    Ok(())
}
