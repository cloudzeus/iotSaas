"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardSection } from "./types";
import {
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
} from "@/lib/dashboard-actions";

interface SectionManagerProps {
  dashboardId: string;
  sections: DashboardSection[];
  onChange: (sections: DashboardSection[]) => void;
  onClose: () => void;
}

// ─── Sortable row ─────────────────────────────────────────────────────────────
function SortableSection({
  section,
  onRename,
  onDelete,
}: {
  section: DashboardSection;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  async function commitRename() {
    setEditing(false);
    if (name.trim() && name !== section.name) {
      onRename(section.id, name.trim());
    } else {
      setName(section.name);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 8,
      }}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--text-muted)",
          fontSize: 16,
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        ⠿
      </span>

      {/* Name / edit input */}
      {editing ? (
        <input
          autoFocus
          className="input"
          style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setName(section.name); setEditing(false); }
          }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{section.name}</span>
      )}

      {/* Actions */}
      <button
        className="btn-ghost"
        style={{ padding: "2px 8px", fontSize: 12 }}
        onClick={() => setEditing(true)}
        title="Rename"
      >
        ✏️
      </button>
      <button
        className="btn-ghost"
        style={{ padding: "2px 8px", fontSize: 12, color: "#ef4444" }}
        onClick={() => onDelete(section.id)}
        title="Delete section"
      >
        🗑
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SectionManager({
  dashboardId,
  sections: initialSections,
  onChange,
  onClose,
}: SectionManagerProps) {
  const [sections, setSections] = useState<DashboardSection[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  );
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
      ...s,
      order: i,
    }));
    setSections(reordered);
    onChange(reordered);
    await reorderSections(dashboardId, reordered.map((s) => s.id));
  }

  async function handleAdd() {
    const name = newName.trim() || `Section ${sections.length + 1}`;
    setSaving(true);
    try {
      const newSection = await addSection(dashboardId, name);
      const updated = [...sections, { ...newSection, order: sections.length }];
      setSections(updated);
      onChange(updated);
      setNewName("");
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: string, name: string) {
    await updateSection(dashboardId, id, { name });
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    onChange(sections.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this section and all its widgets?")) return;
    await deleteSection(dashboardId, id);
    const updated = sections.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    onChange(updated);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Manage sections</h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              Drag to reorder · click ✏️ to rename · 🗑 to remove
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Section list */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px" }}>
          {sections.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
              No sections yet. Add one below.
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((s) => (
                <SortableSection
                  key={s.id}
                  section={s}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add section */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            className="input"
            style={{ flex: 1 }}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New section name…"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={saving}
            style={{ whiteSpace: "nowrap" }}
          >
            {saving ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
