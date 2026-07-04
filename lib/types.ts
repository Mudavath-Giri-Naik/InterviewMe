export type Role = "interviewer" | "candidate";

export interface ChatTurn {
  role: Role;
  text: string;
}

export interface Persona {
  name: string;
  title: string;
}

export interface Track {
  name: string;
  persona: Persona;
  arc: string;
  turnBudget: number;
}

export type TrackId =
  | "sde"
  | "ai_engineer"
  | "ml_engineer"
  | "data_engineer"
  | "cisco_ideathon";

export interface InterviewPrefs {
  company?: string;
  seniority?: string;
  weakAreas?: string;
}

export interface ReportQuestion {
  question: string;
  verdict: "strong" | "okay" | "weak";
  improvement: string;
}

export interface Report {
  summary: string;
  readiness: number; // 0-10, directional not a verdict
  questions: ReportQuestion[];
  patterns: string[];
}

export interface StoredSession {
  id: string;
  track: TrackId;
  startedAt: string;
  endedAt?: string;
  resumeSnapshot?: string;
  prefs?: InterviewPrefs;
  transcript: ChatTurn[];
  report?: Report;
}
