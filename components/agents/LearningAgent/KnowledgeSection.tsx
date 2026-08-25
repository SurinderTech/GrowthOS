"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle2, Loader2, Trash2, Search, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { ingestKnowledge, retrieveKnowledge, KnowledgeIngestResult } from "@/lib/nova-api";

interface DocItem {
  id: string;
  title: string;
  source: string;
  status: "ready" | "processing" | "failed";
  topic?: string;
  uploadedAt: string;
}

const SAMPLE_DOCS: DocItem[] = [
  {
    id: "doc-1",
    title: "Python_Advanced_Decorators_Notes.pdf",
    source: "user_upload",
    status: "ready",
    topic: "Python Core",
    uploadedAt: "Today, 10:30 AM",
  },
  {
    id: "doc-2",
    title: "System_Design_Distributed_Systems.md",
    source: "user_upload",
    status: "ready",
    topic: "Architecture",
    uploadedAt: "Yesterday, 4:15 PM",
  },
];

export function KnowledgeSection() {
  const [docs, setDocs] = useState<DocItem[]>(SAMPLE_DOCS);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Search RAG test state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docText.trim() || isUploading) return;

    setIsUploading(true);
    setUploadStatus("Uploading document & generating pgvector embeddings...");

    try {
      const res: KnowledgeIngestResult = await ingestKnowledge(docTitle.trim(), docText.trim());

      const newDoc: DocItem = {
        id: res.document_id || `doc-${Date.now()}`,
        title: res.title || docTitle,
        source: "user_upload",
        status: "ready",
        topic: "General Study Notes",
        uploadedAt: "Just now",
      };

      setDocs((prev) => [newDoc, ...prev]);
      setDocTitle("");
      setDocText("");
      setUploadStatus("✅ Document successfully indexed in RAG vector store!");
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err: any) {
      setUploadStatus(`❌ Ingestion error: ${err.message || "Failed to index document"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleTestSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    try {
      const payload = await retrieveKnowledge(searchQuery.trim());
      setSearchResults(payload);
    } catch (err: any) {
      setSearchResults({ error: err.message });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.05))", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "16px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          <BookOpen size={14} /> Learning Knowledge & RAG Index
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>My Uploaded Knowledge Notes</h2>
        <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>
          Upload study notes, PDFs, or markdown files. NOVA will automatically index them into PostgreSQL `pgvector` for instant RAG retrieval during your learning sessions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
        {/* Upload Box */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.95rem" }}>
            <Upload size={16} style={{ color: "#38bdf8" }} />
            <span>Add New Study Document / Notes</span>
          </div>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>Document Title</label>
              <input
                type="text"
                placeholder="e.g., Python_Decorators_Cheatsheet.md"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                style={{ width: "100%", backgroundColor: "#0b1329", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: "#ffffff", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.74rem", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>Document Content / Study Notes</label>
              <textarea
                rows={5}
                placeholder="Paste document text or markdown notes here..."
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                style={{ width: "100%", backgroundColor: "#0b1329", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: "#ffffff", outline: "none", resize: "vertical" }}
              />
            </div>

            {uploadStatus && (
              <div style={{ fontSize: "0.76rem", color: uploadStatus.startsWith("❌") ? "#ef4444" : "#38bdf8", backgroundColor: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "6px" }}>
                {uploadStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || !docTitle.trim() || !docText.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                opacity: isUploading || !docTitle.trim() || !docText.trim() ? 0.5 : 1,
              }}
            >
              {isUploading ? <Loader2 size={15} style={{ animation: "mcSpin 0.9s linear infinite" }} /> : <Upload size={15} />}
              <span>{isUploading ? "Indexing into pgvector..." : "Upload & Index Knowledge"}</span>
            </button>
          </form>
        </div>

        {/* Document List */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.95rem" }}>
              <FileText size={16} style={{ color: "#38bdf8" }} />
              <span>Indexed Knowledge Files ({docs.length})</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
            {docs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={16} style={{ color: "#38bdf8" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#f8fafc" }}>{doc.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                      <span>{doc.uploadedAt}</span>
                      {doc.topic && <span style={{ color: "#38bdf8" }}>• {doc.topic}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.68rem", color: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)", padding: "2px 8px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={10} /> Ready
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    title="Delete document"
                    style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RAG Retrieval Test Box */}
      <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.92rem", marginBottom: "12px" }}>
          <Sparkles size={16} style={{ color: "#38bdf8" }} />
          <span>Test NOVA RAG Knowledge Retrieval</span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Ask a question about your uploaded notes (e.g. 'What are decorators in Python?')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTestSearch()}
            style={{ flex: 1, backgroundColor: "#0b1329", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: "#ffffff", outline: "none" }}
          />
          <button
            onClick={handleTestSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{ backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {isSearching ? <Loader2 size={14} style={{ animation: "mcSpin 0.9s linear infinite" }} /> : <Search size={14} />}
            <span>Retrieve</span>
          </button>
        </div>

        {searchResults && (
          <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#070e20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {JSON.stringify(searchResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeSection;
