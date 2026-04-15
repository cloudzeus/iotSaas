import "server-only";
import { db } from "@/lib/db";
import {
  fetchAllCustomers,
  fetchCustomersByDateRange,
  fetchAllCountries,
  fetchAllTrdpGroups,
  fetchAllTrdBusinesses,
  type S1Customer,
  type S1Country,
  type S1TrdpGroup,
  type S1TrdBusiness,
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
        trdr:        c.trdr,
        code:        c.code,
        name:        c.name ?? `S1 ${c.afm ?? c.code ?? c.trdr}`,
        afm:         c.afm,
        sotitle:     c.sotitle,
        address:     c.address,
        zip:         c.zip,
        city:        c.city,
        district:    c.district,
        area:        c.area,
        country:     c.country,
        phone01:     c.phone01,
        phone02:     c.phone02,
        email:       c.email,
        emailacc:    c.emailacc,
        webpage:     c.webpage,
        jobtype:     c.jobtype,
        jobtypetrd:  c.jobtypetrd,
        trdpgroup:   c.trdpgroup,
        trdbusiness: c.trdbusiness,
        isprosp:     c.isprosp ?? 0,
        prjcs:       c.prjcs,
        irsdata:     c.irsdata,
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

// ─── Countries ──────────────────────────────────────────────────────────────

async function runUpsertCountries(rows: S1Country[]): Promise<SyncResult> {
  const start = Date.now();
  let created = 0, updated = 0, skipped = 0;
  const errors: SyncResult["errors"] = [];

  for (const c of rows) {
    try {
      const data = {
        country: c.country,
        name: c.name,
        shortcut: c.shortcut,
        intecode: c.intecode,
      };
      const existing = await db.country.findUnique({ where: { country: c.country } });
      if (existing) {
        await db.country.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.country.create({ data });
        created++;
      }
    } catch (err) {
      errors.push({
        identifier: `country=${c.country}`,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  return {
    scanned: rows.length,
    created, updated, skipped, errors,
    since: "ALL",
    until: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

export async function syncSoftoneCountries(
  trigger: "manual" | "cron" | "api" = "manual"
) {
  return recordJob("softone-countries", trigger, {}, async () => {
    const rows = await fetchAllCountries();
    return runUpsertCountries(rows);
  });
}

// ─── Trader price groups ────────────────────────────────────────────────────

async function runUpsertTrdpGroups(rows: S1TrdpGroup[]): Promise<SyncResult> {
  const start = Date.now();
  let created = 0, updated = 0, skipped = 0;
  const errors: SyncResult["errors"] = [];
  for (const g of rows) {
    try {
      const data = {
        trdpgroup: g.trdpgroup,
        company: g.company,
        sodtype: g.sodtype,
        name: g.name,
        code: g.code,
      };
      const existing = await db.trdpGroup.findUnique({ where: { trdpgroup: g.trdpgroup } });
      if (existing) {
        await db.trdpGroup.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.trdpGroup.create({ data });
        created++;
      }
    } catch (err) {
      errors.push({
        identifier: `trdpgroup=${g.trdpgroup}`,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }
  return {
    scanned: rows.length,
    created, updated, skipped, errors,
    since: "ALL",
    until: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

export async function syncSoftoneTrdpGroups(
  trigger: "manual" | "cron" | "api" = "manual"
) {
  return recordJob("softone-trdpgroups", trigger, {}, async () => {
    const rows = await fetchAllTrdpGroups();
    return runUpsertTrdpGroups(rows);
  });
}

// ─── Trader business groups ──────────────────────────────────────────────────

async function runUpsertTrdBusinesses(rows: S1TrdBusiness[]): Promise<SyncResult> {
  const start = Date.now();
  let created = 0, updated = 0, skipped = 0;
  const errors: SyncResult["errors"] = [];
  for (const b of rows) {
    try {
      const data = {
        trdbusiness: b.trdbusiness,
        company: b.company,
        sodtype: b.sodtype,
        name: b.name,
        code: b.code,
      };
      const existing = await db.trdBusiness.findUnique({ where: { trdbusiness: b.trdbusiness } });
      if (existing) {
        await db.trdBusiness.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.trdBusiness.create({ data });
        created++;
      }
    } catch (err) {
      errors.push({
        identifier: `trdbusiness=${b.trdbusiness}`,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }
  return {
    scanned: rows.length,
    created, updated, skipped, errors,
    since: "ALL",
    until: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

export async function syncSoftoneTrdBusinesses(
  trigger: "manual" | "cron" | "api" = "manual"
) {
  return recordJob("softone-trdbusinesses", trigger, {}, async () => {
    const rows = await fetchAllTrdBusinesses();
    return runUpsertTrdBusinesses(rows);
  });
}

// ─── Milesight device reconciliation ─────────────────────────────────────────
// Compares our local assigned devices against the live Milesight inventory.
// Local devices whose devEui no longer exists on Milesight get a non-null
// `removedFromMilesightAt` stamp (ghost flag). If a previously-ghost device
// reappears, the flag is cleared. Also recomputes affected tenant invoices.

async function runReconcileMilesight(): Promise<SyncResult> {
  const { searchDevicesAllApps } = await import("@/lib/milesight-apps");
  const { recalcCurrentInvoice } = await import("@/lib/billing");
  const start = Date.now();
  let created = 0, updated = 0, skipped = 0;
  const errors: SyncResult["errors"] = [];

  let msContent;
  try {
    msContent = await searchDevicesAllApps();
  } catch (err) {
    return {
      scanned: 0, created: 0, updated: 0, skipped: 1,
      errors: [{ identifier: "milesight-api", error: err instanceof Error ? err.message : String(err) }],
      since: "RECONCILE", until: new Date().toISOString(), durationMs: Date.now() - start,
    };
  }

  const liveEuis = new Set(msContent.map((d) => d.devEUI.toUpperCase()));
  const locals = await db.device.findMany({
    select: { id: true, devEui: true, tenantId: true, removedFromMilesightAt: true },
  });

  const affectedTenants = new Set<string>();

  for (const d of locals) {
    try {
      const isLive = liveEuis.has(d.devEui.toUpperCase());
      if (!isLive && d.removedFromMilesightAt == null) {
        await db.device.update({
          where: { id: d.id },
          data: { removedFromMilesightAt: new Date(), online: false },
        });
        affectedTenants.add(d.tenantId);
        updated++;
      } else if (isLive && d.removedFromMilesightAt != null) {
        // Device reappeared — unset ghost flag
        await db.device.update({
          where: { id: d.id },
          data: { removedFromMilesightAt: null },
        });
        affectedTenants.add(d.tenantId);
        updated++;
      }
    } catch (err) {
      errors.push({
        identifier: `device=${d.devEui}`,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  // Billing recompute for every tenant whose ghost set changed
  for (const tenantId of affectedTenants) {
    await recalcCurrentInvoice(tenantId).catch((err) =>
      console.error("[reconcile] recalc failed for", tenantId, err)
    );
  }

  return {
    scanned: locals.length,
    created, updated, skipped, errors,
    since: "RECONCILE",
    until: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

export async function reconcileMilesightDevices(
  trigger: "manual" | "cron" | "api" = "manual"
) {
  return recordJob("milesight-reconcile", trigger, {}, runReconcileMilesight);
}
