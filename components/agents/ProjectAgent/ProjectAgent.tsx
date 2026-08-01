"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, Zap } from "lucide-react";
import { PanelShell, sharedStyles as shared } from "../PanelShell";
import { getProjects, createProject, updateProject, deleteProject, type ProjectItem, type ProjectStatus } from "@/lib/agents-api";

const STATUS_COLORS: Record<ProjectStatus, string> = { idea: "#64748b", in_progress: "#f59e0b", completed: "#22c55e" };
const STATUS_LABELS: Record<ProjectStatus, string> = { idea: "Idea", in_progress: "In Progress", completed: "Completed" };

export function ProjectAgent({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => getProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const p = await createProject({ title, description: description || undefined, github_url: githubUrl || undefined });
      setProjects(prev => [p, ...prev]);
      setTitle(""); setDescription(""); setGithubUrl(""); setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const cycleStatus = async (p: ProjectItem) => {
    const order: ProjectStatus[] = ["idea", "in_progress", "completed"];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
    try { await updateProject(p.id, { status: next }); } catch {}
  };

  const handleDelete = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try { await deleteProject(id); } catch {}
  };

  return (
    <PanelShell
      icon={<Zap size={22} style={{ color: "#a855f7" }} />}
      title="Project Agent Workspace"
      sub="Track what you're building, from idea to shipped"
      accent="#a855f7"
      onClose={onClose}
    >
      <button style={shared.primaryBtn("#a855f7")} onClick={() => setShowForm(v => !v)}><Plus size={14} /> New Project</button>

      {showForm && (
        <div style={{ marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input style={shared.input} placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={shared.textarea} rows={2} placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <input style={shared.input} placeholder="GitHub URL (optional)" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
          <button style={{ ...shared.primaryBtn("#a855f7"), opacity: saving || !title.trim() ? 0.5 : 1 }} disabled={saving || !title.trim()} onClick={handleCreate}>
            {saving ? "Saving..." : "Add Project"}
          </button>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={shared.emptyState}>No projects yet. Add your first one above.</div>
        ) : projects.map(p => (
          <div key={p.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "white" }}>{p.title}</div>
                {p.description && <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>{p.description}</div>}
              </div>
              <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => cycleStatus(p)} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: "8px", background: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status], border: `1px solid ${STATUS_COLORS[p.status]}44`, cursor: "pointer" }}>
                {STATUS_LABELS[p.status]}
              </button>
              {p.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#a855f7", display: "flex", alignItems: "center", gap: "3px" }}>
                  <ExternalLink size={11} /> GitHub
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

export const ProjectAgentPanel = ProjectAgent;
export default ProjectAgent;
