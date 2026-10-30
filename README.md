# Internship Search Starter Kit

A reusable setup kit for an AI-assisted internship search: onboarding, a sourced career profile, a private applications dashboard, Google Docs tracking, resume management, grounded application drafts, and optional supervised browser entry.

**Start here:** create your own ChatGPT project and paste [this single self-contained prompt](prompts/00-start-here.md). It includes the repository link and tells your agent to read the files and carry out onboarding/setup. If your agent cannot access the repository, download and upload [CHATGPT-SETUP-PACK.md](CHATGPT-SETUP-PACK.md); for runnable code, also provide the repository ZIP when needed. No coding is required to start the interview.

This repository includes **runnable dashboard code** in [dashboard/](dashboard/README.md), alongside instructions and blank templates. It is **not a deployed online dashboard, browser extension, cloud sync server, or preconnected account**. Your assistant builds/configures your private workspace in your account and proves which capabilities work. No personal career data or permissions transfer from the kit's author.

## Run the included dashboard

With Python 3.9+ installed, run `python3 dashboard/server.py` from this repository and open **http://127.0.0.1:8765**. On Windows use `py -3 dashboard/server.py`. No package installs or API keys are required. Data persists outside the checkout. Read [dashboard/README.md](dashboard/README.md) for launchers, data location, backup and local-only boundaries. Your ChatGPT can start from this code instead of rebuilding the screens.

## Recommended path

1. Use your own ChatGPT account. Prefer desktop Work or Codex when available for multi-step setup and local/browser work. A normal chat can still interview you and prepare drafts.
2. Create a project named `Internship Search — My Career`. Paste `prompts/00-start-here.md` into a chat in that project. Upload the setup pack or repository ZIP if the agent cannot fetch the files.
3. Answer the interview in small batches. Add your resume and any relevant profile/project materials privately.
4. Connect your own Google Drive. Add Gmail, calendar, GitHub and browser capabilities only as useful. Complete sign-in yourself.
5. Have the assistant create your private profile, tracker and writing archive, then launch the included local dashboard or adapt it for private hosting using `docs/10-dashboard-code.md` and `docs/04-dashboard-spec.md`. Record each actual destination in your private workspace registry.
6. Run `docs/08-acceptance-checks.md`. Begin with three official job postings and one reviewed application draft.
7. Use `prompts/02-daily-commands.md` for ongoing work. Turn on a recurring check only after choosing its scope and time zone.

If a connection is unavailable, start with documents and drafts. Keep unavailable capabilities explicitly pending; do not substitute a public dashboard for a private one.

## Contents

| File | Purpose |
| --- | --- |
| `CHATGPT-SETUP-PACK.md` | One-file upload containing the entire operating guide |
| `PROJECT-INSTRUCTIONS.md` | Paste into your project's instructions after onboarding |
| `prompts/00-start-here.md` | Single prompt to paste, including the repo URL and complete setup request |
| `prompts/01-setup.md` | Detailed onboarding and implementation instructions |
| `docs/01-onboarding.md` | Interview and profile evidence rules |
| `docs/02-connections.md` | Account connections and capability tests |
| `docs/03-data-and-sync.md` | Records, identity, conflict handling and dual-write contract |
| `dashboard/` | Working local dashboard with persistent records, history and export |
| `docs/04-dashboard-spec.md` | Requirements for the full private hosted dashboard |
| `docs/10-dashboard-code.md` | Reuse the included code and configure hosting/integrations |
| `docs/05-application-workflow.md` | Discovery, drafting and authorized form entry |
| `docs/06-resumes-and-profile.md` | Resume library and ongoing profile intake |
| `docs/07-routines-and-recovery.md` | Daily use, optional schedules and recovery |
| `docs/08-acceptance-checks.md` | Completion evidence and end-to-end checks |
| `docs/09-sources-and-portability.md` | Product documentation and portability limits |
| `templates/` | Blank documents, structured records and checkpoint |
| `scripts/check_kit.py` | Local consistency checks; no network or account access |

## Keep personal data private

Use this public repository only as a template. Download it or copy it into a **separate private workspace**. Do not fill profile templates or commit resumes, employer drafts, tracker data, credentials or screenshots here. `.gitignore` helps with common private directories but does not make publication safe. No API keys are needed for the interview or to read this kit; use product-supported account connections for the workflow.

## What success means

A fresh chat can find your private registry and understand you. A real role has a grounded draft and verified resume choice. Dashboard and tracker show the same changed fields after separate readbacks. You can review the exact remaining actions and personally submit. Each unavailable piece has a precise pending action.

The kit cannot guarantee job availability, employer website compatibility or unattended execution. Setup is complete for a capability only after its acceptance check passes.

## Local kit maintenance

Run `python3 scripts/check_kit.py` to check links and templates. The setup pack is a generated distribution file; regenerate after changes with `python3 scripts/build_pack.py`.
