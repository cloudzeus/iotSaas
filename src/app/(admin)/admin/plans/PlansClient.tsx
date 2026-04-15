"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  BookOpen, Plus, Pencil, Trash2, MoreHorizontal, Check, X,
  Loader2, Save, AlertCircle, Users, Server, Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  savePlanAction, togglePlanAction, deletePlanAction, type PlanInput,
} from "./actions";
import m from "@/components/customers/customers.module.css";
import s from "@/components/plans/plans.module.css";

interface Plan {
  id: string; name: string; slug: string; pricePerDevice: number;
  maxDevices: number | null; features: string[]; isActive: boolean;
  _count: { tenants: number };
}

interface Props { plans: Plan[]; locale: string; }

export default function PlansClient({ plans, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showNew = searchParams.get("new") === "1";
  const editId = searchParams.get("edit");
  const close = () => router.replace(pathname);
  const openNew = () => router.replace(`${pathname}?new=1`);
  const openEdit = (id: string) => router.replace(`${pathname}?edit=${id}`);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = locale === "el";

  const editing = editId ? plans.find((p) => p.id === editId) : null;
  const modalOpen = showNew || !!editing;

  function onToggle(p: Plan) {
    startTransition(async () => {
      await togglePlanAction(p.id, !p.isActive);
      router.refresh();
    });
  }

  function onDelete(p: Plan) {
    if (!confirm(`${t ? "Διαγραφή πλάνου" : "Delete plan"} "${p.name}";`)) return;
    startTransition(async () => {
      try {
        await deletePlanAction(p.id);
        setMenuFor(null);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <BookOpen size={22} style={{ display: "inline", marginRight: 8, color: "var(--orange)" }} />
          {t ? "Πλάνα Τιμολόγησης" : "Billing Plans"}
          <span style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: "1rem", fontWeight: 400 }}>
            ({plans.length})
          </span>
        </h1>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> {t ? "Νέο Πλάνο" : "New Plan"}
        </button>
      </div>

      <div className={s.grid}>
        {plans.map((plan) => {
          const popular = plan.slug === "growth";
          return (
            <div
              key={plan.id}
              className={`card ${s.card} ${popular ? s.cardPopular : ""} ${!plan.isActive ? s.cardInactive : ""}`}
            >
              {popular && <div className={s.popularTag}>{t ? "Δημοφιλές" : "Popular"}</div>}

              <div className={s.cardHeader}>
                <div className={s.title}>
                  {plan.name}
                  {!plan.isActive && (
                    <span className="badge badge-gray">{t ? "Ανενεργό" : "Inactive"}</span>
                  )}
                </div>
                <PlanMenu
                  isOpen={menuFor === plan.id}
                  onToggle={() => setMenuFor(menuFor === plan.id ? null : plan.id)}
                  onEdit={() => { openEdit(plan.id); setMenuFor(null); }}
                  onDelete={() => onDelete(plan)}
                  disabled={pending}
                  t={t}
                />
              </div>

              <div className={s.price}>
                <span className={s.priceValue}>{formatCurrency(Number(plan.pricePerDevice), "EUR")}</span>
                <span className={s.priceUnit}>/ {t ? "συσκευή" : "device"} / {t ? "μήνα" : "month"}</span>
              </div>

              <div className={s.devices}>
                <Server size={14} />
                {plan.maxDevices
                  ? `${t ? "Έως" : "Up to"} ${plan.maxDevices} ${t ? "συσκευές" : "devices"}`
                  : (t ? "Απεριόριστες συσκευές" : "Unlimited devices")}
              </div>

              <ul className={s.features}>
                {plan.features.map((f, i) => (
                  <li key={i} className={s.feature}>
                    <Check size={14} className={s.featureCheck} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className={s.footer}>
                <span className={s.tenants}>
                  <Users size={13} /> {plan._count.tenants} {t ? "πελάτες" : "tenants"}
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(plan)}
                  disabled={pending}
                  aria-label={plan.isActive ? "Deactivate" : "Activate"}
                  className={`${s.toggle} ${plan.isActive ? s.toggleOn : ""}`}
                >
                  <span className={s.toggleThumb} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className={m.backdrop} onClick={close}>
          <div className={m.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className={m.modalHeader}>
              <div className={m.modalTitle}>
                {editing ? <Pencil size={16} /> : <Sparkles size={16} />}
                {editing ? `${t ? "Επεξεργασία" : "Edit"}: ${editing.name}` : t ? "Νέο Πλάνο" : "New Plan"}
              </div>
              <button onClick={close} aria-label="Close" className={m.modalClose}>
                <X size={18} />
              </button>
            </div>
            <div className={m.modalBody}>
              <PlanForm initial={editing} t={t} onDone={close} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanForm({
  initial, t, onDone,
}: {
  initial: Plan | null | undefined;
  t: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [price, setPrice] = useState(String(initial?.pricePerDevice ?? ""));
  const [maxDevices, setMaxDevices] = useState(
    initial?.maxDevices != null ? String(initial.maxDevices) : ""
  );
  const [features, setFeatures] = useState<string[]>(initial?.features ?? [""]);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: PlanInput = {
      id: initial?.id,
      name,
      slug,
      pricePerDevice: Number(price),
      maxDevices: maxDevices.trim() ? Number(maxDevices) : null,
      features,
      isActive,
    };
    startTransition(async () => {
      try {
        await savePlanAction(input);
        router.refresh();
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={submit} className={m.form}>
      {error && (
        <div className={`${m.alert} ${m.alertError}`}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <section className={m.section}>
        <div className={m.sectionTitle}>{t ? "Βασικά" : "Basics"}</div>
        <div className={m.grid4}>
          <div className={`${m.field} ${m.span2}`}>
            <label className="label">{t ? "Όνομα" : "Name"}</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={`${m.field} ${m.span2}`}>
            <label className="label">Slug</label>
            <input
              className="input"
              value={slug}
              placeholder={t ? "αυτόματο από όνομα" : "auto from name"}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className={`${m.field} ${m.span2}`}>
            <label className="label">{t ? "Τιμή / συσκευή / μήνα (€)" : "Price / device / month (€)"}</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className={`${m.field} ${m.span2}`}>
            <label className="label">{t ? "Μέγιστες συσκευές" : "Max devices"}</label>
            <input
              className="input"
              type="number"
              min="1"
              value={maxDevices}
              placeholder={t ? "κενό = απεριόριστες" : "empty = unlimited"}
              onChange={(e) => setMaxDevices(e.target.value)}
            />
          </div>
          <label className={`${m.checkboxRow} ${m.span4}`}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            {t ? "Ενεργό (διαθέσιμο για νέους πελάτες)" : "Active (available for new tenants)"}
          </label>
        </div>
      </section>

      <section className={m.section}>
        <div className={m.sectionTitle}>{t ? "Χαρακτηριστικά" : "Features"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {features.map((f, i) => (
            <div key={i} className={s.featureInputRow}>
              <input
                className="input"
                value={f}
                placeholder={t ? `Χαρακτηριστικό ${i + 1}` : `Feature ${i + 1}`}
                onChange={(e) => {
                  const next = [...features];
                  next[i] = e.target.value;
                  setFeatures(next);
                }}
              />
              <button
                type="button"
                onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                className={s.featureRemove}
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFeatures([...features, ""])}
            className={s.addFeatureBtn}
          >
            <Plus size={14} /> {t ? "Προσθήκη χαρακτηριστικού" : "Add feature"}
          </button>
        </div>
      </section>

      <div className={m.saveBar}>
        <button
          type="submit"
          disabled={pending}
          className={`btn-primary ${m.saveBtn}`}
        >
          {pending ? <Loader2 size={16} className={m.spin} /> : <Save size={16} />}
          {t ? "Αποθήκευση" : "Save"}
        </button>
      </div>
    </form>
  );
}

function PlanMenu({
  isOpen, onToggle, onEdit, onDelete, disabled, t,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  t: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onToggle(); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className={m.menuWrap}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label="Actions"
        className={m.menuTrigger}
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className={m.menu}>
          <button type="button" className={m.menuItem} onClick={onEdit}>
            <Pencil size={14} /> {t ? "Επεξεργασία" : "Edit"}
          </button>
          <div className={m.menuSeparator} />
          <button type="button" className={`${m.menuItem} ${m.menuItemDanger}`} onClick={onDelete}>
            <Trash2 size={14} /> {t ? "Διαγραφή" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
