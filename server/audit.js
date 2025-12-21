import { db } from './db/index.js';
import { users, profiles, transactions } from './db/schema.js';
import { sql } from 'drizzle-orm';

async function audit() {
    try {
        console.log("Starting Audit...");
        const allUsers = await db.select().from(users);
        console.log(`Found ${allUsers.length} users:`, allUsers.map(u => u.email));
        
        const allTxnsRaw = await db.select().from(transactions);
        console.log(`Found ${allTxnsRaw.length} total transactions in DB.`);
        if (allTxnsRaw.length > 0) console.log('Tx IDs:', allTxnsRaw.map(t => t.id));

        const allProfilesRaw = await db.select().from(profiles);
        console.log(`Found ${allProfilesRaw.length} profiles in DB.`);
        allProfilesRaw.forEach(p => {
            if (Number(p.mainWallet) > 0 || Number(p.profitWallet) > 0) {
                console.log(`Profile ${p.id} (User ${p.userId}) has balance: Main=${p.mainWallet}, Profit=${p.profitWallet}`);
            }
        });

        console.log("Audit Complete.");
    } catch (error) {
        console.error("Audit Failed:", error);
    } finally {
        process.exit(0);
    }
}

audit();
