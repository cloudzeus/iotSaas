"use server";

/**
 * Server Actions for dashboard & widget mutations.
 * All data writes go through these — no direct API calls from client components.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WidgetType, WidgetConfig } from "@/components/widgets/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Layout = {
  cols: number;
  rowHeight: number;
  sections: Array<{ id: string; name: string; order: number; collapsed?: boolean }>;
};

async function requireDashboard(dashboardId: string, tenantId: string) {
  const dash = await prisma.dashboard.findFirst({
    where: { id: dashboardId, tenantId },
  });
  if (!dash) throw new Error("Dashboard not found");
  return dash;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function createDashboard(name: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const dashboard = await prisma.dashboard.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      isDefault: false,
      layout: {
        cols: 12,
        rowHeight: 60,
        sections: [
          { id: crypto.randomUUID(), name: "Overview", order: 0 },
        ],
      },
    },
    include: { widgets: true },
  });
  revalidatePath("/dashboard");
  return dashboard;
}

export async function renameDashboard(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  await requireDashboard(id, session.user.tenantId);
  await prisma.dashboard.update({ where: { id }, data: { name } });
  revalidatePath("/dashboard");
}

export async function deleteDashboard(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  const dash = await requireDashboard(id, session.user.tenantId);
  if ((dash.layout as Layout)?.sections === undefined)
    throw new Error("Cannot delete");
  await prisma.dashboard.delete({ where: { id } });
  revalidatePath("/dashboard");
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function addSection(dashboardId: string, name: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const dash = await requireDashboard(dashboardId, session.user.tenantId);
  const layout = dash.layout as Layout;
  const newSection = {
    id: crypto.randomUUID(),
    name,
    order: layout.sections.length,
    collapsed: false,
  };

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections: [...layout.sections, newSection] } },
  });
  revalidatePath("/dashboard");
  return newSection;
}

export async function updateSection(
  dashboardId: string,
  sectionId: string,
  updates: { name?: string; collapsed?: boolean }
) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  const dash = await requireDashboard(dashboardId, session.user.tenantId);
  const layout = dash.layout as Layout;
  const sections = layout.sections.map((s) =>
    s.id === sectionId ? { ...s, ...updates } : s
  );
  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections } },
  });
  revalidatePath("/dashboard");
}

export async function deleteSection(dashboardId: string, sectionId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const dash = await requireDashboard(dashboardId, session.user.tenantId);
  const layout = dash.layout as Layout;

  // Orphan widgets — move to first remaining section or keep sectionId unchanged
  // (they'll just not render until section is created again)
  const sections = layout.sections
    .filter((s) => s.id !== sectionId)
    .map((s, i) => ({ ...s, order: i }));

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { layout: { ...layout, sections } },
  });
  revalidatePath("/dashboard");
}

export async function reorderSections(dashboardId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  const dash = await requireDashboard(dashboardId, session.user.tenantId);
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
  revalidatePath("/dashboard");
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
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  await requireDashboard(dashboardId, session.user.tenantId);

  const widget = await prisma.widget.create({
    data: {
      dashboardId,
      type: data.type,
      title: data.title,
      config: data.config,
      position: data.position,
    },
  });

  revalidatePath("/dashboard");
  return widget;
}

export async function updateWidgetConfig(
  widgetId: string,
  config: Partial<WidgetConfig>,
  title?: string
) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, dashboard: { tenantId: session.user.tenantId } },
  });
  if (!widget) throw new Error("Not found");

  const current = widget.config as Record<string, unknown>;
  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      ...(title ? { title } : {}),
      config: { ...current, ...config },
    },
  });
  revalidatePath("/dashboard");
}

export async function saveWidgetLayout(
  dashboardId: string,
  layouts: Array<{ id: string; x: number; y: number; w: number; h: number; sectionId: string }>
) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") return;

  await requireDashboard(dashboardId, session.user.tenantId);

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
  // No revalidate — layout saves are high-frequency; client is authoritative
}

export async function removeWidget(widgetId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Forbidden");

  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, dashboard: { tenantId: session.user.tenantId } },
  });
  if (!widget) throw new Error("Not found");

  await prisma.widget.delete({ where: { id: widgetId } });
  revalidatePath("/dashboard");
}
