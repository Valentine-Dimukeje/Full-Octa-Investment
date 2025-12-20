import React from "react";
import "../styles/activityFeed.css";

const feedData = [
  "💡 Did you know? Diversified portfolios reduce risk and boost returns.",
  "📊 Top investors grow wealth steadily, not overnight.",
  "🚀 Join Octa Investment and be part of a fast-growing community.",
  "🔒 Your funds are protected with institutional-grade security.",
  "🌍 Thousands of investors are building financial freedom with us.",
  "📈 Consistency beats timing — start investing today.",
  "🤝 Partner with experts who understand the markets.",
  "💰 Small investments today can compound into big results tomorrow.",
  "📣 Registration is open — secure your spot now.",
  "🏆 Octa Investment: Trusted strategies, proven results.",
  "🧠 Smart investors don’t wait — they start early.",
  "📢 Build wealth with expert-backed strategies.",
  "💡 Did you know? The earlier you invest, the higher your long-term growth.",
  "🚀 Join other investors earning steady passive income.",
  "📊 Stay ahead of the market with data-driven insights.",
];

function ActivityFeed() {
  return (
    <div className="ticker-container">
      <div className="ticker-wrapper">
        <div className="ticker">
          {feedData.map((item, index) => (
            <span className="ticker-item" key={index}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActivityFeed;
