// components/agents/LearningAgent/fieldDatasets.ts
//
// Dynamic Domain Datasets & Field Detector for Learning Agent.
// Supports Tech (Frontend, Backend, AI), Competitive Exams (JEE, NEET, UPSC),
// Entrepreneurship, Content Creation, and Freelancing.

export interface BranchNode {
  id: string;
  label: string;
  x: number; // 0-1000 viewBox coords
  creates: string[];
  needs: string[];
  learningWeeks: number;
  projects: string[];
  rating: number; // 1-5
}

export interface PathTemplateInfo {
  id: string;
  title: string;
  novaLine: string;
  nodes: string[];
}

export interface FieldDatasetResult {
  primaryField: string;
  pathTemplates: Record<string, PathTemplateInfo>;
  branchNodes: BranchNode[];
  defaultTemplateId: string;
  domainName: string;
}

// ── 1. JEE Aspirants (IIT JEE Mains & Advanced) ─────────────────────────
const JEE_BRANCH_NODES: BranchNode[] = [
  { id: "jee_physics", label: "Physics (Mechanics & Waves)", x: 110, creates: ["Physics Concepts", "Kinematics & Dynamics", "Problem Speed"], needs: ["Newton's Laws", "Vectors", "Calculus"], learningWeeks: 10, projects: ["HC Verma Drills", "Irodov Problem Sets"], rating: 5 },
  { id: "jee_chem_org", label: "Organic & Physical Chem", x: 300, creates: ["Reaction Mechanisms", "Equilibrium & Kinetics", "Chemical Formulas"], needs: ["NCERT Chemistry", "Chemical Bonding"], learningWeeks: 10, projects: ["MS Chouhan Reactions", "PYQ Sets"], rating: 5 },
  { id: "jee_chem_inorg", label: "Inorganic Chemistry", x: 490, creates: ["Periodic Trends", "Coordination Compounds", "Direct NCERT Marks"], needs: ["NCERT Line-by-Line", "Block Elements"], learningWeeks: 6, projects: ["Inorganic Memory Sheets", "NCERT Drills"], rating: 4 },
  { id: "jee_maths", label: "Maths (Calculus & Algebra)", x: 680, creates: ["Analytical Calculus", "Coordinate Geometry", "Algebra Speed"], needs: ["Functions", "Trigonometry", "Vectors"], learningWeeks: 10, projects: ["Cengage Maths Sets", "PYQ Drills"], rating: 5 },
  { id: "jee_mocks", label: "NTA PYQs & Full Mocks", x: 870, creates: ["All-India Rank Readiness", "3-Hour Time Control", "Zero Mistakes"], needs: ["Previous 10 Year Papers", "Formula Revision"], learningWeeks: 4, projects: ["Weekly Full NTA Mock Exams"], rating: 5 },
];

const JEE_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  jee_physics: {
    id: "jee_physics",
    title: "Physics High-Score Path",
    novaLine: "Physics-first it is. We'll master Mechanics & Electromagnetism to maximize your JEE score.",
    nodes: ["Basic Math & Vectors", "Mechanics & Laws of Motion", "Waves & Thermodynamics", "Electromagnetism & Optics", "Modern Physics", "NTA PYQ Drills", "JEE Rank Ready"],
  },
  jee_chemistry: {
    id: "jee_chemistry",
    title: "Chemistry Maximum Marks Path",
    novaLine: "Chemistry path selected. Scoring top marks in Organic Reaction Mechanisms & NCERT Inorganic.",
    nodes: ["Atomic Structure & Bonding", "Organic Reaction Mechanisms", "Physical Chemistry Equilibrium", "Inorganic NCERT Mastery", "PYQ Drills", "JEE Rank Ready"],
  },
  jee_maths: {
    id: "jee_maths",
    title: "Maths & Calculus Master Path",
    novaLine: "Maths & Calculus path. Building high-speed problem solving in Calculus & Algebra.",
    nodes: ["Trigonometry & Algebra", "Coordinate Geometry", "Differential Calculus", "Integral Calculus", "Vectors & 3D Geometry", "Timed Mock Tests", "JEE Rank Ready"],
  },
  jee_full: {
    id: "jee_full",
    title: "Comprehensive JEE All-Rounder Path",
    novaLine: "Full JEE All-Rounder path — balancing Physics, Chemistry, and Maths for maximum All-India Rank.",
    nodes: ["Physics Mechanics", "Organic Chemistry", "Calculus & Algebra", "Electromagnetism", "Inorganic NCERT", "NTA PYQs", "Full All-India Mocks", "JEE Qualified"],
  },
};

// ── 2. NEET / Medical Students ──────────────────────────────────────────
const NEET_BRANCH_NODES: BranchNode[] = [
  { id: "neet_biology", label: "Biology (Zoology & Botany)", x: 120, creates: ["Human Physiology", "Genetics & Evolution", "Plant Anatomy"], needs: ["NCERT Bio 11th & 12th"], learningWeeks: 10, projects: ["NCERT Line-by-Line", "Diagram Sheets"], rating: 5 },
  { id: "neet_chemistry", label: "Chemistry for Medical", x: 380, creates: ["Organic Reactions", "Physical Chemistry Numericals"], needs: ["NCERT Chemistry", "Chemical Bonding"], learningWeeks: 8, projects: ["Reaction Flowcharts", "PYQ Sets"], rating: 5 },
  { id: "neet_physics", label: "Physics Numerical Speed", x: 640, creates: ["Formula Speed", "Concept Clarity"], needs: ["Kinematics", "Optics", "Circuits"], learningWeeks: 8, projects: ["Formula Flashcards", "Numerical Speed Drills"], rating: 4 },
  { id: "neet_mocks", label: "700+ Score Mock Practice", x: 880, creates: ["Time Management", "Negative Marking Isolation"], needs: ["180 Question Timed Tests"], learningWeeks: 4, projects: ["Full OMR Mock Series"], rating: 5 },
];

const NEET_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  neet_biology: {
    id: "neet_biology",
    title: "Biology 360/360 Path",
    novaLine: "Biology 360/360 path. Mastering NCERT Zoology & Botany line-by-line.",
    nodes: ["Cell Biology & Genetics", "Plant Physiology", "Human Physiology", "Ecology & Reproduction", "NCERT Diagram Drills", "Full Bio Mocks", "NEET 360 Ready"],
  },
  neet_full: {
    id: "neet_full",
    title: "Complete NEET Medical Path",
    novaLine: "Complete NEET Medical path — balancing 360 Marks Bio with Physics & Chemistry numerical accuracy.",
    nodes: ["NCERT Biology", "Organic Chemistry", "Physics Mechanics & Optics", "Human Physiology", "Physical Chemistry", "Full OMR Mocks", "NEET Top Rank"],
  },
};

// ── 3. UPSC / Civil Services ─────────────────────────────────────────────
const UPSC_BRANCH_NODES: BranchNode[] = [
  { id: "upsc_polity", label: "Polity & Governance", x: 110, creates: ["Constitutional Law", "Governance & Rights"], needs: ["Laxmikanth", "NCERT Polity"], learningWeeks: 6, projects: ["Constitutional Articles Summary"], rating: 5 },
  { id: "upsc_history", label: "History & Modern India", x: 320, creates: ["Freedom Struggle", "Ancient & Medieval Culture"], needs: ["Spectrum", "NCERT History"], learningWeeks: 8, projects: ["Timeline Mindmaps"], rating: 5 },
  { id: "upsc_geo", label: "Geography & Environment", x: 530, creates: ["Physical Geography", "Ecology & Climate"], needs: ["NCERT Geo", "Atlas Mapping"], learningWeeks: 6, projects: ["Map Marking Practice"], rating: 4 },
  { id: "upsc_economy", label: "Indian Economy & Affairs", x: 740, creates: ["Economic Policies", "Budget & Survey"], needs: ["Economic Survey", "Newspapers"], learningWeeks: 6, projects: ["Editorial Analysis"], rating: 5 },
  { id: "upsc_mains", label: "Mains Answer & CSAT", x: 900, creates: ["Answer Structuring", "Aptitude Speed"], needs: ["Daily Answer Writing", "CSAT PYQs"], learningWeeks: 6, projects: ["Mains Test Series"], rating: 5 },
];

const UPSC_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  upsc_gs: {
    id: "upsc_gs",
    title: "General Studies Master Path",
    novaLine: "General Studies Master path. Building deep conceptual mastery across Polity, History, and Economy.",
    nodes: ["Polity & Constitution", "Modern History", "Geography & Environment", "Indian Economy", "Current Affairs", "Prelims PYQs", "UPSC Qualified"],
  },
  upsc_mains: {
    id: "upsc_mains",
    title: "Mains Answer Writing & CSAT Path",
    novaLine: "Mains Answer Writing path. Structuring 250-word analytical answers and essay strategy.",
    nodes: ["GS 1-4 Core", "Daily Answer Practice", "Essay Strategy", "Ethics & Case Studies", "CSAT Speed Practice", "Mains Mock Series", "UPSC Cleared"],
  },
};

// ── 4. Business Owners & Entrepreneurs ──────────────────────────────────
const BIZ_BRANCH_NODES: BranchNode[] = [
  { id: "biz_validation", label: "Idea & Market Research", x: 120, creates: ["Validated Value Proposition", "Customer Personas"], needs: ["Customer Interviews", "Competitor Research"], learningWeeks: 3, projects: ["Customer Survey & Pitch Deck"], rating: 5 },
  { id: "biz_mvp", label: "Product & MVP Launch", x: 380, creates: ["Working Prototype", "Core Service Offer"], needs: ["No-Code / Tech Stack", "Landing Page"], learningWeeks: 4, projects: ["Launch Live MVP"], rating: 5 },
  { id: "biz_marketing", label: "Customer Acquisition", x: 640, creates: ["Paying Customers", "Sales Channel"], needs: ["SEO", "Meta/Google Ads", "Outreach"], learningWeeks: 6, projects: ["First 100 Paying Clients"], rating: 5 },
  { id: "biz_finance", label: "Economics & Scaling Ops", x: 880, creates: ["Profitability", "Team Systems & Ops"], needs: ["P&L Statements", "Hiring Playbooks"], learningWeeks: 4, projects: ["Financial Model & Scale Ops"], rating: 4 },
];

const BIZ_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  biz_startup: {
    id: "biz_startup",
    title: "Zero to One Startup Path",
    novaLine: "Zero to One Startup path. Moving fast from validation to MVP launch and first revenue.",
    nodes: ["Market Research", "Idea Validation", "Build MVP", "Landing Page", "Sales Funnel", "Customer Acquisition", "Revenue Generating"],
  },
  biz_scaling: {
    id: "biz_scaling",
    title: "Business Growth & Scaling Path",
    novaLine: "Business Growth path. Scaling customer acquisition, optimizing unit economics, and team ops.",
    nodes: ["Offer Optimization", "Paid Acquisition", "Sales Funnels", "Financial Planning", "Hiring & Systems", "Scaling Revenue"],
  },
};

// ── 5. Content Creators & Influencers ────────────────────────────────────
const CREATOR_BRANCH_NODES: BranchNode[] = [
  { id: "creator_niche", label: "Niche & Brand Identity", x: 130, creates: ["Unique Creator Positioning", "Audience Avatar"], needs: ["Niche Analysis", "Content Strategy"], learningWeeks: 2, projects: ["Channel Strategy Deck"], rating: 5 },
  { id: "creator_prod", label: "Scripting & Video Editing", x: 400, creates: ["High Retention Content", "Storytelling"], needs: ["CapCut/Premiere", "Storyboarding"], learningWeeks: 4, projects: ["10 Polished Videos"], rating: 5 },
  { id: "creator_growth", label: "Thumbnails, SEO & Reach", x: 670, creates: ["High CTR", "Viral Algorithm Reach"], needs: ["Canva/Photoshop", "YouTube Analytics"], learningWeeks: 3, projects: ["Thumbnail & Hook Pack"], rating: 5 },
  { id: "creator_monetize", label: "Monetization & Sponsorships", x: 890, creates: ["Sponsorship Revenue", "Digital Products"], needs: ["Media Kit", "Brand Pitching"], learningWeeks: 3, projects: ["First Sponsor & Digital Product"], rating: 4 },
];

const CREATOR_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  creator_youtube: {
    id: "creator_youtube",
    title: "YouTube & Social Growth Path",
    novaLine: "YouTube Growth path. Mastering high-retention storytelling, thumbnails, and monetization.",
    nodes: ["Niche Definition", "Scripting & Hook Writing", "Video Editing", "Thumbnails & SEO", "Upload Routine", "Monetization Launch"],
  },
};

// ── 6. Freelancers ───────────────────────────────────────────────────────
const FREELANCE_BRANCH_NODES: BranchNode[] = [
  { id: "freelance_skill", label: "High-Income Skill Polish", x: 150, creates: ["Marketable Service", "High Work Quality"], needs: ["Dev/Design/Writing/Marketing Skill"], learningWeeks: 6, projects: ["3 Portfolio Case Studies"], rating: 5 },
  { id: "freelance_profile", label: "Upwork & Profile Optimization", x: 450, creates: ["Client Magnet Profile", "Trust Signals"], needs: ["Bio, Portfolio, Testimonials"], learningWeeks: 2, projects: ["Complete Upwork Profile"], rating: 5 },
  { id: "freelance_outreach", label: "Outreach & Proposals", x: 780, creates: ["Consistent Client Inquiries", "Retainer Contracts"], needs: ["Proposal Templates", "Loom Demos"], learningWeeks: 4, projects: ["Send 50 Client Proposals"], rating: 5 },
];

const FREELANCE_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
  freelance_client: {
    id: "freelance_client",
    title: "Client Acquisition Fast-Track",
    novaLine: "Client Acquisition path. Building portfolio case studies and landing high-paying clients fast.",
    nodes: ["Skill Refinement", "Portfolio Case Studies", "Upwork & Profile Setup", "Proposal Writing", "Client Outreach", "First Paid Contract"],
  },
};

// ── 7. Tech & Developers (Default Tech) ──────────────────────────────────
const TECH_BRANCH_NODES: BranchNode[] = [
  { id: "frontend", label: "Frontend", x: 90, creates: ["Websites", "Dashboards", "Landing Pages", "Admin Panels"], needs: ["HTML", "CSS", "JavaScript", "React", "Next.js"], learningWeeks: 8, projects: ["Netflix Clone", "Spotify UI", "GrowthOS UI"], rating: 5 },
  { id: "backend", label: "Backend", x: 233, creates: ["Servers", "APIs", "Authentication", "Database Logic"], needs: ["Python", "Node.js", "SQL", "REST APIs"], learningWeeks: 9, projects: ["Instagram Backend", "GrowthOS Backend", "Payment System"], rating: 5 },
  { id: "database", label: "Database", x: 376, creates: ["Data Models", "Query Layers", "Schemas"], needs: ["SQL", "PostgreSQL", "Indexing", "Normalization"], learningWeeks: 4, projects: ["Inventory System", "Analytics Warehouse"], rating: 4 },
  { id: "git", label: "Git & Version Control", x: 519, creates: ["Change History", "Branch Workflows", "Team Collaboration"], needs: ["Git CLI", "GitHub", "Pull Requests"], learningWeeks: 1, projects: ["Open Source Contribution"], rating: 5 },
  { id: "dsa", label: "DSA", x: 662, creates: ["Problem-Solving Skill", "Interview Readiness"], needs: ["Arrays", "Trees", "Graphs", "Big-O"], learningWeeks: 10, projects: ["LeetCode 150", "Mock Interviews"], rating: 5 },
  { id: "cloud", label: "Cloud & DevOps", x: 805, creates: ["Deployments", "CI/CD Pipelines", "Scalable Infra"], needs: ["AWS/GCP", "Docker", "CI/CD"], learningWeeks: 6, projects: ["Deploy GrowthOS", "Dockerized Microservice"], rating: 4 },
  { id: "ai_ml", label: "AI & Machine Learning", x: 910, creates: ["Predictive Models", "LLM Apps", "Automation"], needs: ["Python", "NumPy", "PyTorch", "LLM APIs"], learningWeeks: 12, projects: ["Recommendation Engine", "AI Chat App"], rating: 5 },
];

const TECH_PATH_TEMPLATES: Record<string, PathTemplateInfo> = {
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

// ── Domain Detector ──────────────────────────────────────────────────────
export function detectField(goal?: string): FieldDatasetResult {
  const norm = (goal || "").toLowerCase();

  // JEE / IIT / Engineering Entrance
  if (norm.includes("jee") || norm.includes("iit") || norm.includes("engineering entrance") || norm.includes("crack_exam")) {
    let primaryField = "jee_full";
    if (norm.includes("physics")) primaryField = "jee_physics";
    else if (norm.includes("chem")) primaryField = "jee_chemistry";
    else if (norm.includes("math")) primaryField = "jee_maths";

    return {
      primaryField,
      pathTemplates: JEE_PATH_TEMPLATES,
      branchNodes: JEE_BRANCH_NODES,
      defaultTemplateId: primaryField,
      domainName: "JEE Preparation",
    };
  }

  // NEET / Medical / Doctors
  if (norm.includes("neet") || norm.includes("doctor") || norm.includes("medical") || norm.includes("mbbs") || norm.includes("biology")) {
    return {
      primaryField: "neet_full",
      pathTemplates: NEET_PATH_TEMPLATES,
      branchNodes: NEET_BRANCH_NODES,
      defaultTemplateId: "neet_full",
      domainName: "Medical / NEET",
    };
  }

  // UPSC / Government Exams
  if (norm.includes("upsc") || norm.includes("ias") || norm.includes("civil services") || norm.includes("government exam") || norm.includes("ssc")) {
    return {
      primaryField: "upsc_gs",
      pathTemplates: UPSC_PATH_TEMPLATES,
      branchNodes: UPSC_BRANCH_NODES,
      defaultTemplateId: "upsc_gs",
      domainName: "UPSC / Civil Services",
    };
  }

  // Business / Startup / Entrepreneur
  if (norm.includes("business") || norm.includes("startup") || norm.includes("entrepreneur") || norm.includes("build_business") || norm.includes("earn_online")) {
    return {
      primaryField: "biz_startup",
      pathTemplates: BIZ_PATH_TEMPLATES,
      branchNodes: BIZ_BRANCH_NODES,
      defaultTemplateId: "biz_startup",
      domainName: "Business & Startup",
    };
  }

  // Content Creator / YouTube
  if (norm.includes("creator") || norm.includes("youtube") || norm.includes("instagram") || norm.includes("audience") || norm.includes("grow_audience")) {
    return {
      primaryField: "creator_youtube",
      pathTemplates: CREATOR_PATH_TEMPLATES,
      branchNodes: CREATOR_BRANCH_NODES,
      defaultTemplateId: "creator_youtube",
      domainName: "Content Creation",
    };
  }

  // Freelancing
  if (norm.includes("freelance") || norm.includes("upwork") || norm.includes("fiverr") || norm.includes("client")) {
    return {
      primaryField: "freelance_client",
      pathTemplates: FREELANCE_PATH_TEMPLATES,
      branchNodes: FREELANCE_BRANCH_NODES,
      defaultTemplateId: "freelance_client",
      domainName: "Freelancing",
    };
  }

  // Default Tech / Software Developer
  let primaryField = "full_stack";
  if (norm.includes("frontend") || norm.includes("react") || norm.includes("web")) {
    primaryField = "frontend";
  } else if (norm.includes("backend") || norm.includes("api") || norm.includes("python") || norm.includes("node")) {
    primaryField = "backend";
  } else if (norm.includes("ai") || norm.includes("machine learning") || norm.includes("data science") || norm.includes("ml")) {
    primaryField = "ai_ml";
  }

  return {
    primaryField,
    pathTemplates: TECH_PATH_TEMPLATES,
    branchNodes: TECH_BRANCH_NODES,
    defaultTemplateId: primaryField,
    domainName: "Software Engineering",
  };
}
