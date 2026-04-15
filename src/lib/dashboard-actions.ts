"use server";

/**
 * Server Actions for dashboard & widget mutations.
 * Admins (SUPER_ADMIN / ADMIN) may act on any tenant's dashboard.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WidgetType, WidgetConfig } from "@/components/widgets/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = {
  id: string;
  name: string;
  order: number;
  cols?: number;          // per-section column count (overrides dashboard default)
  collapsed?: boolean;
};
type Layout = {
  cols: number;
  rowHeight: number;
  sections: Section[];
};

// ─── Authorization helper ─────────────────────────────────────────────────────

async function authorizedSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

function isAdmin(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Loads a dashboard and verifies the caller may write to it.
 * Admins can touch any dashboard; regular users only their own tenant's.
 * Returns the dashboard and the tenantId to use for revalidation/paths.
 */
async function requireDashboardAccess(
  dashboardId: string,
  role: string,
  tenantIdFromSession: string | null
) {
  const dash = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
  if (!dash) throw new Error("Dashboard not found");
  if (!isAdmin(role) && dash.tenantId !== tenantIdFromSession) {
    throw new Error("Forbidden");
  }
  return dash;
}

function rolePath(tenantId: string, role: string) {
  // Admins editing from /admin/tenants/<id>/dashboard want that path refreshed;
  // regular users want /dashboard. Returning both keeps both in sync.
  return isAdmin(role) ? [`/admin/tenants/${tenantId}/dashboard`, "/dashboard"] : ["/dashboard"];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function createDashboard(name: string, tenantIdOverride?: string) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const tenantId = isAdmin(session.user.role)
    ? (tenantIdOverride ?? session.user.tenantId)
    : session.user.tenantId;
  if (!tenantId) throw new Error("tenantId required");

  const dashboard = await prisma.dashboard.create({
    data: {
      tenantId,
      name,
      isDefault: false,
      layout: {
        cols: 12,
        rowHeight: 60,
        sections: [{ id: crypto.randomUUID(), name: "Overview", order: 0, cols: 12 }],
      },
    },
    include: { widgets: true },
  });
  rolePath(tenantId, session.user.role).forEach(revalidatePath);
  return dashboard;
}

export async function renameDashboard(id: string, name: string) {
  const session = await authorizedSession();
  const dash = await requireDashboardAccess(id, session.user.role, session.user.tenantId ?? null);
  await prisma.dashboard.update({ where: { id }, data: { name } });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
}

export async function deleteDashboard(id: string) {
  const session = await authorizedSession();
  const dash = await requireDashboardAccess(id, session.user.role, session.user.tenantId ?? null);
  await prisma.dashboard.delete({ where: { id } });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function addSection(dashboardId: string, name: string) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");
  const dash = await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  const layout = dash.layout as Layout;
  const newSection: Section = {
    id: crypto.randomUUID(),
    name,
    order: layout.sections.length,
    cols: layout.cols,
    collapsed: false,
  };

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections: [...layout.sections, newSection] } },
  });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
  return newSection;
}

export async function updateSection(
  dashboardId: string,
  sectionId: string,
  updates: { name?: string; collapsed?: boolean; cols?: number }
) {
  const session = await authorizedSession();
  const dash = await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  const layout = dash.layout as Layout;
  const sections = layout.sections.map((s) =>
    s.id === sectionId
      ? { ...s, ...updates, ...(updates.cols != null ? { cols: Math.max(1, Math.min(24, Math.round(updates.cols))) } : {}) }
      : s
  );
  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections } },
  });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
}

export async function deleteSection(dashboardId: string, sectionId: string) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");
  const dash = await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  const layout = dash.layout as Layout;
  const sections = layout.sections
    .filter((s) => s.id !== sectionId)
    .map((s, i) => ({ ...s, order: i }));

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections } },
  });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
}

export async function reorderSections(dashboardId: string, orderedIds: string[]) {
  const session = await authorizedSession();
  const dash = await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  const layout = dash.layout as Layout;
  const sectionMap = new Map(layout.sections.map((s) => [s.id, s]));
  const sections = orderedIds.map((id, i) => {
    const s = sectionMap.get(id);
    if (!s) throw new Error(`Section ${id} not found`);
    return { ...s, order: i };
  });
  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections } },
  });
  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

export async function addWidget(
  dashboardId: string,
  data: {
    type: WidgetType;
    title: string;
    config: WidgetConfig;
    position: { x: number; y: number; w: number; h: number; sectionId: string };
  }
) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");
  const dash = await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  const widget = await prisma.widget.create({
    data: {
      dashboardId,
      type: data.type,
      title: data.title,
      config: data.config,
      position: data.position,
    },
  });

  rolePath(dash.tenantId, session.user.role).forEach(revalidatePath);
  return widget;
}

export async function updateWidgetConfig(
  widgetId: string,
  config: Partial<WidgetConfig>,
  title?: string
) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const widget = await prisma.widget.findUnique({
    where: { id: widgetId },
    include: { dashboard: { select: { tenantId: true } } },
  });
  if (!widget) throw new Error("Not found");
  if (!isAdmin(session.user.role) && widget.dashboard.tenantId !== session.user.tenantId) {
    throw new Error("Forbidden");
  }

  const current = widget.config as Record<string, unknown>;
  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      ...(title ? { title } : {}),
      config: { ...current, ...config },
    },
  });
  rolePath(widget.dashboard.tenantId, session.user.role).forEach(revalidatePath);
}

export async function saveWidgetLayout(
  dashboardId: string,
  layouts: Array<{ id: string; x: number; y: number; w: number; h: number; sectionId: string }>
) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") return;
  await requireDashboardAccess(dashboardId, session.user.role, session.user.tenantId ?? null);

  await Promise.all(
    layouts.map(async ({ id, x, y, w, h, sectionId }) => {
      const widget = await prisma.widget.findUnique({
        where: { id },
        select: { config: true },
      });
      if (!widget) return;
      const currentConfig = widget.config as Record<string, unknown>;
      return prisma.widget.update({
        where: { id },
        data: {
          position: { x, y, w, h, sectionId },
          config: { ...currentConfig, sectionId },
        },
      });
    })
  );
}

export async function removeWidget(widgetId: string) {
  const session = await authorizedSession();
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const widget = await prisma.widget.findUnique({
    where: { id: widgetId },
    include: { dashboard: { select: { tenantId: true } } },
  });
  if (!widget) throw new Error("Not found");
  if (!isAdmin(session.user.role) && widget.dashboard.tenantId !== session.user.tenantId) {
    throw new Error("Forbidden");
  }

  await prisma.widget.delete({ where: { id: widgetId } });
  rolePath(widget.dashboard.tenantId, session.user.role).forEach(revalidatePath);
}
