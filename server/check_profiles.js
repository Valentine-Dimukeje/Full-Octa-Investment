import { db } from './db/index.js';
import { users, profiles, transactions } from './db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function checkProfiles() {
    try {
        const url = process.env.DATABASE_URL || "MISSING";
        console.log(`--- Comprehensive Audit ---`);
        console.log(`Connecting to: ${url.substring(0, 20)}...${url.substring(url.length - 20)}`);
        
        const data = await db.select({
            userId: users.id,
            email: users.email,
            mainWallet: profiles.mainWallet,
            profitWallet: profiles.profitWallet,
            txCount: sql`(SELECT count(*) FROM transactions WHERE user_id = ${users.id})`
        }).from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId));
        
        console.log(JSON.stringify(data, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkProfiles();
