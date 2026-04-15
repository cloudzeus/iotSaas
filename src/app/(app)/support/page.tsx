"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, Mail, Phone } from "lucide-react";

const faqEl = [
  { q: "Πώς προσθέτω μια νέα συσκευή;", a: "Μεταβείτε στην ενότητα Συσκευές και πατήστε «Προσθήκη Συσκευής». Εισάγετε το DevEUI και τα στοιχεία της συσκευής." },
  { q: "Πώς λειτουργεί η χρέωση;", a: "Η χρέωση γίνεται ανά ενεργή συσκευή ανά μήνα. Το τιμολόγιο εκδίδεται στην αρχή κάθε μήνα." },
  { q: "Πώς ρυθμίζω ειδοποιήσεις;", a: "Στην ενότητα Ειδοποιήσεις → Κανόνες, δημιουργήστε νέο κανόνα με συσκευή, κανάλι, τελεστή και κατώφλι." },
  { q: "Πώς αλλάζω τη γλώσσα;", a: "Στις Ρυθμίσεις ή από τον διακόπτη γλώσσας στην πάνω μπάρα." },
  { q: "Πού βρίσκω τα raw δεδομένα;", a: "Πατήστε «Logs» στη λίστα συσκευών για να δείτε όλα τα μηνύματα με hex, RSSI, SNR και αποκωδικοποιημένο payload." },
];

const faqEn = [
  { q: "How do I add a new device?", a: "Go to Devices and click 'Add Device'. Enter the DevEUI and device details." },
  { q: "How does billing work?", a: "Billing is per active device per month. An invoice is generated at the start of each month." },
  { q: "How do I set up alerts?", a: "In Alerts → Rules, create a new rule by selecting device, channel, operator, and threshold." },
  { q: "How do I change the language?", a: "In Settings or from the language switcher in the top bar." },
  { q: "Where can I see raw device data?", a: "Click 'Logs' in the device list to see all messages with hex, RSSI, SNR, and decoded payload." },
];

export default function SupportPage() {
  const [locale] = useState("el");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const t = locale === "el";
  const faq = t ? faqEl : faqEn;

  return (
    <div style={{ maxWidth: "800px" }}>
      <div className="page-header">
        <h1 className="page-title">
          <HelpCircle size={22} style={{ display: "inline", marginRight: "8px", color: "var(--orange)" }} />
          {t ? "Υποστήριξη" : "Support"}
        </h1>
      </div>

      {/* FAQ */}
      <div className="card" style={{ marginBottom: "24px", padding: "0" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1rem", margin: 0 }}>
            {t ? "Συχνές Ερωτήσεις" : "FAQ"}
          </h2>
        </div>
        {faq.map((item, i) => (
          <div key={i} style={{ borderBottom: i < faq.length - 1 ? "1px solid var(--row-border)" : undefined }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: "100%",
                padding: "16px 20px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                textAlign: "left",
              }}
            >
              <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 500 }}>
                {item.q}
              </span>
              {openFaq === i
                ? <ChevronDown size={16} style={{ color: "var(--orange)", flexShrink: 0 }} />
                : <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 20px 16px", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="card" style={{ padding: "24px" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1rem", marginBottom: "16px" }}>
          {t ? "Επικοινωνία" : "Contact Us"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--orange-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={16} style={{ color: "var(--orange)" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</div>
              <a href="mailto:support@dgsmart.gr" style={{ color: "var(--text-primary)", fontSize: "0.875rem", textDecoration: "none" }}>
                support@dgsmart.gr
              </a>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--orange-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Phone size={16} style={{ color: "var(--orange)" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t ? "Τηλέφωνο" : "Phone"}
              </div>
              <a href="tel:+302101234567" style={{ color: "var(--text-primary)", fontSize: "0.875rem", textDecoration: "none" }}>
                +30 210 123 4567
              </a>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
          {t
            ? "Ώρες εξυπηρέτησης: Δευτ–Παρ 09:00–18:00 (EET). Απαντάμε εντός 24 ωρών."
            : "Support hours: Mon–Fri 09:00–18:00 (EET). We respond within 24 hours."}
        </div>
      </div>
    </div>
  );
}
