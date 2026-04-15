"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardSection, WidgetType, WidgetConfig, WIDGET_DEFAULTS } from "./types";
import { WIDGET_DEFAULTS as WD } from "./types";
import { saveWidgetLayout, removeWidget, addWidget } from "@/lib/dashboard-actions";
import WidgetRenderer from "./WidgetRenderer";
import SectionManager from "./SectionManager";
import AddWidgetPanel from "./AddWidgetPanel";

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
    const existingInSection = widgetsForSection(sectionId);
    // Find a free Y slot
    const maxY = existingInSection.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);

    const newWidget = await addWidget(dashboardId, {
      type,
      title,
      config: { ...config, sectionId },
      position: { x: 0, y: maxY, w: def.w, h: def.h, sectionId },
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
                  draggableHandle=".widget-drag-handle"
                  margin={[8, 8]}
                  containerPadding={[8, 8]}
                  resizeHandles={["se"]}
                >
                  {sectionWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      style={{
                        background: "var(--card)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {/* Edit mode overlay: drag handle + remove */}
                      {editMode && (
                        <>
                          <div
                            className="widget-drag-handle"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 24,
                              background: "rgba(255,102,0,0.08)",
                              borderBottom: "1px solid rgba(255,102,0,0.15)",
                              cursor: "grab",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10,
                            }}
                          >
                            <span
                              style={{ color: "rgba(255,102,0,0.5)", fontSize: 12, userSelect: "none" }}
                            >
                              ⠿ {widget.title}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveWidget(widget.id)}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 6,
                              background: "rgba(239,68,68,0.15)",
                              border: "none",
                              color: "#ef4444",
                              borderRadius: 4,
                              width: 18,
                              height: 18,
                              fontSize: 11,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 11,
                            }}
                            title="Remove widget"
                          >
                            ×
                          </button>
                        </>
                      )}

                      {/* Actual widget content */}
                      <div
                        style={{
                          height: "100%",
                          paddingTop: editMode ? 24 : 0,
                        }}
                      >
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
