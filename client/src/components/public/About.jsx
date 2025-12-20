import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/about.css";

function About() {
 const navigate = useNavigate();

  return (
    <>
      {/* HERO SECTION */}
      <section
        className="about-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(12,19,34,0.8), rgba(12,19,34,0.8)), url(/images/team-bg.jpg)`,
        }}
      >
        {/* Floating background elements */}
        <div className="about-animated-bg">
          <motion.div
            className="blob blob1"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="blob blob2"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 12, repeat: Infinity }}
          />

          <motion.span
            className="circle circle1"
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="circle circle2"
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          className="about-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1>
            About <span>Octa Investment</span>
          </h1>
          <p>
            Trusted by global investors, we combine technology and expertise to
            deliver secure, transparent, and profitable investment solutions.
          </p>
        </motion.div>
      </section>

      {/* OUR MISSION SECTION */}
      <section className="about-mission">
        <motion.div
          className="mission-content"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2>Our Mission</h2>
          <p>
            At Octa Investment, our mission is to empower individuals and
            institutions with access to smart, data-driven strategies. We aim to
            maximize long-term growth while maintaining strong principles of
            risk management and security.
          </p>
        </motion.div>
        <motion.img
          src="/images/moni.jpg"
          alt="Mission"
          className="mission-img"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        />
      </section>

      {/* VALUES / WHY CHOOSE US SECTION */}
      <section className="about-values">
        <div className="values-header">
          <h2>Why Choose Us</h2>
          <p>
            We provide more than just investment opportunities — we provide
            trust, expertise, and a commitment to sustainable growth.
          </p>
        </div>

        <div className="values-grid">
          {[
            {
              title: "Security First",
              desc: "Institutional-grade safeguards to protect your funds and data.",
              icon: "🔒",
            },
            {
              title: "Expert Strategies",
              desc: "Our methods are backed by financial experts and real-time data.",
              icon: "📊",
            },
            {
              title: "Global Access",
              desc: "A platform designed for investors across multiple markets.",
              icon: "🌍",
            },
            {
              title: "Sustainable Growth",
              desc: "Helping you build wealth steadily through proven principles.",
              icon: "📈",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <div className="value-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

{/* CERTIFICATE SECTION */}
<section className="about-certificate">
  <motion.div
    className="certificate-wrapper"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
  >
    <div className="certificate-image-container">
      <img
        src="/images/cert.png"
        alt="Octa Investment Certificate"
        className="certificate-image"
      />
    </div>

    <div className="certificate-text">
      <h2>Certified & Trusted Investment Platform</h2>
      <p>
        Octa Investment proudly holds an official certification as a recognized
        and accredited investment company. Our gold-standard certificate
        represents our commitment to transparency, regulatory compliance,
        investor protection, and world-class service.
      </p>

      <p>
        Partnering with us means you are trusting a globally recognized,
        professionally accredited investment institution dedicated to integrity
        and excellence.
      </p>
    </div>
  </motion.div>
</section>


      {/* CTA SECTION */}
      <section className="about-cta">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2>Take the Next Step in Your Investment Journey</h2>
          <button
  className="btn btn-primary"
  onClick={() => navigate("/register")}
>
  Register Today
</button>

        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>© 2022 Octa Investment Group. All rights reserved.</p>
      </footer>
    </>
  );
}

export default About;
