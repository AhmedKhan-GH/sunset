export const practitioner = {
  name: "Sarah Chen, RN",
  firstName: "Sarah",
  initials: "SC",
  role: "Primary Nurse",
  credentials: "BSN, CHPN",
  org: "Davis Hospice",
};

export type CaseloadStatus = "stable" | "attention" | "urgent";

export type CaseloadPatient = {
  id: string;
  first: string;
  last: string;
  age: number;
  diagnosis: string;
  status: CaseloadStatus;
  pain: number;
  lastLog: string;
  alertsCount: number;
  nextVisit: string;
  flag?: string;
};

export const caseload: CaseloadPatient[] = [
  { id: "P-1042", first: "Eleanor", last: "Whitman", age: 84, diagnosis: "Stage IV breast cancer", status: "stable", pain: 4, lastLog: "12 min ago", alertsCount: 1, nextVisit: "Today 11:30 AM", flag: "Pain ≥ 7 spike resolved" },
  { id: "P-1057", first: "William", last: "Hayes", age: 79, diagnosis: "End-stage liver cancer", status: "urgent", pain: 7, lastLog: "8 min ago", alertsCount: 2, nextVisit: "Tomorrow 10:00 AM", flag: "Pain unresolved 90 min after dose" },
  { id: "P-1056", first: "Margaret", last: "Thompson", age: 88, diagnosis: "Stage IV ovarian cancer", status: "attention", pain: 6, lastLog: "32 min ago", alertsCount: 1, nextVisit: "Tomorrow 2:30 PM", flag: "No PRN given in 2 hr" },
  { id: "P-1045", first: "James", last: "O'Connor", age: 76, diagnosis: "Pancreatic cancer", status: "stable", pain: 3, lastLog: "1 hr ago", alertsCount: 0, nextVisit: "Today 9:00 AM" },
  { id: "P-1047", first: "Samuel", last: "Brennan", age: 81, diagnosis: "Lung cancer w/ mets", status: "stable", pain: 2, lastLog: "45 min ago", alertsCount: 0, nextVisit: "Thu, May 15" },
  { id: "P-1050", first: "Florence", last: "Becker", age: 86, diagnosis: "Glioblastoma", status: "attention", pain: 4, lastLog: "20 min ago", alertsCount: 1, nextVisit: "Today 2:00 PM", flag: "Missed scheduled lactulose" },
  { id: "P-1054", first: "Vivian", last: "Larsen", age: 89, diagnosis: "End-stage CHF", status: "stable", pain: 4, lastLog: "1 hr ago", alertsCount: 0, nextVisit: "Wed, May 14" },
  { id: "P-1058", first: "Rose", last: "Anderson", age: 85, diagnosis: "ALS", status: "stable", pain: 3, lastLog: "55 min ago", alertsCount: 0, nextVisit: "Fri, May 16" },
];

export type Alert = {
  id: string;
  patientId: string;
  patientName: string;
  trigger: string;
  detail: string;
  severity: "high" | "medium" | "low";
  time: string;
  ago: string;
  status: "new" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
};

export const alerts: Alert[] = [
  {
    id: "A-2052",
    patientId: "P-1057",
    patientName: "Hayes, William",
    trigger: "Pain unresolved after PRN dose",
    detail: "Morphine 10 mg given at 4:30 AM · Pain still 7/10 at 6:00 AM (90 min later). Threshold for re-dose reached.",
    severity: "high",
    time: "6:00 AM",
    ago: "8 min ago",
    status: "new",
  },
  {
    id: "A-2051",
    patientId: "P-1056",
    patientName: "Thompson, Margaret",
    trigger: "Pain reported, no medication logged",
    detail: "Pain 6/10 at 5:35 AM. No PRN morphine recorded in past 2 hours.",
    severity: "medium",
    time: "5:35 AM",
    ago: "32 min ago",
    status: "new",
  },
  {
    id: "A-2050",
    patientId: "P-1050",
    patientName: "Becker, Florence",
    trigger: "Scheduled medication missed",
    detail: "Daily lactulose 30 mL not logged in past 24 hours.",
    severity: "medium",
    time: "5:48 AM",
    ago: "20 min ago",
    status: "new",
  },
  {
    id: "A-2041",
    patientId: "P-1042",
    patientName: "Whitman, Eleanor",
    trigger: "Pain ≥ 7 sustained",
    detail: "Pain 7/10 at 11:42 PM. Resolved to 4/10 at 12:42 AM after morphine 15 mg PO.",
    severity: "high",
    time: "11:42 PM",
    ago: "6 hr ago",
    status: "acknowledged",
    acknowledgedBy: "S. Chen (you) at 12:48 AM",
  },
];

export type TodayVisit = {
  id: string;
  time: string;
  endTime: string;
  patientId: string;
  patient: string;
  age: number;
  type: "Home Visit" | "Phone Check-In" | "Initial Assessment";
  duration: string;
  agenda: string[];
  flag?: string;
};

export const todayVisits: TodayVisit[] = [
  {
    id: "V-3010",
    time: "9:00 AM",
    endTime: "10:00 AM",
    patientId: "P-1045",
    patient: "O'Connor, James",
    age: 76,
    type: "Home Visit",
    duration: "60 min",
    agenda: ["Vitals", "Pain regimen review", "Bowel program"],
  },
  {
    id: "V-3011",
    time: "11:30 AM",
    endTime: "12:30 PM",
    patientId: "P-1042",
    patient: "Whitman, Eleanor",
    age: 84,
    type: "Home Visit",
    duration: "60 min",
    agenda: ["Vitals", "Discuss overnight pain spike", "Refill morphine"],
    flag: "Recent overnight pain spike — review log first",
  },
  {
    id: "V-3012",
    time: "2:00 PM",
    endTime: "2:45 PM",
    patientId: "P-1050",
    patient: "Becker, Florence",
    age: 86,
    type: "Home Visit",
    duration: "45 min",
    agenda: ["Bowel regimen — missed lactulose", "Comfort positioning"],
    flag: "Missed scheduled medication",
  },
];

export type SymptomLogEntry = {
  id: string;
  time: string;
  day: string;
  type: string;
  severity: number;
  location?: string;
  description: string;
  reportedBy: string;
  hasVoice: boolean;
  voiceDuration?: string;
  voiceConfidence?: string;
  voiceTranscript?: string;
  followUpSeverity?: number;
  followUpTime?: string;
  alert: boolean;
  med?: { name: string; dose: string; route: string; effective: boolean | null };
};

export const symptomLog: SymptomLogEntry[] = [
  {
    id: "SL-9182",
    time: "12:42 AM",
    day: "Today, May 9",
    type: "Pain",
    severity: 4,
    location: "Abdomen",
    description: "Follow-up after morphine — improved",
    reportedBy: "Sarah Whitman (caregiver)",
    hasVoice: false,
    alert: false,
  },
  {
    id: "SL-9181",
    time: "11:42 PM",
    day: "Yesterday, May 8",
    type: "Pain",
    severity: 7,
    location: "Abdomen",
    description: "Sharp, cramping — patient woke from sleep",
    reportedBy: "Sarah Whitman (caregiver)",
    hasVoice: true,
    voiceDuration: "0:24",
    voiceConfidence: "94%",
    voiceTranscript:
      "She's saying her stomach hurts a lot, she rates it like a seven, it's a sharp pain, she just had her morphine an hour ago and now it's coming back, I'm going to give her another dose…",
    followUpSeverity: 4,
    followUpTime: "12:42 AM (60 min)",
    alert: true,
    med: { name: "Morphine sulfate", dose: "15 mg", route: "PO", effective: true },
  },
  {
    id: "SL-9180",
    time: "9:15 PM",
    day: "Yesterday, May 8",
    type: "Pain",
    severity: 6,
    location: "Lower back",
    description: "Dull ache",
    reportedBy: "Eleanor (patient)",
    hasVoice: true,
    voiceDuration: "0:18",
    voiceConfidence: "88%",
    voiceTranscript:
      "It's the lower back again, about a six. The morphine helped last time, can someone give me another one…",
    followUpSeverity: 3,
    followUpTime: "10:00 PM (45 min)",
    alert: false,
    med: { name: "Morphine sulfate", dose: "10 mg", route: "PO", effective: true },
  },
  {
    id: "SL-9179",
    time: "2:30 PM",
    day: "Yesterday, May 8",
    type: "Anxiety",
    severity: 3,
    description: "Mild restlessness — daughter offered music & breathing",
    reportedBy: "Eleanor (patient)",
    hasVoice: false,
    followUpSeverity: 1,
    followUpTime: "3:00 PM (30 min)",
    alert: false,
  },
  {
    id: "SL-9178",
    time: "8:45 PM",
    day: "Wed, May 7",
    type: "Pain",
    severity: 8,
    location: "Abdomen",
    description: "Sharp, radiating to back",
    reportedBy: "Sarah Whitman (caregiver)",
    hasVoice: true,
    voiceDuration: "0:32",
    voiceConfidence: "92%",
    voiceTranscript:
      "She's in a lot of pain, it's an eight in her abdomen, she's also anxious. I'm going to give her the morphine and the lorazepam now…",
    followUpSeverity: 5,
    followUpTime: "9:30 PM (45 min)",
    alert: true,
    med: { name: "Morphine 15 mg + Lorazepam 0.5 mg", dose: "Combo", route: "PO/SL", effective: true },
  },
];

export type PainPoint = {
  hoursAgo: number;
  pain: number;
  medGiven?: string;
  isFollowUp?: boolean;
};

export const painTrend24h: PainPoint[] = [
  { hoursAgo: 24, pain: 5 },
  { hoursAgo: 22, pain: 4 },
  { hoursAgo: 18, pain: 3, isFollowUp: true },
  { hoursAgo: 19, pain: 6, medGiven: "Morphine 10 mg" },
  { hoursAgo: 14, pain: 3, isFollowUp: true },
  { hoursAgo: 9, pain: 1, isFollowUp: true },
  { hoursAgo: 9.5, pain: 5 },
  { hoursAgo: 6, pain: 7 },
  { hoursAgo: 6, pain: 7, medGiven: "Morphine 15 mg" },
  { hoursAgo: 5, pain: 4, isFollowUp: true },
];

export type ClinicalNote = {
  id: string;
  date: string;
  time: string;
  author: string;
  type: "Visit Note" | "Phone Note" | "Med Adjustment" | "Care Plan Update";
  body: string;
};

export const clinicalNotes: ClinicalNote[] = [
  {
    id: "CN-708",
    date: "May 7",
    time: "11:30 AM",
    author: "Sarah Chen, RN",
    type: "Visit Note",
    body:
      "Pain controlled with current regimen. Eleanor sitting up and conversational. Reviewed PRN doses with daughter Sarah Whitman. Approved by Dr. Reid: OK to titrate morphine to 20 mg if 15 mg ineffective. Bowel regimen on track.",
  },
  {
    id: "CN-705",
    date: "May 5",
    time: "10:00 AM",
    author: "Sarah Chen, RN",
    type: "Visit Note",
    body:
      "Routine visit. Vitals stable. Discussed signs of progressing fatigue with family. Family asking thoughtful questions about end-of-life care; offered chaplain referral.",
  },
  {
    id: "CN-702",
    date: "May 1",
    time: "3:15 PM",
    author: "Dr. James Reid",
    type: "Med Adjustment",
    body:
      "Phone consult after pain spike on Apr 30. Morphine increased to 15 mg q4h PRN (was 10 mg). Recommended weekly RN visits going forward.",
  },
];
