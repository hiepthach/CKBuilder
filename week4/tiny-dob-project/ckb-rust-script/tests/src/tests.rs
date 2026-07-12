use ckb_testtool::ckb_types::{
    bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*
};
use ckb_testtool::context::Context;

const ERR_MINT_INVALID_ID: i8 = 11;
const ERR_TRANSFER_DATA_CHANGED: i8 = 13;

// ==========================================
// 1. Hello World Unit Test
// ==========================================
#[test]
fn test_hello_world() {
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("hello-world");

    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![42]))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script)
            .build(),
    ];

    let outputs_data = vec![Bytes::new(); 2];

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("hello-world consume cycles: {}", cycles);
}

// ==========================================
// 2. TinyDOB Unit Tests Helpers
// ==========================================
fn calculate_dob_id(first_input_outpoint: &OutPoint, output_index: u64) -> [u8; 32] {
    use blake2b_ref::Blake2bBuilder;
    let mut data_to_hash = Vec::new();
    data_to_hash.extend_from_slice(first_input_outpoint.as_slice());
    data_to_hash.extend_from_slice(&output_index.to_le_bytes());

    let mut blake2b = Blake2bBuilder::new(32)
        .personal(b"ckb-default-hash")
        .build();
    blake2b.update(&data_to_hash);
    let mut expected_dob_id = [0u8; 32];
    blake2b.finalize(&mut expected_dob_id);
    expected_dob_id
}

fn create_dob_data(content_type: &str, content: &[u8]) -> Bytes {
    let mut data = Vec::new();
    data.push(content_type.len() as u8);
    data.extend_from_slice(content_type.as_bytes());
    data.extend_from_slice(content);
    Bytes::from(data)
}

// ==========================================
// 3. TinyDOB Unit Test Cases
// ==========================================
#[test]
fn test_mint_dob_success() {
    let mut context = Context::default();
    let contract_out_point = context.deploy_cell_by_name("tiny-dob-script");

    let lock_script = context
        .build_script(&contract_out_point, Bytes::new())
        .expect("lock_script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let dob_id = calculate_dob_id(&input_out_point, 0);

    let dob_type_script = context
        .build_script(&contract_out_point, Bytes::copy_from_slice(&dob_id))
        .expect("build_script");

    let output_cell = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .type_(Some(dob_type_script).pack())
        .build();

    let output_data = create_dob_data("image/png", &[0x89, 0x50, 0x4e, 0x47]);

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output_cell)
        .output_data(output_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("Mint consumed cycles: {}", cycles);
}

#[test]
fn test_mint_dob_invalid_id() {
    let mut context = Context::default();
    let contract_out_point = context.deploy_cell_by_name("tiny-dob-script");

    let lock_script = context
        .build_script(&contract_out_point, Bytes::new())
        .expect("lock_script");

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

    let incorrect_dob_id = [0u8; 32];

    let dob_type_script = context
        .build_script(&contract_out_point, Bytes::copy_from_slice(&incorrect_dob_id))
        .expect("build_script");

    let output_cell = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .type_(Some(dob_type_script).pack())
        .build();

    let output_data = create_dob_data("image/png", &[1, 2, 3, 4]);

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output_cell)
        .output_data(output_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    let err = context.verify_tx(&tx, 10_000_000).unwrap_err();
    assert!(err.to_string().contains(&format!("error code {}", ERR_MINT_INVALID_ID)));
}

#[test]
fn test_transfer_dob_success() {
    let mut context = Context::default();
    let contract_out_point = context.deploy_cell_by_name("tiny-dob-script");

    let lock_script = context
        .build_script(&contract_out_point, Bytes::new())
        .expect("lock_script");

    let input_out_point = OutPoint::new_builder().build();
    let dob_id = calculate_dob_id(&input_out_point, 0);

    let dob_type_script = context
        .build_script(&contract_out_point, Bytes::copy_from_slice(&dob_id))
        .expect("build_script");

    let dob_data = create_dob_data("image/png", &[1, 2, 3, 4]);

    let input_dob_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .type_(Some(dob_type_script.clone()).pack())
            .build(),
        dob_data.clone(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_dob_out_point)
        .build();

    let output_cell = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .type_(Some(dob_type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output_cell)
        .output_data(dob_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    context.verify_tx(&tx, 10_000_000).expect("pass transfer verification");
}

#[test]
fn test_transfer_dob_data_changed() {
    let mut context = Context::default();
    let contract_out_point = context.deploy_cell_by_name("tiny-dob-script");

    let lock_script = context
        .build_script(&contract_out_point, Bytes::new())
        .expect("lock_script");

    let input_out_point = OutPoint::new_builder().build();
    let dob_id = calculate_dob_id(&input_out_point, 0);

    let dob_type_script = context
        .build_script(&contract_out_point, Bytes::copy_from_slice(&dob_id))
        .expect("build_script");

    let input_dob_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .type_(Some(dob_type_script.clone()).pack())
            .build(),
        create_dob_data("image/png", &[1, 2, 3, 4]),
    );
    let input = CellInput::new_builder()
        .previous_output(input_dob_out_point)
        .build();

    let changed_dob_data = create_dob_data("image/png", &[9, 9, 9, 9]);

    let output_cell = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .type_(Some(dob_type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output_cell)
        .output_data(changed_dob_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    let err = context.verify_tx(&tx, 10_000_000).unwrap_err();
    assert!(err.to_string().contains(&format!("error code {}", ERR_TRANSFER_DATA_CHANGED)));
}

#[test]
fn test_burn_dob_success() {
    let mut context = Context::default();
    let contract_out_point = context.deploy_cell_by_name("tiny-dob-script");

    let lock_script = context
        .build_script(&contract_out_point, Bytes::new())
        .expect("lock_script");

    let input_out_point = OutPoint::new_builder().build();
    let dob_id = calculate_dob_id(&input_out_point, 0);

    let dob_type_script = context
        .build_script(&contract_out_point, Bytes::copy_from_slice(&dob_id))
        .expect("build_script");

    let input_dob_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(lock_script.clone())
            .type_(Some(dob_type_script).pack())
            .build(),
        create_dob_data("image/png", &[1, 2, 3, 4]),
    );
    let input = CellInput::new_builder()
        .previous_output(input_dob_out_point)
        .build();

    let output_cell = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output_cell)
        .output_data(Bytes::new().pack())
        .build();
    let tx = context.complete_tx(tx);

    context.verify_tx(&tx, 10_000_000).expect("pass burn verification");
}
