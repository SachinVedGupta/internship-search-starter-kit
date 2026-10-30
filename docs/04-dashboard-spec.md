# Private dashboard build brief

This is an implementation brief, not an included application. Ask the assistant to build it in the user's account with available website tools, or use it in local Codex with an approved hosting choice. Follow the actual platform's skill and authentication documentation. Do not assume the original author's backend or private API exists.

## Product

Create a responsive, accessible internship workspace with these areas:

- **Home:** next three actions, deadlines, review queue, open blockers and meaningful sync failures.
- **Applications:** sortable/searchable table and detail view; term/company/location/priority/stage/availability filters; Posted then Found On display; official links; stable IDs; archived outcomes; notes and next action. Show all history for duplicate checks.
- **Application details:** official source evidence, eligibility, exact observed questions and conditions, editable drafts, grounding and assumptions in a separate private panel, review states, selected resume/source/PDF, history, employer draft state and submission evidence. Drafts stay Need Action.
- **My Profile:** detailed career entries, provenance/conflicts, accomplishments, preferences, source links, artifacts and intake notes. Separate application-only sensitive fields from general profile content.
- **Resumes:** current category presets, reusable source blocks, source/PDF version pairing, PDF preview, company copies, immutable previous versions, review/hash metadata. Preserve explicit selection.
- **Sync and settings:** configured destinations, last actual verification, pending changes/conflicts, per-destination result and retry, permissions, export and backup.

## Minimum implementation requirements

Use real persistent storage appropriate to the chosen host. No hardcoded personal seed data or client-only array masquerading as persistence. Mutations need validation and revision/conflict handling; use idempotent operation IDs where practical. Paginate without hiding records from exports/history reconciliation. Provide JSON and readable Markdown export; preserve sources, unknowns and history.

Use owner-authenticated access with authorization enforced for every data/file read and write at the server/storage boundary. A hidden URL, client-side password screen, robots setting or public file bucket is not sufficient. Keep secrets server-side. Verify owner access and denial to signed-out users and another user if a test account is available. Do not expose resumes or profile exports through unauthenticated endpoints.

Use supported private storage for PDFs and artifacts. Signed URLs must expire as intended; record durable object references rather than claiming expiring URLs are permanent links. Verify object access separately. Never make an artifact public to get an inline preview.

Do not build a Google Docs sync service unless actually implementing and testing one. Default to agent-performed targeted sync from `docs/03-data-and-sync.md`; show that mode in settings. A sync button must invoke real supported operations or accurately open a task; a toast is not proof of cloud sync.

## Delivery and checks

Build with fictional sample data first. Verify create → reload → edit → reload → export, conflict preservation, duplicates, question review invalidation, source/PDF pairing and all filters. Test access before entering real data. Then import only the user's authorized records. Show actual dashboard URL, storage mode, readback evidence, access check results and pending connections.

Prefer platform-native private hosting when supported. If deploying externally would require new accounts, billing or public access, prepare a local preview/build and ask the user about that concrete remaining choice. Document-only mode remains available while hosting is unresolved.
