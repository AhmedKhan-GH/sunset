export const patient = {
  first: "Eleanor",
  last: "Whitman",
  age: 84,
};

export const family = {
  name: "Sarah Whitman",
  firstName: "Sarah",
  relationship: "Daughter",
  initials: "SW",
};

export type TimelineKind =
  | "symptom"
  | "medication"
  | "followup"
  | "voice"
  | "alert"
  | "visit"
  | "note";

export type TimelineEntry = {
  id: string;
  time: string;
  day: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  by: string;
  byYou?: boolean;
};

export const timeline: TimelineEntry[] = [
  { id: "T-09", time: "12:42 AM", day: "Today", kind: "followup", title: "Pain follow-up: 4/10", detail: "Down from 7 — morphine working", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-08", time: "11:42 PM", day: "Yesterday", kind: "medication", title: "Gave Morphine 15 mg", detail: "Oral, for pain", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-07", time: "11:42 PM", day: "Yesterday", kind: "voice", title: "Voice note recorded", detail: "“She's saying her stomach hurts a lot, she rates it like a seven…”", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-06", time: "11:42 PM", day: "Yesterday", kind: "symptom", title: "Pain 7/10 — abdomen", detail: "Sharp, cramping", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-05", time: "10:00 PM", day: "Yesterday", kind: "followup", title: "Pain follow-up: 3/10", detail: "Lower back relief after morphine", by: "Eleanor (patient)" },
  { id: "T-04", time: "9:15 PM", day: "Yesterday", kind: "medication", title: "Gave Morphine 10 mg", detail: "Oral, for back pain", by: "Mark Whitman (afternoon shift)" },
  { id: "T-03", time: "9:15 PM", day: "Yesterday", kind: "symptom", title: "Pain 6/10 — lower back", detail: "Dull ache", by: "Eleanor (patient)" },
  { id: "T-02", time: "3:00 PM", day: "Yesterday", kind: "followup", title: "Anxiety follow-up: 1/10", detail: "Music & breathing helped", by: "Eleanor (patient)" },
  { id: "T-01", time: "2:30 PM", day: "Yesterday", kind: "symptom", title: "Anxiety 3/10", detail: "Mild restlessness, no med given", by: "Eleanor (patient)" },
];

export type Medication = {
  name: string;
  generic: string;
  dose: string;
  route: string;
  purpose: string;
  schedule: string;
  maxDaily: string;
  lastGiven: string;
  nextOk: string;
  prn: boolean;
  instructions: string;
  sideEffects: string[];
};

export const medications: Medication[] = [
  {
    name: "Morphine sulfate",
    generic: "Morphine",
    dose: "15 mg",
    route: "Oral (liquid)",
    purpose: "Pain (PRN)",
    schedule: "Every 4 hours as needed",
    maxDaily: "90 mg",
    lastGiven: "1 hr ago — by you",
    nextOk: "OK after 3:42 AM",
    prn: true,
    instructions: "Place under tongue. May be repeated after 4 hours if pain returns.",
    sideEffects: ["Drowsiness", "Constipation", "Slowed breathing"],
  },
  {
    name: "Lorazepam",
    generic: "Lorazepam",
    dose: "0.5 mg",
    route: "Sublingual tablet",
    purpose: "Anxiety (PRN)",
    schedule: "Every 6 hours as needed",
    maxDaily: "2 mg",
    lastGiven: "Not given today",
    nextOk: "OK anytime",
    prn: true,
    instructions: "Place under tongue, let dissolve. Don't swallow whole.",
    sideEffects: ["Drowsiness", "Confusion in elderly"],
  },
  {
    name: "Ondansetron",
    generic: "Ondansetron (Zofran)",
    dose: "4 mg",
    route: "Oral disintegrating tablet",
    purpose: "Nausea (PRN)",
    schedule: "Every 8 hours as needed",
    maxDaily: "16 mg",
    lastGiven: "Yesterday 6:30 AM — by you",
    nextOk: "OK anytime",
    prn: true,
    instructions: "Place on tongue, let dissolve. No water needed.",
    sideEffects: ["Headache", "Constipation"],
  },
  {
    name: "Lactulose",
    generic: "Lactulose",
    dose: "30 mL",
    route: "Oral (liquid)",
    purpose: "Constipation",
    schedule: "Daily, morning",
    maxDaily: "60 mL",
    lastGiven: "Yesterday — morning",
    nextOk: "Due in ~2 hours",
    prn: false,
    instructions: "Mix with juice or water. Sweet taste.",
    sideEffects: ["Bloating", "Loose stools"],
  },
  {
    name: "Acetaminophen",
    generic: "Acetaminophen (Tylenol)",
    dose: "650 mg",
    route: "Oral",
    purpose: "Fever / mild pain",
    schedule: "Every 6 hours as needed",
    maxDaily: "3 g",
    lastGiven: "—",
    nextOk: "OK anytime",
    prn: true,
    instructions: "Use for fever > 100.4°F or mild aches.",
    sideEffects: ["Liver concerns at high doses"],
  },
];

export const allergies = [
  { allergen: "Penicillin", severity: "Moderate", reaction: "Rash, itching" },
  { allergen: "Sulfa drugs", severity: "Mild", reaction: "Skin reaction" },
];

export type CareTeamMember = {
  initials: string;
  name: string;
  role: string;
  credentials: string;
  phone: string;
  email: string;
  availability: string;
  available: boolean;
  bio: string;
};

export const careTeam: CareTeamMember[] = [
  {
    initials: "SC",
    name: "Sarah Chen, RN",
    role: "Primary Nurse",
    credentials: "BSN, CHPN",
    phone: "(530) 555-0201",
    email: "schen@davishospice.org",
    availability: "Available now · Mon-Fri 8AM-6PM",
    available: true,
    bio: "Sarah has been a hospice nurse for 12 years. She visits Eleanor twice a week and is your first call for anything urgent.",
  },
  {
    initials: "JR",
    name: "Dr. James Reid",
    role: "Hospice Physician",
    credentials: "MD, HMDC",
    phone: "(530) 555-0202",
    email: "jreid@davishospice.org",
    availability: "On-call after 5 PM",
    available: true,
    bio: "Dr. Reid oversees Eleanor's care plan and medication orders. Reachable through Sarah; available directly for clinical questions.",
  },
  {
    initials: "LP",
    name: "Linda Park, LCSW",
    role: "Social Worker",
    credentials: "LCSW, MSW",
    phone: "(530) 555-0204",
    email: "lpark@davishospice.org",
    availability: "Mon-Fri 9AM-5PM",
    available: false,
    bio: "Linda helps with paperwork, advance directives, family meetings, and grief support resources.",
  },
  {
    initials: "TG",
    name: "Rev. Thomas Greene",
    role: "Chaplain",
    credentials: "M.Div., BCC",
    phone: "(530) 555-0205",
    email: "tgreene@davishospice.org",
    availability: "By request",
    available: false,
    bio: "Spiritual support for patient and family — any tradition, or none. Offers visits, prayer, music, or simply company.",
  },
  {
    initials: "DW",
    name: "Daniel Wong, PharmD",
    role: "Pharmacist",
    credentials: "PharmD",
    phone: "(530) 555-0100",
    email: "dwong@davispharmacy.com",
    availability: "Daily 8AM-9PM",
    available: true,
    bio: "Davis Hospice Pharmacy. Call with any questions about doses, interactions, or running low on medications.",
  },
];

export type Visit = {
  id: string;
  date: string;
  weekday: string;
  time: string;
  type: "Home Visit" | "Phone Check-In" | "Emergency Visit" | "Initial Assessment";
  who: string;
  role: string;
  status: "scheduled" | "completed" | "cancelled";
  duration: string;
  summary?: string;
  agenda?: string[];
};

export const upcomingVisits: Visit[] = [
  {
    id: "V-2061",
    date: "May 12",
    weekday: "Tue",
    time: "10:00 AM – 11:00 AM",
    type: "Home Visit",
    who: "Sarah Chen, RN",
    role: "Primary Nurse",
    status: "scheduled",
    duration: "60 min",
    agenda: [
      "Vitals check",
      "Pain regimen review with family",
      "Refill morphine prescription",
    ],
  },
  {
    id: "V-2062",
    date: "May 14",
    weekday: "Thu",
    time: "2:00 PM – 2:30 PM",
    type: "Phone Check-In",
    who: "Linda Park, LCSW",
    role: "Social Worker",
    status: "scheduled",
    duration: "30 min",
    agenda: ["Family meeting follow-up", "Hospice volunteer scheduling"],
  },
  {
    id: "V-2063",
    date: "May 15",
    weekday: "Fri",
    time: "11:00 AM – 12:00 PM",
    type: "Home Visit",
    who: "Rev. Thomas Greene",
    role: "Chaplain",
    status: "scheduled",
    duration: "60 min",
    agenda: ["Pastoral visit", "Music & quiet company"],
  },
];

export const pastVisits: Visit[] = [
  {
    id: "V-2058",
    date: "May 7",
    weekday: "Thu",
    time: "10:15 AM – 11:30 AM",
    type: "Home Visit",
    who: "Sarah Chen, RN",
    role: "Primary Nurse",
    status: "completed",
    duration: "75 min",
    summary:
      "Pain controlled with current regimen. Eleanor sitting up and conversational. Reviewed PRN doses with Sarah Whitman; OK to titrate morphine to 20 mg if needed. Bowel regimen on track.",
  },
  {
    id: "V-2057",
    date: "May 5",
    weekday: "Tue",
    time: "9:45 AM – 10:30 AM",
    type: "Home Visit",
    who: "Sarah Chen, RN",
    role: "Primary Nurse",
    status: "completed",
    duration: "45 min",
    summary:
      "Routine visit. Vitals stable. Discussed signs of progressing fatigue. Family asking good questions about end-of-life care; offered to schedule chaplain visit.",
  },
  {
    id: "V-2056",
    date: "May 1",
    weekday: "Fri",
    time: "—",
    type: "Phone Check-In",
    who: "Dr. James Reid",
    role: "Hospice Physician",
    status: "completed",
    duration: "20 min",
    summary:
      "Phone consult after pain spike on Apr 30. Approved morphine increase to 15 mg q4h PRN. Recommended weekly RN visits going forward.",
  },
  {
    id: "V-2055",
    date: "Apr 28",
    weekday: "Tue",
    time: "11:00 AM – 12:30 PM",
    type: "Home Visit",
    who: "Sarah Chen, RN",
    role: "Primary Nurse",
    status: "completed",
    duration: "90 min",
    summary:
      "Pain has worsened over past 4 days. Adjusted regimen, started lactulose for opioid-induced constipation. Family doing excellent job tracking via app.",
  },
];
