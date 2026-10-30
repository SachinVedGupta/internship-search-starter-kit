# Start from the included dashboard code

The repository now includes a working local dashboard in `dashboard/`. Read its README and use the existing code instead of rebuilding the core screens from scratch. This extends the original dashboard brief; it does not turn local code into a hosted service.

## Recommended setup sequence

1. Complete enough onboarding to understand the user's term, role preferences and existing tools.
2. If local execution is supported, download the repository into a separate private working location, inspect `dashboard/README.md`, check Python availability and run `python3 dashboard/server.py`. Keep data outside the public checkout. Open the printed local URL. Start empty or use fictional examples in a separate test data directory.
3. Verify actual save → reload → edit → reload → export and review history/conflict behavior. Record the user's local URL and data location privately. Use the app's actual field names; conceptual templates require mapping.
4. Personalize preferences and authorized private records. Configure Google Docs using connected tools. Maintain the dual-destination sync contract; saving a Docs URL in Workspace does not connect it.
5. If the user wants a private online dashboard and the account supports it, port/reuse these screens and data rules on a supported persistent host. Follow the platform's skills and access controls. The Python loopback server is local-only: do not expose it publicly or upload its database. Replace it with a suitable hosted backend and owner-authenticated, authorized reads/writes; private file storage needs its own implementation.
6. Import the user's exported records through a validated migration, preserve versions/history and test access and readback separately. Do not label migration complete merely because the UI loads.

## What code is already done

Overview, searchable/filterable applications, application questions and grounded drafts, career notes, resume metadata/private links, reusable writing, manual sync checklist, preferences, SQLite persistence, retained versions, stale-edit conflicts, JSON backup/restore and Markdown export.

## What remains account-specific

Google Docs connections and actual cloud writes; online hosting/authentication; private PDF storage and inspection/compilation; official-posting research; employer form assistance; optional scheduling. No personal profile, credentials or standing permissions are bundled. A cloud-only chat may need the user to run the app locally, use an authorized connected computer or choose hosted setup.

## Prompt to reuse the code

“Read the included dashboard/README.md and docs/10-dashboard-code.md. Start from dashboard/ rather than rebuilding it. Launch and verify the local app if my environment supports it. Configure my preferences and private documents from onboarding, preserve my data outside the public checkout, and establish actual separate destination readbacks. If I want hosting, reuse the UI and data rules with a proper owner-authenticated persistent backend; do not expose the local Python server. Report which capabilities truly work and what still needs setup.”

## Starter verification

The kit maintainer ran 12 automated tests for persistence/history, stale edits, evidence rules, exact duplicate records, review invalidation, partial sync states, JSON restore, invalid input and local HTTP boundaries. Browser checks with fictional data covered application/question creation, reload, search, edit/history, profile notes, resume metadata, generic answer saving and a pending sync record. This is starter verification, not proof of any new user account, cloud connection or hosted deployment.
