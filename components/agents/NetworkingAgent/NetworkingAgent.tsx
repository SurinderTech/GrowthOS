"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Sparkles, Users } from "lucide-react";
import { PanelShell, sharedStyles as shared } from "../PanelShell";
import { getContacts, createContact, updateContact, deleteContact, draftOutreachMessage, type ContactItem, type ContactStatus } from "@/lib/agents-api";

const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = { to_reach: "#64748b", contacted: "#3b82f6", replied: "#f59e0b", connected: "#22c55e" };
const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = { to_reach: "To Reach", contacted: "Contacted", replied: "Replied", connected: "Connected" };

export function NetworkingAgent({ onClose }: { onClose: () => void }) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);

  const load = () => getContacts().then(setContacts).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const c = await createContact({ name, role: role || undefined, company: company || undefined });
      setContacts(prev => [c, ...prev]);
      setName(""); setRole(""); setCompany(""); setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const cycleStatus = async (c: ContactItem) => {
    const order: ContactStatus[] = ["to_reach", "contacted", "replied", "connected"];
    const next = order[(order.indexOf(c.status) + 1) % order.length];
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    try { await updateContact(c.id, { status: next }); } catch {}
  };

  const handleDraft = async (c: ContactItem) => {
    setDraftingId(c.id);
    try {
      const { message } = await draftOutreachMessage(c.id);
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, last_message: message } : x));
    } catch {} finally { setDraftingId(null); }
  };

  const handleDelete = async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    try { await deleteContact(id); } catch {}
  };

  return (
    <PanelShell
      icon={<Users size={22} style={{ color: "#ec4899" }} />}
      title="Networking Agent Workspace"
      sub="Track outreach and draft AI messages for your pipeline"
      accent="#ec4899"
      onClose={onClose}
    >
      <button style={shared.primaryBtn("#ec4899")} onClick={() => setShowForm(v => !v)}><Plus size={14} /> New Contact</button>

      {showForm && (
        <div style={{ marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input style={shared.input} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input style={shared.input} placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} />
          <input style={shared.input} placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} />
          <button style={{ ...shared.primaryBtn("#ec4899"), opacity: saving || !name.trim() ? 0.5 : 1 }} disabled={saving || !name.trim()} onClick={handleCreate}>
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div style={shared.emptyState}>No contacts yet. Add someone you'd like to reach out to.</div>
        ) : contacts.map(c => (
          <div key={c.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "white" }}>{c.name}</div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{[c.role, c.company].filter(Boolean).join(" · ") || c.platform}</div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => cycleStatus(c)} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: "8px", background: `${CONTACT_STATUS_COLORS[c.status]}20`, color: CONTACT_STATUS_COLORS[c.status], border: `1px solid ${CONTACT_STATUS_COLORS[c.status]}44`, cursor: "pointer" }}>
                {CONTACT_STATUS_LABELS[c.status]}
              </button>
              <button onClick={() => handleDraft(c)} disabled={draftingId === c.id} style={{ fontSize: "0.7rem", color: "#818cf8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <Sparkles size={11} /> {draftingId === c.id ? "Drafting..." : "Draft message"}
              </button>
            </div>
            {c.last_message && (
              <div style={{ marginTop: "8px", padding: "10px 12px", background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.55 }}>
                {c.last_message}
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

export const NetworkingAgentPanel = NetworkingAgent;
export default NetworkingAgent;
