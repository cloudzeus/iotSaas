"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardSection, WidgetType, WidgetConfig, WIDGET_DEFAULTS } from "./types";
import { WIDGET_DEFAULTS as WD } from "./types";
import { saveWidgetLayout, removeWidget, addWidget, updateWidgetConfig } from "@/lib/dashboard-actions";
import WidgetRenderer from "./WidgetRenderer";
import SectionManager from "./SectionManager";
import AddWidgetPanel from "./AddWidgetPanel";
import WidgetConfigModal from "./WidgetConfigModal";

interface WidgetRow {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
    sectionId: string;
  };
}

interface Device {
  id: string;
  name: string;
  channels: string[];
}

interface DashboardGridProps {
  dashboardId: string;
  sections: DashboardSection[];
  widgets: WidgetRow[];
  devices: Device[];
  editMode: boolean;
  onSectionsChange: (sections: DashboardSection[]) => void;
}

const COLS = 12;
const ROW_HEIGHT = 60;
const SAVE_DEBOUNCE_MS = 1200;

export default function DashboardGrid({
  dashboardId,
  sections: initialSections,
  widgets: initialWidgets,
  devices,
  editMode,
  onSectionsChange,
}: DashboardGridProps) {
  const [sections, setSections] = useState<DashboardSection[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  );
  const [widgets, setWidgets] = useState<WidgetRow[]>(initialWidgets);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [addWidgetSectionId, setAddWidgetSectionId] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<WidgetRow | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Track container width for responsive grid
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Group widgets by section
  function widgetsForSection(sectionId: string): WidgetRow[] {
    return widgets.filter(
      (w) => w.config.sectionId === sectionId || w.position.sectionId === sectionId
    );
  }

  function toGridItems(sectionWidgets: WidgetRow[]): Layout[] {
    return sectionWidgets.map((w) => ({
      i: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h,
      minW: 2,
      minH: 2,
    }));
  }

  // Debounced save when layout changes
  function handleLayoutChange(sectionId: string, layout: Layout[]) {
    // Update local state immediately
    setWidgets((prev) =>
      prev.map((w) => {
        const l = layout.find((item) => item.i === w.id);
        if (!l) return w;
        return {
          ...w,
          position: { ...w.position, x: l.x, y: l.y, w: l.w, h: l.h },
        };
      })
    );

    // Debounce DB save
    const existing = saveTimers.current.get(sectionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      const changes = layout.map((l) => ({
        id: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        sectionId,
      }));
      await saveWidgetLayout(dashboardId, changes);
      saveTimers.current.delete(sectionId);
    }, SAVE_DEBOUNCE_MS);
    saveTimers.current.set(sectionId, timer);
  }

  async function handleAddWidget(
    sectionId: string,
    type: WidgetType,
    title: string,
    config: WidgetConfig
  ) {
    const def = WD[type];
    const section = sections.find((s) => s.id === sectionId);
    const perRow = section?.cols ?? 3;
    const defaultW = Math.max(2, Math.min(12, Math.floor(COLS / perRow)));
    const existingInSection = widgetsForSection(sectionId);
    const maxY = existingInSection.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);

    const newWidget = await addWidget(dashboardId, {
      type,
      title,
      config: { ...config, sectionId },
      position: { x: 0, y: maxY, w: defaultW, h: def.h, sectionId },
    });

    setWidgets((prev) => [...prev, newWidget as WidgetRow]);
    setAddWidgetSectionId(null);
  }

  async function handleRemoveWidget(widgetId: string) {
    if (!confirm("Remove this widget?")) return;
    await removeWidget(widgetId);
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {/* Dashboard toolbar */}
      {editMode && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "10px 0 16px",
          }}
        >
          <button
            className="btn-secondary"
            onClick={() => setShowSectionManager(true)}
            style={{ fontSize: 13 }}
          >
            ⚙️ Manage sections
          </button>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Drag widgets to rearrange · resize from corners · click + to add
          </span>
        </div>
      )}

      {/* Sections */}
      {sections.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p>No sections yet.</p>
          {editMode && (
            <button
              className="btn-primary"
              style={{ marginTop: 8 }}
              onClick={() => setShowSectionManager(true)}
            >
              Add first section
            </button>
          )}
        </div>
      )}

      {sections.map((section) => {
        const sectionWidgets = widgetsForSection(section.id);
        const isCollapsed = collapsedSections.has(section.id);

        return (
          <div key={section.id} style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                padding: "0 4px",
              }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "2px 4px",
                  transition: "transform 0.2s",
                  transform: isCollapsed ? "rotate(-90deg)" : "none",
                }}
              >
                ▼
              </button>
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {section.name}
              </h3>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {sectionWidgets.length} widget{sectionWidgets.length !== 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              {editMode && (
                <button
                  className="btn-primary"
                  style={{ padding: "3px 12px", fontSize: 12 }}
                  onClick={() => setAddWidgetSectionId(section.id)}
                >
                  + Add widget
                </button>
              )}
            </div>

            {/* Grid */}
            {!isCollapsed && (
              <div
                style={{
                  background: "rgba(255,255,255,0.015)",
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.06)",
                  minHeight: sectionWidgets.length === 0 ? 80 : undefined,
                  position: "relative",
                }}
              >
                {sectionWidgets.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      fontSize: 12,
                      pointerEvents: "none",
                    }}
                  >
                    {editMode ? 'Click "+ Add widget" to add your first widget' : "No widgets in this section"}
                  </div>
                )}

                <GridLayout
                  layout={toGridItems(sectionWidgets)}
                  cols={COLS}
                  rowHeight={ROW_HEIGHT}
                  width={containerWidth}
                  isDraggable={editMode}
                  isResizable={editMode}
                  onLayoutChange={(layout) => handleLayoutChange(section.id, layout)}
                  // Mobile: stack widgets full-width. Desktop: use their stored widths.
                  layout={containerWidth < 640
                    ? sectionWidgets.map((w, i) => ({
                        i: w.id, x: 0, y: i * (w.position.h || 4),
                        w: COLS, h: w.position.h || 4,
                      }))
                    : undefined}
                  draggableHandle=".widget-drag-handle"
                  margin={[8, 8]}
                  containerPadding={[8, 8]}
                  resizeHandles={["se"]}
                >
                  {sectionWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <WidgetHeader
                        widget={widget}
                        editMode={editMode}
                        onEdit={() => setEditingWidget(widget)}
                        onRemove={() => handleRemoveWidget(widget.id)}
                      />
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <WidgetRenderer
                          id={widget.id}
                          type={widget.type}
                          title={widget.title}
                          config={widget.config}
                        />
                      </div>
                    </div>
                  ))}
                </GridLayout>
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {showSectionManager && (
        <SectionManager
          dashboardId={dashboardId}
          sections={sections}
          onChange={(s) => {
            setSections([...s].sort((a, b) => a.order - b.order));
            onSectionsChange(s);
          }}
          onClose={() => setShowSectionManager(false)}
        />
      )}

      {editingWidget && (
        <WidgetConfigModal
          initialType={editingWidget.type}
          initialTitle={editingWidget.title}
          initialConfig={editingWidget.config}
          devices={devices}
          onSave={async (_type, title, config) => {
            await updateWidgetConfig(editingWidget.id, config, title);
            setWidgets((prev) =>
              prev.map((w) =>
                w.id === editingWidget.id
                  ? { ...w, title, config: { ...w.config, ...config } }
                  : w
              )
            );
            setEditingWidget(null);
          }}
          onClose={() => setEditingWidget(null)}
        />
      )}

      {addWidgetSectionId && (
        <AddWidgetPanel
          sectionId={addWidgetSectionId}
          devices={devices}
          onAdd={(type, title, config) =>
            handleAddWidget(addWidgetSectionId, type, title, config)
          }
          onClose={() => setAddWidgetSectionId(null)}
        />
      )}
    </div>
  );
}

// ─── Widget header with dropdown menu ─────────────────────────────────────────

function WidgetHeader({
  widget, editMode, onEdit, onRemove,
}: {
  widget: WidgetRow;
  editMode: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div
      className={editMode ? "widget-drag-handle" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        background: editMode ? "rgba(255,102,0,0.04)" : "var(--bg-card)",
        cursor: editMode ? "grab" : "default",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        {editMode && (
          <span style={{ color: "var(--text-muted)", fontSize: 12, userSelect: "none", flexShrink: 0 }}>⠿</span>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
          title={widget.title}
        >
          {widget.title}
        </span>
      </div>
      <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Widget menu"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            fontSize: 16,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
        >
          ⋯
        </button>
        {open && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              minWidth: 140,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              padding: 4,
              zIndex: 50,
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              style={menuItemStyle()}
            >
              ✎ Edit properties
            </button>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 2px" }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onRemove(); }}
              style={menuItemStyle("#ef4444")}
            >
              × Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function menuItemStyle(color?: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 10px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
    fontSize: 12,
    color: color ?? "var(--text-primary)",
    textAlign: "left",
  };
}
