import { db } from './db/index.js';
import { users, profiles } from './db/schema.js';
import { hashPassword } from './utils/password.js';
import { eq } from 'drizzle-orm';

async function createAdmin(email, password) {
    try {
        console.log(`🚀 Creating admin user: ${email}...`);
        
        // Check if user exists
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
            console.log("⚠️ User already exists. Updating to staff status...");
            await db.update(users).set({ is_staff: true, is_superuser: true }).where(eq(users.id, existing.id));
            console.log("✅ User elevated to Admin.");
            process.exit(0);
        }

        const hashedPassword = await hashPassword(password);
        
        const [newUser] = await db.insert(users).values({
            email,
            username: email,
            password: hashedPassword,
            is_staff: true,
            is_superuser: true
        }).returning();

        await db.insert(profiles).values({
            userId: newUser.id,
            firstName: "System",
            lastName: "Admin",
            mainWallet: "0.00",
            profitWallet: "0.00"
        });

        console.log("✅ Admin user created successfully!");
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating admin:", error);
        process.exit(1);
    }
}

// You can change these credentials in your .env.local file or pass them via CLI
const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || "admin@octainvest.com";
const adminPass = process.argv[3] || process.env.ADMIN_PASSWORD || "Admin123!";

createAdmin(adminEmail, adminPass);
