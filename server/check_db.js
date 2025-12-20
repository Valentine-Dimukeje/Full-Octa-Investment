import { db } from './db/index.js';
import { transactions, users } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
    try {
        console.log("--- Checking Transactions ---");
        const allTxns = await db.select({
            id: transactions.id,
            userId: transactions.userId,
            type: transactions.type
        }).from(transactions).limit(5);
        console.log(JSON.stringify(allTxns, null, 2));

        console.log("--- Checking Users ---");
        const allUsers = await db.select({
            id: users.id,
            email: users.email
        }).from(users).limit(5);
        console.log(JSON.stringify(allUsers, null, 2));

        console.log("--- Checking Join Logic ---");
        const joined = await db.select({
            txnId: transactions.id,
            uId: users.id,
            uEmail: users.email
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .limit(5);
        console.log(JSON.stringify(joined, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
