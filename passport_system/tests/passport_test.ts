import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that only contract owner can add authorities",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;
        const wallet2 = accounts.get("wallet_2")!;

        // Try to add authority from non-owner account
        let block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "add-authority",
                [types.principal(wallet2.address), types.utf8("Test Authority")],
                wallet1.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(err u1)'); // err-unauthorized

        // Add authority from owner account
        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "add-authority",
                [types.principal(wallet2.address), types.utf8("Test Authority")],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that authority management works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const authority = accounts.get("wallet_1")!;

        // Add authority
        let block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "add-authority",
                [types.principal(authority.address), types.utf8("Test Authority")],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify authority status
        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "is-authority",
                [types.principal(authority.address)],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, 'true');

        // Remove authority
        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "remove-authority",
                [types.principal(authority.address)],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify authority status after removal
        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "is-authority",
                [types.principal(authority.address)],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, 'false');
    },
});

Clarinet.test({
    name: "Ensure passport issuance works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const authority = accounts.get("wallet_1")!;
        const passportHolder = accounts.get("wallet_2")!;

        // Add authority first
        let block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "add-authority",
                [types.principal(authority.address), types.utf8("Test Authority")],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Issue passport
        const passportId = "PASS123";
        const fullName = "John Doe";
        const dateOfBirth = 19900101;
        const nationality = "USA";
        const validityPeriod = 365;

        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "issue-passport",
                [
                    types.utf8(passportId),
                    types.principal(passportHolder.address),
                    types.utf8(fullName),
                    types.uint(dateOfBirth),
                    types.utf8(nationality),
                    types.uint(validityPeriod),
                    types.none(),
                ],
                authority.address
            ),
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify passport exists
        block = chain.mineBlock([
            Tx.contractCall(
                "digital-passport",
                "get-passport",
                [types.utf8(passportId)],
                deployer.address
            ),
        ]);
        assertEquals(block.receipts[0].result.includes(passportHolder.address), true);
        assertEquals(block.receipts[0].result.includes(fullName), true);
    },
});
