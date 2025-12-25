import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons in React bundlers. [file:107]
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "./App.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ---------------- Toast ---------------- */
const Toast = ({ message, type = "info", onClose }) => {
  return (
    <div className={`toast ${type}`} onClick={onClose}>
      <div className="toast-content">
        <span className="toast-icon" />
        <span>{message}</span>
      </div>
      <button className="toast-close" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
};

/* --------------- Loading ---------------- */
const LoadingSpinner = ({ message = "Analyzing image..." }) => {
  return (
    <div className="loading-container">
      <div className="spinner">
        <div className="spinner-ring" />
        <div className="spinner-ring" />
        <div className="spinner-ring" />
      </div>
      <p className="loading-text">{message}</p>
      <div className="loading-progress">
        <div className="progress-bar" />
      </div>
    </div>
  );
};

/* -------------- Disclaimer -------------- */
const MedicalDisclaimer = ({ isOpen, onClose }) => {
  return (
    <div className={`modal-overlay ${isOpen ? "active" : ""}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Medical Disclaimer</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="disclaimer-content">
            <div className="disclaimer-icon" />
            <h4>Important Medical Information</h4>
            <p>
              <strong>This application is for informational purposes only</strong>{" "}
              and should not be used as a substitute for professional medical advice,
              diagnosis, or treatment.
            </p>
            <ul className="disclaimer-points">
              <li>Always consult qualified healthcare professionals for medical decisions.</li>
              <li>This AI analysis tool is not FDA-approved for clinical diagnosis.</li>
              <li>Results may contain false positives or false negatives.</li>
              <li>Seek immediate medical attention for emergency symptoms.</li>
              <li>Do not delay professional medical care based on these results.</li>
            </ul>
            <div className="disclaimer-footer">
              <p>
                By using this application, you acknowledge that you understand these
                limitations and agree to use the information responsibly.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose} type="button">
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Chatbot ---------------- */
const Chatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      message:
        "Hello! I'm your AI Medical Assistant.\n\nI can help you with:\n• Pneumonia symptoms and prevention\n• Chest X-ray interpretation\n• When to seek medical care\n• Understanding your analysis results\n\nHow can I assist you today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What are the symptoms of pneumonia?",
    "How accurate is this AI analysis?",
    "When should I see a doctor?",
    "What causes pneumonia?",
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  const medicalKnowledgeBase = useMemo(
    () => ({
      "pneumonia symptoms": {
        response:
          "Common Pneumonia Symptoms:\n\n• Respiratory: cough (may produce phlegm), shortness of breath, rapid breathing\n• General: fever/chills, fatigue/weakness\n• Chest pain when breathing/coughing\n\nSevere warning signs:\n• High fever\n• Difficulty breathing\n• Bluish lips/fingernails\n• Confusion",
        followUp: ["What causes pneumonia?", "How is pneumonia treated?", "How to prevent pneumonia?"],
      },
      "pneumonia causes": {
        response:
          "What Causes Pneumonia:\n\n• Bacterial: Streptococcus pneumoniae, Haemophilus influenzae\n• Viral: influenza, RSV, COVID-19\n• Atypical: Mycoplasma\n• Fungal (rare)\n• Aspiration\n\nRisk factors:\n• Age <2 or >65\n• Chronic disease\n• Weakened immunity\n• Smoking",
        followUp: ["How to prevent pneumonia?", "What are pneumonia symptoms?", "How is pneumonia diagnosed?"],
      },
      "pneumonia treatment": {
        response:
          "Pneumonia Treatment (general):\n\n• Bacterial pneumonia may require clinician-prescribed antibiotics\n• Complete the full course if prescribed\n\nSupportive care:\n• Rest\n• Fluids\n• Humidified air/steam\n\nSevere cases may require hospital care (oxygen/IV antibiotics).",
        followUp: ["When to see a doctor?", "How to prevent pneumonia?", "Pneumonia recovery time"],
      },
      "pneumonia prevention": {
        response:
          "Preventing Pneumonia:\n\n• Vaccines: pneumococcal (if eligible), annual flu shot, COVID-19 vaccines\n• Hygiene: hand washing, avoid touching face\n• Lifestyle: don’t smoke, good sleep, nutrition, exercise\n• Reduce exposure: avoid sick contacts, masks in crowded places, clean surfaces",
        followUp: ["What are pneumonia symptoms?", "Pneumonia risk factors", "When to get vaccinated?"],
      },
      "chest xray": {
        response:
          "About Chest X-rays:\n\n• Shows lung structures and abnormalities\n• Can show infection/inflammation patterns\n\nAbout this AI result:\n• Screening output only\n• Confirm with clinician/radiologist",
        followUp: ["How accurate is AI analysis?", "When do I need an X-ray?", "X-ray preparation tips"],
      },
      "ai accuracy": {
        response:
          "AI Accuracy (general):\n\n• Helps with fast preliminary screening\n• Can produce false positives/negatives\n• Best used alongside clinicians",
        followUp: ["When to see a doctor?", "Understanding my results", "What are false positives?"],
      },
      "when to see doctor": {
        response:
          "When to Seek Medical Care:\n\nEmergency:\n• Severe breathing difficulty\n• Chest pain with shortness of breath\n• Confusion\n• Bluish lips/fingernails\n• Coughing blood\n\nSee a doctor soon:\n• Persistent fever + cough\n• Worsening breathlessness",
        followUp: ["Find nearby hospitals", "Pneumonia symptoms", "Emergency warning signs"],
      },
      "understanding results": {
        response:
          "Understanding Your AI Analysis:\n\n• Normal: no strong signs detected; monitor symptoms\n• Pneumonia detected: needs clinical confirmation\n• Confidence reflects model certainty",
        followUp: ["When to see a doctor?", "Download my report", "What causes pneumonia?"],
      },
    }),
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getEnhancedBotResponse = (userMessage) => {
    const msg = userMessage.toLowerCase();
    for (const [key, data] of Object.entries(medicalKnowledgeBase)) {
      if (msg.includes(key) || msg.includes(key.replace(/\s/g, ""))) return data;
    }

    if (msg.includes("symptom")) return medicalKnowledgeBase["pneumonia symptoms"];
    if (msg.includes("cause") || msg.includes("why")) return medicalKnowledgeBase["pneumonia causes"];
    if (msg.includes("treat") || msg.includes("cure") || msg.includes("medicine"))
      return medicalKnowledgeBase["pneumonia treatment"];
    if (msg.includes("prevent") || msg.includes("avoid")) return medicalKnowledgeBase["pneumonia prevention"];
    if (msg.includes("accurate") || msg.includes("reliable") || msg.includes("trust"))
      return medicalKnowledgeBase["ai accuracy"];
    if (msg.includes("doctor") || msg.includes("hospital") || msg.includes("emergency"))
      return medicalKnowledgeBase["when to see doctor"];
    if (msg.includes("result") || msg.includes("report") || msg.includes("analysis"))
      return medicalKnowledgeBase["understanding results"];
    if (msg.includes("xray") || msg.includes("x-ray") || msg.includes("scan"))
      return medicalKnowledgeBase["chest xray"];

    return {
      response:
        "I can help with pneumonia and respiratory health questions, but for medical decisions please consult a healthcare professional.",
      followUp: ["What are pneumonia symptoms?", "How to prevent pneumonia?", "When to see a doctor?"],
    };
  };

  const handleSendMessage = async (messageText) => {
    const text = (messageText ?? inputMessage).trim();
    if (!text) return;

    const userMsg = {
      id: Date.now(),
      type: "user",
      message: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);
    setShowSuggestions(false);

    setTimeout(() => {
      const botData = getEnhancedBotResponse(text);
      const botMsg = {
        id: Date.now() + 1,
        type: "bot",
        message: botData.response,
        timestamp: new Date().toLocaleTimeString(),
        followUp: botData.followUp,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);

      if (botData.followUp?.length) {
        setSuggestedQuestions(botData.followUp);
        setShowSuggestions(true);
      }
    }, 900);
  };

  const handleSuggestionClick = (q) => {
    handleSendMessage(q);
    setShowSuggestions(false);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: "bot",
        message: "Chat cleared! How can I assist you today?",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setSuggestedQuestions([
      "What are the symptoms of pneumonia?",
      "How accurate is this AI analysis?",
      "When should I see a doctor?",
      "What causes pneumonia?",
    ]);
    setShowSuggestions(true);
  };

  const exportChat = () => {
    const chatContent = messages
      .map((m) => `${m.timestamp} ${m.type.toUpperCase()}: ${m.message}`)
      .join("\n\n");
    const blob = new Blob([chatContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-chat-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`chatbot-overlay ${isOpen ? "active" : ""}`}>
      <div className="chatbot-container">
        <div className="chatbot-header">
          <div className="chatbot-title">
            <div className="chatbot-avatar" />
            <div>
              <h4>Medical AI Assistant</h4>
              <span className="chatbot-status">{isTyping ? "Typing..." : "Online • Respiratory Health"}</span>
            </div>
          </div>

          <div className="chatbot-actions">
            <button className="chatbot-action-btn" onClick={clearChat} title="Clear Chat" type="button">
              🧹
            </button>
            <button className="chatbot-action-btn" onClick={exportChat} title="Export Chat" type="button">
              ⬇
            </button>
            <button className="chatbot-close" onClick={onClose} type="button">
              ✕
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className="message-content">
                <div className="message-text">{msg.message}</div>
                <div className="message-time">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {showSuggestions && suggestedQuestions.length > 0 && !isTyping && (
            <div className="suggestion-container">
              <div className="suggestion-title">Suggested questions</div>
              <div className="suggestions">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => handleSuggestionClick(q)} type="button">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="message bot">
              <div className="message-content">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-container">
          <div className="input-suggestions">
            <button className="quick-action-btn" onClick={() => handleSendMessage("What are pneumonia symptoms?")} type="button">
              Symptoms
            </button>
            <button className="quick-action-btn" onClick={() => handleSendMessage("When should I see a doctor?")} type="button">
              Medical Care
            </button>
            <button className="quick-action-btn" onClick={() => handleSendMessage("How accurate is the AI?")} type="button">
              AI Info
            </button>
          </div>

          <form
            className="chatbot-input"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about pneumonia, symptoms, treatment, or X-rays..."
              disabled={isTyping}
              maxLength={500}
            />
            <button type="submit" disabled={!inputMessage.trim() || isTyping} title="Send">
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Navbar / Sections / Footer ---------------- */
const Navbar = ({ onChatbotOpen, onDisclaimerOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo" />
          <div className="brand-text">
            <h1>MedScan AI</h1>
            <span>Advanced Medical Imaging</span>
          </div>
        </div>

        <div className={`navbar-menu ${isMenuOpen ? "active" : ""}`}>
          <a href="#home" className="navbar-link active" onClick={() => setIsMenuOpen(false)}>
            Home
          </a>
          <a href="#about" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            About
          </a>
          <a href="#services" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            Services
          </a>
          <a href="#contact" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            Contact
          </a>

          <button className="navbar-btn btn" onClick={onChatbotOpen} type="button">
            <span className="btn-icon">🤖</span> Ask AI
          </button>
          <button className="navbar-btn btn secondary" onClick={onDisclaimerOpen} type="button">
            <span className="btn-icon">⚠</span> Disclaimer
          </button>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setIsMenuOpen((s) => !s)}
          type="button"
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
};

const AboutSection = () => (
  <section id="about" className="section about-section">
    <div className="container">
      <h2>About MedScan AI</h2>
      <div className="about-grid">
        <div className="about-card">
          <div className="about-icon" />
          <h3>AI-Powered Analysis</h3>
          <p>AI screening to assist in detecting patterns that can match pneumonia on chest X-rays.</p>
        </div>
        <div className="about-card">
          <div className="about-icon" />
          <h3>Fast Results</h3>
          <p>Get a preliminary analysis output in seconds for faster triage support.</p>
        </div>
        <div className="about-card">
          <div className="about-icon" />
          <h3>Secure & Private</h3>
          <p>Images are processed for analysis; always use secure deployments for real clinical use.</p>
        </div>
        <div className="about-card">
          <div className="about-icon" />
          <h3>Medical Grade UX</h3>
          <p>Designed as an assistive tool, not a replacement for a clinician’s diagnosis.</p>
        </div>
      </div>
    </div>
  </section>
);

const ServicesSection = () => (
  <section id="services" className="section services-section">
    <div className="container">
      <h2>Our Services</h2>
      <div className="services-grid">
        <div className="service-card">
          <div className="service-header">
            <div>
              <div className="service-icon" />
              <h3>X-ray Analysis</h3>
            </div>
          </div>
          <p>Upload chest X-rays for AI-powered pneumonia screening.</p>
          <ul className="service-features">
            <li>Instant analysis</li>
            <li>Confidence scoring</li>
            <li>Report generation</li>
          </ul>
        </div>

        <div className="service-card">
          <div className="service-header">
            <div>
              <div className="service-icon" />
              <h3>Medical Reports</h3>
            </div>
          </div>
          <p>Generate a readable patient guidance report from the AI result.</p>
          <ul className="service-features">
            <li>Professional formatting</li>
            <li>Downloadable report</li>
            <li>Follow-up guidance</li>
          </ul>
        </div>

        <div className="service-card">
          <div className="service-header">
            <div>
              <div className="service-icon" />
              <h3>AI Assistant</h3>
            </div>
          </div>
          <p>Chat with the built-in assistant for respiratory health questions.</p>
          <ul className="service-features">
            <li>24/7 availability</li>
            <li>Knowledge base</li>
            <li>Instant responses</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const ContactSection = () => (
  <section id="contact" className="section contact-section">
    <div className="container">
      <h2>Contact Us</h2>
      <div className="contact-grid">
        <div className="contact-info">
          <h3>Get in Touch</h3>
          <p>Have questions about our AI medical imaging service? We’re here to help.</p>

          <div className="contact-item">
            <div className="contact-icon" />
            <div>
              <h4>Email</h4>
              <p>support@medscan-ai.com</p>
            </div>
          </div>

          <div className="contact-item">
            <div className="contact-icon" />
            <div>
              <h4>Phone</h4>
              <p>+1 555 123-4567</p>
            </div>
          </div>
        </div>

        <div className="contact-form">
          <h3>Send us a Message</h3>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Your Name" required />
            <input type="email" placeholder="Your Email" required />
            <textarea placeholder="Your Message" rows={4} required />
            <button type="submit" className="btn btn-primary">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  </section>
);

const Footer = ({ onDisclaimerOpen }) => (
  <footer className="footer">
    <div className="footer-container">
      <div className="footer-content">
        <div className="footer-section footer-brand">
          <div className="footer-logo" />
          <h3>MedScan AI</h3>
          <p>AI-powered medical imaging analysis for healthcare professionals (demo).</p>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#contact">Contact Us</a></li>
            <li>
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  onDisclaimerOpen();
                }}
              >
                Medical Disclaimer
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-disclaimer">
          <span className="disclaimer-warning" />
          <span>This tool is for informational purposes only. Consult healthcare professionals.</span>
          <button className="footer-disclaimer-link" onClick={onDisclaimerOpen} type="button">
            Read full disclaimer
          </button>
        </div>
        <div className="footer-copyright">
          <p>© 2024 MedScan AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
);

/* -------------------- Overpass + Nominatim -------------------- */
const FETCH_RADIUS_METERS = 20000;
const NOMINATIM_DELAY_MS = 900;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isExcludedHospitalName(name) {
  const n = String(name || "").toLowerCase();
  const banned = [
    "eye", "ophthal", "ophthalm", "optical", "vision", "lasik",
    "dental", "dentist", "tooth", "oral", "maxillofacial",
    "ortho", "orthop", "orthopaedic", "orthopedic", "bone", "joint", "spine",
    "ent", "ear nose", "throat", "otolaryng", "hearing", "audiology",
    "skin", "derma", "dermatology", "cosmetic", "aesthetic", "laser", "hair", "tricho",
    "maternity", "women", "woman", "gyn", "gyne", "gynaec", "obg", "ob-gyn", "fertility", "ivf", "infertility",
    "children", "childern", "child", "kids", "pediatric", "paediatric", "pediatrics", "paediatrics", "nicu", "picu", "neonatal",
    "cardiac", "cardio", "cardiology", "heart", "piles",
    "neuro", "neurology", "neurosurg", "neurosurgery", "brain",
    "cancer", "oncology", "onco", "tumor", "tumour", "chemo", "chemotherapy", "radiation",
    "renal", "nephro", "nephrology", "dialysis",
    "gastro", "gastroenterology", "liver", "hepat", "hepatology",
    "diabetes", "diabetic", "endocrine", "endocrinology", "thyroid",
    "psychiat", "psychology", "mental", "deaddiction", "rehab", "rehabilitation",
    "ayur", "ayurveda", "homeo", "homeopathy", "unani", "siddha", "naturopathy", "yoga",
    "clinic", "polyclinic", "diagnostic", "diagnostics", "scan", "imaging", "labs", "laboratory",
  ];
  return banned.some((k) => n.includes(k));
}

function getCurrentPositionAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(new Error(err.message || "Geolocation error")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

async function geocodeAddressNominatim(queryText) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2&q=${encodeURIComponent(queryText)}` +
    `&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoding failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("No results for that address/city");
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), displayName: data[0].display_name };
}

async function reversePlaceLabel(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=jsonv2&lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lng)}` +
    `&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json();
  const a = data.address || {};
  return (
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.state_district ||
    a.district ||
    a.state ||
    ""
  );
}

async function fetchHospitalsOverpass(lat, lng) {
  const query = `[out:json][timeout:30];(
    node(around:${FETCH_RADIUS_METERS},${lat},${lng})["amenity"="hospital"];
    way(around:${FETCH_RADIUS_METERS},${lat},${lng})["amenity"="hospital"];
    relation(around:${FETCH_RADIUS_METERS},${lat},${lng})["amenity"="hospital"];

    node(around:${FETCH_RADIUS_METERS},${lat},${lng})["healthcare"="hospital"];
    way(around:${FETCH_RADIUS_METERS},${lat},${lng})["healthcare"="hospital"];
    relation(around:${FETCH_RADIUS_METERS},${lat},${lng})["healthcare"="hospital"];
  );out center;`;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Overpass failed (HTTP ${r.status})`);
  const data = await r.json();
  const els = data?.elements || [];

  const getLatLng = (el) => {
    if (el.type === "node") return { lat: el.lat, lng: el.lon };
    if (el.center) return { lat: el.center.lat, lng: el.center.lon };
    return null;
  };

  const distMeters = (aLat, aLng, bLat, bLng) =>
    L.latLng(aLat, aLng).distanceTo(L.latLng(bLat, bLng));

  const hospitals = els
    .map((el, idx) => {
      const p = getLatLng(el);
      if (!p) return null;

      const name = el.tags?.name || el.tags?.["name:en"] || `Hospital ${idx + 1}`;
      if (isExcludedHospitalName(name)) return null;

      const dist = distMeters(lat, lng, p.lat, p.lng);
      return { name, lat: p.lat, lng: p.lng, dist };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist);

  const enriched = [];
  const n = Math.min(hospitals.length, 15);

  for (let i = 0; i < n; i++) {
    const h = hospitals[i];
    let place = "";
    try {
      place = await reversePlaceLabel(h.lat, h.lng);
    } catch (_) {
      place = "";
    }
    enriched.push({ ...h, place, display: place ? `${h.name}, ${place}` : h.name });
    if (i < n - 1) await sleep(NOMINATIM_DELAY_MS);
  }

  return enriched;
}

/* ------------------------- Main App ------------------------- */
function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // CHANGED: removed default "Parasarampuram, AP" [file:107]
  const [location, setLocation] = useState("");
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState("");

  const [hospLoading, setHospLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [userPos, setUserPos] = useState(null);

  const [mapQuery, setMapQuery] = useState("");
  const [mapCenterLabel, setMapCenterLabel] = useState("");

  const inputRef = useRef(null);

  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const showToastMsg = (message, type = "info") => setToast({ message, type, id: Date.now() });
  const closeToast = () => setToast(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const el = document.getElementById("hospMap");
    if (!el) return;
    if (mapRef.current) return;

    const map = L.map("hospMap").setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, [result]);

  const validateFile = (f) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/tiff"];
    const maxSize = 10 * 1024 * 1024;
    if (!validTypes.includes(f.type)) {
      showToastMsg("Please upload a valid image file (JPEG, PNG, BMP, or TIFF).", "error");
      return false;
    }
    if (f.size > maxSize) {
      showToastMsg("File size must be less than 10MB.", "error");
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const image = e.target.files?.[0];
    if (!image) return;
    if (!validateFile(image)) return;

    setFile(image);
    setPreview(URL.createObjectURL(image));
    setResult(null);

    setHospitals([]);
    setUserPos(null);
    setMapCenterLabel("");

    showToastMsg("Image uploaded successfully.", "success");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const image = e.dataTransfer.files?.[0];
    if (!image) return;
    if (!validateFile(image)) return;

    setFile(image);
    setPreview(URL.createObjectURL(image));
    setResult(null);

    setHospitals([]);
    setUserPos(null);
    setMapCenterLabel("");

    showToastMsg("Image uploaded successfully.", "success");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const drawHospitalsOnMap = (lat, lng, hs, { showYouAreHere = true } = {}) => {
    if (!mapRef.current || !layerRef.current) return;

    layerRef.current.clearLayers();

    if (userMarkerRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    const bounds = [];

    if (showYouAreHere) {
      userMarkerRef.current = L.marker([lat, lng]).addTo(mapRef.current).bindPopup("<b>🟢 Center</b>");
      bounds.push([lat, lng]);
    }

    hs.forEach((h, i) => {
      bounds.push([h.lat, h.lng]);
      L.marker([h.lat, h.lng])
        .addTo(layerRef.current)
        .bindTooltip(`#${i + 1} ${h.display}`, { direction: "top" })
        .bindPopup(
          `<div style="min-width:240px">
            <h3 style="margin:0 0 8px 0">🏥 ${h.display}</h3>
            <p style="margin:0 0 6px 0"><b>Distance:</b> ${(h.dist / 1000).toFixed(2)} km</p>
            <p style="margin:0"><b>Coords:</b> ${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</p>
          </div>`
        );
    });

    if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 13);
      return;
    }

    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const searchHospitalsAt = async ({ lat, lng, label, setAsUserPos = false }) => {
    setHospLoading(true);
    setHospitals([]);
    if (setAsUserPos) setUserPos({ lat, lng });
    setMapCenterLabel(label || "");

    try {
      const hs = await fetchHospitalsOverpass(lat, lng);
      setHospitals(hs);
      drawHospitalsOnMap(lat, lng, hs, { showYouAreHere: true });
      showToastMsg(`Found ${hs.length} nearby hospitals (OSM).`, "success");
    } catch (e) {
      showToastMsg(`Hospital search failed: ${e.message}`, "error");
    } finally {
      setHospLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    setHospLoading(true);
    showToastMsg("Getting current location…", "info");
    try {
      const pos = await getCurrentPositionAsync();
      await searchHospitalsAt({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: "Current location",
        setAsUserPos: true,
      });
    } catch (e) {
      showToastMsg(`Location error: ${e.message}`, "error");
      setHospLoading(false);
    }
  };

  const handleSearchHospitalsClick = async () => {
    const q = mapQuery.trim();
    if (!q) {
      await handleUseMyLocation();
      return;
    }

    setHospLoading(true);
    showToastMsg("Geocoding address/city…", "info");
    try {
      const geo = await geocodeAddressNominatim(q);
      await searchHospitalsAt({
        lat: geo.lat,
        lng: geo.lng,
        label: geo.displayName,
        setAsUserPos: false,
      });
    } catch (e) {
      showToastMsg(e.message, "error");
      setHospLoading(false);
    }
  };

  const triggerHospitalFinderIfPneumonia = async (predictionData) => {
    if (!predictionData || predictionData.error) return;
    if (predictionData.label !== "pneumonia") return;
    await handleUseMyLocation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      showToastMsg("Please select an image first.", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("location", location);
    formData.append("age", age);
    formData.append("symptoms", symptoms);

    try {
      // Use environment variable for API URL (fallback to localhost for dev)
      const apiUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000") + "/predict";
      const res = await axios.post(apiUrl, formData, {
        timeout: 30000,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      showToastMsg("Analysis completed successfully.", "success");

      await triggerHospitalFinderIfPneumonia(res.data);
    } catch (error) {
      const message = error?.response?.data?.error || "Analysis failed. Please try again.";
      setResult({ error: message });
      showToastMsg(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);

    setHospitals([]);
    setUserPos(null);
    setMapQuery("");
    setMapCenterLabel("");

    setIsDragOver(false);

    // CHANGED: reset location to empty (not Parasarampuram) [file:107]
    setLocation("");
    setAge("");
    setSymptoms("");

    if (inputRef.current) inputRef.current.value = "";
    showToastMsg("Form reset successfully.", "info");
  };

  const downloadReport = () => {
    if (!result || result.error) {
      showToastMsg("No valid report to download.", "error");
      return;
    }

    const reportContent = `MEDSCAN AI - MEDICAL REPORT
-----------------------------------------
Analysis Date: ${new Date().toLocaleDateString()}
Analysis Time: ${new Date().toLocaleTimeString()}
Report ID: ${Date.now()}

PATIENT INFO
Location: ${result?.patient_info?.location || location || "N/A"}
Age: ${result?.patient_info?.age || age || "N/A"}
Symptoms: ${result?.patient_info?.symptoms || symptoms || "N/A"}

CHEST X-RAY ANALYSIS RESULTS
Diagnosis: ${result?.label ? result.label.charAt(0).toUpperCase() + result.label.slice(1) : "N/A"}
Probability: ${typeof result?.probability === "number" ? (result.probability * 100).toFixed(1) + "%" : "N/A"}
Confidence: ${typeof result?.confidence === "number" ? (result.confidence * 100).toFixed(1) + "%" : "N/A"}
Severity: ${result?.severity || "N/A"}

DETAILED MEDICAL REPORT
${result?.report || "No detailed report available."}

IMPORTANT DISCLAIMER
This analysis is generated by an AI system and is for informational purposes only.
Always consult a healthcare professional for diagnosis and treatment decisions.
`;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `medscan-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToastMsg("Report downloaded successfully.", "success");
  };

  const resultClass = useMemo(() => {
    if (!result) return "";
    if (result.error) return "error";
    if (String(result.label || "").toLowerCase().includes("pneumonia")) return "warning";
    return "success";
  }, [result]);

  // Responsive inline styles used by inputs/buttons in this file. [file:107]
  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.93)",
    width: "100%",
    boxSizing: "border-box",
  };

  const responsiveRow = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const responsiveCol = {
    flex: "1 1 180px",
    minWidth: 160,
  };

  return (
    <div className="app-container">
      <Navbar onChatbotOpen={() => setShowChatbot(true)} onDisclaimerOpen={() => setShowDisclaimer(true)} />

      <div className="app-content">
        <main className="main-content" id="home">
          <div className="upload-section">
            <h2>Upload Chest X-ray Image</h2>
            <p className="section-description">Upload a chest X-ray image for AI-powered pneumonia detection analysis.</p>

            <form onSubmit={handleSubmit} className="upload-form">
              {/* Responsive patient fields */}
              <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (city / address)"
                  style={inputStyle}
                />

                <div style={responsiveRow}>
                  <div style={responsiveCol}>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
                      style={inputStyle}
                    />
                  </div>

                  <div style={responsiveCol}>
                    <input
                      type="text"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Symptoms (optional)"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`upload-zone ${isDragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="file-input" />

                {preview ? (
                  <div className="preview-container">
                    <img src={preview} alt="X-ray preview" className="preview-image" />
                    <div className="preview-overlay">
                      <span className="preview-text">Click to change image</span>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon" />
                    <h3>Drag & drop your X-ray image here</h3>
                    <p>
                      or <span className="upload-link">click to browse</span>
                    </p>
                    <div className="upload-formats">Supports JPEG, PNG, BMP, TIFF (max 10 MB)</div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={!file || loading}>
                  {loading ? "Analyzing..." : "Analyze Image"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
                  Reset
                </button>
              </div>
            </form>

            {loading && <LoadingSpinner message="Analyzing image..." />}

            {result && (
              <div className="results-section">
                <div className={`result-card ${resultClass}`}>
                  <div className="result-header">
                    <div className="result-header-left">
                      <div className="result-icon" />
                      <h3>Analysis Results</h3>
                    </div>
                    {!result.error && (
                      <button className="btn btn-download" onClick={downloadReport} type="button">
                        ⬇ Download Report
                      </button>
                    )}
                  </div>

                  {result.error ? (
                    <div className="error-content">
                      <p className="error-message">{result.error}</p>
                      <p className="error-suggestion">Please try uploading a different image or check backend logs.</p>
                    </div>
                  ) : (
                    <div className="success-content">
                      <div className="diagnosis-summary">
                        <h4 className="diagnosis-label">
                          {result.label ? result.label.charAt(0).toUpperCase() + result.label.slice(1) : "N/A"}
                        </h4>

                        <div className="confidence-score">
                          <span className="confidence-label">Probability</span>
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{ width: `${result.probability ? result.probability * 100 : 0}%` }}
                            />
                          </div>
                          <span className="confidence-value">
                            {result.probability ? (result.probability * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="medical-report">
                        <h4 className="report-title">
                          <span className="report-icon" /> Detailed Medical Report
                        </h4>
                        <div className="report-content">
                          <div className="report-text">{result.report}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!result?.error && result?.label === "pneumonia" && (
                  <div className="result-card warning" style={{ marginTop: 14 }}>
                    <div className="result-header">
                      <div className="result-header-left">
                        <div className="result-icon" />
                        <h3>Nearby Hospitals</h3>
                      </div>
                    </div>

                    <div className="success-content">
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          marginBottom: 12,
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.14)",
                        }}
                      >
                        <input
                          type="text"
                          value={mapQuery}
                          onChange={(e) => setMapQuery(e.target.value)}
                          placeholder="Enter city or address (optional)"
                          style={inputStyle}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchHospitalsClick();
                            }
                          }}
                        />

                        <div style={responsiveRow}>
                          <button className="btn btn-secondary" type="button" onClick={handleUseMyLocation} disabled={hospLoading}>
                            📍 Use My Current Location
                          </button>
                          <button className="btn btn-primary" type="button" onClick={handleSearchHospitalsClick} disabled={hospLoading}>
                            🔍 Search Hospitals
                          </button>
                        </div>

                        {mapCenterLabel && (
                          <div style={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }}>
                            Center: {mapCenterLabel}
                          </div>
                        )}
                      </div>

                      <div
                        id="hospMap"
                        style={{
                          height: 420,
                          borderRadius: 16,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      />

                      <div style={{ marginTop: 10, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                        {hospLoading
                          ? "Searching hospitals…"
                          : hospitals.length === 0
                            ? "No hospitals shown yet."
                            : `Showing ${hospitals.length} hospitals (nearest-first) within ${(FETCH_RADIUS_METERS / 1000).toFixed(0)}km.`}
                      </div>

                      {userPos && (
                        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.70)", fontSize: 12 }}>
                          Your GPS: {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                        </div>
                      )}

                      {hospitals.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 13, marginBottom: 8 }}>
                            Nearest hospitals list:
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            {hospitals.slice(0, 10).map((h, i) => (
                              <div
                                key={`${h.lat}-${h.lng}-${i}`}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  background: "rgba(0,0,0,0.14)",
                                  borderRadius: 14,
                                  padding: 10,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{i + 1}. {h.display}</div>
                                <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 4 }}>
                                  Distance: {(h.dist / 1000).toFixed(2)} km
                                </div>
                                <a
                                  href={`https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lng}#map=17/${h.lat}/${h.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "rgba(59,130,246,0.95)",
                                    fontSize: 12,
                                    marginTop: 6,
                                    display: "inline-block",
                                  }}
                                >
                                  View on OpenStreetMap
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <AboutSection />
        <ServicesSection />
        <ContactSection />
        <Footer onDisclaimerOpen={() => setShowDisclaimer(true)} />

        <button className="floating-chat-btn" onClick={() => setShowChatbot(true)} title="Ask Medical AI" type="button">
          <span className="chat-icon">💬</span>
        </button>

        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
        <MedicalDisclaimer isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
        <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} />
      </div>
    </div>
  );
}

export default App;
