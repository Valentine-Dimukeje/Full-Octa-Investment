
import { pgTable, serial, text, integer, boolean, decimal, timestamp } from 'drizzle-orm/pg-core';

// -----------------------------------------------------------------------------
// Users Table (Django Auth User)
// -----------------------------------------------------------------------------
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Hashed
  is_active: boolean('is_active').default(true),
  is_staff: boolean('is_staff').default(false),
  is_superuser: boolean('is_superuser').default(false),
  date_joined: timestamp('date_joined').defaultNow(),
});

// -----------------------------------------------------------------------------
// Profiles Table
// -----------------------------------------------------------------------------
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(), // OneToOne
  phone: text('phone'),
  country: text('country'),
  flag: text('flag'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  
  // Decimal fields
  mainWallet: decimal('main_wallet', { precision: 12, scale: 2 }).default('0.00'),
  profitWallet: decimal('profit_wallet', { precision: 12, scale: 2 }).default('0.00'),

  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(true),
  systemNotifications: boolean('system_notifications').default(true),
});

// -----------------------------------------------------------------------------
// Transactions Table
// -----------------------------------------------------------------------------
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // deposit, withdraw, investment, profit
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').default('pending'), // pending, active, completed, rejected
  meta: text('meta'), // JSON string or use jsonb if supported and desired
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(), 
});

// -----------------------------------------------------------------------------
// Investments Table
// -----------------------------------------------------------------------------
export const investments = pgTable('investments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  plan: text('plan').notNull(), // Amateur Plan, etc.
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  earnings: decimal('earnings', { precision: 12, scale: 2 }).default('0.00'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(), 
});

// -----------------------------------------------------------------------------
// Referrals Table
// -----------------------------------------------------------------------------
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(), // The referrer
  referredUserId: integer('referred_user_id').references(() => users.id).notNull(), // The user who was referred
  bonusAmount: decimal('bonus_amount', { precision: 12, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
});

// -----------------------------------------------------------------------------
// Devices Table
// -----------------------------------------------------------------------------
export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  deviceName: text('device_name').notNull(),
  ipAddress: text('ip_address').notNull(),
  lastActive: timestamp('last_active').defaultNow(),
});
