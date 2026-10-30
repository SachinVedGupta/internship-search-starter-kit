# Records and synchronization contract

Use `templates/workspace.example.json` as the private destination registry. Null means not configured. Record actual document IDs, URLs, owner/account, read/write capability, last verification and any blockers. Never use invented endpoint names or IDs from examples. An application dashboard does not automatically sync with Google Docs.

## Record model

- **Application:** stable internal ID; employer; official URL and aliases; requisition; title; term; locations; eligibility status/reasons; availability (open/closed/blocked/unverified); stage (Need Action/Applied/OA/Interviewing/Offer); separate outcome (active/rejected/withdrawn/accepted/declined); priority; posted date (nullable); earliest found date; verified-at date; submission evidence/date; next action; selected resume; manual notes; revision/history.
- **Question:** stable ID and application ID; exact observed prompt; required flag; choices; condition; source/read date; draft; grounding; missing facts; user-edited flag; review status and reviewed content version. Practice questions are labelled separately.
- **Career entry:** stable ID; role/project; event dates; contribution; implementation; decisions; results/qualifiers; maturity; lessons; artifacts; facts with provenance and conflict state.
- **Resume:** category/preset; immutable version; editable source reference; PDF reference/hash; page size/count; included section versions; review state and role; cloud storage/readback; employer attachment evidence separately.
- **Sync operation:** run/operation IDs; identity; changed fields with before/after and evidence; source/destination revisions; per-destination pending/written/verified/conflict/blocked state; readback evidence and timestamp.

## Identity and history

Match official employer/ATS requisition and its context before URL aliases. Keep distinct locations/requisitions separate unless the employer confirms a single posting. Do not deduplicate by company/title alone. Canonicalize tracking parameters without losing identity-bearing parameters. Search the full known application history, not only the current page, and flag incomplete history.

## Which destinations change?

| Change | Destinations |
| --- | --- |
| Stage, priority, dates, next action, resume choice | Applications dashboard + Application Tracker |
| Career accomplishment or project update | Profile hub + Comprehensive Career Profile Doc |
| Reusable answer, letter or interview story | Relevant hub record + Career Writing Archive |
| Actual employer entry or attachment | Employer readback + application record + tracker summary |

Where a dashboard/hub is not configured, mark it pending; do not label two-destination sync complete. The document-only workflow is a usable reduced mode.

## Reliable write sequence

1. Read latest checkpoint, both destinations and relevant full sources; capture current revisions and user edits.
2. Reconcile one field-level change set. User decisions govern preferences; official posting sources govern posting facts; verified submission evidence governs Applied. Surface material conflicts without silently selecting one.
3. Record intended operation IDs. Apply targeted updates with revision checks where supported. If no conditional writes exist, re-read immediately before writing, use the smallest supported update and compare afterward. Never claim atomicity across systems.
4. Read back actual saved changed fields in each destination. An acknowledged write is not readback verification. Preserve a successful destination if the other fails.
5. Persist per-destination result and pending operations; on retry fresh-read and apply only unresolved changes. Prevent duplicate entries by stable identity and operation history.
6. Preserve history, human notes, document formatting/tabs/links and original found dates. Counts come from full current reads, not hardcoded totals.

Snapshots record the original read time, source and revision. Packet generation or changing a file timestamp cannot renew source freshness. Use an explicit freshness policy (24 hours is a reasonable application-packet default); revalidate fast-changing availability immediately before entry. Never invent verification receipts.
