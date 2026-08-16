// components/agents/LearningAgent/fieldDatasets.ts

export interface PathTemplateInfo {
  id: string;
  title: string;
  novaLine: string;
  nodes: string[];
}

export function detectField(goal?: string) {
  const normalized = (goal || "").toLowerCase();

  const pathTemplates: Record<string, PathTemplateInfo> = {
    frontend: {
      id: "frontend",
      title: "Frontend-First Path",
      novaLine: "Frontend-first it is. This path gets you shipping visible, real UI fast.",
      nodes: ["Programming Basics", "Git", "HTML & CSS", "JavaScript", "React", "Portfolio Project", "Job Ready"],
    },
    backend: {
      id: "backend",
      title: "Backend-First Path",
      novaLine: "Backend-first it is. This path builds the systems everything else runs on.",
      nodes: ["Programming Basics", "Git", "Python", "Databases", "APIs & Auth", "Deployment", "Job Ready"],
    },
    full_stack: {
      id: "full_stack",
      title: "Full-Stack Path",
      novaLine: "Full stack — the broadest path. You'll own the whole product, end to end.",
      nodes: ["Programming", "Python", "Git", "Frontend", "Backend", "Database", "Projects", "Deployment", "Interview Prep", "Job Ready"],
    },
    ai_ml: {
      id: "ai_ml",
      title: "AI & ML Path",
      novaLine: "AI it is. This path takes you from fundamentals straight into building with LLMs.",
      nodes: ["Python", "Programming Basics", "DSA", "Machine Learning", "Deep Learning", "LLMs", "AI Projects", "Deployment"],
    },
  };

  let primaryField = "full_stack";
  if (normalized.includes("frontend") || normalized.includes("react") || normalized.includes("web")) {
    primaryField = "frontend";
  } else if (normalized.includes("backend") || normalized.includes("api") || normalized.includes("python") || normalized.includes("node")) {
    primaryField = "backend";
  } else if (normalized.includes("ai") || normalized.includes("machine learning") || normalized.includes("data science") || normalized.includes("ml")) {
    primaryField = "ai_ml";
  }

  return {
    primaryField,
    pathTemplates,
  };
}
