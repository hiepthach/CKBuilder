// ============================================================================
// TinyDOB Type Script Contract
// ============================================================================
// File: main.rs
// Description: Implements the type script validation logic for TinyDOB (Digital
//              Object) cells on Nervos CKB.
//
// Lifecycle Modes:
// 1. Mint: Creates a new DOB cell. Verifies the DOB ID matches the hash of the
//          first input outpoint and the output index.
// 2. Transfer: Validates ownership transfer, ensuring the DOB data contents
//              remain consistent and intact during the transaction.
// 3. Burn: Handles the destruction of a DOB cell, clearing the digital object.
//
// References & Standards:
// - Spore Protocol (DOB / Digital Object standard):
//   https://spore.pro
//   https://docs.spore.pro
// - CKB Type ID (Unique ID generation pattern):
//   https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0022-transaction-structure/0022-transaction-structure.md#type-id
// ============================================================================

#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);

#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::high_level::{
    load_cell_data, load_input, load_script, load_cell_type,
};
use ckb_std::error::SysError;
use ckb_std::ckb_types::prelude::Entity;
use blake2b_ref::Blake2bBuilder;

// Custom Error Codes
const ERR_INVALID_ARGS: i8 = 10;
const ERR_MINT_INVALID_ID: i8 = 11;
const ERR_MINT_INVALID_DATA: i8 = 12;
const ERR_TRANSFER_DATA_CHANGED: i8 = 13;
const ERR_INVALID_GROUP_COUNT: i8 = 14;
const ERR_MINT_INDEX_NOT_FOUND: i8 = 15;

pub fn program_entry() -> i8 {
    ckb_std::debug!("TinyDOB Type Script contract execution started.");

    // 1. Get current script and extract args (TinyDOB ID)
    // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_script
    let script = match load_script() {
        Ok(s) => s,
        Err(_) => {
            ckb_std::debug!("Error: Could not load the script.");
            return ERR_INVALID_ARGS;
        }
    };
    let dob_id = script.args().raw_data();
    // If args are empty, treat this as an always-success lock script for testing purposes.
    if dob_id.is_empty() {
        ckb_std::debug!("Empty args detected. Running as always-success lock script mode.");
        return 0;
    }
    
    if dob_id.len() != 32 {
        ckb_std::debug!("Error: DOB ID in Type Script args must be exactly 32 bytes.");
        return ERR_INVALID_ARGS;
    }

    // 2. Count cells in the current Type Script group
    // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#group
    // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_cell_type
    let mut input_group_count = 0;
    let mut output_group_count = 0;

    let mut i = 0;
    loop {
        match load_cell_type(i, Source::GroupInput) {
            Ok(_) => input_group_count += 1,
            Err(SysError::IndexOutOfBound) => break,
            Err(_) => return ERR_INVALID_GROUP_COUNT,
        }
        i += 1;
    }

    let mut i = 0;
    loop {
        match load_cell_type(i, Source::GroupOutput) {
            Ok(_) => output_group_count += 1,
            Err(SysError::IndexOutOfBound) => break,
            Err(_) => return ERR_INVALID_GROUP_COUNT,
        }
        i += 1;
    }

    ckb_std::debug!("Group size - Input: {}, Output: {}", input_group_count, output_group_count);

    // 3. Match execution mode
    if input_group_count == 0 && output_group_count == 1 {
        // --- MINT MODE ---
        ckb_std::debug!("Mode: Minting");

        // A. Verify DOB ID matches blake2b(first_input_outpoint + output_index)
        
        // Find the global output index of our DOB cell
        // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_cell
        let mut global_output_index = None;
        let mut idx = 0;
        loop {
            match load_cell_type(idx, Source::Output) {
                Ok(Some(s)) => {
                    if s.as_slice() == script.as_slice() {
                        global_output_index = Some(idx);
                        break;
                    }
                }
                Ok(None) => {}
                Err(SysError::IndexOutOfBound) => break,
                Err(_) => {}
            }
            idx += 1;
        }

        let output_index = match global_output_index {
            Some(i) => i,
            None => {
                ckb_std::debug!("Error: Could not find current script cell in transaction outputs.");
                return ERR_MINT_INDEX_NOT_FOUND;
            }
        };

        // Get first input outpoint
        // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_input
        let first_input = match load_input(0, Source::Input) {
            Ok(in_cell) => in_cell,
            Err(_) => {
                ckb_std::debug!("Error: Could not load the first input cell.");
                return ERR_MINT_INVALID_ID;
            }
        };
        let outpoint = first_input.previous_output();
        let outpoint_bytes = outpoint.as_slice();

        // Calculate expected DOB ID using pure Rust blake2b-ref
        // dob_id = blake2b(outpoint_bytes + output_index_bytes)
        // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0022-transaction-structure/0022-transaction-structure.md#type-id
        let mut data_to_hash = alloc::vec::Vec::new();
        data_to_hash.extend_from_slice(outpoint_bytes);
        data_to_hash.extend_from_slice(&(output_index as u64).to_le_bytes());

        let mut blake2b = Blake2bBuilder::new(32)
            .personal(b"ckb-default-hash")
            .build();
        blake2b.update(&data_to_hash);
        let mut expected_dob_id = [0u8; 32];
        blake2b.finalize(&mut expected_dob_id);

        if dob_id.as_ref() != expected_dob_id {
            ckb_std::debug!("Error: DOB ID does not match expected blake2b(first_input + output_index).");
            return ERR_MINT_INVALID_ID;
        }

        // B. Verify Cell Data Layout
        // Layout: [content_type_len (1 byte)] + [content_type] + [content]
        // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_cell_data
        let cell_data = match load_cell_data(0, Source::GroupOutput) {
            Ok(d) => d,
            Err(_) => return ERR_MINT_INVALID_DATA,
        };

        if cell_data.len() < 2 {
            ckb_std::debug!("Error: DOB Cell data is too short.");
            return ERR_MINT_INVALID_DATA;
        }

        let content_type_len = cell_data[0] as usize;
        if content_type_len == 0 {
            ckb_std::debug!("Error: Content-type length cannot be 0.");
            return ERR_MINT_INVALID_DATA;
        }

        if cell_data.len() <= 1 + content_type_len {
            ckb_std::debug!("Error: DOB Cell data lacks content body.");
            return ERR_MINT_INVALID_DATA;
        }

        ckb_std::debug!("Mint validation passed successfully.");
        0
    } else if input_group_count == 1 && output_group_count == 1 {
        // --- TRANSFER MODE ---
        ckb_std::debug!("Mode: Transferring");

        // Enforce immutability of data
        // see: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0009-vm-syscalls/0009-vm-syscalls.md#load_cell_data
        let input_data = match load_cell_data(0, Source::GroupInput) {
            Ok(d) => d,
            Err(_) => return ERR_TRANSFER_DATA_CHANGED,
        };
        let output_data = match load_cell_data(0, Source::GroupOutput) {
            Ok(d) => d,
            Err(_) => return ERR_TRANSFER_DATA_CHANGED,
        };

        if input_data != output_data {
            ckb_std::debug!("Error: DOB content is immutable and cannot be modified on transfer.");
            return ERR_TRANSFER_DATA_CHANGED;
        }

        ckb_std::debug!("Transfer validation passed successfully.");
        0
    } else if input_group_count == 1 && output_group_count == 0 {
        // --- BURN MODE ---
        ckb_std::debug!("Mode: Burning (Melting)");
        0
    } else {
        ckb_std::debug!("Error: Invalid group counts for TinyDOB script.");
        ERR_INVALID_GROUP_COUNT
    }
}
