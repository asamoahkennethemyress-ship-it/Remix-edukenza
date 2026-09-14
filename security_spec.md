# EDUkenZA Financial & Payment System Security Specification (TDD)

## 1. Executive Summary & Core Financial Invariants

The EDUkenZA financial system manages multi-tenant SaaS subscriptions, school tuition fees, student daily services, and POS digital wallets across primary, secondary, and tertiary educational institutions.

### Non-Negotiable Data Invariants:
1. **Zero Client Authority**: The client/browser has zero authority over payment status, fee clearance, or wallet balance modifications.
2. **Strict Multi-Tenant Isolation**: School A can NEVER view, access, query, or mutate financial records of School B. All queries and rule validations enforce `resource.data.schoolId == user.schoolId`.
3. **Idempotent Financial Operations**: Every financial transaction must be idempotent. Re-submitting the same reference, webhook payload, or transaction ID must NEVER result in duplicate wallet credits, double fee reductions, or multiple invoice clearance events.
4. **Immutable Financial Ledger**: Financial transaction documents (`transactions`, `walletTransactions`, `paymentReceipts`, `payments`) are immutable. Once written, they can NEVER be updated or deleted by client applications. Reversals or refunds must be executed as distinct offsetting credit/debit ledger entries.
5. **Atomic Balance Integrity**: Wallet balances cannot go below zero (`balance >= 0`). Top-ups and deductions MUST use atomic transactions (`runTransaction`) with optimistic concurrency checks to prevent race conditions and double-spending.
6. **Zero Client Secret Exposure**: Gateway API keys (Paystack, Hubtel, Flutterwave, Stripe) are strictly confined to the secure Node.js backend environment.
7. **Strict Precision & Currency Guarding**: All amounts are validated as positive numbers with 2 decimal precision (`amount > 0 && amount <= 1000000`). Currency codes must match institutional configurations (`GHS`, `USD`, `ZAR`, `NGN`, `EUR`, `GBP`).

---

## 2. The "Dirty Dozen" Financial Attack Vectors & Mitigation Proofs

| Attack Vector ID | Attack Name | Malicious Payload / Method | Expected Result | Mitigation Rule / Logic |
| :--- | :--- | :--- | :--- | :--- |
| **FATK-01** | **Direct Balance Injection** | Student/Parent sends Firestore `updateDoc` setting `studentWallets/{id}.balance = 999999` | **PERMISSION_DENIED** | `studentWallets` update rule forbids students/parents from mutating `balance` or `dailySpent`. Updates strictly limited to limits/toggles by authorized school bursar/admin. |
| **FATK-02** | **Transaction Ledger Tampering** | Attacker calls `deleteDoc` or `updateDoc` on `walletTransactions/{txnId}` to erase audit trail | **PERMISSION_DENIED** | `allow update, delete: if false` on all transaction collections for all client users. |
| **FATK-03** | **Client Forged Success** | Client intercepts gateway checkout and directly calls Firestore setting `billingInvoices/{id}.status = 'paid'` without payment verification | **PERMISSION_DENIED** | Status transitions on invoices are blocked from regular users and verified strictly via server-side verification endpoint or authorized Bursar role. |
| **FATK-04** | **Cross-Tenant Financial Drain** | School Admin at School 001 attempts to query or deduct wallet from School 002 | **PERMISSION_DENIED** | Relational Gate: `getUserData().schoolId == resource.data.schoolId`. Cross-school operations strictly denied. |
| **FATK-05** | **Replay / Duplicate Credit Attack** | Attacker re-submits a previously verified webhook or transaction reference to top-up wallet multiple times | **409 Conflict / NO-OP** | Idempotency Engine checks `transactions` and `walletTransactions` by `reference`. If already processed, the duplicate is recorded and rejected. |
| **FATK-06** | **Negative Amount Deduction Attack** | Attacker invokes POS deduction with `amount = -500` to illicitly increase balance | **400 Bad Request / PERMISSION_DENIED** | Schema & Rule Gate: `incoming().amount > 0` and backend validation `amount > 0`. |
| **FATK-07** | **Race Condition / Double Spend** | Attacker triggers 5 simultaneous POS checkout requests for a GHS 10 balance with GHS 10 cart each | **1 Success, 4 Failed** | Atomic Firestore `runTransaction` locks wallet document, reads current balance, asserts `balance >= amount`, updates balance, and commits atomically. |
| **FATK-08** | **Price / Currency Tampering** | Client initiates payment checkout modifying invoice total from GHS 5,000 to GHS 50 | **400 Bad Request** | Backend `/api/payments/initialize` fetches the authoritative invoice from Firestore, ignoring client-provided price or currency. |
| **FATK-09** | **Unsigned / Forged Webhook Attack** | Attacker posts synthetic webhook payload to `/api/payments/webhook/paystack` asserting payment success | **401 Unauthorized** | Webhook verification calculates HMAC-SHA512 using `PAYSTACK_SECRET_KEY` and compares against `x-paystack-signature` header. Unsigned/invalid hashes rejected immediately. |
| **FATK-10** | **Floating Point Drift Attack** | Attacker exploits floating point math (e.g. `0.1 + 0.2 = 0.30000000000000004`) to create fractional cent imbalances | **Calculated as Exact Integer Cents** | All currency math is executed using integer cents (`Math.round(amount * 100)`) and formatted cleanly to 2 decimal places before commit. |
| **FATK-11** | **Category Limit Bypass** | Student attempts POS purchase on restricted 'canteen_snacks' when category is disabled by parent | **403 Forbidden** | POS & Wallet engine asserts `!wallet.disabledCategories.includes(item.category)` before authorizing deduction. |
| **FATK-12** | **Daily Spending Limit Overflow** | Student attempts GHS 40 purchase when dailyLimit is GHS 50 and dailySpent is GHS 30 | **403 Limit Exceeded** | POS & Wallet engine checks `dailySpent + amount <= dailyLimit`. Rejects purchase and alerts parent. |

---

## 3. Server-Authoritative Architecture & API Endpoints

1. **`POST /api/payments/initialize`**:
   - Accepts `{ invoiceId, invoiceType, paymentMethod, customerEmail, customerName, schoolId, studentId, callbackUrl }`
   - Authoritatively reads invoice or fee record from Firestore.
   - Generates cryptographic reference (`EDUKZ-{YEAR}-{UUID}`).
   - Creates a pending transaction in `billingTransactions` or `walletTransactions` with status `'pending'`.
   - Initializes gateway session with Paystack / Hubtel / Flutterwave / Stripe using server secrets.
   - Returns `{ success: true, reference, checkoutUrl, status: 'pending' }`.

2. **`POST /api/payments/verify`**:
   - Accepts `{ reference, gatewayProvider }`.
   - Calls official payment provider API directly from backend using secret key.
   - Validates response status (`success` / `successful`), paid amount, and currency.
   - Executes atomic Firestore transaction:
     - Validates reference has not already been finalized (`idempotency check`).
     - Updates transaction record to `'successful'`.
     - Updates target invoice / school fee / student wallet balance.
     - Creates official immutable `paymentReceipts` document with SHA256 audit signature.
     - Emits system audit log and sends notifications.
   - Returns `{ success: true, receiptNumber, newBalance, status: 'successful' }`.

3. **`POST /api/payments/webhook/:gateway`**:
   - Verifies HMAC cryptographic signature header (`x-paystack-signature`, `hubtel-signature`, etc.).
   - Parses verified gateway event (`charge.success`).
   - Executes the authoritative reconciliation transaction idempotently.
   - Returns `HTTP 200 OK`.

4. **`POST /api/wallet/deduct` & `POST /api/wallet/topup`**:
   - Server-guarded or atomic transaction-backed endpoints with validation rules, spending limit checks, and immutable transaction logging.
