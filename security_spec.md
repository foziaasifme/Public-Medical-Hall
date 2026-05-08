# Firestore Security Specification - PMH (Pharma Management System)

## Data Invariants
1. A Sale must contain at least one item and have a positive total.
2. Stock entries must reference a valid medicine ID.
3. Medicine prices and stock levels must be non-negative.
4. Patient records must have a unique ID and a valid phone number.
5. All IDs must follow the standard ID format (alphanumeric, underscores, hyphens).
6. Timestamps must be valid ISO strings or server timestamps.

## Security Roles
- **Authenticated User**: Any user who is signed in (including anonymous for initial setup, but ideally identified users).
- **Admin**: Has full access to settings, users, and all clinical/inventory data.
- **Staff**: Has access to counter, inventory, and patients, but may be restricted from settings and deleting records.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Attempting to create a user with `role: 'admin'` as an unauthenticated user or staff.
2. **Price Manipulation**: Attempting to update a medicine's `salePrice` to $0.01 by a non-admin.
3. **Ghost Sale**: Creating a sale with an empty items array.
4. **Invalid Stock Injection**: Adding a stock entry with `quantity: -1000`.
5. **PII Leak**: An unauthenticated user attempting to list all patients.
6. **Orphaned Report**: Creating a `PatientReport` with a `patientId` that does not exist.
7. **Recursive Write**: Attempting to update `CompanySettings` as a non-admin.
8. **ID Poisoning**: Injecting 2KB worth of junk data into a document ID.
9. **History Tampering**: Updating a Patient's `history` (sale IDs) without an actual sale.
10. **Role Escalation**: A staff member attempting to update their own `permissions`.
11. **Negative Price Sale**: A sale with a negative total.
12. **System Bypass**: Attempting to write to a collection not defined in the blueprint.

## Test Runner Plan
We will implement `firestore.rules.test.ts` to verify these cases after drafting the rules.
