<div align="center">

<img src="build/icon.png" alt="TalkIt" width="128" height="128">

# TalkIt

**A Windows-First, Gemma-Powered Voice Desktop Copilot**  
*Speak to write. Talk to act. Approve without interrupting your flow.*

[![License: MIT](https://img.shields.io/badge/license-MIT-111?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-GovindUpadhyay13%2FTalkIt-181f18?style=flat-square&logo=github)](https://github.com/GovindUpadhyay13/TalkIt)
[![Platforms](https://img.shields.io/badge/platform-Windows%2010%2F11%20·%20macOS%20·%20Linux-111?style=flat-square)](#quick-start)
[![Electron](https://img.shields.io/badge/Electron-42-111?style=flat-square&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Model](https://img.shields.io/badge/LLM-Google%20Gemma-C5F467?style=flat-square&labelColor=111411&color=C5F467)](https://ollama.com)

</div>

---

## What is TalkIt?

**TalkIt** transforms your desktop experience into a voice-first copilot designed specifically for Windows 10/11. Powered primarily by **Google Gemma** (served locally through **Ollama** or via the **Google Gemini API**), TalkIt lets you dictate text anywhere, control desktop applications with natural language, and review & approve permissions from AI coding agents—all with your voice.

### Four Core Capabilities

1. **TalkIt Write**: System-wide voice dictation into any focused text box, editor, or browser with natural punctuation, pause, resume, and deduplication.
2. **TalkIt Execute**: Deterministic desktop automation. Launch Windows applications (`Calculator`, `Notepad`, `Terminal`, browsers), research topics on the web, and create/manage local desktop research notes safely.
3. **TalkIt Approve**: Voice-controlled permission decisions for external coding agents (such as Claude Code, Cursor, Copilot CLI) and internal skills. Say *"Allow once"*, *"Always allow"*, *"Deny"*, or *"Explain that again"* without switching windows or interrupting your flow.
4. **TalkIt Flow**: Seamless state machine that preserves your active writing context when handling a permission prompt or running a quick desktop action.

---

## Obsidian Lime Theme

TalkIt features a signature **Obsidian Lime** visual aesthetic:
- **Base Surface**: `#111411` deep obsidian dark mode
- **Elevated Surfaces**: `#222922` container panels and `#181f18` cards
- **Primary Accent**: `#C5F467` radiant lime
- **Secondary Accent**: `#8AA89A` sage
- **Text**: `#F2F5ED` off-white primary and `#A4ADA0` muted text
- **Interactive Audio**: Amplitude-reactive vertical voice wave bars that dance to your voice in real time.

---

## Google Gemma LLM Options

During setup/login, TalkIt offers two ways to power your assistant with Google Gemma:

### Option 1: Run Locally (Ollama)
Run Google Gemma 100% locally on your machine. Completely private, offline-capable, and with zero cloud costs.
1. Download Ollama from [ollama.com](https://ollama.com).
2. Start the daemon: `ollama serve`
3. Pull the recommended model:
   ```bash
   ollama run gemma3:4b
   ```
*(Alternative models such as `gemma3:1b` for low-spec machines, `gemma3:12b`, or `gemma2:9b` are supported).*

### Option 2: Cloud API (Google Gemini API)
Connect to Google's hosted Gemma 4 models via the Gemini API for superior reasoning, multi-step thinking, and multimodal image understanding.
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Enter your `GEMINI_API_KEY` during login or in TalkIt Settings.
3. Supported models:
   - `gemma-4-26b-a4b-it` — Multimodal vision & thinking process
   - `gemma-4-31b-it` — High capacity multi-step reasoning
   - `gemma-2-27b-it`
   - `gemma-2-9b-it`

---

## Quick Start (Windows)

> Requires **Node.js 20+** and **pnpm 10+**.

```bash
# 1. Clone repository
git clone https://github.com/GovindUpadhyay13/TalkIt.git
cd TalkIt

# 2. Install dependencies
pnpm install

# 3. Run unit tests
pnpm test

# 4. Launch TalkIt in development mode
pnpm dev

# 5. Build production bundle
pnpm build
```

---

## TalkIt Approve: External Coding Agent Integration

TalkIt runs an internal, local HTTP approval server on `http://127.0.0.1:51111/v1/permissions`. When an external coding agent or tool requires confirmation before running a sensitive shell command or writing a file, it can request approval from TalkIt.

### Using the Pre-Execution Hook

You can wire any external CLI tool or agent to TalkIt using the included hook script:

```bash
node scripts/talkit-approval-hook.js "Run Command" "pip install requests" "Claude Code"
```

1. The script dispatches the request to TalkIt.
2. TalkIt surfaces an approval card on your desktop and reads the request aloud:  
   *"Your Claude Code wants to run command: pip install requests. Allow this request?"*
3. You respond with your voice:
   - **"Allow once"** → Grants one-time approval; the script exits with code 0.
   - **"Deny"** → Denies the command; the script exits with code 1.
   - **"Explain again"** → Repeats the action details aloud.
   - **"Cancel"** → Cancels the prompt.

---

## Shortcuts & Controls

- **Push-to-Talk**: `Control + Shift + Space` (macOS: `Command + Shift + Space`)
- **Emergency Stop / Interrupt**: `Control + Escape`
- **Summon / Dismiss Window**: `Alt + Space` (falls back to `Control + Alt + Space` on Windows)
- **Toggle Dictation (TalkIt Write)**: `Control + Alt + D`

---

## Architecture & Security

- **Process Isolation**: The Electron Main Process securely handles local server hooks, OS input injection, and Gemma model streaming. Secret credentials (if cloud fallback providers are used) never leave the main process.
- **Input Safety**: TalkIt sanitizes file paths, validates URLs strictly against `http(s)` and `mailto`, and uses clipboard restoration for reliable text injection into active desktop applications.
- **Local-First Voice**: Offline speech recognition via Vosk WASM keyword spotting and local Whisper models ensures private speech processing.

---

## License

TalkIt is licensed under the [MIT License](LICENSE) © 2026 Govind Upadhyay.
