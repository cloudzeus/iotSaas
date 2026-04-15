"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { lookupAfmAction, saveAfmTenantAction } from "@/app/(admin)/admin/tenants/actions";
import { kadList, type AfmInfo, type AfmKad } from "@/lib/afm";
import s from "./customers.module.css";

interface CustomerForm {
  afm: string; code: string; name: string; sotitle: string;
  isprosp: number; country: string; address: string; zip: string;
  district: string; city: string; area: string; latitude: string; longitude: string;
  phone01: string; phone02: string; jobtype: string; jobtypetrd: string;
  trdpgroup: string; webpage: string; email: string; emailacc: string;
  trdbusiness: string; irsdata: string; consent: boolean; prjcs: string;
  remark: string; registrationDate: string; numberOfEmployees: string; gemiCode: string;
}

const empty: CustomerForm = {
  afm: "", code: "", name: "", sotitle: "", isprosp: 0, country: "",
  address: "", zip: "", district: "", city: "", area: "",
  latitude: "", longitude: "", phone01: "", phone02: "",
  jobtype: "", jobtypetrd: "", trdpgroup: "", webpage: "",
  email: "", emailacc: "", trdbusiness: "", irsdata: "",
  consent: false, prjcs: "", remark: "", registrationDate: "",
  numberOfEmployees: "", gemiCode: "",
};

export default function AfmLookup({
  initialForm,
  initialKads,
  tenantId,
}: {
  initialForm?: Partial<CustomerForm>;
  initialKads?: AfmKad[];
  tenantId?: string;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [form, setForm] = useState<CustomerForm>({ ...empty, ...initialForm });
  const [kads, setKads] = useState<AfmKad[]>(initialKads ?? []);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyAfmInfo(info: AfmInfo) {
    const b = info.basic_rec;
    setForm((f) => ({
      ...f,
      afm: b.afm,
      name: b.onomasia ?? "",
      sotitle: b.commer_title ?? "",
      address: [b.postal_address, b.postal_address_no].filter(Boolean).join(" "),
      zip: b.postal_zip_code ?? "",
      city: b.postal_area_description ?? "",
      irsdata: b.doy_descr ?? "",
      registrationDate: b.regist_date ?? "",
    }));
    setKads(kadList(info));
  }

  function onLookup() {
    setError(null);
    setSavedId(null);
    startTransition(async () => {
      try {
        const info = await lookupAfmAction(form.afm);
        applyAfmInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα αναζήτησης");
      }
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await saveAfmTenantAction({ form, kads, id: tenantId });
        setSavedId(id);
        router.replace(pathname);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα αποθήκευσης");
      }
    });
  }

  const afmValid = form.afm.length === 9;

  return (
    <form onSubmit={onSave} className={s.form}>
      <div className={s.afmBar}>
        <div className={s.afmInputWrap}>
          <div className={s.afmBarLabel}>ΑΦΜ — Αυτόματη συμπλήρωση</div>
          <div style={{ position: "relative" }}>
            <input
              className={`input ${s.afmInput}`}
              value={form.afm}
              onChange={(e) => set("afm", e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="099095556"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={onLookup}
              disabled={pending || !afmValid}
              title="Λήψη στοιχείων από vat.wwa.gr"
              className={s.afmSearchBtn}
            >
              {pending ? <Loader2 size={16} className={s.spin} /> : <Search size={16} />}
            </button>
          </div>
          <div className={s.afmBarHint}>
            Εισάγετε 9 ψηφία και πατήστε το εικονίδιο αναζήτησης
          </div>
        </div>
      </div>

      {error && (
        <div className={`${s.alert} ${s.alertError}`}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {savedId && (
        <div className={`${s.alert} ${s.alertSuccess}`}>
          <CheckCircle2 size={16} /> Αποθηκεύτηκε (ID: {savedId})
        </div>
      )}

      <Section title="Ταυτότητα">
        <Field label="Επωνυμία" span={2} value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Διακριτικός τίτλος" span={2} value={form.sotitle} onChange={(v) => set("sotitle", v)} />
        <Field label="Κωδικός" value={form.code} onChange={(v) => set("code", v)} />
        <Field label="ΔΟΥ" value={form.irsdata} onChange={(v) => set("irsdata", v)} />
        <Field label="ΓΕΜΗ" value={form.gemiCode} onChange={(v) => set("gemiCode", v)} />
        <Field label="Έναρξη" type="date" value={form.registrationDate?.slice(0, 10)} onChange={(v) => set("registrationDate", v)} />
        <Field label="Αρ. Εργαζομένων" type="number" value={form.numberOfEmployees} onChange={(v) => set("numberOfEmployees", v)} />
        <SelectField
          label="Τύπος"
          value={String(form.isprosp)}
          onChange={(v) => set("isprosp", Number(v))}
          options={[{ value: "0", label: "Πελάτης" }, { value: "1", label: "Prospect" }]}
        />
      </Section>

      <Section title="Διεύθυνση">
        <Field label="Οδός & Αριθμός" span={3} value={form.address} onChange={(v) => set("address", v)} />
        <Field label="ΤΚ" value={form.zip} onChange={(v) => set("zip", v)} />
        <Field label="Πόλη" value={form.city} onChange={(v) => set("city", v)} />
        <Field label="Νομός" value={form.district} onChange={(v) => set("district", v)} />
        <Field label="Περιοχή" value={form.area} onChange={(v) => set("area", v)} />
        <Field label="Χώρα (κωδ.)" type="number" value={form.country} onChange={(v) => set("country", v)} />
        <Field label="Latitude" type="number" value={form.latitude} onChange={(v) => set("latitude", v)} />
        <Field label="Longitude" type="number" value={form.longitude} onChange={(v) => set("longitude", v)} />
      </Section>

      <Section title="Επικοινωνία">
        <Field label="Τηλέφωνο 1" value={form.phone01} onChange={(v) => set("phone01", v)} />
        <Field label="Τηλέφωνο 2" value={form.phone02} onChange={(v) => set("phone02", v)} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Email Λογιστηρίου" type="email" value={form.emailacc} onChange={(v) => set("emailacc", v)} />
        <Field label="Ιστοσελίδα" span={4} value={form.webpage} onChange={(v) => set("webpage", v)} />
      </Section>

      <Section title="Softone">
        <Field label="Επάγγελμα (κωδ.)" type="number" value={form.jobtype} onChange={(v) => set("jobtype", v)} />
        <Field label="Επάγγελμα (περ.)" value={form.jobtypetrd} onChange={(v) => set("jobtypetrd", v)} />
        <Field label="Trdpgroup" type="number" value={form.trdpgroup} onChange={(v) => set("trdpgroup", v)} />
        <Field label="Trdbusiness" type="number" value={form.trdbusiness} onChange={(v) => set("trdbusiness", v)} />
        <Field label="Έργα (prjcs)" type="number" value={form.prjcs} onChange={(v) => set("prjcs", v)} />
        <label className={`${s.checkboxRow} ${s.span3}`}>
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
          />
          Συγκατάθεση GDPR
        </label>
      </Section>

      <Section title="Σημειώσεις">
        <div className={s.span4}>
          <label className="label">Παρατηρήσεις</label>
          <textarea
            className="input"
            value={form.remark}
            onChange={(e) => set("remark", e.target.value)}
            rows={3}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
      </Section>

      {kads.length > 0 && (
        <Section title={`ΚΑΔ (${kads.length})`}>
          <div className={`${s.span4} ${s.kadList}`}>
            {kads.map((k) => (
              <div key={k.firm_act_code} className={s.kadRow}>
                <code className={s.kadCode}>{k.firm_act_code}</code>
                <span className={s.kadDesc}>{k.firm_act_descr}</span>
                <span className={`badge ${k.firm_act_kind === "1" ? "badge-orange" : "badge-gray"}`}>
                  {k.firm_act_kind_descr}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className={s.saveBar}>
        <button
          type="submit"
          disabled={pending || !form.afm}
          className={`btn-primary ${s.saveBtn}`}
        >
          {pending ? <Loader2 size={16} className={s.spin} /> : <Save size={16} />}
          Αποθήκευση
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionTitle}>{title}</div>
      <div className={s.grid4}>{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", span = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  span?: 1 | 2 | 3 | 4;
}) {
  const cls = span > 1 ? s[`span${span}`] : "";
  return (
    <div className={`${s.field} ${cls}`}>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className={s.field}>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
