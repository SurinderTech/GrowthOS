"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Play, Send, RefreshCw, AlertTriangle, CheckCircle, Clock, Code2, Sparkles, Terminal } from "lucide-react";

// Dynamically import Monaco Editor to avoid SSR window issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export interface LeetCodeMonacoEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string; // python | cpp | java | javascript
  onLanguageChange: (lang: string) => void;
  onRun: (isPasted: boolean, timeSpentS: number) => void;
  onSubmit: (isPasted: boolean, timeSpentS: number) => void;
  running: boolean;
  testResult: { pass: boolean; msg: string; status?: string } | null;
  starterCode: string;
  examples?: { input: string; output: string; explain?: string }[];
}

export default function LeetCodeMonacoEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  onRun,
  onSubmit,
  running,
  testResult,
  starterCode,
  examples = [],
}: LeetCodeMonacoEditorProps) {
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "hc-black">("vs-dark");
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcases" | "console">("testcases");
  const [selectedExampleIdx, setSelectedExampleIdx] = useState(0);

  // Copy-Paste Detector & Typing Timer state
  const [isPasted, setIsPasted] = useState(false);
  const [pastedCount, setPastedCount] = useState(0);
  const [timeSpentS, setTimeSpentS] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  // Track active writing time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTyping) {
      interval = setInterval(() => {
        setTimeSpentS((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTyping]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Map app language key to Monaco language identifier
  const getMonacoLanguage = (lang: string) => {
    const l = (lang || "").toLowerCase();
    if (l === "c") return "c";
    if (l === "cpp" || l === "c++") return "cpp";
    if (l === "java") return "java";
    if (l === "python" || l === "py" || l === "python3") return "python";
    if (l === "javascript" || l === "js") return "javascript";
    if (l === "csharp" || l === "cs" || l === "c#") return "csharp";
    if (l === "go" || l === "golang") return "go";
    if (l === "rust" || l === "rs") return "rust";
    return "python";
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Listen for paste event on Monaco instance
    editor.onDidPaste((e: any) => {
      setIsPasted(true);
      setPastedCount((prev) => prev + 1);
    });

    // Custom theme configuration for LeetCode Dark feel
    monaco.editor.defineTheme("leetcode-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
        { token: "number", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
        { token: "type", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
      ],
      colors: {
        "editor.background": "#0F172A",
        "editor.foreground": "#E2E8F0",
        "editor.lineHighlightBackground": "#1E293B50",
        "editorCursor.foreground": "#6366F1",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94A3B8",
        "editor.selectionBackground": "#33415590",
        "editorBracketMatch.background": "#334155",
        "editorBracketMatch.border": "#6366F1",
      },
    });

    monaco.editor.setTheme("leetcode-dark");
  };

  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal || "";
    onChange(val);

    // Trigger active typing state
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const handleReset = () => {
    onChange(starterCode);
    setIsPasted(false);
    setPastedCount(0);
    setTimeSpentS(0);
  };

  // Switch to Console tab whenever a test/submit result arrives
  useEffect(() => {
    if (testResult) {
      setActiveConsoleTab("console");
    }
  }, [testResult]);

  return (
    <div style={styles.container}>
      {/* ── HEADER TOOLBAR ────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.langSelectWrap}>
            <Code2 size={15} color="#818CF8" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              style={styles.langSelect}
            >
              <option value="c">C (GCC 14)</option>
              <option value="cpp">C++ (GCC 14)</option>
              <option value="java">Java 17 (OpenJDK)</option>
              <option value="python">Python 3 (v3.11)</option>
              <option value="javascript">JavaScript (Node.js 18)</option>
              <option value="csharp">C# (.NET 8)</option>
              <option value="go">Go (v1.22)</option>
              <option value="rust">Rust (v1.75)</option>
            </select>
          </div>

          <button
            onClick={handleReset}
            style={styles.resetBtn}
            title="Reset code to starter template"
          >
            <RefreshCw size={13} /> Reset
          </button>
        </div>

        {/* Live Paste & Handwriting Detector Badge */}
        <div style={styles.headerRight}>
          <div
            style={{
              ...styles.detectorBadge,
              backgroundColor: isPasted ? "rgba(234, 179, 8, 0.12)" : "rgba(34, 197, 94, 0.12)",
              borderColor: isPasted ? "rgba(234, 179, 8, 0.35)" : "rgba(34, 197, 94, 0.35)",
              color: isPasted ? "#FACC15" : "#4ADE80",
            }}
          >
            {isPasted ? (
              <>
                <AlertTriangle size={13} style={{ marginRight: 5 }} />
                <span>Pasted Code (AI Copy Flagged)</span>
              </>
            ) : (
              <>
                <CheckCircle size={13} style={{ marginRight: 5 }} />
                <span>Written by User</span>
              </>
            )}
          </div>

          <div style={styles.timerBadge}>
            <Clock size={13} color="#94A3B8" style={{ marginRight: 5 }} />
            <span>{formatTime(timeSpentS)}</span>
          </div>
        </div>
      </div>

      {/* ── MONACO EDITOR CONTAINER ───────────────────────────────────────── */}
      <div style={styles.editorBody}>
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={value}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            lineNumbers: "on",
            renderLineHighlight: "all",
            smoothScrolling: true,
            tabSize: language === "python" || language === "javascript" ? 4 : 2,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* ── BOTTOM TEST CASES & CONSOLE PANEL ──────────────────────────────── */}
      <div style={styles.bottomConsole}>
        <div style={styles.consoleHeader}>
          <div style={styles.consoleTabs}>
            <button
              onClick={() => setActiveConsoleTab("testcases")}
              style={{
                ...styles.consoleTabBtn,
                ...(activeConsoleTab === "testcases" ? styles.consoleTabBtnActive : {}),
              }}
            >
              <Sparkles size={13} /> Test Cases
            </button>
            <button
              onClick={() => setActiveConsoleTab("console")}
              style={{
                ...styles.consoleTabBtn,
                ...(activeConsoleTab === "console" ? styles.consoleTabBtnActive : {}),
              }}
            >
              <Terminal size={13} /> Evaluation & Console Output
              {testResult && (
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: testResult.pass ? "#22C55E" : "#EF4444",
                  }}
                />
              )}
            </button>
          </div>

          <div style={styles.actionGroup}>
            <button
              onClick={() => onRun(isPasted, timeSpentS)}
              disabled={running}
              style={styles.runBtn}
            >
              <Play size={14} fill="currentColor" /> Run Code
            </button>
            <button
              onClick={() => onSubmit(isPasted, timeSpentS)}
              disabled={running}
              style={styles.submitBtn}
            >
              <Send size={14} /> Submit
            </button>
          </div>
        </div>

        <div style={styles.consoleContent}>
          {activeConsoleTab === "testcases" ? (
            <div style={styles.testCasesPane}>
              {examples.length > 0 ? (
                <>
                  <div style={styles.examplePills}>
                    {examples.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedExampleIdx(i)}
                        style={{
                          ...styles.examplePill,
                          ...(selectedExampleIdx === i ? styles.examplePillActive : {}),
                        }}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>
                  {examples[selectedExampleIdx] && (
                    <div style={styles.exampleDetail}>
                      <div style={styles.exampleField}>
                        <span style={styles.fieldLabel}>Input:</span>
                        <pre style={styles.codeBlock}>{examples[selectedExampleIdx].input}</pre>
                      </div>
                      <div style={styles.exampleField}>
                        <span style={styles.fieldLabel}>Expected Output:</span>
                        <pre style={styles.codeBlock}>{examples[selectedExampleIdx].output}</pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={styles.noData}>No sample test cases provided for this problem.</div>
              )}
            </div>
          ) : (
            <div style={styles.consoleOutputPane}>
              {running ? (
                <div style={styles.runningState}>
                  <RefreshCw size={18} className="animate-spin" color="#6366F1" />
                  <span style={{ marginLeft: 8, color: "#94A3B8" }}>Compiling & Executing Code...</span>
                </div>
              ) : testResult ? (
                <div
                  style={{
                    ...styles.verdictBox,
                    backgroundColor: testResult.pass
                      ? "rgba(34, 197, 94, 0.08)"
                      : "rgba(239, 68, 68, 0.08)",
                    borderColor: testResult.pass
                      ? "rgba(34, 197, 94, 0.3)"
                      : "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <div
                    style={{
                      ...styles.verdictTitle,
                      color: testResult.pass ? "#4ADE80" : "#F87171",
                    }}
                  >
                    {testResult.pass ? "✔ All Test Cases Passed (Accepted)" : "✘ Execution Failed"}
                  </div>
                  <pre style={styles.verdictMsg}>{testResult.msg}</pre>
                </div>
              ) : (
                <div style={styles.noData}>Click "Run Code" or "Submit" to test your solution.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 14px",
    backgroundColor: "#1E293B",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  langSelectWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  langSelect: {
    backgroundColor: "transparent",
    color: "#F8FAFC",
    border: "none",
    fontSize: "0.82rem",
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "none",
    fontSize: "0.78rem",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  detectorBadge: {
    display: "flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  timerBadge: {
    display: "flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    fontSize: "0.78rem",
    color: "#CBD5E1",
    fontWeight: 600,
  },
  editorBody: {
    flex: 1,
    minHeight: "320px",
    width: "100%",
    position: "relative",
  },
  bottomConsole: {
    display: "flex",
    flexDirection: "column",
    height: "220px",
    backgroundColor: "#0F172A",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  consoleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 14px",
    backgroundColor: "#1E293B",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  consoleTabs: {
    display: "flex",
    gap: "8px",
  },
  consoleTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    color: "#94A3B8",
    border: "none",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  consoleTabBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818CF8",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  actionGroup: {
    display: "flex",
    gap: "10px",
  },
  runBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 16px",
    borderRadius: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#F8FAFC",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 18px",
    borderRadius: "6px",
    backgroundColor: "#6366F1",
    color: "#FFFFFF",
    border: "none",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
  },
  consoleContent: {
    flex: 1,
    padding: "12px 16px",
    overflowY: "auto",
  },
  testCasesPane: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  examplePills: {
    display: "flex",
    gap: "6px",
  },
  examplePill: {
    padding: "4px 12px",
    borderRadius: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "#64748B",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  examplePillActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#A5B4FC",
    borderColor: "rgba(99, 102, 241, 0.4)",
  },
  exampleDetail: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  exampleField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldLabel: {
    fontSize: "0.75rem",
    color: "#94A3B8",
    fontWeight: 600,
  },
  codeBlock: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    backgroundColor: "#1E293B",
    padding: "6px 10px",
    borderRadius: "6px",
    color: "#E2E8F0",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  consoleOutputPane: {
    height: "100%",
  },
  runningState: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
  },
  verdictBox: {
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid",
  },
  verdictTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    marginBottom: "6px",
  },
  verdictMsg: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    color: "#CBD5E1",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  noData: {
    fontSize: "0.8rem",
    color: "#64748B",
    fontStyle: "italic",
    padding: "12px 0",
  },
};
