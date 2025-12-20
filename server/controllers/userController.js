import { db } from '../db/index.js';
import { referrals, devices, profiles, users } from '../db/schema.js'; 
import { eq, desc } from 'drizzle-orm';

// Get Referrals
export const getReferrals = async (req, res) => {
    try {
        // We join referrals with users (of the person referred) and their profile
        const refs = await db.select({
            id: referrals.id,
            name: profiles.firstName, // Assuming we show first name as Name
            email: users.email,
            joined: users.date_joined,
            bonus: referrals.bonusAmount
        })
        .from(referrals)
        .innerJoin(users, eq(referrals.referredUserId, users.id))
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .where(eq(referrals.userId, req.user.id))
        .orderBy(desc(referrals.createdAt));

        // Format for frontend
        const formatted = refs.map(r => ({
            name: r.name || 'User',
            email: r.email,
            joined: r.joined ? new Date(r.joined).toLocaleDateString() : 'N/A',
            status: 'Active', // Mock or logic based on investments
            earnings: r.bonus || "0.00"
        }));

        res.json({ referrals: formatted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Get Devices
export const getDevices = async (req, res) => {
    try {
        const devs = await db.select().from(devices)
            .where(eq(devices.userId, req.user.id))
            .orderBy(desc(devices.lastActive));
        res.json({ devices: devs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Logout Device
export const logoutDevice = async (req, res) => {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ detail: "device_id is required" });

    try {
        await db.delete(devices).where(and(eq(devices.id, device_id), eq(devices.userId, req.user.id)));
        res.json({ message: "Device disconnected successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Update Notifications
export const updateNotifications = async (req, res) => {
    const { email, sms, system } = req.body;
    try {
        const updateData = {};
        if (email !== undefined) updateData.emailNotifications = email;
        if (sms !== undefined) updateData.smsNotifications = sms;
        if (system !== undefined) updateData.systemNotifications = system;

        await db.update(profiles).set(updateData).where(eq(profiles.userId, req.user.id));
        
        const [updated] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);
        res.json({
            message: "Profile updated successfully",
            profile: updated,
            notifications: {
                email: updated.emailNotifications,
                sms: updated.smsNotifications,
                system: updated.systemNotifications
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};
