import React from "react"; 
import { motion } from "framer-motion";
import "../styles/contact.css";

function Contact() {
  return (
    <>
      {/* HERO SECTION */}
      <section
        className="contact-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(12,19,34,0.85), rgba(12,19,34,0.85)), url(/images/contact-bg.jpg)`
        }}
      >
        <div className="contact-animated-bg">
          <motion.div className="blob blob1" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="blob blob2" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 12, repeat: Infinity }} />

          <motion.span className="circle circle1" animate={{ y: [-10, 10, -10] }} transition={{ duration: 8, repeat: Infinity }} />
          <motion.span className="circle circle2" animate={{ y: [10, -10, 10] }} transition={{ duration: 8, repeat: Infinity }} />
        </div>

        <motion.div className="contact-hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <h1>Contact <span>Octa Investment</span></h1>
          <p>Have questions? Get in touch and we’ll help you get started.</p>
        </motion.div>
      </section>

      {/* CONTACT FORM & INFO */}
      <section className="contact-section">
        <div className="contact-info">
          <motion.div className="info-card" whileHover={{ scale: 1.05 }}>
            <i className="fas fa-map-marker-alt"></i>
            <h4>Our Address</h4>
            <p>200 Park Avenue, New York, NY 10166, USA</p>
          </motion.div>
          <motion.div className="info-card" whileHover={{ scale: 1.05 }}>
            <i className="fas fa-phone-alt"></i>
            <h4>Call Us</h4>
            <p>+(706) 912-9702</p>
          </motion.div>
          <motion.div className="info-card" whileHover={{ scale: 1.05 }}>
            <i className="fas fa-envelope"></i>
            <h4>Email</h4>
            <p>support@octainvestmentgrup.com</p>
          </motion.div>
        </div>

        <form className="contact-form">
          <h2>Send Us a Message</h2>
          <input type="text" placeholder="Your Name" required />
          <input type="email" placeholder="Email Address" required />
          <textarea placeholder="Your Message" rows="5" required></textarea>
          <button type="submit" className="primary-btn">Send Message</button>
        </form>
      </section>

      {/* UPDATED MAP */}
      <section className="map-section">
        <iframe
          title="Octa Investment Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3021.362188030015!2d-73.9782263845949!3d40.75493297932719!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259aeb9a5dfd7%3A0x96c1d9d7b88db2c3!2s200%20Park%20Ave%2C%20New%20York%2C%20NY%2010166%2C%20USA!5e0!3m2!1sen!2sus!4v1695400000000!5m2!1sen!2sus"
          loading="lazy"
        ></iframe>
      </section>

      <footer className="footer">
        <p>© 2022 Octa Investment. All rights reserved.</p>
      </footer>
    </>
  );
}

export default Contact;
