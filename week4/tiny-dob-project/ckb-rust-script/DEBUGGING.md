# Debugging CKB Contracts with ckb-debugger

This guide explains how to use **`ckb-debugger`**—an offline CKB-VM interpreter—to inspect execution logs, measure CPU cycles consumed by smart contracts, and perform step-by-step interactive debugging.

---

## Workflow Overview

```
┌─────────────────────────────────┐
│ 1. Dump Tx Context from Test    │ ──(Generates a static tx.json mockup)
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ 2. Run ckb-debugger CLI         │ ──(Executes offline, prints logs & cycles)
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ 3. Connect GDB for Step-Debug   │ ──(Inspect registers, memory, variables)
└─────────────────────────────────┘
```

---

## Step 1: Dump Transaction Context to JSON

The `ckb-testtool` library provides a convenient way to dump the simulated transaction context (including inputs, outputs, cell deps, and binary codes) into a JSON file.

Add the following code to the end of any test case in [tests/src/tests.rs](tests/src/tests.rs) before verifying the transaction:

```rust
    // Complete transaction construction
    let tx = context.complete_tx(tx);

    // --- DUMP TRANSACTION TO JSON ---
    let tx_json = context.dump_tx(&tx).expect("Failed to dump transaction");
    std::fs::write(
        "tx.json",
        serde_json::to_string_pretty(&tx_json).unwrap()
    ).expect("Failed to write tx.json");
    // ---------------------------------

    // Run the verification
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
```

Run `make test` to execute the test suite and output the `tx.json` file in the workspace directory.

---

## Step 2: Run Transaction Offline with ckb-debugger

Use the `ckb-debugger` command-line utility to run the Type Script (or Lock Script) offline using the transaction context saved in `tx.json`.

Execute the following command in your terminal from the workspace root:

```bash
ckb-debugger --tx-file tx.json --script-group-type type --cell-index 0 --cell-type output
```

### Argument Explanations:
*   `--tx-file tx.json`: Specifies the dumped transaction context JSON file.
*   `--script-group-type type`: Selects the script group type to execute. Use `type` for Type Scripts and `lock` for Lock Scripts.
*   `--cell-index 0`: The index of the cell within the script group to test (in our case, the TinyDOB output cell is at index 0 of the group).
*   `--cell-type output`: Specifies whether the script group is in the transaction `input` or `output` list.

### Expected Output:
Upon execution, `ckb_std::debug!` statements will print to stdout, followed by the execution result code and total cycles:

```text
[INFO] TinyDOB Type Script contract execution started.
[INFO] Group size - Input: 0, Output: 1
[INFO] Mode: Minting
[INFO] Mint validation passed successfully.
Run result: 0
Cycles consumed: 172905
```

*   `Run result: 0`: Signifies successful validation (any other code means a contract crash/rejection).
*   `Cycles consumed`: Displays the exact count of CPU clock cycles used. This is critical for estimating CKB transaction fees and gas optimization.

---

## Step 3: Interactive Source-Level Debugging (GDB)

If a contract crashes (e.g. out of memory, index out of bounds) and logs are insufficient, you can hook the interpreter to a GDB server.

### 1. Launch ckb-debugger GDB Server
Start the debugger and instruct it to listen on port `9000`:
```bash
ckb-debugger --tx-file tx.json --script-group-type type --cell-index 0 --cell-type output --mode gdb --gdb-listen 127.0.0.1:9000
```
*The command will pause and await connection.*

### 2. Connect via RISC-V GDB
In a separate terminal, launch `gdb-multiarch` (or `riscv64-unknown-elf-gdb` if installed) targeting the debug build of your contract:
```bash
# Install on Ubuntu/Debian: sudo apt update && sudo apt install gdb-multiarch
gdb-multiarch build/release/dob-script.debug
```

Once inside the GDB interactive shell, establish connection to the server:
```text
(gdb) target remote 127.0.0.1:9000
```

### 3. Basic Debugging Commands

You are now attached to the virtual machine executing your code. Use standard GDB commands:
*   `b <function_name>` or `b <line_number>`: Sets a breakpoint. Since Rust aggressively inlines functions in release mode, the symbol `program_entry` might not exist. Instead, set breakpoints using line numbers or the macro-generated main symbol:
    *   `b dob_script::__ckb_std_main` (the entrypoint symbol)
    *   `b main.rs:23` (by line number)
*   `c`: Continues execution until the next breakpoint.
*   `n`: Steps to the next line of code (skips function calls).
*   `s`: Steps into the function call on the current line.
*   `p <variable>`: Prints the contents of a variable (e.g., `p input_group_count` or `p/x expected_dob_id`).
*   `info registers`: Displays the CKB-VM RISC-V CPU registers state.
*   `q`: Quits the debugging session.

---

## 4. Interactive Debugging Walkthrough Example

Here is a step-by-step walk-through of an interactive debugging session tailored for the `dob-script` contract:

### Step 1: Connect and Break at Entrypoint
Start `gdb-multiarch` and target the debug file. Set a breakpoint at the entrypoint symbol `dob_script::__ckb_std_main` immediately after connecting:
```text
(gdb) target remote 127.0.0.1:9000
Remote debugging using 127.0.0.1:9000
0x00000000000150e0 in _start ()
(gdb) b dob_script::__ckb_std_main
Breakpoint 1 at 0x10d18: file contracts/dob-script/src/main.rs, line 23.
```

### Step 2: Continue Execution to Entrypoint
Execute the `c` command to run the VM bootstrap code. The execution will pause at line 23:
```text
(gdb) c
Continuing.

Breakpoint 1, dob_script::main::program_entry () at contracts/dob-script/src/main.rs:23
23          ckb_std::debug!("TinyDOB Type Script contract execution started.");
```

### Step 3: Inspect Execution Mode (Group Counts)
We want to check if the contract correctly identifies that we are in **Mint Mode**. Use `n` to step through lines until the group counts are resolved:
```text
(gdb) n
24          let script = match load_script() {
(gdb) n
...
63          ckb_std::debug!("Group size - Input: {}, Output: {}", input_group_count, output_group_count);
```
Now, print both variables to check their values:
```text
(gdb) p input_group_count
$1 = 0
(gdb) p output_group_count
$2 = 1
```
Since `input_group_count == 0` and `output_group_count == 1`, this confirms the contract correctly identified **Mint Mode** execution.

### Step 4: Validate Blake2b Hash & DOB ID
Set a breakpoint at the line that verifies the DOB ID (line 124 in `main.rs` where `dob_id` is matched against `expected_dob_id`):
```text
(gdb) b 124
Breakpoint 2 at 0x11100: file contracts/dob-script/src/main.rs, line 124.
(gdb) c
Continuing.

Breakpoint 2, dob_script::main::program_entry () at contracts/dob-script/src/main.rs:124
124             if dob_id.as_ref() != expected_dob_id {
```

Print the expected DOB ID calculated by Blake2b:
*   **As decimal array**:
    ```text
    (gdb) p expected_dob_id
    $3 = [118, 59, 211, 239, ...]
    ```
*   **As hex bytes**:
    ```text
    (gdb) p/x expected_dob_id
    $4 = {0x76, 0x3b, 0xd3, 0xef, ...}
    ```

You can also print the parsed script argument byte slice:
```text
(gdb) p dob_id
```

### Step 5: Quit Debugging
To terminate the CKB-VM interpreter simulation and exit GDB:
```text
(gdb) q
A debugging session is active.
Quit anyway? (y or n) y
```

---

## 5. Debugging CKB Contracts inside VSCode

Rather than running GDB inside a raw terminal, you can configure VSCode to debug your contracts interactively with breakpoints, variable inspection, and step-by-step navigation directly inside the VSCode editor GUI.

You can configure this using either **Method 1 (Automated with `tasks.json`)** or **Method 2 (Manual execution in terminal)**. Both configurations support the **Native Debug** extension (using GDB) or the **CodeLLDB** extension (using LLDB).

---

### Method 1: Automated Debugging (using `tasks.json`)

This method is fully automated. When you press `F5`, VSCode automatically launches `ckb-debugger` in the background, attaches the GDB/LLDB debugger client, and stops the debugger process when you exit.

#### 1. Configure VSCode Tasks (`.vscode/tasks.json`)
Create a file at `.vscode/tasks.json` in your workspace root (or add to your existing configurations) to start/stop the `ckb-debugger` process automatically:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "StartDbg-Rust",
            "isBackground": true,
            "type": "shell",
            "command": "ckb-debugger --tx-file ${workspaceRoot}/week4/Create_DOB/tests/tx.json --script-group-type type --cell-index 0 --cell-type output --mode gdb --gdb-listen 127.0.0.1:9000",
            "problemMatcher": {
                "owner": "custom",
                "pattern": {
                    "regexp": "^$"
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": "Listening for gdb remote connection",
                    "endsPattern": "booting VM"
                }
            }
        },
        {
            "label": "StopCkbDebugger",
            "type": "shell",
            "command": "killall ckb-debugger || true"
        }
    ]
}
```

#### 2. Configure Debug Launch Settings (`.vscode/launch.json`)
Create a file at `.vscode/launch.json` in your workspace root and add the following configuration:

##### Option A: Using "Native Debug" Extension (Recommended for GDB)
Install the VSCode extension: **Native Debug** (`webfreak.debug`). Then configure it to attach to the automated background task:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "CKB Debug (Native Debug GDB - Automated)",
            "type": "gdb",
            "request": "attach",
            "target": "127.0.0.1:9000",
            "remote": true,
            "cwd": "${workspaceRoot}",
            "gdbpath": "gdb-multiarch",
            "executable": "${workspaceRoot}/week4/Create_DOB/build/release/dob-script.debug",
            "preLaunchTask": "StartDbg-Rust",
            "postDebugTask": "StopCkbDebugger"
        }
    ]
}
```

##### Option B: Using "CodeLLDB" Extension (Alternative for LLDB)
Install the VSCode extension: **CodeLLDB** (`vadimcn.vscode-lldb`). Add this to your `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "CKB Debug (CodeLLDB - Automated)",
            "type": "lldb",
            "request": "custom",
            "targetCreateCommands": [
                "target create ${workspaceRoot}/week4/Create_DOB/build/release/dob-script.debug"
            ],
            "processCreateCommands": [
                "gdb-remote 127.0.0.1:9000"
            ],
            "preLaunchTask": "StartDbg-Rust",
            "postDebugTask": "StopCkbDebugger"
        }
    ]
}
```

---

### Method 2: Manual Debugging (Without `tasks.json`)

This method is simpler to configure. You manually run the `ckb-debugger` server in a separate VSCode terminal tab, then use the debug window to attach to it. This is ideal if you want to see raw debugger log outputs directly.

#### 1. Configure Debug Launch Settings (`.vscode/launch.json`)
Make sure you remove `preLaunchTask` and `postDebugTask` from your `.vscode/launch.json` configurations:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "CKB Debug (Native Debug GDB - Manual Attach)",
            "type": "gdb",
            "request": "attach",
            "target": "127.0.0.1:9000",
            "remote": true,
            "cwd": "${workspaceRoot}",
            "gdbpath": "gdb-multiarch",
            "executable": "${workspaceRoot}/week4/Create_DOB/build/release/dob-script.debug"
        }
    ]
}
```

#### 2. Start the ckb-debugger Server Manually
Before launching GDB, open the VSCode integrated terminal. 
*Note: Make sure your relative path to `tx.json` matches your current working directory (Cwd):*

*   **If you are at the Workspace Root (`/home/hiepthach/04_CKB`)**:
    ```bash
    ckb-debugger --tx-file week4/Create_DOB/tests/tx.json --script-group-type type --cell-index 0 --cell-type output --mode gdb --gdb-listen 127.0.0.1:9000
    ```
*   **If you are at the Project Root (`/home/hiepthach/04_CKB/week4/Create_DOB`)**:
    ```bash
    ckb-debugger --tx-file tests/tx.json --script-group-type type --cell-index 0 --cell-type output --mode gdb --gdb-listen 127.0.0.1:9000
    ```

---

### Step 3: Run and Debug in VSCode (For Both Methods)
1. Open the Rust source file: [main.rs](contracts/tiny-dob-script/src/main.rs).
2. Set a breakpoint in your code by clicking to the left of the line numbers (e.g. line 24).
3. Go to the **Run and Debug** view in VSCode (`Ctrl+Shift+D`).
4. Select your preferred configuration (e.g. `CKB Debug (Native Debug GDB - Automated)` or `CKB Debug (Native Debug GDB - Manual Attach)`) from the dropdown.
5. Click the green play arrow or press **`F5`** to start debugging.
6. Execution will halt at your breakpoint, enabling you to inspect registers, step through lines, and check variables in the VSCode GUI!
