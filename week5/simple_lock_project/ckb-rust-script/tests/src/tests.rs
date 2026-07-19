use ckb_testtool::ckb_types::{
    bytes::Bytes,
    core::{TransactionBuilder, DepType},
    packed::*,
    prelude::*,
};
use ckb_testtool::{ckb_hash, context::Context};
use std::fs;

// The custom errors matching the ones in main.rs
const ERROR_INVALID_ARGS_LENGTH: i8 = 5;
const ERROR_WITNESS_EMPTY: i8 = 6;
const ERROR_HASH_MISMATCH: i8 = 7;

fn load_contract_binary() -> Bytes {
    fs::read("../build/release/hash-lock")
        .expect("Failed to load binary, please run `make build` first")
        .into()
}

fn init_log() {
    let _ = env_logger::builder().is_test(true).try_init();
}

#[test]
fn test_unlock_success() {
    init_log();
    let mut context = Context::default();
    let contract_bin = load_contract_binary();
    let out_point = context.deploy_cell(contract_bin);

    // Setup preimage and expected hash
    let preimage = b"Hello World";
    let expected_hash = ckb_hash::blake2b_256(preimage);

    // Create the lock script
    let lock_script = context
        .build_script(&out_point, Bytes::from(expected_hash.to_vec()))
        .expect("script");

    // Create a mock input cell
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();

    // Create output cell
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64)
            .lock(Script::default())
            .build(),
    ];
    let outputs_data = vec![Bytes::new()];

    // Create WitnessArgs with the preimage
    let witness_args = WitnessArgs::new_builder()
        .lock(Some(Bytes::from(preimage.to_vec())).pack())
        .build();

    // Build the transaction
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .cell_dep(
            CellDep::new_builder()
                .out_point(out_point)
                .dep_type(DepType::Code)
                .build()
        )
        .witness(witness_args.as_bytes().pack())
        .build();

    let tx = context.complete_tx(tx);

    // Verification should succeed
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_unlock_wrong_preimage() {
    init_log();
    let mut context = Context::default();
    let contract_bin = load_contract_binary();
    let out_point = context.deploy_cell(contract_bin);

    // Setup preimage and expected hash
    let correct_preimage = b"Hello World";
    let expected_hash = ckb_hash::blake2b_256(correct_preimage);
    
    let wrong_preimage = b"Wrong Secret";

    let lock_script = context
        .build_script(&out_point, Bytes::from(expected_hash.to_vec()))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64)
            .lock(Script::default())
            .build(),
    ];
    let outputs_data = vec![Bytes::new()];

    // Pass the wrong preimage
    let witness_args = WitnessArgs::new_builder()
        .lock(Some(Bytes::from(wrong_preimage.to_vec())).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .cell_dep(
            CellDep::new_builder()
                .out_point(out_point)
                .dep_type(DepType::Code)
                .build()
        )
        .witness(witness_args.as_bytes().pack())
        .build();

    let tx = context.complete_tx(tx);

    // Verification should fail with ERROR_HASH_MISMATCH
    let err = context.verify_tx(&tx, 10_000_000).unwrap_err();
    let err_str = err.to_string();
    assert!(err_str.contains(&format!("error code {}", ERROR_HASH_MISMATCH)));
}

#[test]
fn test_unlock_empty_witness() {
    init_log();
    let mut context = Context::default();
    let contract_bin = load_contract_binary();
    let out_point = context.deploy_cell(contract_bin);

    let preimage = b"Hello World";
    let expected_hash = ckb_hash::blake2b_256(preimage);

    let lock_script = context
        .build_script(&out_point, Bytes::from(expected_hash.to_vec()))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64)
            .lock(Script::default())
            .build(),
    ];
    let outputs_data = vec![Bytes::new()];

    // Empty witness args
    let witness_args = WitnessArgs::new_builder().build();

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .cell_dep(
            CellDep::new_builder()
                .out_point(out_point)
                .dep_type(DepType::Code)
                .build()
        )
        .witness(witness_args.as_bytes().pack())
        .build();

    let tx = context.complete_tx(tx);

    let err = context.verify_tx(&tx, 10_000_000).unwrap_err();
    let err_str = err.to_string();
    assert!(err_str.contains(&format!("error code {}", ERROR_WITNESS_EMPTY)));
}

#[test]
fn test_unlock_invalid_args_length() {
    init_log();
    let mut context = Context::default();
    let contract_bin = load_contract_binary();
    let out_point = context.deploy_cell(contract_bin);

    // Args with length != 32
    let invalid_args = Bytes::from(vec![0u8; 10]);

    let lock_script = context
        .build_script(&out_point, invalid_args)
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64)
            .lock(Script::default())
            .build(),
    ];
    let outputs_data = vec![Bytes::new()];

    let witness_args = WitnessArgs::new_builder()
        .lock(Some(Bytes::from(b"Some text".to_vec())).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .cell_dep(
            CellDep::new_builder()
                .out_point(out_point)
                .dep_type(DepType::Code)
                .build()
        )
        .witness(witness_args.as_bytes().pack())
        .build();

    let tx = context.complete_tx(tx);

    let err = context.verify_tx(&tx, 10_000_000).unwrap_err();
    let err_str = err.to_string();
    assert!(err_str.contains(&format!("error code {}", ERROR_INVALID_ARGS_LENGTH)));
}
