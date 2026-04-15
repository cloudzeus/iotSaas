// Constants for sync schedule kinds. Kept separate from `schedule-actions.ts`
// because "use server" files can only export async functions.

export const SYNC_KINDS = [
  { kind: "softone-customers",     label: "SoftOne · Customers (incremental)", defaultInterval: 5 },
  { kind: "softone-countries",     label: "SoftOne · Countries",               defaultInterval: 720 },
  { kind: "softone-trdpgroups",    label: "SoftOne · Trader Price Groups",     defaultInterval: 720 },
  { kind: "softone-trdbusinesses", label: "SoftOne · Trader Business Groups",  defaultInterval: 720 },
  { kind: "milesight-reconcile",   label: "Milesight · Device reconciliation", defaultInterval: 60 },
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number]["kind"];
