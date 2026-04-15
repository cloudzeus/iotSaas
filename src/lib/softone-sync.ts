import "server-only";
import { db } from "@/lib/db";
import {
  fetchAllCustomers,
  fetchCustomersByDateRange,
  type S1Customer,
} from "@/lib/softone";

async function findExistingCustomer(c: S1Customer) {
  if (c.trdr != null) {
    const hit = await db.customer.findUnique({ where: { trdr: c.trdr } });
    if (hit) return hit;
  }
  if (c.afm) {
    const hit = await db.customer.findFirst({ where: { afm: c.afm } });
    if (hit) return hit;
  }
  if (c.code) {
    const hit = await db.customer.findFirst({ where: { code: c.code } });
    if (hit) return hit;
  }
  return null;
}

export interface SyncResult {
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ identifier: string; error: string }>;
  since: string;
  until: string;
  durationMs: number;
}

async function runUpsert(rows: S1Customer[], since: string, until: string): Promise<SyncResult> {
  const start = Date.now();
  let created = 0, updated = 0, skipped = 0;
  const errors: SyncResult["errors"] = [];

  for (const c of rows) {
    const id = `trdr=${c.trdr ?? "-"} afm=${c.afm ?? "-"} code=${c.code ?? "-"}`;
    try {
      const data = {
        trdr:       c.trdr,
        code:       c.code,
        name:       c.name ?? `S1 ${c.afm ?? c.code ?? c.trdr}`,
        afm:        c.afm,
        sotitle:    c.sotitle,
        address:    c.address,
        zip:        c.zip,
        city:       c.city,
        district:   c.district,
        area:       c.area,
        phone01:    c.phone01,
        phone02:    c.phone02,
        email:      c.email,
        webpage:    c.webpage,
        jobtypetrd: c.jobtypetrd,
        irsdata:    c.irsdata,
      };

      const existing = await findExistingCustomer(c);
      if (existing) {
        await db.customer.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.customer.create({ data });
        created++;
      }
    } catch (err) {
      errors.push({ identifier: id, error: err instanceof Error ? err.message : String(err) });
      skipped++;
    }
  }

  return {
    scanned: rows.length,
    created, updated, skipped, errors,
    since, until,
    durationMs: Date.now() - start,
  };
}

async function recordJob<T extends SyncResult>(
  kind: string,
  trigger: "manual" | "cron" | "api",
  params: Record<string, unknown>,
  run: () => Promise<T>
): Promise<T & { jobId: string }> {
  const job = await db.syncJob.create({
    data: { kind, trigger, status: "running", params },
  });
  try {
    const result = await run();
    await db.syncJob.update({
      where: { id: job.id },
      data: {
        status: result.skipped > 0 && result.created + result.updated === 0 ? "failed" : "success",
        scanned: result.scanned,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length ? result.errors : undefined,
        finishedAt: new Date(),
        durationMs: result.durationMs,
        message: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
      },
    });
    return { ...result, jobId: job.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.syncJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        durationMs: Date.now() - job.startedAt.getTime(),
        message: msg,
      },
    });
    throw err;
  }
}

export async function syncSoftoneCustomers(
  windowMinutes = 10,
  trigger: "manual" | "cron" | "api" = "cron"
) {
  return recordJob("softone-customers-incremental", trigger, { windowMinutes }, async () => {
    const until = new Date();
    const since = new Date(until.getTime() - windowMinutes * 60 * 1000);
    const rows = await fetchCustomersByDateRange(since, until);
    return runUpsert(rows, since.toISOString(), until.toISOString());
  });
}

export async function fullSyncSoftoneCustomers(
  trigger: "manual" | "cron" | "api" = "manual"
) {
  return recordJob("softone-customers-full", trigger, {}, async () => {
    const until = new Date();
    const rows = await fetchAllCustomers();
    return runUpsert(rows, "ALL", until.toISOString());
  });
}
