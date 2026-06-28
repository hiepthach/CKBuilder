# Lesson Explanation: Basic Operation on CKB

## Table of Contents
* [1. What is a Cell?](#1-what-is-a-cell)
* [2. Basic Operation: "Consume" and "Create"](#2-basic-operation-consume-and-create)
* [3. Structure of a Transaction](#3-structure-of-a-transaction)
* [4. Transaction Verification Process](#4-transaction-verification-process)
* [5. Practice: Connect Wallet & Check Live Cells (Chapter 1)](#5-practice-connect-wallet--check-live-cells-chapter-1)
  * [5.1. Connect Wallet](#51-connect-wallet)
  * [5.2. Live Cells Displayed on UI](#52-live-cells-displayed-on-ui)
  * [5.3. Blocks & Transactions](#53-blocks--transactions)
  * [5.4. Detailed Analysis of a Special Transaction (Cellbase Transaction)](#54-detailed-analysis-of-a-special-transaction-cellbase-transaction)
  * [5.5. Testnet Chain Configuration](#55-testnet-chain-configuration)
* [6. What is transaction? (Chapter 2)](#6-what-is-transaction-chapter-2)
* [7. Send a transaction (Chapter 3)](#7-send-a-transaction-chapter-3)
* [8. Common Errors When Sending Transactions](#8-common-errors-when-sending-transactions)
  * [Error 1: Transaction without Fee (PoolRejectedTransactionByMinFeeRate)](#error-1-transaction-without-fee-poolrejectedtransactionbyminfeerate)
  * [Error 2: Signature Mismatch due to Data Modification (ValidationFailure: error code 71)](#error-2-signature-mismatch-due-to-data-modification-validationfailure-error-code-71)
* [Summary](#summary)
* [9. In-depth Knowledge (Further References)](#9-in-depth-knowledge-further-references)
  * [1. WitnessArgs Structure (blockchain.mol)](#1-witnessargs-structure-blockchainmol)
  * [2. The Versatility of Omnilock (RFC 0042-omnilock)](#2-the-versatility-of-omnilock-rfc-0042-omnilock)
  * [3. Strict Transaction Signing Process (How-to-sign-transaction)](#3-strict-transaction-signing-process-how-to-sign-transaction)

---

The **Basic Operation** lesson in Nervos CKB revolves around how the **Cell Model** works – the core data structure of CKB, and how transactions change the state of the blockchain. CKB uses a generalized version of Bitcoin's UTXO (Unspent Transaction Output) model, called the Cell Model.

Below are the most important basic concepts and operations:

## 1. What is a Cell?
A Cell is the most basic data storage unit on Nervos CKB. You can think of each Cell as a "box" containing data with a lock on it.
A Cell contains 4 main components:
- **Capacity:** The amount of CKB tokens this Cell is holding. This capacity also limits the maximum data size the Cell can store (1 CKB = 1 Byte of storage).
- **Data:** Any arbitrary data that can be stored (e.g., smart contract state, text, images, etc.).
- **Lock Script:** A snippet of code used to determine "who is the owner" of the Cell. Only those with a valid key (digital signature) have the right to unlock and use (consume) this Cell.
- **Type Script (Optional):** A snippet of code acting as a Smart Contract, dictating the rules when the data or state of the Cell is modified in a transaction.

## 2. Basic Operation: "Consume" and "Create"
Unlike Ethereum (where account balances are simply added/subtracted), CKB operates on **destruction and creation**.
- Cells are **immutable**. Once a Cell is created on the blockchain, it cannot be modified.
- To update data or transfer money (CKB), you must perform a transaction with the operation: **Consume** the old Cells in the `Inputs` section and **Create** new Cells in the `Outputs` section.

*Example:* If you have 1 Cell containing 100 CKB and want to send a friend 30 CKB.
- **Input:** Provide the old Cell (100 CKB). Unlock it with your signature.
- **Output 1:** Create 1 new Cell containing 30 CKB, locked by your friend's Lock Script.
- **Output 2:** Create 1 new Cell containing 70 CKB change (minus transaction fee), locked back with your Lock Script.
- The old 100 CKB Cell will then be marked as "Dead" (spent), and the 2 new Cells will become "Live" (available for the next transaction).

## 3. Structure of a Transaction
A basic operation (transaction) on CKB will include the following components:
- **Inputs:** The existing Cells (Live Cells) you want to consume.
- **Outputs:** The new Cells generated with the new state/balance.
- **Cell Deps (Cell Dependencies):** The Cells containing the source code of Smart Contracts. The transaction only "reads" these Cells to execute lock logic (Lock Script) or contract logic (Type Script), but does not consume them.
- **Witnesses:** Contains digital signatures or other cryptographic proofs to prove you have the right to use the Inputs.

## 4. Transaction Verification Process
When you submit an operation (transaction) to the network, the nodes on the network will check:
1. The total `Capacity` of the Inputs must be **greater than or equal to** the total capacity of the Outputs. (You cannot create CKB out of thin air).
2. The Lock Script of all Inputs must execute successfully (Verifying the rightful owner).
3. The Type Script of both Inputs and Outputs must execute successfully (Verifying the state transition rules of the Smart Contract are correct).

## 5. Practice: Connect Wallet & Check Live Cells (Chapter 1)

Below is a detailed explanation of the practice interface in Chapter 1 upon successful wallet connection on CKB Academy:

### 5.1. Connect Wallet
* When you successfully connect your wallet (e.g., via MetaMask/JoyID), the system will issue you an official testnet wallet address starting with `ckt...`.
* To support the learning process, the system automatically assigns **10 Live Cells**, each with a capacity of **100 CKB** to your wallet.

### 5.2. Live Cells Displayed on UI
* The interface displays a list of your 10 Cells with the capacity noted as `Capacity: 0x2540be400`.
* **Explanation of the number `0x2540be400`:**
  * This is a representation in Hexadecimal. When converted to Decimal, `0x2540be400` = `10,000,000,000`.
  * The smallest unit of the CKB network is the **Shannon** (similar to Bitcoin's Satoshi). Conversion: `1 CKB = 10^8 Shannons` (100,000,000 Shannons).
  * Therefore, `10,000,000,000 Shannons` is exactly equal to **100 CKB**.
* **Wallet Balance Definition:** When we say a wallet possesses a certain amount of CKB, we are actually referring to the **total Capacity of all Live Cells** that the wallet's Private Key has the right to unlock. This number is also the maximum data storage capacity limit your wallet is occupying on the CKB blockchain.

### 5.3. Blocks & Transactions
* The interface displays a list of the 9 latest Blocks on the CKB Testnet.
* Each block contains information about the block height (Block number), Block Hash, creation time (Time), and the number of transactions within that block (`Transactions: Count`).
* You can click on each transaction to view the detailed JSON structure. Although actual transactions on the blockchain are technically more complex, their core is still built on the fundamental principle: **Inputs => Outputs**.

### 5.4. Detailed Analysis of a Special Transaction (Cellbase Transaction)
Below is an analysis of the JSON data structure of a sample transaction extracted from Block 21531277 on the CKB Testnet:

```json
{
  "cellDeps": [],
  "inputs": [
    {
      "previousOutput": {
        "txHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "index": "0xffffffff"
      },
      "since": "0x1488a8d"
    }
  ],
  "outputs": [
    {
      "lock": {
        "codeHash": "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
        "hashType": "type",
        "args": "0x0450340178ae277261a838c89f9ccb76a190ed4b"
      },
      "type": null,
      "capacity": "0xd410ca617"
    }
  ],
  "outputsData": [
    "0x"
  ],
  "headerDeps": [],
  "hash": "0xaa32dbdfaf3eebbf7976fc25c13a8d6066f76541af97447f072a88809931b06f",
  "version": "0x0",
  "witnesses": [
    "0x7f0000000c00000055000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce801140000000450340178ae277261a838c89f9ccb76a190ed4b260000000000000020302e3230372e3020283866366361636620323032362d30362d31302920deadbeef"
  ]
}
```

#### Structure Analysis:
1. **Inputs:**
   * The `txHash` field of `previousOutput` is a string of all `0`s (`0x000000...00`), and the `index` is `0xffffffff`.
   * **Meaning:** This is a **Cellbase Transaction** (similar to a Coinbase Transaction in Bitcoin). This is a special transaction created by the miner to receive the block reward. It does not consume any actual Cells, but generates new CKB out of thin air as a mining reward.
2. **Outputs:**
   * Creates a new Cell with `capacity`: `0xd410ca617` (in Hex) = `56,925,103,639` Shannons (approximately **569.25 CKB**). This is the miner's block reward.
   * `lock.codeHash`: `0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8`. This is the hash of the default `SECP256K1_BLAKE160` security lock contract.
   * `lock.args`: `0x0450340178ae277261a838c89f9ccb76a190ed4b`. This is the Public Key Hash of the miner, acting as the receiving address.
3. **OutputsData:** `0x` (contains no additional data).
4. **Witnesses:** Contains cryptographic proof of verification or information about the mining application (at the end of the hash string, there is the text `deadbeef`).

#### Security Concerns:
* **Is there anything sensitive/secure in this data?**
  * **No.** All information in this JSON file is entirely **public information** on the blockchain.
  * The `args` field is just a public key used to identify the receiving address and absolutely does not contain a private key or password. Anyone using a Blockchain Explorer can view this transaction.

### 5.5. Testnet Chain Configuration
For dApps or scripts to transact on the blockchain, we need to know the basic configuration information of that network:

* **`PREFIX: "ckt"`**:
  * Defines the display prefix for wallet addresses.
  * On the CKB Mainnet, addresses start with the prefix `ckb`. On the CKB Testnet, addresses start with `ckt`.
* **`SCRIPTS`**:
  * These are the identifiers of the system Smart Contracts (key/source code types) pre-deployed in the genesis block of CKB. When creating a Lock Script or Type Script for a Cell, developers will call these functions via hash references (`CODE_HASH`, `TX_HASH`, `DEP_TYPE`).
  * Some typical system Scripts:
    1. **`SECP256K1_BLAKE160`**: The default signature encryption and hashing algorithm of the system, used as a Lock Script to protect the ownership of Cells.
    2. **`SECP256K1_BLAKE160_MULTISIG`**: A version supporting multi-signature (multiple people co-owning and approving a transaction).
    3. **`DAO`**: The smart contract of NervosDAO (used for depositing CKB to earn interest).
    4. **`SUDT` (Simple User Defined Token)**: A standard contract helping issue custom tokens on CKB (similar to the ERC-20 standard on Ethereum).
    5. **`ANYONE_CAN_PAY`**: A special lock contract allowing others to transfer funds into your Cell without your signature (very useful for receiving donations or creating automated receiving wallets).
    6. **`OMNILOCK`**: The versatile lock contract of CKB, supporting transaction signing with various signature formats (Bitcoin, Ethereum, EOS, or Passkey/JoyID).

---

## 6. What is transaction? (Chapter 2)
A transaction on CKB is essentially just the act of **consuming some existing Live Cells and creating some new Cells**.

CKB is designed on the **"Off-chain computing, on-chain verifying"** model. This is very significant: you can completely build the contents of a transaction manually on your computer without an internet connection.
* **Amazon Jungle Example:** Imagine a friend in the Amazon jungle with no internet. They can write down the transaction details on paper (which Cells to consume, which Cells to create), compute the digital signature using their Private Key on an offline computer, and send that paper via mail taking half a month to reach you. When you enter that information and submit it to the CKB mainnet, the network only needs to "verify" that the signature is valid, and the transaction is successful.

The structure of a manually constructed transaction (in JSON format) includes:
* **Transaction Input (`inputs`):** Used to specify which Cells will be consumed in this transaction.
  * To pinpoint the exact Cell to be consumed, the system uses the concept of **`previousOutput`** containing an **`outPoint`**. An `outPoint` acts as a locational pointer, comprising:
    * **`txHash`:** The hash of the transaction that created this Cell.
    * **`index`:** The position of that Cell in the `outputs` array of the aforementioned transaction (e.g., `0x0` is the first Cell, `0x2` is the third Cell).
  * **Why are there multiple `outPoint`/`txHash`/`index`?** Having multiple elements in the `inputs` array is normal because a transaction often needs to **consume multiple Cells** at once to gather enough Capacity for a payment.
  * Additionally, within each input, there is a `since` field used for time locks.
* **Cell Dependencies (`cellDeps`):** Contains a list of Cells providing Smart Contract source code that this transaction must reference for the system to run the verification logic.
  * Like `inputs`, it also uses **`outPoint`** to point to the Cells containing the source code. A transaction might need to reference multiple different contracts (e.g., needing both `OMNILOCK` and `SECP256K1`), so this array also has multiple `outPoint`s.
  * **`depType`**: Determines how the CKB Virtual Machine (CKB-VM) will load the source code from this Cell:
    * `"code"`: The referenced Cell directly contains the binary code of the contract.
    * `"depGroup"`: The referenced Cell does not contain source code, but contains a list (array) of other `outPoint`s. The system will continue to follow those `outPoint`s to fetch the actual source code. This technique helps optimize capacity when a feature needs to group multiple linked scripts.
* **Transaction Output (`outputs`):** Contains information of the new Cells to be generated (including `capacity` and `lock script`). **Note:** The total capacity of the Outputs must be less than the total capacity of the Inputs. The difference (CKB gap) is the transaction `fee` for the miners.
* **Outputs Data (`outputs_data`):** The actual data stored correspondingly with each Cell in the `outputs` section (separated to optimize performance).

---

## 7. Send a transaction (Chapter 3)
This chapter provides step-by-step practical instructions to manually create and send a transaction:

1. **Fill in transaction information:** You must manually input the `inputs`, `outputs`, and especially `cellDeps`.
   * **Where do you get this information in the CKB Academy practice?** On the right side of the interface, there will be a Toolbox:
     * To fill in **`inputs`**: Scroll down to the **Live Cells** section in the Toolbox, select a Cell currently available in your wallet, and copy its `txHash` and `index` to put into `previousOutput`.
     * To fill in **`outputs`**: You can use the **Address Tool** in the Toolbox to translate the recipient's wallet address into a `lock script` (or copy directly from your wallet if you want to send it back to yourself) and manually enter the desired `capacity`.
     * To fill in **`cellDeps`**: Open the **Chain Info** section in the Toolbox to copy the `outPoint` information of system contracts like Omnilock or Secp256k1.
   * **How do you know the information of the `outputs` in advance (like `capacity`, `lock`)?** In CKB (as well as other blockchains using the UTXO model), **you (or your wallet software) are the one who fully designs and determines the Outputs** before submitting them to the network.
     * **`capacity`:** You decide based on the amount you want to send. For example, if you use 1 `input` worth 100 CKB to send a friend 20 CKB, you will manually create the first Output with `capacity = 20 CKB` (for your friend), and a second Output with `capacity = 79.999 CKB` (acting as "change" returned to yourself). The difference (0.001 CKB) will automatically become the miner fee.
     * **`lock`:** You dictate who will own these new Cells. For the first Output, you fill in your friend's `lock script`. For the second Output (change), you fill in your own `lock script`.
       * **How do you find out the recipient's `args`, `code_hash`, `hash_type`?** In reality, the **wallet address** (e.g., `ckt1...`) someone sends you is not a random string of characters. It is the **encoded version (Bech32m format) of an entire `lock script` structure**. When you paste that address into a wallet software (or a tool like Address Tool), it will automatically "decode" it back into 3 core components:
         1. `code_hash`: Points to the type of smart contract being used (e.g., the hash of the Omnilock contract).
         2. `hash_type`: How the system will search for that contract (usually `type` or `data`).
         3. `args`: The actual identifier of the recipient (usually the Public Key Hash).
   * **Example of `cellDeps`:** If the Live Cell in your `inputs` is protected by Omnilock, you will need to add `SECP256K1_BLAKE160` and `OMNILOCK` to the `cellDeps` section so the network knows how to verify the signature.
2. **Generate TX Hash:** Because CKB uses an on-chain verification model, you can calculate the unique hash of the transaction (`tx_hash`) even before you sign or broadcast it to the network.
   * **How is this hash calculated?**
     1. **Assemble Raw Transaction:** The system will gather all core fields of the transaction. This record includes: `version`, `cellDeps`, `headerDeps`, `inputs`, `outputs`, and `outputsData`. **Note:** It absolutely does NOT include the `witnesses` (signature) field, because logically, you cannot hash data that already contains its own signature.
     2. **Data Serialization:** That entire Raw Transaction record will be packed and encoded according to a standard CKB data structure format called **Molecule**.
     3. **Hashing:** The resulting Molecule data string will be passed through the **Blake2b** hashing algorithm (using a personalization parameter specific to the CKB network, `ckb-default-hash`). The resulting 32-byte Hex string output is exactly the `tx_hash`.
3. **Sign Transaction:** The raw transaction needs to be signed with a Private Key. This signature will be placed in the `witnesses` field under the `WitnessArgs` structure (which includes `lock`, `input_type`, `output_type`). For Omnilock, the signature will be placed in the `lock` field.
4. **Send to the network:** When everything is complete, you send the transaction to the CKB Testnet. The returned hash from the network will perfectly match the hash you calculated yourself in Step 2. This is the "certainty" that the CKB system provides.
5. **Check Block status:** If the transaction is in a `pending` state, it is being verified. Once completed, your transaction has been permanently recorded on the blockchain.

---

## 8. Common Errors When Sending Transactions
During the practice of manually building and sending transactions (Chapter 3), you might encounter some common technical errors. Below are 2 typical errors and how to resolve them:

### Error 1: Transaction without Fee (PoolRejectedTransactionByMinFeeRate)
* **Error Message:** `The min fee rate is 1000 shannons/KW, requiring a transaction fee of at least 309 shannons, but the fee provided is only 0`
* **Cause:** In the CKB network, the transaction fee is calculated using the formula: `Fee = Total Capacity of Inputs - Total Capacity of Outputs`. If you set the Capacity of the Outputs to be exactly the same as the Inputs (e.g., taking an Input of 100 CKB and creating Outputs totaling exactly 100 CKB), the remaining fee will be 0. The network will reject the transaction to prevent spam.
* **Solution:** In **Step 1 (Fill in information)**, slightly reduce the `capacity` value of an Output to leave some change as a fee.
  * Example: Instead of leaving it as `0x2540be400` (10,000,000,000 shannons), reduce it to `0x2540be000` (which deducts 1024 shannons for the fee).

### Error 2: Signature Mismatch due to Data Modification (ValidationFailure: error code 71)
* **Error Message:** `TransactionScriptError { source: Inputs[0].Lock, cause: ValidationFailure: see error code 71... }`
* **Cause:** Error code 71 of the Omnilock contract indicates that the digital signature does not match the transaction. This error commonly occurs when you **have modified the transaction information** (such as adjusting the `capacity` in Error 1) but **forgot to generate a new hash and sign it again**. Whenever the transaction structure changes, the hash (`tx_hash`) must fundamentally change as well. If you still use the old signature attached to the new transaction, the smart contract will detect the mismatched hash and reject it.
* **Solution:** Whenever you edit data in Step 1, you must redo the signing process from the beginning:
  1. Go back to **Step 2**, click `Generate TX Hash` to recalculate the newest hash.
  2. Move down to **Step 3**, click `Generate Message` then click `Sign Transaction` to prompt the wallet to sign again.
  3. Paste the new signature into the blank box, click `Serialize witnessArgs`, and then `Update Raw Transaction`.
  4. Only then, click `Send` in **Step 4**.

---

## Summary
**Basic Operation** on CKB is the process of state transition by turning **Live Cells** into **Dead Cells** and generating new Live Cells. All ownership logic is protected by the **Lock Script**, and all business logic (dApp/Smart Contract) is secured by the **Type Script**. The practice interface of CKB Academy helps visually illustrate how these Cells exist on the blockchain.

---

## 9. In-depth Knowledge (Further References)
Below is an explanation of the core protocol-level concepts based on the official Nervos Network documentation:

### 1. WitnessArgs Structure (blockchain.mol)
In CKB's architecture, to optimize space, signatures are not directly stored within the Input section. Instead, all transaction proofs are saved in the `witnesses` array field.
`WitnessArgs` is a fundamental data structure (defined using the [Molecule](https://github.com/nervosnetwork/ckb/blob/5a7efe7a0b720de79ff3761dc6e8424b8d5b22ea/util/types/schemas/blockchain.mol#L114-L118) language) used to categorize these proofs. This structure has 3 Optional fields:
* `lock`: Typically used to contain the digital signature, intended to unlock the `Lock Script` of the Input.
* `input_type`: Used to contain parameters/signatures needed for running the logic of the `Type Script` on the Input side.
* `output_type`: Similarly, contains data needed for the `Type Script` on the Output side.

### 2. The Versatility of Omnilock (RFC 0042-omnilock)
Normally, a blockchain network (like Bitcoin) only supports a single lock algorithm. However, CKB prides itself on maximum abstraction design.
[Omnilock](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md) was created as a "universal lock". It is a Smart Contract that allows signature verification from almost any ecosystem:
* You can use an Ethereum wallet (MetaMask), Bitcoin, EOS, Tron, Dogecoin wallets... to directly sign CKB network transactions.
* You can even use a **Passkey** (like TouchID, FaceID, or Windows Hello via the WebAuthn protocol) to sign transactions without manually holding a Private Key (exemplified by the JoyID wallet experience).
* Omnilock identifies the type of "key" via a 1-byte identifier flag located in the `args` field of the Lock Script (e.g., `0x00` is the default Secp256k1, `0x01` is Ethereum, `0x04` is WebAuthn).

### 3. Strict Transaction Signing Process (How-to-sign-transaction)
Creating a valid signature on CKB is not just simply signing the `tx_hash`. To prevent security vulnerabilities and ensure integrity, the process of [generating the Message to sign](https://github.com/nervosnetwork/ckb-system-scripts/wiki/How-to-sign-transaction) is very strict:
1. **Base Root:** The system uses the 32-byte hash of the raw transaction (`tx_hash`).
2. **Grouping Inputs:** The system groups all Inputs sharing the same `lock script` together.
3. **Cumulative Hashing:** The `tx_hash` is further processed through the Blake2b hashing function along with the total length and the entire actual content of each `witness` corresponding to the Inputs in that group.
4. The final resulting hash string is precisely the **Message** that is passed to the wallet software to create a signature using the Private Key. This signature is then nested inside the `lock` field of the `WitnessArgs` corresponding to the first Input in the group.

### Detailed Reference Links:
* [WitnessArgs Structure (blockchain.mol #L114-L118)](https://github.com/nervosnetwork/ckb/blob/5a7efe7a0b720de79ff3761dc6e8424b8d5b22ea/util/types/schemas/blockchain.mol#L114-L118)
* [Omnilock Specification RFC 0042](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md)
* [Detailed Transaction Signing Guide (How to sign transaction Wiki)](https://github.com/nervosnetwork/ckb-system-scripts/wiki/How-to-sign-transaction)
