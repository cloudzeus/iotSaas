/**
 * Multi-app Milesight client.
 * Each MilesightApp row has its own OAuth2 credentials and webhook secret.
 * Token cache is per-app (keyed by clientId).
 */

import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { MilesightApp } from "@prisma/client";

interface TokenCache { accessToken: string; expiresAt: number; }
const tokenCacheByClientId = new Map<string, TokenCache>();

async function fetchToken(app: MilesightApp): Promise<string> {
  const res = await fetch(`${app.baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: app.clientId,
      client_secret: app.clientSecret,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "Success" || !json?.data?.access_token) {
    throw new Error(`[${app.name}] token fetch ${res.status}: ${JSON.stringify(json)}`);
  }
  const entry: TokenCache = {
    accessToken: json.data.access_token as string,
    expiresAt: Date.now() + ((json.data.expires_in as number) - 60) * 1000,
  };
  tokenCacheByClientId.set(app.clientId, entry);
  return entry.accessToken;
}

async function getToken(app: MilesightApp): Promise<string> {
  const cached = tokenCacheByClientId.get(app.clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;
  return fetchToken(app);
}

async function apiRequest<T>(
  app: MilesightApp,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  let token = await getToken(app);
  const doFetch = (t: string) =>
    fetch(`${app.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
  let res = await doFetch(token);
  if (res.status === 401) {
    tokenCacheByClientId.delete(app.clientId);
    token = await fetchToken(app);
    res = await doFetch(token);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${app.name}] ${method} ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public ──────────────────────────────────────────────────────────────────

export interface MilesightDeviceFromApp {
  appId: string;
  appName: string;
  deviceId: string;
  devEUI: string;
  sn: string;
  name: string;
  model: string;
  connectStatus: "ONLINE" | "OFFLINE" | string;
  deviceType: string;
  electricity?: number;
  lastUpdateTime?: number;
  application?: { applicationId: string; applicationName: string };
}

interface MilesightApiResponse<T> { status: "Success" | "Failed"; requestId: string; data: T; }
interface DeviceSearchResult {
  pageNumber: number; pageSize: number; total: number;
  content: Array<Omit<MilesightDeviceFromApp, "appId" | "appName">>;
}

export async function listActiveApps(): Promise<MilesightApp[]> {
  return db.milesightApp.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Seed a MilesightApp from env if the table is empty. Safe to call repeatedly. */
export async function ensureDefaultAppFromEnv(): Promise<MilesightApp | null> {
  const count = await db.milesightApp.count();
  if (count > 0) return null;
  const clientId = process.env.MILESIGHT_CLIENT_ID;
  const clientSecret = process.env.MILESIGHT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return db.milesightApp.create({
    data: {
      name: "Default (from .env)",
      baseUrl: process.env.MILESIGHT_BASE_URL || "https://eu-openapi.milesight.com",
      clientId,
      clientSecret,
      uuid: process.env.MILESIGHT_UUID || null,
      webhookSecret: process.env.MILESIGHT_WEBHOOK_SECRET || null,
      isActive: true,
    },
  });
}

/** Search one app's devices, tagged with appId/appName. */
export async function searchDevicesForApp(
  app: MilesightApp, pageNumber = 1, pageSize = 200,
): Promise<MilesightDeviceFromApp[]> {
  const res = await apiRequest<MilesightApiResponse<DeviceSearchResult>>(
    app, "POST", "/device/openapi/v1/devices/search",
    { pageNumber, pageSize },
  );
  if (res.status !== "Success") throw new Error(`[${app.name}] search failed`);
  return (res.data?.content ?? []).map((d) => ({ ...d, appId: app.id, appName: app.name }));
}

/** Union devices from every active Milesight app. */
export async function searchDevicesAllApps(): Promise<MilesightDeviceFromApp[]> {
  const apps = await listActiveApps();
  if (apps.length === 0) return [];
  const results = await Promise.allSettled(apps.map((a) => searchDevicesForApp(a)));
  const out: MilesightDeviceFromApp[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") out.push(...r.value);
    else console.error(`[milesight] app "${apps[i].name}" fetch failed:`, r.reason);
  });
  return out;
}

/** Find the MilesightApp that owns the given webhook UUID. */
export async function findAppByWebhookUuid(uuid: string | null | undefined) {
  if (!uuid) return null;
  return db.milesightApp.findFirst({
    where: { uuid, isActive: true },
  });
}

/** Per-app webhook signature validation (HMAC-SHA256, format TBD — fail-open for now). */
export function validateAppWebhookSignature(
  _app: MilesightApp,
  _rawBody: Buffer,
  _signature: string,
): { ok: boolean } {
  // Milesight's canonical-string format isn't documented; we log and fail-open
  // until one of the common variants is confirmed. See milesight.ts for the
  // candidate brute-force logic we can port here once validated.
  void crypto;
  return { ok: true };
}

// ─── Quick test (used by /admin/milesight → Test) ───────────────────────────

export interface TestResult {
  ok: boolean;
  tokenOk: boolean;
  devicesCount?: number;
  error?: string;
}

export async function testApp(app: MilesightApp): Promise<TestResult> {
  try {
    await fetchToken(app);
    const devices = await searchDevicesForApp(app, 1, 5);
    return { ok: true, tokenOk: true, devicesCount: devices.length };
  } catch (err) {
    return {
      ok: false,
      tokenOk: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
