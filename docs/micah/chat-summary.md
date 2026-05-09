# Hospice Symptom Monitoring App — Chat Summary

## App Concept

An iPad app provided by hospice to each patient, kept at home during hospice care. The app passively logs symptoms via **voice-prompted check-ins**, removing the documentation burden from exhausted families and giving the care team reliable, timestamped data.

### Symptoms covered (common hospice set)
- Pain
- Shortness of breath
- Nausea / vomiting
- Anxiety / agitation
- Constipation
- Congestion
- Fever

### Voice flow example (Pain)
1. Patient/family taps **Pain**.
2. App asks: *"How much is your pain? Where is your pain? What kind of pain?"*
3. Patient/family records: *"7/10, abdominal, pressure pain."*
4. App asks: *"It's 7pm — did you take pain meds? What did you take?"*
5. One hour later, app asks: *"It's 8pm — how much is your pain now?"*
6. Patient answers *"4/10."* App logs everything with timestamps.

### Why this matters
- Today, nurses rely on family notes + phone calls — wildly inconsistent.
- Multiple caregivers across 24h → no single source of truth.
- Doctors adjusting doses on unreliable data is unsafe.
- In hospice, fast/safe/easy symptom management = comfort for dying patients.

Records can be reviewed virtually by nurses and doctors, or in person at home visits.

---

## UI Research — Healthcare Apps to Study

### Patient-facing
- **Epic MyChart** — gold standard for patient health UI. Study symptom check-ins, medication logging, after-visit summaries.
- **Ada Health** — chat-style symptom triage. Closest existing model to your conversational voice flow.
- **Sensely** — virtual nurse assistant; conversational AI for symptom checks + vitals. The closest existing product to your idea.
- **Flo** — calm, non-clinical daily check-in design. Great use of color and simplicity.
- **Noom** — reveals complexity gradually so users aren't overwhelmed. Relevant for first-open experience.
- **Welldoc / BlueStar** — FDA-cleared chronic disease app; conversational prompting + timestamped logging.
- **Aiva Health** — voice-first patient room assistant for users with limited dexterity.
- **Pallium Canada / ESAS-r** — Edmonton Symptom Assessment System; already used in palliative care. Shows how pain scales translate to touch.

### Nurse / care team dashboard
- **Biofourmis**
- **Cadence**
- **Current Health**

All three are remote patient monitoring platforms for home care. Study how they flag urgent vs. stable patients at a glance — that's your nurse review screen.

### Where to find more inspiration
- **Dribbble** — search "healthcare app UI", "symptom tracker", "patient monitoring dashboard"
- **Mobbin** — full screen-by-screen UI libraries of real health apps
- **Behance** — search "hospice app design", "palliative care app"
- **Nielsen Norman Group (nngroup.com)** — articles on elderly users, caregiver stress, healthcare accessibility

---

## Design Principles

### Critical for this user population
- **Large touch targets** — minimum 44×44px (Apple), ideally much larger for elderly/frail users.
- **Voice UI conversation design** — Google and Amazon publish guidelines; this is a voice UX problem first.
- **Caregiver fatigue / cognitive load** — users will be exhausted, grieving, possibly elderly. Fewest taps, biggest buttons, zero medical jargon.
- **Ambient passive monitoring** — make logging feel like conversation, not a form.
- **Adaptable across contexts** — works in busy homes and quiet bedrooms alike.
- **WCAG AA contrast** — 4.5:1 minimum text-to-background, especially for low-light home settings.

### Voice-first is the right call
More than half of consumers want voice assistants for managing health. For elderly hospice patients, voice removes typing/dexterity barriers entirely.

---

## Key UX Decisions to Resolve

1. **Alert thresholds** — if pain jumps 4 → 8 overnight with no meds logged, does the nurse get a 3am push? Escalation logic is as important as the UI.
2. **Caregiver handoff** — when the night aide replaces the afternoon family member, show a *"here's where we left off"* summary so they don't have to read everything.

---

## Color Palette (hospice / hospital — calm, clean, trustworthy)

### Neutral base
- Pure white: `#FFFFFF`
- Off-white: `#FAFAFA`
- Light gray: `#F5F5F5`
- Border gray: `#E5E5E5`
- Subtle gray: `#D4D4D4`
- Body text gray: `#6B7280`
- Heading dark: `#1F2937`

### Brand accents (pick one — lavender or muted teal feel most appropriate for palliative care; sage works too)
- Soft lavender: `#A78BFA` / `#C4B5FD`
- Muted teal: `#14B8A6` / `#5EEAD4`
- Sage green: `#84A98C` / `#B7CDBF`
- Calm blue: `#60A5FA` / `#93C5FD`

### Status colors (critical for nurse dashboard at-a-glance triage)
- Stable / OK: `#10B981` (green)
- Attention: `#F59E0B` (amber)
- Urgent: `#EF4444` (red)

All combinations meet WCAG AA 4.5:1 contrast.

---

## Git Workflow Reference

Full process to commit local changes, sync with remote, and push:

```bash
# 1. Check what's changed
git status

# 2. Stage your files
git add image_references/

# 3. Commit
git commit -m "add image references"

# 4. Fetch latest from remote
git fetch origin

# 5. Pull latest into your branch
git pull origin micah-dev

# 6. Push your branch
git push origin micah-dev
```

Then on GitHub: open repo → **Compare & pull request** to merge `micah-dev` into `main`.

If pull causes a merge conflict, VS Code highlights conflicting files. Resolve, then:
```bash
git add .
git commit -m "resolve merge conflicts"
git push origin micah-dev
```

### What `git fetch` vs `git status` actually do
- `git fetch origin` — downloads remote changes into git's knowledge but doesn't touch your files.
- `git status` — shows local state: modified, staged, untracked, ahead/behind remote.

### VS Code Source Control panel (no terminal needed)
1. Click Source Control icon (Ctrl+Shift+G).
2. Stage files with the `+` button.
3. Type commit message → click checkmark (or Ctrl+Enter).
4. Click **Sync Changes** (up arrow) to push.

---

## Resources Mentioned (Could Not Fetch)
- `https://www.diva-portal.org/smash/get/diva2:1653940/FULLTEXT01.pdf` — Scandinavian academic paper, likely on digital health / palliative care / older-adult eHealth acceptance. Site blocks direct fetch — download manually and re-share if you want it analyzed.
