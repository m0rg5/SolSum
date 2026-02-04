# SolSum 2.0: Solar Energy Intelligence

SolSum is a high-precision energy modeling and intelligence tool designed for off-grid power systems (12V, 24V, 48V). It combines deterministic electrical math with live weather forecasting to provide a "State of Resilience" overview for technical users.

---

## 🛠 Tech Stack

- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React / Custom SVGs
- **Deployment**: Traditional static hosting (Vercel/Netlify optimized)
- **State Management**: React Hooks + LocalStorage Persistence

---

## 🎯 LLM Integration Guide (Cheat Sheet)

If you are an AI working on this project, read this section carefully to avoid common regressions.

### 1. Unit Strictness (CRITICAL)
- **Charging Inputs**: Solar and Alternator inputs are stored in **Watts (W)**.
- **Battery State**: The "Source of Truth" for battery state is **Ah (Amp-hours)**. 
- **Conversions**: Always use `battery.voltage` for conversions. Never hardcode 12V or 24V outside of `powerLogic.ts`.
- **Loads**: Stored as Watts x Hours = **Wh**.

### 2. UI Design System (Tailwind Tokens)
Maintain the "Intelligence Terminal" aesthetic:
- **Major Headers**: `text-[10px] text-slate-500 font-bold uppercase tracking-widest`
- **Main Action/Primary**: `blue-600`
- **Gauge/Sizing Feature**: `rose-500` / `rose-400`
- **Success/Healthy**: `emerald-400`
- **Warning**: `amber-400`
- **Danger/Deficit**: `rose-400`
- **Typography**: Inter (UI) / JetBrains Mono (Data).

### 3. Component "Ghosting" Gotchas
- **SmartNotesInput.tsx**: This component uses two perfectly overlaid layers (a background `div` for tag highlights and a transparent foreground `textarea`). 
  - **DANGER**: Any change to font-size, line-height, letter-spacing, or padding MUST be applied to BOTH layers (via the `sharedStyles` object), or the text will misalign and "ghost."

### 4. Persistence & Schema
- Managed via `localStorage` in `App.tsx`.
- **STORAGE_SCHEMA_VERSION**: Mandatory. If you update interfaces in `types.ts`, you MUST bump the version in `App.tsx` and handle the migration or reset logic to prevent state corruption.

---

## 🏗 Architecture & Logic

### Autonomous Resilience Engine (`services/powerLogic.ts`)
The "Battery Life" widget uses a 3-tier resilience model:
1. **Realistic**: Current live forecast (from `weatherService`) or manual entry.
2. **Monthly Baseline (Cloud icon)**: Uses **Historical Monthly Average** sunlight for the location. This answers: *"Is this config sustainable for the average climate of this location?"*
3. **Reserve**: Zero solar input (Battery only).

### Weather Context (`services/weatherService.ts`)
- Powered by **Open-Meteo**.
- **Location Profiling**: The app always fetches historical monthly averages in the background to provide the "London vs. Sydney" baseline, even when viewing live forecasts.

### Cable Gauge Guide
Integrated into `ChatBot.tsx` as a split-pane utility.
- **Standards**: ISO 10133 / ABYC E-11 compliant voltage drop math.
- **UX**: Modal margin is fixed at `6px` for the "Floating Layer" effect.

---

## 🚀 Development

```bash
# Setup
npm install

# Run (Specific Port for consistency)
npm run dev -- --port 3005
```

### LLM Workflow Friction Points
- **Modal Swapping**: When in Zone Sizing mode, the Chat remains at the bottom, and the Calculator expands to the top.
- **Auto-Solar Fallback**: If `autoSolar` is off, `getEffectiveSolarHours` falls back to manual input or a hardcoded baseline (4.0h).
