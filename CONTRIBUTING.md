# Contributing to TalkIt

TalkIt is a voice-first agentic desktop copilot (Electron + React + Tailwind). Two
things are designed to be **drop-in folders** so you can extend the app without
touching its internals:

- **Skills** (and their tools + result cards) live in `src/skills/<name>/`
- **Themes** (the whole on-screen experience) live in
  `src/renderer/src/components/themes/<id>/`

## Getting started

```bash
pnpm install
pnpm dev          # run the app with HMR
pnpm typecheck    # tsc --noEmit — run this before opening a PR
pnpm test         # run test suite
```

TalkIt is an Electron app with three processes:

- **Main** (`src/main/`, Node) owns the agent loop, API keys, and OS access.
- **Renderer** (`src/renderer/`, React) is the UI. It never sees secrets.
- A **skill spans both** — its executable half runs in main, its UI half in the
  renderer. They're co-located in one folder and linked only by a tool-name
  string. The build only bundles each half into its own process.

---

## Adding a skill

A skill bundles one or more **tools** the agent can call (e.g. `getWeather`).
Create a folder `src/skills/<name>/` with up to three files:

```
src/skills/weather/
  meta.ts     # id, label, description, sensitivity + tool-name constants  (shared, no deps)
  skill.ts    # the executable tools: inputSchema + execute                (MAIN — zod / node / ai)
  view.tsx    # optional: tool labels + result cards                       (RENDERER — React)
```

### 1. `meta.ts` — the contract (dependency-free)

Declares the tool names once (imported by both `skill.ts` and `view.tsx`) plus
the renderer-safe metadata that drives the Settings → "Skills & tools" UI. Keep
this file free of `node`, `electron`, `ai`, and `react` imports.

```ts
import type { SkillMeta } from "../types";

export const TOOLS = { getWeather: "getWeather" } as const;

export const meta: SkillMeta = {
  id: "weather",
  label: "Weather",
  description: "Look up the current weather and a brief forecast for a place.",
  sensitive: false, // true → every call is gated behind a permission prompt
};
```

### 2. `skill.ts` — the executable (main process)

Spread `meta` and define each tool's `inputSchema` (zod) and `execute`. This
runs in Node/Electron, so you may use `node:*` and `electron` here.

```ts
import { z } from "zod";
import { meta, TOOLS } from "./meta";
import type { Skill } from "../types";

export const weatherSkill: Skill = {
  ...meta,
  tools: [
    {
      name: TOOLS.getWeather,
      description: "Get the current weather for a location.",
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }: { location: string }) => {
        return { place: location, /* … */ };
      },
    },
  ],
};
```

Then register it in `src/skills/registry.ts`:

```ts
import { weatherSkill } from "./weather/skill";
export const BUILTIN_SKILLS: Skill[] = [/* … */ weatherSkill];
```

### 3. `view.tsx` — labels + result card (renderer, optional)

Register a **label** (the activity banner) and optionally a **Card** (rendered in
the conversation thread). This file is **auto-discovered** — no registry edit.

```tsx
import { TOOLS } from "./meta";
import { registerToolView } from "../tool-registry";
import type { ToolViewProps } from "../tool-view";

function WeatherCard({ result, status, surface }: ToolViewProps) {
  if (status !== "done") return <div>Checking the weather…</div>;
  return <div>{/* … */}</div>;
}

registerToolView({
  name: TOOLS.getWeather,
  label: (input) => ({ icon: "🌤️", label: "Check the weather" }),
  Card: WeatherCard,
});
```

---

## Adding a theme

A theme renders the **entire** main experience (audio visualizer + status +
transcript + controls). Create a folder
`src/renderer/src/components/themes/<id>/index.tsx` that **default-exports** a
`DexThemeDef`. It's **auto-discovered** — no registry edit.

See the default `obsidian-lime` theme in `src/renderer/src/components/themes/obsidian-lime/`
as the reference implementation.

---

## Conventions

- **Run `pnpm typecheck` and `pnpm test` before a PR.**
- Keep `meta.ts` dependency-free, and never import a skill's `skill.ts` from the
  renderer.
- Secrets stay in the main process.
