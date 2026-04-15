/**
 * SoftOne ERP client
 * https://www.softone.gr/ws/
 *
 * Two-step auth: login → authenticate → session clientID.
 * We cache the clientID with a 1-hour TTL (SoftOne tokens last a full day,
 * but we refresh proactively to catch mid-day invalidations).
 *
 * All responses are Windows-1253 encoded — decode with iconv-lite.
 */

import "server-only";
import iconv from "iconv-lite";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.SOFTONE_URL!;                        // e.g. https://dgsoft.oncloud.gr
const APP_ID = process.env.SOFTONE_APP_ID!;
const SESSION_FILE = path.join(process.cwd(), ".s1session.json");
const TTL_MS = 60 * 60 * 1000;                                    // 1 hour

export interface S1Session {
  clientID: string;
  authenticatedAt: number; // epoch ms
  expiresAt: number;       // epoch ms (authenticatedAt + TTL)
}

async function s1Fetch<T = unknown>(body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}/s1services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const buffer = await res.arrayBuffer();
  const decoded = iconv.decode(Buffer.from(buffer), "win1253");
  return JSON.parse(decoded) as T;
}

function loadSession(): S1Session | null {
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8");
    const s = JSON.parse(raw) as S1Session;
    if (s.expiresAt > Date.now() && s.clientID) return s;
  } catch {
    // missing or corrupt — fall through to re-auth
  }
  return null;
}

function saveSession(clientID: string): S1Session {
  const now = Date.now();
  const s: S1Session = {
    clientID,
    authenticatedAt: now,
    expiresAt: now + TTL_MS,
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(s));
  return s;
}

export function clearSession(): void {
  try { fs.rmSync(SESSION_FILE, { force: true }); } catch {}
}

export async function authenticate(): Promise<S1Session> {
  const body = {
    service:  "login",
    username: process.env.SOFTONE_USERNAME,
    password: process.env.SOFTONE_PASSWORD,
    appId:    APP_ID,
    COMPANY:  process.env.SOFTONE_COMPANY,
    BRANCH:   process.env.SOFTONE_BRANCH,
    MODULE:   process.env.SOFTONE_MODULE ?? "0",
    REFID:    process.env.SOFTONE_REFID,
    VERSION:  "1",
  };
  console.log("[softone] login request:", {
    ...body,
    password: body.password ? `(${body.password.length} chars)` : "(missing)",
  });

  const res = await s1Fetch<{ success: boolean; clientID?: string; error?: string; errorcode?: number }>(body);
  console.log("[softone] login response:", res);

  if (!res.success || !res.clientID) {
    throw new Error(`SoftOne Login failed: ${res.error ?? "unknown"}`);
  }
  return saveSession(res.clientID);
}

export async function getSession(): Promise<S1Session> {
  return loadSession() ?? authenticate();
}

/** Returns current session metadata without re-authenticating. */
export function peekSession(): S1Session | null {
  return loadSession();
}

// ─── Customer fetch ──────────────────────────────────────────────────────────

export interface S1Customer {
  trdr: number | null;
  code: string | null;
  name: string | null;
  afm: string | null;
  sotitle: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  district: string | null;
  area: string | null;
  phone01: string | null;
  phone02: string | null;
  email: string | null;
  webpage: string | null;
  jobtypetrd: string | null;
  irsdata: string | null;
  insdate: Date | null;
  upddate: Date | null;
}

/**
 * Fetches CUSTOMER rows whose insdate OR upddate fall within [since, until].
 * Uses SoftOne's generic getBrowserInfo → getBrowserData flow against the
 * CUSTOMER object, which is present on every standard SoftOne install.
 *
 * NOTE: Field list and filter syntax may need tweaking per install — if your
 * SoftOne admin exposes a purpose-built SqlData script, prefer that instead.
 */
const CUSTOMER_FIELDS =
  "trdr,code,afm,irsdata,name,sotitle,jobtype,trdbusiness,trdpgroup," +
  "webpage,isprosp,prjcs,phone01,phone02,email,emailacc,address,zip," +
  "city,country,insdate,upddate";

async function getTableRows(filter: string): Promise<Record<string, unknown>[]> {
  const session = await getSession();
  const req = {
    clientId: session.clientID,
    appId: Number(APP_ID),
    version: "1",
    service: "GetTable",
    TABLE: "trdr",
    FIELDS: CUSTOMER_FIELDS,
    FILTER: filter,
  };
  console.log("[softone] GetTable request:", { ...req, clientID: `${session.clientID.slice(0, 6)}…` });

  const res = await s1Fetch<Record<string, unknown>>(req);
  console.log("[softone] GetTable keys:", Object.keys(res), "sample:", JSON.stringify(res).slice(0, 600));

  if (!res.success) {
    throw new Error(`SoftOne GetTable failed: ${res.error ?? JSON.stringify(res)}`);
  }

  // SoftOne GetTable shape:
  //   { success, table, count, model: [[{name,type}, ...]], data: [[v0,v1,...], ...] }
  // Fields live under `model[0]`, rows under `data`. Fall back to `rows`/`fields`
  // for any install that returns the alternative shape.
  const rowsRaw = (res.data ?? res.rows ?? []) as unknown;
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) return [];

  // Extract field names from model[0] or fields
  let fields: string[] = [];
  const model = res.model as unknown;
  if (Array.isArray(model)) {
    const meta = Array.isArray(model[0]) ? (model[0] as Array<{ name: string }>) : (model as Array<{ name: string }>);
    fields = meta.map((f) => f.name);
  } else if (Array.isArray(res.fields)) {
    fields = (res.fields as Array<{ name: string }>).map((f) => f.name);
  }

  if (Array.isArray(rowsRaw[0])) {
    return (rowsRaw as unknown[][]).map((arr) => {
      const obj: Record<string, unknown> = {};
      fields.forEach((k, i) => { obj[k] = arr[i]; });
      return obj;
    });
  }

  return rowsRaw as Record<string, unknown>[];
}

const BASE_FILTER = "sodtype=13 AND company=10 AND isactive=1";

/** Fetch ALL customers — one-time bootstrap. */
export async function fetchAllCustomers(): Promise<S1Customer[]> {
  const rows = await getTableRows(BASE_FILTER);
  return rows.map(mapBrowserRowToCustomer).filter((c) => c.trdr || c.afm || c.code);
}

/** Fetch customers touched in [since, until]. */
export async function fetchCustomersByDateRange(
  since: Date,
  until: Date = new Date()
): Promise<S1Customer[]> {
  void until;
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const filter = `${BASE_FILTER} AND (upddate >= '${fmt(since)}' OR insdate >= '${fmt(since)}')`;
  const rows = await getTableRows(filter);
  return rows.map(mapBrowserRowToCustomer).filter((c) => c.trdr || c.afm || c.code);
}

function mapBrowserRowToCustomer(r: Record<string, unknown>): S1Customer {
  const get = (k: string): string | null => {
    const v = r[k] ?? r[k.toUpperCase()];
    return v === undefined || v === null || v === "" ? null : String(v);
  };
  const num = (k: string): number | null => {
    const s = get(k);
    return s && !isNaN(Number(s)) ? Number(s) : null;
  };
  const date = (k: string): Date | null => {
    const s = get(k);
    return s ? new Date(s.replace(" ", "T")) : null;
  };
  return {
    trdr:       num("trdr"),
    code:       get("code"),
    name:       get("name"),
    afm:        get("afm"),
    sotitle:    get("sotitle"),
    address:    get("address"),
    zip:        get("zip"),
    city:       get("city"),
    district:   null,
    area:       null,
    phone01:    get("phone01"),
    phone02:    get("phone02"),
    email:      get("email"),
    webpage:    get("webpage"),
    jobtypetrd: get("jobtype"),
    irsdata:    get("irsdata"),
    insdate:    date("insdate"),
    upddate:    date("upddate"),
  };
}

export async function s1<T = unknown>(
  service: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const session = await getSession();
  const data = await s1Fetch<{ success: boolean; errorcode?: number } & Record<string, unknown>>({
    service,
    clientID: session.clientID,
    appId: APP_ID,
    VERSION: "2",
    ...params,
  });

  // Session-expired codes → re-auth once and retry
  if (!data.success && (data.errorcode === -101 || data.errorcode === -100)) {
    clearSession();
    const fresh = await authenticate();
    return s1Fetch<T>({
      service, clientID: fresh.clientID, appId: APP_ID, VERSION: "2", ...params,
    });
  }

  return data as T;
}
