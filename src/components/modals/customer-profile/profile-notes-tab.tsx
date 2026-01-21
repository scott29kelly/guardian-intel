"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Trash2 } from "lucide-react";

interface Note {
  id: string;
  date: string;
  note: string;
  user: string;
}

interface ProfileNotesTabProps {
  notes: Note[];
  onAddNote: (note: string) => void;
  onDeleteNote: (id: string) => void;
}

export function ProfileNotesTab({ notes, onAddNote, onDeleteNote }: ProfileNotesTabProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleAdd = () => {
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText("");
    setShowAddNote(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted font-mono text-sm">Customer notes:</p>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
        >
          {showAddNote ? "Cancel" : "+ Add Note"}
        </button>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="panel p-4 border-accent-primary/50"
        >
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Enter note about this customer..."
            className="w-full h-24 px-3 py-2 bg-surface-secondary border border-border rounded font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowAddNote(false);
                setNewNoteText("");
              }}
              className="px-3 py-1.5 bg-surface-secondary border border-border rounded font-mono text-xs text-text-muted hover:text-text-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newNoteText.trim()}
              className="px-3 py-1.5 rounded font-mono text-xs text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: newNoteText.trim() ? `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` : undefined }}
            >
              Save Note
            </button>
          </div>
        </motion.div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="panel p-8 text-center">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">No notes yet</p>
          <p className="font-mono text-xs text-text-muted mt-1">Click "+ Add Note" to create one</p>
        </div>
      ) : (
        notes.map((item) => (
          <div key={item.id} className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-text-muted">{item.user} • {item.date}</span>
              <button
                onClick={() => onDeleteNote(item.id)}
                className="text-text-muted hover:text-accent-danger transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-mono text-sm text-text-secondary">{item.note}</p>
          </div>
        ))
      )}
    </div>
  );
}
