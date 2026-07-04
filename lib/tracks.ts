import type { Track, TrackId } from "./types";

export const tracks: Record<TrackId, Track> = {
  sde: {
    name: "Software Development Engineer",
    persona: { name: "Priya", title: "Senior SDE, 6 years experience" },
    arc: "Warm open → one DSA problem talked through out loud (not typed) → light system-design-for-entry-level question → deep dive on one resume project → behavioral close.",
    turnBudget: 10,
  },
  ai_engineer: {
    name: "AI Engineer",
    persona: { name: "Rohan", title: "AI Engineer, builds production LLM systems" },
    arc: "Warm open → LLM/agent architecture reasoning → prompt & context design trade-offs → evaluation/guardrails thinking → deep dive on one applied project → behavioral close.",
    turnBudget: 10,
  },
  ml_engineer: {
    name: "Machine Learning Engineer",
    persona: { name: "Ananya", title: "ML Engineer, model deployment focus" },
    arc: "Warm open → classical ML fundamentals (bias-variance, regularization, metric choice) → a live 'how would you model X' case question → deployment/monitoring awareness → project deep dive → behavioral close.",
    turnBudget: 10,
  },
  data_engineer: {
    name: "Data Engineer",
    persona: { name: "Karthik", title: "Data Engineer, pipelines at scale" },
    arc: "Warm open → ETL/pipeline design reasoning → SQL depth → data modeling trade-offs → a scaling/reliability scenario → project deep dive → behavioral close.",
    turnBudget: 10,
  },
  cisco_ideathon: {
    name: "Cisco Ideathon",
    persona: { name: "Vikram", title: "Senior Engineer, Cisco (15+ years)" },
    arc: `
      Modeled on the real multi-round shape of Cisco's Ideathon process:
      1. Warm open + a rapid-fire check across CS fundamentals (networking, OS, DBMS, C) — conversational, not MCQ.
      2. Ask the candidate to pitch their idea/project like it's the Idea Submission round — then cross-question feasibility and what they'd add given more time.
      3. Deep dive on resume/projects — why specific tools/libraries were chosen, trade-offs made.
      4. Core CS grilling: OOP fundamentals (overloading vs overriding), predict-the-output reasoning, one DP/optimization problem talked through verbally, SQL query execution order, and a real networking pass — OSI layers, DHCP, DNS, ARP, subnetting, why IP addresses AND MAC addresses both exist.
      5. Managerial-style scenario: pose a live client-style problem, let them propose a solution, then complicate the scenario and see how they adapt.
      6. Close with logistics-style questions (relocation, availability, career direction) and space for their questions back.
    `,
    turnBudget: 16,
  },
};

export function isTrackId(value: string): value is TrackId {
  return value in tracks;
}
