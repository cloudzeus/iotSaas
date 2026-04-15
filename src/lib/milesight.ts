/**
 * Milesight Development Platform client (Open API)
 * https://www.milesight.com/development-platform/docs/en/api-reference/overview.html
 *
 * Auth: OAuth2 client_credentials → bearer token. No per-request signing.
 * Token response is wrapped: { status, requestId, data: { access_token, expires_in, ... } }.
 * The access_token is bound to a single Application within the organization.
 */

import crypto from "crypto";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

let tokenCache: TokenCache | null = null;

async function fetchToken(): Promise<string> {
  const base = process.env.MILESIGHT_BASE_URL!;
  const clientId = process.env.MILESIGHT_CLIENT_ID!;
  const clientSecret = process.env.MILESIGHT_CLIENT_SECRET!;

  const res = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "Success" || !json?.data?.access_token) {
    throw new Error(`Milesight token fetch failed ${res.status}: ${JSON.stringify(json)}`);
  }

  tokenCache = {
    accessToken: json.data.access_token as string,
    expiresAt: Date.now() + ((json.data.expires_in as number) - 60) * 1000,
  };
  return tokenCache.accessToken;
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }
  return fetchToken();
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const base = process.env.MILESIGHT_BASE_URL!;
  let token = await getToken();

  const doFetch = (t: string) =>
    fetch(`${base}${path}`, {
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

  // Auto-refresh on 401
  if (res.status === 401) {
    tokenCache = null;
    token = await fetchToken();
    res = await doFetch(token);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Milesight API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API ────────────────────────────────────────────────────────────
// All Open API responses are wrapped: { status, requestId, data: ... }

export interface MilesightApiResponse<T> {
  status: "Success" | "Failed";
  requestId: string;
  data: T;
}

export interface MilesightDevice {
  deviceId: string;
  devEUI: string;
  sn: string;
  name: string;
  model: string;
  description?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  electricity?: number;            // battery %
  lastUpdateTime?: number;         // epoch ms
  connectStatus: "ONLINE" | "OFFLINE";
  deviceType: "SUB_DEVICE" | "GATEWAY" | string;
  licenseStatus?: string;
  rpsStatus?: string;
  mac?: string;
  tag?: string[];
  application?: { applicationId: string; applicationName: string };
  [k: string]: unknown;
}

export interface MilesightDeviceSearchResult {
  pageNumber: number;
  pageSize: number;
  total: number;
  content: MilesightDevice[];
}

/**
 * Search devices in the Application bound to this access token.
 * POST /device/openapi/v1/devices/search
 */
export async function searchDevices(
  pageNumber = 1,
  pageSize = 50,
  filters: Record<string, unknown> = {}
): Promise<MilesightDeviceSearchResult> {
  const res = await apiRequest<MilesightApiResponse<MilesightDeviceSearchResult>>(
    "POST",
    "/device/openapi/v1/devices/search",
    { pageNumber, pageSize, ...filters }
  );
  if (res.status !== "Success") {
    throw new Error(`Milesight search failed: ${JSON.stringify(res)}`);
  }
  return res.data;
}

// ─── Webhook Event Shape ────────────────────────────────────────────────────
// Milesight Development Platform pushes an ARRAY of events per request.

export interface MilesightWebhookEvent {
  eventId: string;
  eventCreatedTime: number;        // epoch seconds
  eventVersion: string;
  eventType: "DEVICE_DATA" | string;
  data: {
    deviceProfile: {
      deviceId: number;
      sn: string;
      devEUI: string;
      name: string;
      model: string;
    };
    type: "PROPERTY" | "TELEMETRY" | "EVENT" | string;
    payload: Record<string, unknown>;
    ts: number;                    // epoch milliseconds
  };
}

// ─── Webhook Signature Validation ──────────────────────────────────────────
// Milesight pushes:
//   X-MSC-Request-Signature   hex HMAC-SHA256
//   X-MSC-Request-Timestamp   epoch seconds
//   X-MSC-Request-Nonce       uuid
//   X-MSC-Webhook-UUID        subscription id
//
// Their docs don't specify the canonical string. We try several candidates
// against the secret and accept whichever matches; the matching format is
// logged so we can lock it down later.

interface SigParts {
  ts: string;
  nonce: string;
  uuid: string;
  body: string;
  bodyBuf: Buffer;
  bodySha256Hex: string;
  bodyMd5Hex: string;
}

type Candidate = { name: string; build: (p: SigParts) => string | Buffer };

const CANDIDATES: Candidate[] = [
  { name: "ts+nonce+body",                    build: (p) => p.ts + p.nonce + p.body },
  { name: "ts\\nnonce\\nbody",                build: (p) => `${p.ts}\n${p.nonce}\n${p.body}` },
  { name: "ts+nonce+uuid+body",               build: (p) => p.ts + p.nonce + p.uuid + p.body },
  { name: "uuid+ts+nonce+body",               build: (p) => p.uuid + p.ts + p.nonce + p.body },
  { name: "body",                              build: (p) => p.body },
  { name: "ts+body",                           build: (p) => p.ts + p.body },
  { name: "nonce+ts+body",                    build: (p) => p.nonce + p.ts + p.body },
  { name: "uuid+nonce+ts+body",               build: (p) => p.uuid + p.nonce + p.ts + p.body },
  { name: "nonce+ts+uuid+body",               build: (p) => p.nonce + p.ts + p.uuid + p.body },
  { name: "body+ts+nonce",                    build: (p) => p.body + p.ts + p.nonce },
  { name: "ts+nonce+sha256(body)",            build: (p) => p.ts + p.nonce + p.bodySha256Hex },
  { name: "ts+nonce+uuid+sha256(body)",       build: (p) => p.ts + p.nonce + p.uuid + p.bodySha256Hex },
  { name: "uuid+ts+nonce+sha256(body)",       build: (p) => p.uuid + p.ts + p.nonce + p.bodySha256Hex },
  { name: "ts+nonce+md5(body)",               build: (p) => p.ts + p.nonce + p.bodyMd5Hex },
  { name: "ts.nonce.body",                    build: (p) => `${p.ts}.${p.nonce}.${p.body}` },
  { name: "uuid.ts.nonce.body",               build: (p) => `${p.uuid}.${p.ts}.${p.nonce}.${p.body}` },
  { name: "POST\\npath\\nts\\nnonce\\nbody",  build: (p) => `POST\n/api/milesight/webhook\n${p.ts}\n${p.nonce}\n${p.body}` },
  { name: "uuid+body",                         build: (p) => p.uuid + p.body },
  { name: "uuid+body+ts+nonce",               build: (p) => p.uuid + p.body + p.ts + p.nonce },
  { name: "ts+nonce+body+uuid",               build: (p) => p.ts + p.nonce + p.body + p.uuid },
  { name: "buf:ts+nonce+body (bytes)",        build: (p) => Buffer.concat([Buffer.from(p.ts), Buffer.from(p.nonce), p.bodyBuf]) },
];

function hmacHex(secret: string | Buffer, data: string | Buffer): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function validateMscSignature(
  rawBody: Buffer,
  headers: { signature: string; timestamp: string; nonce: string; uuid: string }
): { ok: boolean; matchedFormat?: string } {
  const secretRaw = process.env.MILESIGHT_WEBHOOK_SECRET!;
  if (!secretRaw || !headers.signature) return { ok: false };

  const parts: SigParts = {
    ts: headers.timestamp,
    nonce: headers.nonce,
    uuid: headers.uuid,
    body: rawBody.toString("utf8"),
    bodyBuf: rawBody,
    bodySha256Hex: crypto.createHash("sha256").update(rawBody).digest("hex"),
    bodyMd5Hex: crypto.createHash("md5").update(rawBody).digest("hex"),
  };
  const expectedHex = headers.signature.toLowerCase().replace(/^sha256=/, "");

  // Try secret as raw string AND base64-decoded (the secret looks base64-ish)
  let secretB64: Buffer | null = null;
  try { secretB64 = Buffer.from(secretRaw, "base64"); } catch {}
  const secretVariants: Array<{ name: string; key: string | Buffer }> = [
    { name: "raw", key: secretRaw },
    ...(secretB64 ? [{ name: "b64", key: secretB64 }] : []),
  ];

  for (const sv of secretVariants) {
    for (const c of CANDIDATES) {
      const computed = hmacHex(sv.key, c.build(parts));
      if (computed === expectedHex) {
        return { ok: true, matchedFormat: `secret=${sv.name} fmt="${c.name}"` };
      }
    }
  }
  return { ok: false };
}

// Legacy: plain HMAC-SHA256 of body (kept for back-compat with old call sites).
export function validateWebhookSignature(
  rawBody: Buffer,
  signature: string
): boolean {
  const secret = process.env.MILESIGHT_WEBHOOK_SECRET!;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase(), "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Payload decoder helpers ────────────────────────────────────────────────

export interface WebhookPayload {
  devEUI: string;
  applicationID?: string;
  fPort?: number;
  fCnt?: number;
  rxInfo?: Array<{
    gatewayID?: string;
    rssi?: number;
    loRaSNR?: number;
  }>;
  txInfo?: {
    dataRate?: { modulation: string; bandwidth: number; spreadFactor: number };
    frequency?: number;
  };
  data?: string; // base64 encoded
  object?: Record<string, unknown>; // decoded payload if decoder is configured
  eventType?: string;
}

export function extractTelemetry(
  payload: WebhookPayload
): Array<{ channel: string; value: number; unit?: string }> {
  const result: Array<{ channel: string; value: number; unit?: string }> = [];
  if (!payload.object) return result;

  for (const [key, val] of Object.entries(payload.object)) {
    if (typeof val === "number") {
      result.push({ channel: key, value: val });
    } else if (
      typeof val === "object" &&
      val !== null &&
      "value" in val &&
      typeof (val as { value: unknown }).value === "number"
    ) {
      result.push({
        channel: key,
        value: (val as { value: number; unit?: string }).value,
        unit: (val as { unit?: string }).unit,
      });
    }
  }
  return result;
}
