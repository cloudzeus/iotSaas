// Constants for sync schedule kinds. Kept separate from `schedule-actions.ts`
// because "use server" files can only export async functions.

export const SYNC_KINDS = [
  { kind: "softone-customers", label: "SoftOne · Customers (incremental)", defaultInterval: 5 },
  { kind: "softone-countries", label: "SoftOne · Countries",               defaultInterval: 720 },
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number]["kind"];
