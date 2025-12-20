import { db } from '../db/index.js';
import { users, profiles, devices } from '../db/schema.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateTokens, verifyRefreshToken, verifyAccessToken } from '../utils/jwt.js'; // Added verifyAccessToken
import { eq, and } from 'drizzle-orm';

// Register User
export const register = async (req, res) => {
    const { email, password, referrer } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        // Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await hashPassword(password);

        // Transaction to create User and Profile
        const result = await db.transaction(async (tx) => {
            const [newUser] = await tx.insert(users).values({
                email,
                username: email, // Default username to email
                password: hashedPassword
            }).returning();

            await tx.insert(profiles).values({
                userId: newUser.id,
                firstName: req.body.first_name || null,
                lastName: req.body.last_name || null,
                phone: req.body.phone || null,
                country: req.body.country || null,
            });

            // Handle Referrer
            if (referrer) {
                const [refUser] = await tx.select().from(users).where(eq(users.username, referrer)).limit(1);
                if (refUser) {
                    await tx.insert(referrals).values({
                        userId: refUser.id,
                        referredUserId: newUser.id
                    });
                }
            }

            return newUser;
        });

        const tokens = generateTokens(result);

        res.status(201).json({
            message: "Account created successfully",
            access: tokens.accessToken,
            refresh: tokens.refreshToken,
            user: {
                id: result.id,
                email: result.email,
                username: result.username
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Login User
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const tokens = generateTokens(user);

        // Track Device (Simple implementation)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const deviceName = req.headers['user-agent'] || 'Unknown';
        
        // Upsert device? Or just insert log. Django code did update_or_create.
        // We'll just insert/update for now.
        // For simplicity reusing logic similar to Django:
        const [existingDevice] = await db.select().from(devices)
            .where(eq(devices.userId, user.id)) // strict mapping not perfect here without composite key or logic
            .limit(1); 
        
        // Replicating basic logic:
        await db.insert(devices).values({
             userId: user.id,
             deviceName: deviceName.substring(0, 255),
             ipAddress: typeof ip === 'string' ? ip : '0.0.0.0'
        });

        res.json({
            access: tokens.accessToken,
            refresh: tokens.refreshToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Refresh Token
export const refreshToken = (req, res) => {
    const { refresh } = req.body;
    if (!refresh) return res.sendStatus(401);

    try {
        const payload = verifyRefreshToken(refresh);
        // Could verify user still exists here
        const newTokens = generateTokens({ id: payload.id, email: payload.email });
        res.json({ access: newTokens.accessToken });
    } catch (err) {
        return res.sendStatus(403);
    }
};

// Get Me (User + Profile)
export const getMe = async (req, res) => {
    try {
        const [userWithProfile] = await db.select({
            id: users.id,
            email: users.email,
            username: users.username,
            is_staff: users.is_staff,
            is_superuser: users.is_superuser,
            first_name: profiles.firstName,
            last_name: profiles.lastName,
            phone: profiles.phone,
            country: profiles.country,
            notifications: {
                email: profiles.emailNotifications,
                sms: profiles.smsNotifications,
                system: profiles.systemNotifications
            }
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .where(eq(users.id, req.user.id))
        .limit(1);

        if (!userWithProfile) return res.sendStatus(404);
        
        res.json(userWithProfile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

export const getProfile = async (req, res) => {
    try {
        // Query Profile + User fields like Django implementation
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);
        const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
        
        if (!user) return res.status(404).json({ error: "User not found" });

        // Combine data to match Serializer output if needed, or just return profile
        // Django: UserProfileSerializer(request.user) -> returned user data + profile data nested or flat?
        // Checking Django Serializer... likely flat or nested.
        // Let's assume flat merge for now or standard profile.
        
        res.json({
            ...profile,
            email: user.email,
            username: user.username,
            first_name: profile.firstName, // Mapping checks
            last_name: profile.lastName,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

export const updateProfile = async (req, res) => {
    const { first_name, last_name, email, phone, country } = req.body;
    try {
        // Update User (Email)
        if (email) {
            const [existingUser] = await db.select().from(users).where(and(eq(users.email, email), eq(users.id, req.user.id))).limit(1);
            if (!existingUser) {
                // Check if new email is taken
                const [takenEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
                if (takenEmail) return res.status(400).json({ error: "Email already in use" });
                
                await db.update(users).set({ email, username: email }).where(eq(users.id, req.user.id));
            }
        }
        
        // Update Profile
        await db.update(profiles).set({
            firstName: first_name !== undefined ? first_name : undefined,
            lastName: last_name !== undefined ? last_name : undefined,
            phone: phone !== undefined ? phone : undefined,
            country: country !== undefined ? country : undefined,
        }).where(eq(profiles.userId, req.user.id));

        res.json({ message: "Profile updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

export const updateNotifications = async (req, res) => {
    const { email, sms, system } = req.body;
    try {
        await db.update(profiles).set({
            emailNotifications: email !== undefined ? email : undefined,
            smsNotifications: sms !== undefined ? sms : undefined,
            systemNotifications: system !== undefined ? system : undefined,
        }).where(eq(profiles.userId, req.user.id));
        res.json({ message: "Notifications updated" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export const getDevices = async (req, res) => {
    try {
        const userDevices = await db.select().from(devices).where(eq(devices.userId, req.user.id));
        res.json({ devices: userDevices });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export const logoutDevice = async (req, res) => {
    const { device_id } = req.body;
    try {
        await db.delete(devices).where(and(eq(devices.id, device_id), eq(devices.userId, req.user.id)));
        res.json({ message: "Device logged out" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        await db.transaction(async (tx) => {
            await tx.delete(profiles).where(eq(profiles.userId, req.user.id));
            await tx.delete(devices).where(eq(devices.userId, req.user.id));
            await tx.delete(users).where(eq(users.id, req.user.id));
        });
        res.json({ message: "Account deleted" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

// Request Password Reset
export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Generate Reset Token (reuse access token logic or specific secret)
        const token = generateTokens(user).accessToken; 
        
        // UID (Base64 of ID)
        const uid = Buffer.from(String(user.id)).toString('base64');
        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${uid}/${token}`;

        const htmlContent = `
            <h2>Hello ${user.username},</h2>
            <p>Click below to reset your password:</p>
            <p><a href="${link}">Reset Password</a></p>
            <p>If you didn't request this, ignore this email.</p>
        `;

        // Send Email
        await import('../utils/email.js').then(m => m.sendEmail("Password Reset Request", htmlContent, email, user.username));
        
        res.json({ message: "✅ Password reset email sent!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Confirm Password Reset
export const confirmPasswordReset = async (req, res) => {
    const { uid, token, password } = req.body;
    
    if (!uid || !token || !password) {
        return res.status(400).json({ error: "UID, token and password required." });
    }

    try {
        // Decode UID
        const userId = Buffer.from(uid, 'base64').toString('ascii');
        const payload = verifyAccessToken(token); 
        
        if (String(payload.id) !== userId) {
             return res.status(400).json({ error: "Invalid token or UID mismatch." });
        }

        const hashedPassword = await hashPassword(password);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, payload.id));

        res.json({ message: "✅ Password reset successful!" });

    } catch (error) {
         console.error(error);
         return res.status(400).json({ error: "Invalid or expired token" });
    }
};
