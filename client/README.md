# Octa-Invest

**Octa-Invest** is a modern, high-performance investment platform dashboard built with React and Vite. It provides users with extensive tools to manage portfolios, track investments, and analyze financial data in real-time.

## 🚀 Key Features

- **Interactive Dashboard**: Real-time overview of assets, profit/loss, and activity.
- **Portfolio Management**: Tools to track various investment plans and their performance.
- **Financial Analytics**: Visual data representation using Recharts and Chart.js.
- **Secure Transactions**: Manages deposits and withdrawals with a secure flow.
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices using Tailwind CSS.
- **Modern UI/UX**: Smooth animations with Framer Motion and a clean, glassmorphic aesthetic.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Context API
- **Charts**: [Recharts](https://recharts.org/), [Chart.js](https://www.chartjs.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/), [Lucide React](https://lucide.dev/)

## ⚡ Getting Started

### Prerequisites

Ensure you have **Node.js** (v18 or higher) installed on your machine.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/octa-invest.git
    cd octa-invest
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root directory (or rename `.env.example`) and add your configuration:

    ```properties
    VITE_API_BASE=https://api.your-backend.com
    VITE_DEV_MODE=true
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The app will run at `http://localhost:3000`.

## 📦 Scripts

- `npm run dev`: Starts the development server with HMR.
- `npm run build`: Builds the application for production to the `dist` folder.
- `npm run preview`: Locally preview the production build.
- `npm run lint`: Runs ESLint to check for code quality issues.

## 📂 Project Structure

```
vite-octa-invest/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── dashboard/   # Dashboard specific components
│   │   ├── public/      # Public facing pages (Login, Home)
│   │   ├── layouts/     # Layout wrappers
│   │   └── utils/       # Helpers and configurations
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles and Tailwind directives
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
└── tailwind.config.js   # Tailwind configuration
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

---

Built with ❤️ by [Your Name]
# vite-octa-invest
