// src/components/Home.js
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { useNavigate } from "react-router-dom";
import ActivityFeed from "./ActivityFeed";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "../styles/home.css";

function Home() {
  const [coins, setCoins] = useState([]);
  const [history, setHistory] = useState({});
  const navigate = useNavigate();


  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,litecoin,ripple&order=market_cap_desc&per_page=5&page=1&sparkline=true"
    )
      .then((res) => res.json())
      .then((data) => {
        setCoins(data);
        const formatted = {};
        data.forEach((coin) => {
          formatted[coin.id] = coin.sparkline_in_7d.price.map((p, i) => ({
            time: i,
            price: p,
          }));
        });
        setHistory(formatted);
      })
      .catch((err) => console.error("Error fetching market data:", err));
  }, []);

  return (
    <>
      {/* === NEWSFEED === */}
      <ActivityFeed />

 {/* === HERO SECTION === */}
<section className="hero">
  <div className="hero-overlay" />
  <div className="hero-container">
    {/* Text */}
    <motion.div
      className="hero-text"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      <h1>
        Smart Investing with <span>Octa Investment</span>
      </h1>
      <p>
        We combine data-driven strategies, risk management, and expert insights 
        to help you grow and protect your wealth with confidence.
      </p>

      {/* Key Points */}
      <ul className="mt-5 space-y-3 text-sm text-gray-300">
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full" />
          Diversified portfolios tailored to your goals
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full" />
          Institutional-grade security and transparency
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full" />
          Expert support every step of the way
        </li>
      </ul>

      <div className="hero-buttons mt-6">
        <button
  className="btn btn-primary"
  onClick={() => navigate("/register")}
>
  Get Started
</button>

        <a href="#trust" className="btn btn-outline">
          Learn More
        </a>
      </div>
    </motion.div>

    {/* Illustration */}
    <motion.div
      className="hero-illustration"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1 }}
    >
      <img src="/images/stock.webp" alt="Professional Investment Strategy" />
    </motion.div>
  </div>
</section>


      {/* === LIVE MARKET SECTION === */}
      <section className="market-prices">
        <h2>📈 Live Market Prices</h2>
        <div className="market-grid">
          {coins.length > 0 ? (
            coins.map((coin) => (
              <motion.div
                className="market-card"
                key={coin.id}
                whileHover={{ scale: 1.05 }}
              >
                <div className="market-header">
                  <img src={coin.image} alt={coin.name} />
                  <h3>{coin.name}</h3>
                </div>

                <div className="price">
                  <p>${coin.current_price.toLocaleString()}</p>
                  <span
                    className={
                      coin.price_change_percentage_24h > 0 ? "up" : "down"
                    }
                  >
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>

                {/* Mini Chart */}
                {history[coin.id] && (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={history[coin.id]}>
                        <defs>
                          <linearGradient
                            id={`color-${coin.id}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={
                                coin.price_change_percentage_24h > 0
                                  ? "#4ade80"
                                  : "#f87171"
                              }
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={
                                coin.price_change_percentage_24h > 0
                                  ? "#4ade80"
                                  : "#f87171"
                              }
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={["auto", "auto"]} hide />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={
                            coin.price_change_percentage_24h > 0
                              ? "#4ade80"
                              : "#f87171"
                          }
                          fillOpacity={1}
                          fill={`url(#color-${coin.id})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <p>Loading market data...</p>
          )}
        </div>
      </section>

      {/* === MARKET OVERVIEW SECTION === */}
      <section className="market-overview">
        <h2>🌍 Market Overview</h2>
        <div className="overview-grid">
          {coins.slice(0, 3).map((coin) => (
            <motion.div
              key={coin.id}
              className="overview-card"
              whileHover={{ scale: 1.03 }}
            >
              <h3>{coin.name} - Last 7 Days</h3>
              {history[coin.id] && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history[coin.id]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#00ffc6"
                      fillOpacity={0.4}
                      fill="url(#colorOverview)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* === TRUST SECTION === */}
      <section id="trust" className="trust-section">
        <div className="trust-header">
          <h2>Trusted by Investors Worldwide</h2>
          <p>
            Octa Investment empowers <strong>5,000+</strong> investors in{" "}
            <strong>120+ countries</strong> with security, transparency, and
            consistent growth.
          </p>
        </div>

        <div className="trust-grid">
          <motion.div className="trust-card" whileHover={{ scale: 1.05 }}>
            <img src="/images/security.jpeg" alt="Security" />
            <h3>Bank-Grade Security</h3>
            <p>
              Multi-layered protection, insurance coverage, and compliance with
              international financial standards.
            </p>
          </motion.div>

          <motion.div className="trust-card" whileHover={{ scale: 1.05 }}>
            <img src="/images/returns.png" alt="Returns" />
            <h3>Consistent Growth</h3>
            <p>
              Proven investment strategies designed for steady long-term
              profitability
            </p>
          </motion.div>

          <motion.div className="trust-card" whileHover={{ scale: 1.05 }}>
            <img src="/images/team.png" alt="Expert Team" />
            <h3>Expert Guidance</h3>
            <p>
              A global team of financial analysts and advisors guiding every
              decision.
            </p>
          </motion.div>

          <motion.div className="trust-card" whileHover={{ scale: 1.05 }}>
            <img src="/images/global.png" alt="Global Reach" />
            <h3>Global Reach</h3>
            <p>
              Serving investors across 120+ countries with localized insights
              and support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* === STATS === */}
      <section className="stats">
        <div className="stat">
          <h2>
            <CountUp end={5000} duration={3} />+
          </h2>
          <p>Active Investors</p>
        </div>
        <div className="stat">
          <h2>
            $<CountUp end={2000000} duration={3} />
          </h2>
          <p>Total Investments</p>
        </div>
        <div className="stat">
          <h2>
            <CountUp end={120} duration={3} />+
          </h2>
          <p>Countries</p>
        </div>
      </section>

      {/* === CALL TO ACTION === */}
      <section className="cta">
        <motion.div
          className="cta-box"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <h2>Start Growing Your Wealth Today</h2>
          <p>
            Join thousands of investors who trust Octa Investment for their
            financial success.
          </p>
          <button
  className="btn btn-primary"
  onClick={() => navigate("/register")}
>
  Create Your Account
</button>

        </motion.div>
      </section>

      {/* === FLOATING CHAT BUTTONS === */}
      <div className="chat-buttons">
        <a
          href="https://wa.me/17069129702"
          target="_blank"
          rel="noopener noreferrer"
          className="chat-btn whatsapp"
          aria-label="WhatsApp"
        >
          <img src="/images/WhatsApp.svg" alt="WhatsApp" />
        </a>

        <a
          href="https://t.me/8801328478716"
          target="_blank"
          rel="noopener noreferrer"
          className="chat-btn telegram"
          aria-label="Telegram"
        >
          <img src="/images/Telegram_logo.svg" alt="Telegram" />
        </a>
      </div>

      {/* === FOOTER === */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Octa Investment Group. All rights reserved.</p>
      </footer>
    </>
  );
}

export default Home;
