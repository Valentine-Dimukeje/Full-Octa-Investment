# Octa Investment Platform

A professional and comprehensive investment management platform featuring a modern dashboard, referral system, and robust backend integration. This repository contains both the frontend (client) and backend (server) applications.

## 🚀 Overview

Octa Investment is designed to provide users with a seamless experience for managing investments, tracking growth via interactive charts, and managing their financial profile. It includes a built-in referral system and secure authentication.

---

## ✨ Features

### Client (Frontend)

- **Modern Dashboard**: Real-time performance tracking with Chart.js and Recharts.
- **Investment Plans**: Interactive and responsive plan selection cards.
- **Referral System**: Unique referral link generation and tracking.
- **Smooth Animations**: Powered by Framer Motion for a premium user experience.
- **Responsive Design**: Built with Tailwind CSS for all device sizes.
- **Form Validation**: Comprehensive client-side validation using custom hooks.

### Server (Backend)

- **RESTful API**: Secure and performant Express 5 backend.
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL.
- **JWT Authentication**: Secure user sessions and password hashing with BcryptJS.
- **Email Service**: Integration with Brevo (Sib-api-v3-sdk) for communication.
- **Schema Validation**: Robust data validation using Zod.
- **Transaction Management**: Secure handling of deposits and withdrawals.

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router 7
- **Animations**: Framer Motion
- **Icons**: Lucide React & React Icons

### Backend

- **Environment**: Node.js
- **Framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Security**: JWT & BcryptJS
- **Validation**: Zod

---

## 📂 Project Structure

```text
.
├── client/          # Vite + React Frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── dashboard/   # Dashboard specific logic
│   │   └── public/      # Landing and Auth pages
├── server/          # Express + Drizzle Backend
│   ├── controllers/ # Logic handlers
│   ├── db/          # Database schema and config
│   ├── routes/      # API endpoints
│   └── utils/       # Shared utility functions
└── README.md        # Project documentation
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v18+)
- PostgreSQL Database

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <folder-name>
```

### 2. Configure Environment Variables

**Client (.env.local):**

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

**Server (.env.local):**

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret
BREVO_API_KEY=your_brevo_key
```

### 3. Install Dependencies

**Open two terminals:**

_Terminal 1 (Client):_

```bash
cd client
npm install
npm run dev
```

_Terminal 2 (Server):_

```bash
cd server
npm install
npm run dev
```

---

## 📜 Key Scripts

### Client

- `npm run dev`: Start development server.
- `npm run build`: Create production build.
- `npm run deploy`: Deploy to GitHub Pages.

### Server

- `npm run dev`: Start development server with Nodemon.
- `npm run db:push`: Sync database schema with Drizzle.
- `npm run db:studio`: Open Drizzle Studio to manage data.

---

## 📄 License

This project is licensed under the ISC License.
# Full-Octa-Investment
