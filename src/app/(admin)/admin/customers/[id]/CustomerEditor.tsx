"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiEdit2, FiX, FiSave, FiLoader, FiAlertCircle,
} from "react-icons/fi";
import m from "@/components/customers/customers.module.css";
import { updateCustomerAction, type CustomerUpdateInput } from "../actions";

interface Customer {
  id: number;
  code: string | null;
  name: string;
  afm: string | null;
  sotitle: string | null;
  irsdata: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  district: string | null;
  area: string | null;
  country: number | null;
  phone01: string | null;
  phone02: string | null;
  email: string | null;
  emailacc: string | null;
  webpage: string | null;
  gemiCode: string | null;
  numberOfEmployees: number | null;
  consent: boolean;
  remark: string | null;
  isprosp: number;
}

interface CountryOpt { country: number; name: string; shortcut: string | null; }

export default function CustomerEditor({
  customer, countries, locale,
}: {
  customer: Customer;
  countries: CountryOpt[];
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const t = locale === "el";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: "0.82rem" }}
      >
        <FiEdit2 size={13} /> {t ? "Επεξεργασία" : "Edit"}
      </button>
      {open && (
        <EditorModal
          customer={customer}
          countries={countries}
          onClose={() => setOpen(false)}
          t={t}
        />
      )}
    </>
  );
}

function EditorModal({
  customer, countries, onClose, t,
}: {
  customer: Customer;
  countries: CountryOpt[];
  onClose: () => void;
  t: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<Customer>({ ...customer });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof Customer>(k: K, v: Customer[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: CustomerUpdateInput = {
      id: f.id,
      name: f.name,
      code: f.code,
      afm: f.afm,
      sotitle: f.sotitle,
      irsdata: f.irsdata,
      address: f.address,
      zip: f.zip,
      city: f.city,
      district: f.district,
      area: f.area,
      country: f.country,
      phone01: f.phone01,
      phone02: f.phone02,
      email: f.email,
      emailacc: f.emailacc,
      webpage: f.webpage,
      gemiCode: f.gemiCode,
      numberOfEmployees: f.numberOfEmployees,
      consent: f.consent,
      remark: f.remark,
      isprosp: f.isprosp,
    };
    start(async () => {
      try {
        await updateCustomerAction(input);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className={m.backdrop} onClick={onClose}>
      <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className={m.modalHeader}>
          <div className={m.modalTitle}>
            <FiEdit2 size={16} /> {f.name}
          </div>
          <button onClick={onClose} className={m.modalClose}><FiX size={18} /></button>
        </div>
        <div className={m.modalBody}>
          {error && (
            <div className={`${m.alert} ${m.alertError}`} style={{ marginBottom: 12 }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={submit} className={m.form}>
            <Section title={t ? "Ταυτότητα" : "Identity"}>
              <Field label={t ? "Επωνυμία" : "Name"} span={2} value={f.name ?? ""} onChange={(v) => set("name", v)} required />
              <Field label={t ? "Διακριτικός" : "Title"} span={2} value={f.sotitle ?? ""} onChange={(v) => set("sotitle", v)} />
              <Field label={t ? "Κωδικός" : "Code"} value={f.code ?? ""} onChange={(v) => set("code", v)} />
              <Field label="ΑΦΜ" value={f.afm ?? ""} onChange={(v) => set("afm", v)} />
              <Field label="ΔΟΥ" value={f.irsdata ?? ""} onChange={(v) => set("irsdata", v)} />
              <Field label="ΓΕΜΗ" value={f.gemiCode ?? ""} onChange={(v) => set("gemiCode", v)} />
              <Num label={t ? "Αρ. Εργαζομένων" : "Employees"} value={f.numberOfEmployees} onChange={(v) => set("numberOfEmployees", v)} />
              <div className={m.field}>
                <label className="label">{t ? "Τύπος" : "Type"}</label>
                <select className="input" value={String(f.isprosp)} onChange={(e) => set("isprosp", Number(e.target.value))}>
                  <option value="0">{t ? "Πελάτης" : "Customer"}</option>
                  <option value="1">Prospect</option>
                </select>
              </div>
            </Section>

            <Section title={t ? "Διεύθυνση" : "Address"}>
              <Field label={t ? "Οδός" : "Street"} span={3} value={f.address ?? ""} onChange={(v) => set("address", v)} />
              <Field label="ΤΚ" value={f.zip ?? ""} onChange={(v) => set("zip", v)} />
              <Field label={t ? "Πόλη" : "City"} value={f.city ?? ""} onChange={(v) => set("city", v)} />
              <Field label={t ? "Νομός" : "District"} value={f.district ?? ""} onChange={(v) => set("district", v)} />
              <Field label={t ? "Περιοχή" : "Area"} value={f.area ?? ""} onChange={(v) => set("area", v)} />
              <div className={`${m.field} ${m.span2}`}>
                <label className="label">{t ? "Χώρα" : "Country"}</label>
                <select
                  className="input"
                  value={f.country != null ? String(f.country) : ""}
                  onChange={(e) => set("country", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— {t ? "επιλέξτε" : "select"} —</option>
                  {countries.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.name}{c.shortcut ? ` (${c.shortcut})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </Section>

            <Section title={t ? "Επικοινωνία" : "Contact"}>
              <Field label={t ? "Τηλ. 1" : "Phone 1"} value={f.phone01 ?? ""} onChange={(v) => set("phone01", v)} />
              <Field label={t ? "Τηλ. 2" : "Phone 2"} value={f.phone02 ?? ""} onChange={(v) => set("phone02", v)} />
              <Field label="Email" type="email" value={f.email ?? ""} onChange={(v) => set("email", v)} />
              <Field label={t ? "Email Λογ." : "Email Acc."} type="email" value={f.emailacc ?? ""} onChange={(v) => set("emailacc", v)} />
              <Field label="Web" span={4} value={f.webpage ?? ""} onChange={(v) => set("webpage", v)} />
            </Section>

            <Section title={t ? "Σημειώσεις" : "Notes"}>
              <div className={m.span4}>
                <label className="label">{t ? "Παρατηρήσεις" : "Remark"}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={f.remark ?? ""}
                  onChange={(e) => set("remark", e.target.value)}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <label className={`${m.checkboxRow} ${m.span4}`}>
                <input
                  type="checkbox"
                  checked={f.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                />
                {t ? "Συγκατάθεση GDPR" : "GDPR consent"}
              </label>
            </Section>

            <div className={m.saveBar}>
              <button type="submit" disabled={pending} className={`btn-primary ${m.saveBtn}`}>
                {pending ? <FiLoader size={16} className="animate-spin" /> : <FiSave size={16} />}
                {t ? "Αποθήκευση" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={m.section}>
      <div className={m.sectionTitle}>{title}</div>
      <div className={m.grid4}>{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", span = 1, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  span?: 1 | 2 | 3 | 4;
  required?: boolean;
}) {
  const cls = span > 1 ? m[`span${span}`] : "";
  return (
    <div className={`${m.field} ${cls}`}>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Num({
  label, value, onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className={m.field}>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}
