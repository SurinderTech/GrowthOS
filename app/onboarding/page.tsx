"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2
} from "lucide-react";

import { getToken } from "@/lib/api";
import {
  saveStep1, saveStep2, saveStep3, saveStep4,
  saveStep5Student, saveStep5Freelancer, saveStep5Business,
  saveStep5Creator, saveStep5Exam,
  saveStep6, saveStep7, skipOnboarding, getOnboardingStatus
} from "@/lib/onboarding-api";


/* ---------------- TYPES ---------------- */

type OnboardingState = {
  user_type: string

  full_name: string
  age_group: string
  country: string
  primary_goal: string

  daily_time: string
  interests: string[]

  education_level: string
  field_of_study: string
  career_goal: string

  primary_skill: string
  experience_level: string
  monthly_income_goal: string
  services_offered: string[]

  business_type: string
  team_size: string
  revenue_stage: string
  business_goal: string

  creator_platform: string
  content_niche: string
  audience_size: string
  creator_growth_goal: string

  exam_type: string
  attempt_year: string
  study_hours_daily: string
  weak_subjects: string[]

  productivity_style: string
  twelve_month_goal: string
}


const INITIAL: OnboardingState = {
  user_type: "",

  full_name: "",
  age_group: "",
  country: "",
  primary_goal: "",

  daily_time: "",
  interests: [],

  education_level: "",
  field_of_study: "",
  career_goal: "",

  primary_skill: "",
  experience_level: "",
  monthly_income_goal: "",
  services_offered: [],

  business_type: "",
  team_size: "",
  revenue_stage: "",
  business_goal: "",

  creator_platform: "",
  content_niche: "",
  audience_size: "",
  creator_growth_goal: "",

  exam_type: "",
  attempt_year: "",
  study_hours_daily: "",
  weak_subjects: [],

  productivity_style: "",
  twelve_month_goal: ""
}


/* ---------------- COMPONENT ---------------- */

export default function OnboardingPage() {

  const router = useRouter()

  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingState>(INITIAL)
  const [loading, setLoading] = useState(false)

  const TOTAL_STEPS = 7


  useEffect(() => {

    const token = getToken()

    if (!token) {
      router.replace("/login")
      return
    }

    getOnboardingStatus()
      .then((s) => {

        if (s.onboarding_completed) {
          router.replace("/dashboard")
        }

        if (s.current_step > 1) {
          setStep(s.current_step)
        }

      })
      .catch(() => { })

  }, [])


  const set = (k: keyof OnboardingState, v: any) =>
    setData(p => ({ ...p, [k]: v }))


  const toggleMulti = (
    k: "interests" | "services_offered" | "weak_subjects",
    v: string
  ) => {

    setData(p => {

      const arr = (p[k] || []) as string[]

      return {
        ...p,
        [k]: arr.includes(v)
          ? arr.filter(x => x !== v)
          : [...arr, v]
      }

    })

  }



  const handleNext = async () => {

    setLoading(true)

    try {

      if (step === 1) {

        if (!data.user_type) {
          toast.error("Please select who you are")
          setLoading(false)
          return
        }

        await saveStep1(data.user_type)

      }


      else if (step === 2) {

        await saveStep2({
          full_name: data.full_name,
          age_group: data.age_group,
          country: data.country,
          primary_goal: data.primary_goal
        })

      }


      else if (step === 3) {

        if (!data.daily_time) {
          toast.error("Please select your daily time")
          setLoading(false)
          return
        }

        await saveStep3(data.daily_time)

      }


      else if (step === 4) {

        if (!data.interests.length) {
          toast.error("Pick at least one interest")
          setLoading(false)
          return
        }

        await saveStep4(data.interests)

      }


      else if (step === 5) {

        if (data.user_type === "student") {

          await saveStep5Student({
            education_level: data.education_level,
            field_of_study: data.field_of_study,
            career_goal: data.career_goal
          })

        }

        else if (data.user_type === "freelancer") {

          await saveStep5Freelancer({
            primary_skill: data.primary_skill,
            experience_level: data.experience_level,
            monthly_income_goal: data.monthly_income_goal,
            services_offered: data.services_offered
          })

        }

        else if (data.user_type === "entrepreneur") {

          await saveStep5Business({
            business_type: data.business_type,
            team_size: data.team_size,
            revenue_stage: data.revenue_stage,
            business_goal: data.business_goal
          })

        }

        else if (data.user_type === "creator") {

          await saveStep5Creator({
            creator_platform: data.creator_platform,
            content_niche: data.content_niche,
            audience_size: data.audience_size,
            creator_growth_goal: data.creator_growth_goal
          })

        }

        else if (data.user_type === "exam_aspirant") {

          await saveStep5Exam({
            exam_type: data.exam_type,
            attempt_year: data.attempt_year,
            study_hours_daily: data.study_hours_daily,
            weak_subjects: data.weak_subjects
          })

        }

        else {

          setStep(6)
          return

        }

      }


      else if (step === 6) {

        if (!data.productivity_style) {
          toast.error("Please select your work style")
          setLoading(false)
          return
        }

        await saveStep6(data.productivity_style)

      }


      else if (step === 7) {

        if (!data.twelve_month_goal) {
          toast.error("Please select your 12-month goal")
          setLoading(false)
          return
        }

        await saveStep7(data.twelve_month_goal)

        toast.success("Welcome to GrowthOS 🚀")

        router.push("/dashboard")

        return

      }


      setStep(s => s + 1)

    }

    catch (e: any) {

      toast.error(e.message || "Something went wrong")

    }

    finally {

      setLoading(false)

    }

  }



  const handleSkip = async () => {

    await skipOnboarding().catch(() => { })

    router.push("/dashboard")

  }


  return (
  <div style={s.root}>
   <div style={s.bg} />
    <div style={s.grid} />

    <div style={s.card}>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.logoRow}>
          <Image
            src="/images/GrowthOs.png"
            alt="GrowthOS"
            width={36}
            height={36}
            style={{ borderRadius: "50%" }}
          />
          <span style={s.logoText}>GrowthOS</span>
        </div>

        <button onClick={handleSkip} style={s.skipBtn}>
          Skip for now
        </button>
      </div>


      {/* PROGRESS */}
      <div style={s.progressWrap}>
        <div style={s.progressBg}>
          <div
            style={{
              ...s.progressFill,
              width: `${(step / TOTAL_STEPS) * 100}%`
            }}
          />
        </div>
        <span style={s.progressText}>
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>


      {/* DOTS */}
      <div style={s.dots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              ...s.dot,
              ...(i + 1 < step ? s.dotDone : {}),
              ...(i + 1 === step ? s.dotActive : {})
            }}
          >
            {i + 1 < step ? <Check size={10} /> : i + 1}
          </div>
        ))}
      </div>


      {/* CONTENT */}
      <div style={s.content}>
        {step === 1 && <Step1 data={data} set={set} />}
        {step === 2 && <Step2 data={data} set={set} />}
        {step === 3 && <Step3 data={data} set={set} />}
        {step === 4 && <Step4 data={data} toggle={toggleMulti} />}
        {step === 5 && <Step5 data={data} set={set} toggle={toggleMulti} />}
        {step === 6 && <Step6 data={data} set={set} />}
        {step === 7 && <Step7 data={data} set={set} />}
      </div>


      {/* FOOTER */}
      <div style={s.footer}>

        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={s.backBtn}
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleNext}
          style={s.nextBtn}
          disabled={loading}
        >
          {loading && <Loader2 size={16} />}

          {step === 7
            ? "Finish Setup 🚀"
            : "Continue"}

          {!loading && step < 7 && (
            <ChevronRight size={16} />
          )}
        </button>

      </div>

    </div>
  </div>
)
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Step1({ data, set }: any) {
  const options = [
    { value: "student", emoji: "🎓", label: "Student" },
    { value: "freelancer", emoji: "💻", label: "Freelancer" },
    { value: "entrepreneur", emoji: "🚀", label: "Entrepreneur / Business Owner" },
    { value: "creator", emoji: "🎨", label: "Creator" },
    { value: "exam_aspirant", emoji: "📚", label: "Competitive Exam Aspirant" },
    { value: "self_growth", emoji: "🌱", label: "Just exploring / Self-growth" },
  ];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>What best describes you?</h2>
      <p style={s.stepSub}>This helps us personalise your GrowthOS experience</p>
      <div style={s.grid2}>
        {options.map(o => (
          <button key={o.value} onClick={() => set("user_type", o.value)}
            style={{ ...s.optCard, ...(data.user_type === o.value ? s.optCardActive : {}) }}>
            <span style={s.optEmoji}>{o.emoji}</span>
            <span style={s.optLabel}>{o.label}</span>
            {data.user_type === o.value && <div style={s.checkBadge}><Check size={10} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({ data, set }: any) {
  const goals = [
    { value: "improve_discipline", label: "Improve Discipline" },
    { value: "learn_skills", label: "Learn New Skills" },
    { value: "build_projects", label: "Build Projects" },
    { value: "grow_career", label: "Grow Career" },
    { value: "prepare_exams", label: "Prepare for Exams" },
    { value: "build_business", label: "Build Business" },
    { value: "financial_independence", label: "Financial Independence" },
  ];
  const ages = ["13-17", "18-24", "25-34", "35-44", "45+"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about yourself</h2>
      <p style={s.stepSub}>Basic info to personalise your dashboard</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Full Name (optional)</label>
          <input style={s.input} placeholder="Your name" value={data.full_name}
            onChange={e => set("full_name", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Age Group</label>
          <div style={s.chipRow}>
            {ages.map(a => (
              <button key={a} onClick={() => set("age_group", a)}
                style={{ ...s.chip, ...(data.age_group === a ? s.chipActive : {}) }}>{a}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Country / Region</label>
          <input style={s.input} placeholder="e.g. India, USA, UK" value={data.country}
            onChange={e => set("country", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Primary Goal on GrowthOS</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {goals.map(g => (
              <button key={g.value} onClick={() => set("primary_goal", g.value)}
                style={{ ...s.chip, ...(data.primary_goal === g.value ? s.chipActive : {}) }}>{g.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, set }: any) {
  const options = [
    { value: "30min", label: "30 Minutes", sub: "Quick daily wins" },
    { value: "1hour", label: "1 Hour", sub: "Steady progress" },
    { value: "2-3hours", label: "2–3 Hours", sub: "Serious growth" },
    { value: "4+hours", label: "4+ Hours", sub: "All-in mode" },
  ];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>How much time can you dedicate daily?</h2>
      <p style={s.stepSub}>We'll build your routines around this</p>
      <div style={s.grid2}>
        {options.map(o => (
          <button key={o.value} onClick={() => set("daily_time", o.value)}
            style={{ ...s.optCard, ...(data.daily_time === o.value ? s.optCardActive : {}) }}>
            <span style={{ fontSize: "1.6rem", marginBottom: "6px" }}>⏱</span>
            <span style={s.optLabel}>{o.label}</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>{o.sub}</span>
            {data.daily_time === o.value && <div style={s.checkBadge}><Check size={10} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step4({ data, toggle }: any) {
  const interests = [
    { value: "programming", emoji: "💻", label: "Programming" },
    { value: "ai_tech", emoji: "🤖", label: "AI / Tech" },
    { value: "business", emoji: "📈", label: "Business" },
    { value: "marketing", emoji: "📣", label: "Marketing" },
    { value: "design", emoji: "🎨", label: "Design" },
    { value: "personal_growth", emoji: "🌱", label: "Personal Growth" },
    { value: "Health Care", emoji: "👩‍⚕️", label: "Health Care" },
    { value: "finance", emoji: "💰", label: "Finance" },
    { value: "content_creation", emoji: "🎬", label: "Content Creation" },
    { value: "competitive_exams", emoji: "📚", label: "Competitive Exams" },
  ];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>What are you interested in?</h2>
      <p style={s.stepSub}>Select all that apply — powers your recommendations</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {interests.map(i => (
          <button key={i.value} onClick={() => toggle("interests", i.value)}
            style={{ ...s.interestCard, ...(data.interests.includes(i.value) ? s.interestCardActive : {}) }}>
            <span style={{ fontSize: "1.3rem" }}>{i.emoji}</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{i.label}</span>
            {data.interests.includes(i.value) && <div style={s.checkBadge}><Check size={10} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step5({ data, set, toggle }: any) {
  if (data.user_type === "student") return <Step5Student data={data} set={set} />;
  if (data.user_type === "freelancer") return <Step5Freelancer data={data} set={set} toggle={toggle} />;
  if (data.user_type === "entrepreneur") return <Step5Business data={data} set={set} />;
  if (data.user_type === "creator") return <Step5Creator data={data} set={set} />;
  if (data.user_type === "exam_aspirant") return <Step5Exam data={data} set={set} toggle={toggle} />;
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>You're all set for this step!</h2>
      <p style={s.stepSub}>Click Continue to proceed</p>
    </div>
  );
}

function Step5Student({ data, set }: any) {
  const levels = ["School", "College / University", "Post Graduate"];
  const goals = ["Software Engineer", "Doctor", "Entrepreneur", "Researcher", "Not sure yet", "Other"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about your studies 🎓</h2>
      <p style={s.stepSub}>Help us tailor your learning path</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Current Level</label>
          <div style={s.chipRow}>
            {levels.map(l => (
              <button key={l} onClick={() => set("education_level", l)}
                style={{ ...s.chip, ...(data.education_level === l ? s.chipActive : {}) }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Field of Study</label>
          <input style={s.input} placeholder="e.g. Computer Science, Medicine" value={data.field_of_study}
            onChange={e => set("field_of_study", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Career Goal</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {goals.map(g => (
              <button key={g} onClick={() => set("career_goal", g)}
                style={{ ...s.chip, ...(data.career_goal === g ? s.chipActive : {}) }}>{g}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5Freelancer({ data, set, toggle }: any) {
  const services = ["Web Development", "Design", "Video Editing", "AI Automation", "Marketing", "Writing", "Other"];
  const levels = ["Beginner", "Intermediate", "Expert"];
  const income = ["< $500/mo", "$500–$2k/mo", "$2k–$5k/mo", "$5k+/mo"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about your freelance work 💻</h2>
      <p style={s.stepSub}>We'll help you grow your freelance income</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Primary Skill</label>
          <input style={s.input} placeholder="e.g. React, UI Design, Copywriting" value={data.primary_skill}
            onChange={e => set("primary_skill", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Experience Level</label>
          <div style={s.chipRow}>
            {levels.map(l => (
              <button key={l} onClick={() => set("experience_level", l.toLowerCase())}
                style={{ ...s.chip, ...(data.experience_level === l.toLowerCase() ? s.chipActive : {}) }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Monthly Income Goal</label>
          <div style={s.chipRow}>
            {income.map(i => (
              <button key={i} onClick={() => set("monthly_income_goal", i)}
                style={{ ...s.chip, ...(data.monthly_income_goal === i ? s.chipActive : {}) }}>{i}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Services Offered (multi-select)</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {services.map(sv => (
              <button key={sv} onClick={() => toggle("services_offered", sv)}
                style={{ ...s.chip, ...(data.services_offered.includes(sv) ? s.chipActive : {}) }}>{sv}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5Business({ data, set }: any) {
  const goals = ["More Customers", "Better Systems", "Automation", "Marketing Growth", "Product Launch"];
  const sizes = ["Solo", "2–5", "6–20", "20+"];
  const stages = ["Pre-revenue", "Early Revenue", "Growing", "Scaling"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about your business 🚀</h2>
      <p style={s.stepSub}>We'll help you scale smarter</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Business Type</label>
          <input style={s.input} placeholder="e.g. SaaS, Agency, E-commerce" value={data.business_type}
            onChange={e => set("business_type", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Team Size</label>
          <div style={s.chipRow}>
            {sizes.map(sz => (
              <button key={sz} onClick={() => set("team_size", sz)}
                style={{ ...s.chip, ...(data.team_size === sz ? s.chipActive : {}) }}>{sz}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Revenue Stage</label>
          <div style={s.chipRow}>
            {stages.map(st => (
              <button key={st} onClick={() => set("revenue_stage", st.toLowerCase().replace(" ", "_"))}
                style={{ ...s.chip, ...(data.revenue_stage === st.toLowerCase().replace(" ", "_") ? s.chipActive : {}) }}>{st}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Main Goal Right Now</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {goals.map(g => (
              <button key={g} onClick={() => set("business_goal", g)}
                style={{ ...s.chip, ...(data.business_goal === g ? s.chipActive : {}) }}>{g}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5Creator({ data, set }: any) {
  const platforms = ["YouTube", "Instagram", "Twitter/X", "LinkedIn", "Multiple Platforms"];
  const sizes = ["0–1K", "1K–10K", "10K–100K", "100K+"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about your content 🎨</h2>
      <p style={s.stepSub}>We'll help you grow your audience faster</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Primary Platform</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {platforms.map(p => (
              <button key={p} onClick={() => set("creator_platform", p.toLowerCase())}
                style={{ ...s.chip, ...(data.creator_platform === p.toLowerCase() ? s.chipActive : {}) }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Content Niche</label>
          <input style={s.input} placeholder="e.g. Tech, Finance, Fitness" value={data.content_niche}
            onChange={e => set("content_niche", e.target.value)} />
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Current Audience Size</label>
          <div style={s.chipRow}>
            {sizes.map(sz => (
              <button key={sz} onClick={() => set("audience_size", sz)}
                style={{ ...s.chip, ...(data.audience_size === sz ? s.chipActive : {}) }}>{sz}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Growth Goal</label>
          <input style={s.input} placeholder="e.g. Reach 100K, Monetise" value={data.creator_growth_goal}
            onChange={e => set("creator_growth_goal", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function Step5Exam({ data, set, toggle }: any) {
  const exams = ["JEE", "NEET", "UPSC", "CAT", "GATE", "Other"];
  const years = ["2025", "2026", "2027", "2028+"];
  const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "History", "Polity", "Economics", "English"];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Tell us about your exam prep 📚</h2>
      <p style={s.stepSub}>We'll build the perfect study plan for you</p>
      <div style={s.formGrid}>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Which Exam?</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {exams.map(e => (
              <button key={e} onClick={() => set("exam_type", e.toLowerCase())}
                style={{ ...s.chip, ...(data.exam_type === e.toLowerCase() ? s.chipActive : {}) }}>{e}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Attempt Year</label>
          <div style={s.chipRow}>
            {years.map(y => (
              <button key={y} onClick={() => set("attempt_year", y)}
                style={{ ...s.chip, ...(data.attempt_year === y ? s.chipActive : {}) }}>{y}</button>
            ))}
          </div>
        </div>
        <div style={s.fieldWrap}>
          <label style={s.lbl}>Weak Subjects (multi-select)</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
            {subjects.map(sub => (
              <button key={sub} onClick={() => toggle("weak_subjects", sub)}
                style={{ ...s.chip, ...(data.weak_subjects.includes(sub) ? s.chipActive : {}) }}>{sub}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step6({ data, set }: any) {
  const options = [
    { value: "deep_focus", emoji: "🎯", label: "Deep Focused Sessions", sub: "Long uninterrupted blocks" },
    { value: "short_bursts", emoji: "⚡", label: "Short Productivity Bursts", sub: "Pomodoro-style sprints" },
    { value: "structured", emoji: "📅", label: "Structured Schedules", sub: "Fixed time slots daily" },
    { value: "flexible", emoji: "🌊", label: "Flexible Learning", sub: "Flow-based, no rigid time" },
  ];
  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>How do you prefer to work?</h2>
      <p style={s.stepSub}>This helps GrowthOS create your ideal daily routine</p>
      <div style={s.grid2}>
        {options.map(o => (
          <button key={o.value} onClick={() => set("productivity_style", o.value)}
            style={{ ...s.optCard, ...(data.productivity_style === o.value ? s.optCardActive : {}) }}>
            <span style={s.optEmoji}>{o.emoji}</span>
            <span style={s.optLabel}>{o.label}</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>{o.sub}</span>
            {data.productivity_style === o.value && <div style={s.checkBadge}><Check size={10} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step7({ data, set }: any) {
  const options = [
    { value: "get_job", emoji: "💼", label: "Get a Job" },
    { value: "crack_exam", emoji: "🏆", label: "Crack an Exam" },
    { value: "earn_online", emoji: "💰", label: "Earn Online" },
    { value: "build_startup", emoji: "🚀", label: "Build a Startup" },
    { value: "grow_audience", emoji: "📱", label: "Grow My Audience" },
    { value: "become_disciplined", emoji: "🧘", label: "Become Disciplined" },
  ];
  return (
    <div style={s.stepWrap}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>✨</div>
        <h2 style={s.stepTitle}>Where do you want to be in 12 months?</h2>
        <p style={s.stepSub}>Your north star — GrowthOS will help you get there</p>
      </div>
      <div style={s.grid2}>
        {options.map(o => (
          <button key={o.value} onClick={() => set("twelve_month_goal", o.value)}
            style={{ ...s.optCard, ...(data.twelve_month_goal === o.value ? s.optCardActive : {}) }}>
            <span style={s.optEmoji}>{o.emoji}</span>
            <span style={s.optLabel}>{o.label}</span>
            {data.twelve_month_goal === o.value && <div style={s.checkBadge}><Check size={10} /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  bg: { position: "fixed", inset: 0, background: "linear-gradient(135deg,#0d1f3c 0%,#0a1628 60%,#0d2547 100%)", zIndex: 0 },
  grid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(33,150,243,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(33,150,243,.04) 1px,transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 },
  card: { position: "relative", zIndex: 2, background: "rgba(255,255,255,0.97)", borderRadius: "24px", width: "100%", maxWidth: "580px", boxShadow: "0 25px 80px rgba(0,0,0,0.4)", overflow: "hidden", animation: "fadeIn .4s ease" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px 0" },
  logoRow: { display: "flex", alignItems: "center", gap: "10px" },
  logoText: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0d1f3c" },
  skipBtn: { fontSize: "0.8rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: "8px" },
  progressWrap: { padding: "16px 28px 4px", display: "flex", alignItems: "center", gap: "12px" },
  progressBg: { flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#1565c0,#1e88e5)", borderRadius: "3px", transition: "width .4s ease" },
  progressText: { fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" as const },
  dots: { display: "flex", justifyContent: "center", gap: "8px", padding: "8px 28px 0" },
  dot: { width: "24px", height: "24px", borderRadius: "50%", background: "#e2e8f0", color: "#94a3b8", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" },
  dotActive: { background: "linear-gradient(135deg,#1565c0,#1e88e5)", color: "white", boxShadow: "0 2px 12px rgba(21,101,192,0.4)" },
  dotDone: { background: "#22c55e", color: "white" },
  content: { padding: "24px 28px", minHeight: "360px" },
  footer: { display: "flex", alignItems: "center", padding: "16px 28px 24px", borderTop: "1px solid #f1f5f9", gap: "12px" },
  backBtn: { display: "flex", alignItems: "center", gap: "4px", padding: "10px 18px", background: "#f1f5f9", border: "none", borderRadius: "10px", fontSize: "0.88rem", fontWeight: 600, color: "#64748b", cursor: "pointer" },
  nextBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "12px 24px", background: "linear-gradient(135deg,#1565c0,#1e88e5)", border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 15px rgba(21,101,192,0.35)", fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.03em" },
  stepWrap: { animation: "fadeIn .35s ease" },
  stepTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.55rem", fontWeight: 700, color: "#0d1f3c", marginBottom: "6px" },
  stepSub: { fontSize: "0.88rem", color: "#64748b", marginBottom: "20px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" },
  optCard: { position: "relative", display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "16px 12px", background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "14px", cursor: "pointer", transition: "all .2s", textAlign: "center" as const },
  optCardActive: { border: "2px solid #1565c0", background: "rgba(21,101,192,0.06)", boxShadow: "0 0 0 3px rgba(21,101,192,0.12)" },
  optEmoji: { fontSize: "1.8rem", marginBottom: "8px" },
  optLabel: { fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" },
  checkBadge: { position: "absolute", top: "8px", right: "8px", width: "18px", height: "18px", borderRadius: "50%", background: "#1565c0", color: "white", display: "flex", alignItems: "center", justifyContent: "center" },
  formGrid: { display: "flex", flexDirection: "column" as const, gap: "16px" },
  fieldWrap: { display: "flex", flexDirection: "column" as const, gap: "6px" },
  lbl: { fontSize: "0.72rem", fontWeight: 700, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" as const },
  input: { padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "0.88rem", color: "#1e293b", fontFamily: "inherit", outline: "none", background: "white" },
  chipRow: { display: "flex", flexWrap: "wrap" as const, gap: "8px" },
  chip: { padding: "6px 14px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", cursor: "pointer", transition: "all .2s" },
  chipActive: { background: "rgba(21,101,192,0.1)", border: "1.5px solid #1565c0", color: "#1565c0" },
  interestCard: { position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "12px", cursor: "pointer", transition: "all .2s", textAlign: "left" as const, color: "#1e293b" },
  interestCardActive: { border: "2px solid #1565c0", background: "rgba(21,101,192,0.06)" },
};