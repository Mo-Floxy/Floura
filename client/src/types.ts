export interface User {
  id: number;
  email: string;
  name: string;
  dateOfBirth: string | null;
  emailVerified: boolean;
  consentHealthData: boolean;
  createdAt: string;
}

export interface Settings {
  cycleLength: number;
  periodDuration: number;
  useManualCycleLength: boolean;
  theme: 'light' | 'dark' | 'system';
  waterGoal: number;
  reminderPeriod: boolean;
  reminderOvulation: boolean;
  reminderFertile: boolean;
  reminderMedication: boolean;
  reminderWater: boolean;
  reminderLog: boolean;
  reminderTime: string;
  reminderDaysBefore: number;
  medicationName: string;
  sensitiveNotifications: boolean;
  browserNotifications: boolean;
  profileVisible: boolean;
  researchOptIn: boolean;
}

export interface CycleStats {
  cycleCount: number;
  periodCount: number;
  cycleLengths: number[];
  durations: number[];
  avgCycleLength: number;
  avgPeriodDuration: number;
  shortestCycle: number | null;
  longestCycle: number | null;
  regularity: string;
  regularityScore: number | null;
  deviation: number;
  lastPeriodStart: string | null;
  lastPeriodEnd: string | null;
  confidence: number;
}

export interface PredictedCycle {
  start: string;
  end: string;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
  cycleNumber: number;
}

export interface Predictions {
  stats: CycleStats;
  cycleLength: number;
  duration: number;
  cycleDay: number;
  progress: number;
  phase: 'menstrual' | 'follicular' | 'fertile' | 'ovulation' | 'luteal' | 'unknown';
  phaseLabel: string;
  phaseDescription: string;
  nextPeriod: string | null;
  daysUntilPeriod: number | null;
  ovulation: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  currentCycleStart: string | null;
  upcoming: PredictedCycle[];
  timeline: { key: string; label: string; start: string; end: string }[];
  isEstimate: boolean;
  reference: string;
}

export interface Period {
  id: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  days: number | null;
}

export interface Symptom {
  id?: number;
  date?: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string | null;
}

export interface Mood {
  id?: number;
  date?: string;
  mood: string;
  notes?: string | null;
}

export interface SleepLog {
  id?: number;
  date?: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string | null;
}

export interface ExerciseLog {
  id: number;
  date: string;
  activity: string;
  minutes: number;
  notes?: string | null;
}

export interface DayLog {
  date: string;
  symptoms: Symptom[];
  moods: Mood[];
  water: number;
  waterGoal: number;
  sleep: SleepLog | null;
  exercise: ExerciseLog[];
  nutrition: { food_notes: string | null; craving: string | null } | null;
  dailyNote: string;
  cycleDay: number;
  phase: string;
  isPeriodDay: boolean;
}

export interface Reminder {
  id: number;
  type: string;
  enabled: number;
  time: string;
  days_before: number;
  label: string | null;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  sensitive: number;
  is_read: number;
  created_at: string;
}

export interface InsightData {
  range: string;
  from: string;
  to: string;
  kpis: {
    avgCycleLength: number;
    avgPeriodDuration: number;
    regularity: string;
    regularityScore: number | null;
    cycleCount: number;
    periodCount: number;
    loggedDays: number;
    predictionConfidence: number;
    shortestCycle: number | null;
    longestCycle: number | null;
    avgWater: number;
    avgSleep: number;
    avgExercise: number;
  };
  stats: CycleStats;
  cycleTrend: { label: string; date: string; length: number; index: number }[];
  durationTrend: { label: string; date: string; days: number; index: number }[];
  symptomFrequency: { name: string; count: number }[];
  moodFrequency: { name: string; count: number }[];
  severityBreakdown: { name: string; count: number }[];
  activityBreakdown: { name: string; count: number }[];
  cravingFrequency: { name: string; count: number }[];
  buckets: { label: string; symptoms: number; moods: number; water: number; exercise: number }[];
  periodHistory: { startDate: string; endDate: string | null; days: number | null }[];
  predictions: { nextPeriod: string | null; ovulation: string | null; fertileStart: string | null; fertileEnd: string | null; isEstimate: boolean };
}
