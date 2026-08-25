"use client";

import React, { useState, useEffect } from "react";
import { Brain, Plus, Trash2, CheckCircle2, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { fetchUserMemories, createMemory, deleteMemory, MemoryRecord } from "@/lib/nova-api";

export function PersonalMemorySection() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newFact, setNewFact] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const records = await fetchUserMemories();
      setMemories(records);
    } catch (err: any) {
      console.error("Failed to load user memories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const created = await createMemory(newFact.trim(), "semantic", 0.7);
      setMemories((prev) => [created, ...prev]);
      setNewFact("");
      setMessage("✅ Memory saved to NOVA's personal context!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`❌ Failed to save memory: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const success = await deleteMemory(memoryId, true);
      if (success) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      }
    } catch (err: any) {
      console.error("Failed to delete memory:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.05))", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "16px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c084fc", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          <Brain size={14} /> Personal Intelligence Control
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>What NOVA Remembers About You</h2>
        <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>
          Manage personal facts, preferences, and learning styles remembered by NOVA. You have full transparency and control to correct or remove remembered information.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
        {/* Add Memory Form */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.95rem" }}>
            <Plus size={16} style={{ color: "#c084fc" }} />
            <span>Add Personal Fact / Preference</span>
          </div>

          <form onSubmit={handleAddMemory} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>
                What would you like NOVA to remember?
              </label>
              <textarea
                rows={4}
                placeholder="e.g., 'I prefer hands-on building projects over reading long theoretical manuals', or 'My target exam is in October'."
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                style={{ width: "100%", backgroundColor: "#0b1329", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: "#ffffff", outline: "none", resize: "vertical" }}
              />
            </div>

            {message && (
              <div style={{ fontSize: "0.76rem", color: message.startsWith("❌") ? "#ef4444" : "#c084fc", backgroundColor: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "6px" }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isAdding || !newFact.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                opacity: isAdding || !newFact.trim() ? 0.5 : 1,
              }}
            >
              {isAdding ? <Loader2 size={15} style={{ animation: "mcSpin 0.9s linear infinite" }} /> : <Sparkles size={15} />}
              <span>{isAdding ? "Saving Memory..." : "Save Personal Fact"}</span>
            </button>
          </form>
        </div>

        {/* Remembered Facts List */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.95rem" }}>
              <Brain size={16} style={{ color: "#c084fc" }} />
              <span>Remembered Facts ({memories.length})</span>
            </div>
            <button
              onClick={loadMemories}
              title="Refresh memories"
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
              <Loader2 size={22} style={{ color: "#c084fc", animation: "mcSpin 0.9s linear infinite" }} />
            </div>
          ) : memories.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", padding: "40px 10px" }}>
              No custom memories stored yet. NOVA automatically extracts learning facts as you interact.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "340px", overflowY: "auto" }}>
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "10px 14px",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", color: "#f8fafc", lineHeight: "1.4" }}>{mem.content}</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px", display: "flex", gap: "8px" }}>
                      <span style={{ color: "#c084fc", textTransform: "capitalize" }}>Type: {mem.memory_type}</span>
                      <span>• Source: {mem.source}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    title="Forget / Delete memory"
                    style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "2px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonalMemorySection;
