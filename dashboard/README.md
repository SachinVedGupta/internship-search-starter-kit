# Internship Studio — runnable local dashboard

A working starter, not just a design brief. It runs locally with Python 3.9+ and its standard library (including SQLite). There are no package installs, API keys or paid services required for this local app.

From the repository root:

```sh
python3 dashboard/server.py
```

On Windows with the Python launcher:

```bat
py -3 dashboard/server.py
```

Open **http://127.0.0.1:8765**. Keep the terminal running; press Ctrl+C to stop. Use the printed `127.0.0.1` URL rather than `localhost`. If Python is missing, install a supported Python 3 version from [python.org](https://www.python.org/downloads/); your assistant can walk you through it. You can also use `Start Dashboard.command` on macOS or `Start Dashboard.bat` on Windows.

## Included

- Overview with priorities, counts and next actions.
- Applications with employer/requisition/official URL, term/location, stage versus availability, source and submission evidence, search/filter/sort, archive and next action.
- Application questions with prompts, drafts, grounding, conditions and review status.
- Career profile entries with personal contribution, maturity, sources and notes.
- Resume library with private PDF/source links, exact-version/hash metadata and review notes.
- Answer studio for reusable answers/stories and review.
- Manual sync checklist with separate records for each destination and evidence for readback.
- Workspace preferences and destination links.
- Persistent SQLite storage, revision conflict checks, retained history, Markdown export and JSON backup/restore.

Starts empty. The optional Overview demo button creates three explicitly fictional examples. It never discovers real roles or imports anyone's profile. Archive examples before real use, or try them with a separate data directory.

## Data stays outside the public checkout

The default data directory is `~/.internship-search-workspace`, containing `workspace.sqlite3`. This is local persistence, not browser localStorage. Closing the browser/server does not delete it. Files linked from resume records stay in their original private storage; this starter stores references, not PDF bytes.

For a separate test workspace or different port:

```sh
python3 dashboard/server.py --port 8766 --data-dir /absolute/path/to/private/test-workspace
```

Choose a private directory **outside** this public repository. Do not commit database files, backups, profiles or resumes. Exports contain private career information. JSON backup contains records plus history; restore only accepts an empty workspace and never overwrites existing records. Linked PDFs/source files need their own backups. Restore currently accepts backups up to 8 MB; for a larger workspace, preserve the database and plan a migration with your assistant.

## What still needs setup

This starter has **no Google Docs credentials, automatic sync, browser autofill, employer integration, PDF compiler, file upload storage, hosted account system or scheduler**. The sync checklist records actual work performed through the user's connected tools; it does not execute writes. Review/verification labels are user-entered assertions with evidence, not automated document inspection.

Use the onboarding pack to connect your own accounts. An assistant with authorized browser access can edit the local UI. It can also use the local API below from the same computer when authorized; it must read and reconcile current records and verify each cloud destination independently. A cloud-only ChatGPT session cannot automatically access this computer's loopback app.

## Local access boundary

The server binds only to `127.0.0.1`, validates Host/Origin, denies cross-site requests, requires a per-run token for data routes and serves only three allowlisted static files. Local session tokens are available to the browser on this computer; they are not an account/login system. Other processes or users with access to your OS account can access local data. Use an appropriately private device/account.

**Do not expose this server through a public tunnel, reverse proxy or network bind.** Python's [HTTP server documentation](https://docs.python.org/3/library/http.server.html) does not recommend it for production. For a private online dashboard, reuse these screens/data rules in an appropriate hosted backend with owner authentication and per-record/file authorization. Follow [the hosting handoff](../docs/10-dashboard-code.md) and test access before adding personal data. Do not host the static files alone and call it the complete app.

## Local API for authorized assistants

No CORS access is provided. Requests must target the exact printed Host. Do not place the session token in files, logs, source control or shared packets.

1. `GET /api/session` returns the per-run `token` in memory.
2. Include `X-Workspace-Token` in subsequent API requests. POST bodies use `Content-Type: application/json`.
3. `GET /api/state` returns all records: `{kind,id,revision,updated_at,data}`. Collections are `applications`, `profile`, `resumes`, `writing`, `sync`, `settings`.
4. `POST /api/save` accepts `{kind,id,expected_revision,data}`. Use a UUID for new IDs and revision `0`; existing records require the current revision. HTTP 409 means refresh/reconcile, not force overwrite. The server validates submission evidence, exact duplicate identities and review invalidation. Read `/api/state` back after saving.
5. `GET /api/history/{kind}/{id}` returns previous saved versions, newest first.
6. `GET /api/export` and `GET /api/export.md` export complete JSON history or readable current records.
7. `POST /api/restore` restores a dashboard JSON export only into an empty database. This is not a general template-import endpoint.

The blank templates elsewhere in this kit are conceptual records; the runnable UI's concrete fields are defined by `static/app.js` and validated by `server.py` (for example `company`/`url` rather than `employer`/`official_url`). Map fields explicitly and preserve unknown facts; do not post a template directly as a tested dashboard import.

## Checks

From the repository root:

```sh
python3 -m unittest discover -s dashboard/tests -v
python3 scripts/check_kit.py
```

If Node is available, `node --check dashboard/static/app.js` checks JavaScript syntax. Node is not required to run the dashboard. The tests use temporary fictional workspaces and cover persistence/history, stale edits, submission evidence, duplicate identity, review invalidation, independent sync states, backup/restore, invalid input and local request boundaries. They do not verify hosted authentication, Google Docs or employer compatibility.
