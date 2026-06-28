# Understanding Nervos CKB: Basic Theory Summary (Lesson 1)

This document summarizes and explains in detail the content of the **Basic Theory** course from [CKB Academy](https://academy.ckb.dev/courses/basic-theory). This course provides foundational concepts about Nervos CKB, from Cell structure and ownership verification to how transactions work and the differences between Script types.

---

## Table of Contents
1. [Chapter 1: What is CKB?](#chapter-1-what-is-ckb)
2. [Chapter 2: Structure of a Cell](#chapter-2-structure-of-a-cell)
3. [Chapter 3: Verifying Cell Ownership](#chapter-3-verifying-cell-ownership)
4. [Chapter 4: Part 1 Summary](#chapter-4-part-1-summary)
5. [Chapter 5: Where the Actual Code Lives (CellDep)](#chapter-5-where-the-actual-code-lives-celldep)
6. [Chapter 6: What Happens if the Lock's Code is Lost?](#chapter-6-what-happens-if-the-locks-code-is-lost)
7. [Chapter 7: Transactions in CKB](#chapter-7-transactions-in-ckb)
8. [Chapter 8: Comparing Lock Script and Type Script](#chapter-8-comparing-lock-script-and-type-script)
9. [Chapter 9: Full Course Summary](#chapter-9-full-course-summary)

---

## Chapter 1: What is CKB?

To understand Nervos CKB, set aside complex concepts and focus on the core essence: **Everything in CKB revolves around Cells (memory slots) and their transformations.**

*   **Cell:** The most basic storage unit of CKB. All Cells across the network form the global state of the blockchain.
*   **Cell States:**
    *   **Live Cell:** A Cell that has not yet been consumed; represents an existing asset or piece of data.
    *   **Dead Cell:** A Cell that has been consumed in a past transaction; can never be used again.
*   **How it works:** CKB's operation is similar to Bitcoin's **UTXO** model. When making a transaction, we consume (spend) some old Live Cells (turning them into Dead Cells) and create new Live Cells.
*   **Difference from Bitcoin UTXO:** Bitcoin's UTXOs can only store a monetary balance. CKB's Cells, on the other hand, can store **any type of data** in their `data` field (strings, hashes, timestamps, or even binary code executable on the CKB-VM). This is how CKB implements smart contracts.

---

## Chapter 2: Structure of a Cell

Storage space on the blockchain is finite and has a maintenance cost. This is where the role of the native CKB token comes in.

*   **Storage space conversion:**
    $$\text{1 CKB} = \text{1 Byte of storage space on the blockchain}$$
    If you own 100 CKBytes, you have the right to create Cells with a maximum total size of 100 Bytes.
*   **A Cell's data structure has 4 main fields:**
    ```ts
    Cell: {
      capacity: HexString; // Capacity (max bytes of the Cell, measured in Shannon. 1 CKB = 10^8 Shannon)
      lock: Script;        // Lock Script — governs ownership
      type: Script;        // Type Script — governs business logic (optional)
      data: HexString;     // Arbitrary data stored as Hex
    }
    ```
*   **Capacity constraint:** The total byte size of all 4 fields combined must not exceed the value of the `capacity` field:
    $$\text{capacity} \ge \text{size}(capacity) + \text{size}(lock) + \text{size}(type) + \text{size}(data)$$
    Therefore, if you store more data in `data`, you need a Cell with a larger `capacity` (costing more CKB tokens). This is why the project is named **Common Knowledge Base** — a place for storing the consensus knowledge/data of humanity.

---

## Chapter 3: Verifying Cell Ownership

How does the blockchain know you are the owner and have the right to use a Cell? The answer lies in the `lock` field (Lock Script).

*   **Locking mechanism:** A Lock Script acts like a padlock. When you want to consume (spend) a Cell in a transaction, the CKB-VM automatically runs the code in the Lock Script along with the parameters and proof of authorization (e.g., a digital signature) that you provide.
*   **Structure of a Script:**
    ```ts
    Script: {
      code_hash: HexString; // Hash identifying the code to run
      args: HexString;      // Arguments passed to the code (e.g., your Public Key hash)
      hash_type: Uint8;     // Hash type for locating code (0: data, 1: type, 2: data1)
    }
    ```
*   **Validation:**
    *   `code_hash` and `args` together form a complete lock.
    *   During execution, CKB-VM loads code based on `code_hash` and passes `args` as input parameters.
    *   If the code runs successfully and returns **`0`**, the lock is opened (you've proven ownership). Any non-zero return value means validation failed and the transaction is rejected.
    *   *Asymmetric encryption example:* You place your Public Key hash in the `args` field. When a transaction occurs, you use your Private Key to sign it. The Script takes that signature and cross-checks it against the Public Key in `args` to authenticate you.

---

## Chapter 4: Part 1 Summary

*   CKB is a continuous chain of Cells being created and destroyed.
*   A Cell is a universal storage container (holding arbitrary data).
*   $1\text{ CKB} = 1\text{ Byte}$ of on-chain storage space.
*   The actual size of a Cell must be $\le \text{capacity}$.
*   Every Cell must have a Lock Script to protect ownership.

---

## Chapter 5: Where the Actual Code Lives (CellDep)

In a Script's structure, `code_hash` is only an identifying hash — it does not contain the actual executable code. So where does the real source code live?

*   **Code lives in another Cell:** The actual executable code (in RISC-V binary machine code format) is stored directly in the `data` field of another Cell on the blockchain.
*   **CellDep (Dependency Cell):** When creating a transaction, you must attach the Cell containing this code as a library dependency (`cell_deps`). CKB will use `code_hash` to match and load the code from these dependency Cells into the virtual machine.
*   **How code is located based on `hash_type`:**
    *   If `hash_type` is `"data"` or `"data1"`: CKB looks for a dependency Cell whose `blake2b_ckbhash(data)` matches `code_hash`.
    *   If `hash_type` is `"type"`: CKB looks for a dependency Cell whose `blake2b_ckbhash(type script)` matches `code_hash`.
*   **Advantage:** This design maximizes resource efficiency. If many users share the same type of lock (e.g., the standard SECP256K1 algorithm), the code only needs to be deployed once to a single Cell. Other transactions just reference that Cell via `code_hash` without copying the entire code again.

---

## Chapter 6: What Happens if the Lock's Code is Lost?

What happens if the Cell containing the Lock Script's code is consumed or destroyed?

*   **In theory:** If the Cell containing the code (dep cell) disappears or is altered, the Lock Script cannot find code to run, meaning the Cell using that Lock will be permanently locked and can never be opened again.
*   **Solution for Built-in Scripts (System Scripts):** CKB designs the Cells containing system code (like the SECP256K1 for wallets) to be in a state that can never be consumed, using a special Lock Script called a **Never unlockable lock**:
    ```ts
    Never unlockable lock: {
      code_hash: 0x0000000000000000000000000000000000000000000000000000000000000000
      hash_type: data
      args: 0x
    }
    ```
    No one can open or destroy this Cell, ensuring the system code exists permanently on-chain.
*   **Solution for Custom Scripts:** If you self-deploy code and your dep cell is lost, you can still unlock your Cell by **redeploying that exact same code to a new Cell** and referencing this new Cell as `cell_deps`. Since the `code_hash` of the same binary code is unchanging, CKB will still be able to locate the code and unlock successfully.

---

## Chapter 7: Transactions in CKB

A transaction in CKB is fundamentally the act of destroying some old Cells and creating some new Cells.

*   **Core formula:**
    $$\text{Transaction: inputs} \rightarrow \text{outputs}$$
    *   `inputs`: A list of Live Cells to be consumed (they become Dead Cells after the transaction).
    *   `outputs`: A list of newly created Cells (they become new Live Cells).
*   **Transaction rules:**
    1.  **Capacity conservation:** The total capacity of output Cells must be less than or equal to the total capacity of input Cells to prevent self-minting capacity from thin air:
        $$\sum \text{capacity}(\text{outputs}) \le \sum \text{capacity}(\text{inputs})$$
    2.  **Transaction Fee:** The difference between input and output capacity is the transaction fee paid to miners:
        $$\text{Fee} = \sum \text{capacity}(\text{inputs}) - \sum \text{capacity}(\text{outputs})$$
*   **OutPoint structure:** To optimize storage space, a transaction does not contain the full input Cell — only a reference pointer called an `OutPoint`:
    ```ts
    OutPoint: {
      tx_hash: string; // Hash of the transaction that created that Cell
      index: number;   // Index position of the Cell in that transaction
    }
    ```

---

## Chapter 8: Comparing Lock Script and Type Script

Every Cell must have a Lock Script and may optionally have a Type Script. Although their technical structure is the same, their intended purpose is completely different.

> [!NOTE]
> *   **Lock Script is the Gatekeeper:** Protects ownership of the box (Cell) — defines *who* has the right to open the box.
> *   **Type Script is the Guardian:** Ensures the box follows application business logic rules — defines *how* the box is allowed to transform.

### Differences in execution mechanism:

| Criterion | Lock Script | Type Script |
| :--- | :--- | :--- |
| **Primary purpose** | Protect ownership, manage authentication signatures. | Ensure data validity, state transition rules for dApps. |
| **Required** | Yes (Every Cell must have a Lock Script). | No (Optional). |
| **Execution scope** | Only runs for Cells in `inputs`. | Runs for Cells in both `inputs` and `outputs`. |
| **Execution grouping** | Runs as a group of Cells sharing the same Lock Script. | Runs as a group of Cells sharing the same Type Script. |

*   *Type Script example:* If you want to create a custom token (like SUDT), you program a Type Script that enforces the rule that the total amount of tokens in `outputs` must equal the total amount in `inputs` (preventing users from arbitrarily modifying data to inflate their token balance).

---

## Chapter 9: Full Course Summary

1.  **CKB** is a network of Cells continuously being created and destroyed.
2.  **Cell** is a universal storage container holding any type of data.
3.  **1 CKB = 1 Byte** of on-chain storage space. The actual size of a Cell must be $\le \text{capacity}$.
4.  **Lock Script (required)** protects Cell ownership. Only authorized parties can unlock it.
5.  **Unlocking** succeeds when the executed code returns `0`; fails when it returns any other value.
6.  **Script code** is stored in a separate dependency Cell (`CellDep`) to save resources.
7.  **Never unlockable lock** is used to permanently lock Cells containing system code (system scripts), preventing them from being deleted.
8.  **A transaction** consumes input Cells (`inputs`) and creates output Cells (`outputs`).
9.  **Capacity conservation:** Total output `capacity` must be less than input; the difference is the miner's transaction fee.
10. **Lock Script** protects ownership (only runs at `inputs`), while **Type Script** enforces business logic rules (runs at both `inputs` and `outputs`).
