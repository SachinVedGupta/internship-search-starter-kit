"use strict";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const stages = ["Need Action", "Applied", "OA", "Interviewing", "Offer"],
  priorities = ["Priority", "Strong", "Selective", "Skip"],
  reviews = ["Draft", "Needs review", "User-approved", "Blocked"];
let token = "",
  records = [],
  view = "home",
  editing = null;
const filter = {
  search: "",
  stage: "",
  priority: "",
  availability: "",
  sort: "updated",
  archived: false,
};
const meta = {
  home: [
    "Your search, in focus.",
    "Make room for the opportunities that fit you.",
  ],
  applications: [
    "Find your next chapter.",
    "A clear view of every opportunity, from discovery to offer.",
  ],
  profile: [
    "The story behind your skills.",
    "Keep contributions, decisions and results grounded in your own experience.",
  ],
  resumes: [
    "A resume for the right moment.",
    "Track versions, source files and the exact materials you reviewed.",
  ],
  writing: [
    "Your experience, in your words.",
    "Build thoughtful answers from real evidence. Keep final review yours.",
  ],
  sync: [
    "Keep every surface aligned.",
    "A manual checklist for separate destination writes and readbacks.",
  ],
  settings: [
    "Make this space your own.",
    "Your goals, private document links and local backups.",
  ],
};
async function api(path, body) {
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Workspace-Token": token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed.");
  return d;
}
function notice(message, error = false) {
  $("#notice").textContent = message;
  $("#notice").className = error ? "error" : "";
}
const group = (k) => records.filter((r) => r.kind === k),
  active = (k) => group(k).filter((r) => !r.data.archived);
const pill = (s, t = "") => `<span class="pill ${t}">${esc(s)}</span>`;
const button = (s, a, x = "") =>
  `<button type="button" data-action="${a}" ${x}>${esc(s)}</button>`;
function link(url, label) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  } catch {
    return "";
  }
}
function options(values, current, blank = "Choose…") {
  return values
    .map(
      (v) =>
        `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v || blank)}</option>`,
    )
    .join("");
}
function empty(title, description, kind = view) {
  return `<div class="empty"><div class="empty-symbol">↗</div><h2>${esc(title)}</h2><p>${esc(description)}</p>${button("Add " + ({ applications: "an application", profile: "an experience", resumes: "a resume", writing: "an answer", sync: "a sync task" }[kind] || "a record"), "new", `data-kind="${kind}"`)}</div>`;
}
function switchView(next) {
  view = meta[next] ? next : "home";
  location.hash = view;
  render();
}
function render() {
  const [title, subtitle] = meta[view];
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle;
  $("#kicker").textContent =
    view === "home"
      ? "A LITTLE PROGRESS, EVERY DAY"
      : "YOUR INTERNSHIP WORKSPACE";
  $$("nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  $("#add").hidden = view === "settings";
  $("#add").textContent =
    "+ " +
    ({
      home: "Add application",
      applications: "Add application",
      profile: "Add experience",
      resumes: "Add resume",
      writing: "Draft an answer",
      sync: "Add sync task",
    }[view] || "Add record");
  if (view === "home") renderHome();
  else if (view === "applications") renderApplications();
  else if (view === "settings") renderSettings();
  else renderCards();
}
function renderHome() {
  const apps = active("applications"),
    sent = apps.filter((r) => r.data.stage !== "Need Action"),
    interviews = apps.filter((r) => r.data.stage === "Interviewing"),
    pending = active("sync").filter((r) => r.data.status !== "Verified"),
    goals = group("settings")[0]?.data;
  const top = apps
    .filter((r) => r.data.outcome === "active" && r.data.priority !== "Skip")
    .sort(
      (a, b) =>
        priorities.indexOf(a.data.priority) -
        priorities.indexOf(b.data.priority),
    )
    .slice(0, 3);
  $("#content").innerHTML = `<div class="stats">${[
    ["Opportunities", apps.length, "In your active workspace"],
    ["Applications sent", sent.length, "With recorded submission evidence"],
    ["Interviewing", interviews.length, "Keep your next steps close"],
    ["Sync tasks pending", pending.length, "Separate readbacks required"],
  ]
    .map(
      ([l, n, s]) =>
        `<div class="stat"><p>${esc(l)}</p><strong>${n}</strong><small>${esc(s)}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="grid"><div><div class="hero"><p class="eyebrow">INTENTIONAL SEARCH. REAL PROGRESS.</p><h2>${esc(goals?.target_term ? `Looking ahead to ${goals.target_term}.` : "Your next opportunity starts with a clear direction.")}</h2><p>${esc(goals?.goals || "Start with your goals, add a few well-matched roles, and build applications that reflect the work you actually do.")}</p>${button("Set my search direction", "settings")}</div><div class="panel"><div class="panel-heading"><h2>Your next moves</h2>${pill("Top 3")}</div>${top.length ? top.map((r, i) => `<div class="action"><span class="action-number">0${i + 1}</span><div><h3>${esc(r.data.company)} · ${esc(r.data.title)}</h3><p>${esc(r.data.next_action || "Review eligibility and prepare a grounded draft.")}</p><div class="card-actions">${pill(r.data.priority)}${button("Open application", "edit", `data-id="${esc(r.id)}" data-kind="applications"`)}</div></div></div>`).join("") : '<p class="subtle">Add your first roles to build a focused queue. Drafts stay Need Action until you record a real submission.</p>'}</div></div><div><div class="panel"><p class="eyebrow">A WORKSPACE THAT GROWS WITH YOU</p><h2>Build your foundation</h2><ul class="guide-list"><li>◎ <div><strong>Your profile</strong><br><span>${active("profile").length} experience notes. Keep personal contributions and source context.</span></div></li><li>▤ <div><strong>Your materials</strong><br><span>${active("resumes").length} resume records. A library link is separate from an employer upload.</span></div></li><li>✎ <div><strong>Your voice</strong><br><span>${active("writing").length} saved answers and stories. Generated text still needs your review.</span></div></li></ul></div><div class="panel"><p class="eyebrow">LOCAL, BY DESIGN</p><h3>Saved on this computer</h3><p class="subtle">This starter has no connected Google Docs or private online hosting. Use Workspace to record your destinations and export a backup.</p>${button("Workspace & backups", "settings")}${!records.length ? '<div class="inline-actions">' + button("Try fictional demo data", "demo") + "</div>" : ""}</div></div></div>`;
}
function renderApplications() {
  $("#content").innerHTML =
    `<div class="toolbar"><label class="visually-hidden" for="search">Search applications</label><input id="search" placeholder="Search company, role, location…" value="${esc(filter.search)}">${[
      ["stage", stages, "All stages"],
      ["priority", priorities, "All priorities"],
      [
        "availability",
        ["open", "closed", "blocked", "unverified"],
        "All availability",
      ],
      ["sort", ["updated", "priority", "company", "date"], "Sort"],
    ]
      .map(
        ([k, vs, label]) =>
          `<label class="visually-hidden" for="${k}-filter">${label}</label><select id="${k}-filter">${options(k === "sort" ? vs : ["", ...vs], filter[k], label)}</select>`,
      )
      .join(
        "",
      )}<label class="subtle"><input id="archived-filter" type="checkbox" ${filter.archived ? "checked" : ""}> Include archived</label></div><div id="application-table"></div>`;
  $("#search").addEventListener("input", (e) => {
    filter.search = e.target.value;
    drawTable();
  });
  for (const k of ["stage", "priority", "availability", "sort"])
    $("#" + k + "-filter").addEventListener("change", (e) => {
      filter[k] = e.target.value;
      drawTable();
    });
  $("#archived-filter").addEventListener("change", (e) => {
    filter.archived = e.target.checked;
    drawTable();
  });
  drawTable();
}
function drawTable() {
  let rows = group("applications").filter(
    (r) =>
      (filter.archived || !r.data.archived) &&
      (!filter.stage || r.data.stage === filter.stage) &&
      (!filter.priority || r.data.priority === filter.priority) &&
      (!filter.availability || r.data.availability === filter.availability) &&
      [
        r.data.company,
        r.data.title,
        r.data.location,
        r.data.term,
        r.data.requisition,
      ]
        .join(" ")
        .toLowerCase()
        .includes(filter.search.toLowerCase()),
  );
  rows.sort((a, b) =>
    filter.sort === "priority"
      ? priorities.indexOf(a.data.priority) -
        priorities.indexOf(b.data.priority)
      : filter.sort === "company"
        ? a.data.company.localeCompare(b.data.company)
        : filter.sort === "date"
          ? (b.data.posted_date || b.data.found_on || "").localeCompare(
              a.data.posted_date || a.data.found_on || "",
            )
          : b.updated_at.localeCompare(a.updated_at),
  );
  $("#application-table").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>COMPANY / ROLE</th><th>PRIORITY</th><th>STAGE</th><th>AVAILABILITY</th><th>DATE</th><th>NEXT ACTION</th><th><span class="visually-hidden">Open</span></th></tr></thead><tbody>${rows
        .map((r) => {
          const d = r.data;
          return `<tr><td><strong>${esc(d.company)}</strong><small>${esc(d.title)}${d.archived ? " · Archived" : ""}</small><small>${esc(d.location || "Location unknown")} · ${esc(d.term || "Term unknown")}</small></td><td>${pill(d.priority, d.priority === "Priority" ? "" : "gray")}</td><td>${pill(d.stage, d.stage === "Need Action" ? "amber" : "")}</td><td>${pill(d.availability, d.availability === "open" ? "" : "gray")}</td><td>${esc(d.posted_date || d.found_on || "Unknown")}<small>${d.posted_date ? "Posted" : d.found_on ? "Found on" : "Not verified"}</small></td><td>${esc(d.next_action || "Set next action")}</td><td>${button("Open", "edit", `data-id="${esc(r.id)}" data-kind="applications"`)}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><p class="subtle">${rows.length} shown · ${group("applications").length} total records. Employer submission remains your action.</p>`
    : empty(
        "A thoughtful search starts here.",
        "Add a real official posting, capture what you know, and leave unknown facts clearly labelled.",
        "applications",
      );
}
function renderCards() {
  const entries = active(view),
    intro = {
      profile:
        "Save detailed experience notes and sources. A user report is distinct from independent verification.",
      resumes:
        "Track private source/PDF links and review metadata. This starter does not compile, upload or inspect PDF bytes.",
      writing:
        "Save actual prompts, grounded answers and your review status. Material edits reset review.",
      sync: "These are manual records, not executed integrations. Verified requires actual readback evidence from the destination.",
    };
  $("#content").innerHTML =
    `<p class="subtle">${intro[view]}</p>` +
    (entries.length
      ? `<div class="cards">${entries
          .map((r) => {
            const d = r.data;
            return `<article class="card"><div class="card-head"><div><h2>${esc(d.title)}</h2><small>${esc(d.organization || d.category || d.destination || d.company || "")}</small></div>${pill(d.review || d.status || d.maturity || "Note", d.review === "Needs review" || d.status === "Pending" ? "amber" : "gray")}</div><p class="body-text">${esc(d.content || d.next_action || d.notes || "Add details when you have them.")}</p>${d.version ? `<p class="subtle">Version ${esc(d.version)} · ${esc(d.sha256 ? "Hash recorded" : "Hash not recorded")}</p>` : ""}${d.sources ? `<p class="subtle">Sources: ${esc(d.sources)}</p>` : ""}<div class="card-actions">${button("Open & edit", "edit", `data-id="${esc(r.id)}" data-kind="${view}"`)}${link(d.url, "Source")}${link(d.pdf_url, "PDF")}${link(d.source_file_url, "Editable source")}</div></article>`;
          })
          .join("")}</div>`
      : empty(
          {
            profile: "Your experience deserves context.",
            resumes: "Start with your current resume.",
            writing: "Good answers begin with real stories.",
            sync: "Track the work between your tools.",
          }[view],
          intro[view],
        ));
}
function renderSettings() {
  const d = group("settings")[0]?.data || {};
  $("#content").innerHTML =
    `<div class="settings-grid"><div class="panel"><p class="eyebrow">YOUR DIRECTION</p><h2>${esc(d.name || "Your workspace")}</h2><p class="subtle">${esc(d.target_term || "Choose your target term")}<br>${esc(d.roles || "Add your preferred roles")}<br>${esc(d.locations || "Add your target locations")}</p><p class="subtle">${esc(d.goals || "Add what matters most: learning, location, role, team or product.")}</p>${button("Edit preferences & links", "preferences")}</div><div class="panel"><p class="eyebrow">PRIVATE DESTINATIONS</p><h2>Connections to configure</h2><p class="subtle">These links are references only. Saving a URL does not authorize or execute cloud writes.</p><div class="card-actions">${link(d.tracker_url, "Application tracker")}${link(d.profile_url, "Career profile")}${link(d.archive_url, "Writing archive")}${link(d.dashboard_url, "Hosted dashboard")}</div><p class="subtle">${!d.tracker_url ? "Google Docs tracker not configured." : ""} ${!d.dashboard_url ? "Private online hosting not configured." : ""}</p></div><div class="panel"><p class="eyebrow">TAKE YOUR WORK WITH YOU</p><h2>Backup & export</h2><p class="subtle">JSON includes every record and version history. Markdown is a readable handoff for ChatGPT. Linked resume files stay in their original storage.</p><div class="inline-actions">${button("Download JSON backup", "export-json")}${button("Download Markdown", "export-md")}${button("Restore backup", "restore")}</div><p class="subtle">Restore works only in an empty workspace and never overwrites existing work. Keep exports private.</p></div><div class="panel"><p class="eyebrow">WHAT THIS STARTER DOES</p><h2>Local workspace, clear boundaries</h2><p class="subtle">Records persist in a database outside the checkout. Version history and stale-edit checks protect saved work.</p><p class="subtle">No automatic discovery, Google Docs sync, PDF compilation, browser autofill or employer submission is connected. Your assistant can use these records while setting up those separate capabilities.</p><p class="subtle">This app listens only on this computer. It is not a hosted service or a multi-user account system.</p></div></div>`;
}
const field = (key, label, type = "text", values = null, help = "") => ({
  key,
  label,
  type,
  values,
  help,
});
const schemas = {
  applications: [
    field("company", "Employer"),
    field("title", "Role title"),
    field("url", "Official posting URL", "url"),
    field("requisition", "Requisition ID"),
    field("term", "Internship term"),
    field("location", "Location"),
    field("priority", "Priority", "select", priorities),
    field("stage", "Stage", "select", stages),
    field("availability", "Posting availability", "select", [
      "unverified",
      "open",
      "closed",
      "blocked",
    ]),
    field("outcome", "Outcome", "select", [
      "active",
      "rejected",
      "withdrawn",
      "accepted",
      "declined",
    ]),
    field("posted_date", "Posted date", "date"),
    field("found_on", "Earliest found on", "date"),
    field("verified_at", "Last verified on", "date"),
    field("applied_date", "Actual submission date", "date"),
    field("eligibility", "Eligibility and unknowns", "textarea"),
    field(
      "submission_evidence",
      "Submission evidence",
      "textarea",
      null,
      "Label a portal/email observation or user report. A draft is not a submission.",
    ),
    field("next_action", "Next action", "textarea"),
    field("notes", "Your notes", "textarea"),
    field("sources", "Posting sources and read dates", "textarea"),
  ],
  profile: [
    field("title", "Experience or project title"),
    field("organization", "Organization / team"),
    field("maturity", "Current state", "select", [
      "unknown",
      "planned",
      "in progress",
      "completed",
    ]),
    field("source_state", "Evidence state", "select", [
      "user-reported",
      "independently verified",
      "inferred",
      "conflicting",
      "planned",
    ]),
    field("dates", "Event dates"),
    field("url", "Artifact or source URL", "url"),
    field(
      "content",
      "Contribution, implementation, decisions, results and lessons",
      "textarea",
    ),
    field(
      "sources",
      "Sources, dates, qualifiers and open conflicts",
      "textarea",
    ),
  ],
  resumes: [
    field("title", "Resume name"),
    field("category", "Category"),
    field("version", "Version"),
    field("pdf_url", "Private PDF URL", "url"),
    field("source_file_url", "Private editable source URL", "url"),
    field("sha256", "PDF SHA-256 (if inspected)"),
    field("page_format", "Inspected page count / size"),
    field("review", "Review status", "select", reviews),
    field("sections", "Included sections and versions", "textarea"),
    field(
      "review_evidence",
      "What exact PDF/source was inspected?",
      "textarea",
    ),
    field("notes", "Notes and pending checks", "textarea"),
  ],
  writing: [
    field("title", "Answer or story name"),
    field("company", "Employer / audience"),
    field("prompt", "Observed prompt", "textarea"),
    field("content", "Your answer", "textarea"),
    field("sources", "Grounding, assumptions and sources", "textarea"),
    field("review", "Review status", "select", reviews),
  ],
  sync: [
    field("title", "Record and change to synchronize"),
    field("destination", "Exact destination"),
    field("url", "Destination URL", "url"),
    field("status", "Manual operation status", "select", [
      "Pending",
      "Written not verified",
      "Verified",
      "Conflict",
      "Blocked",
      "Not applicable",
    ]),
    field("content", "Changed fields / before and after", "textarea"),
    field(
      "evidence",
      "Actual destination readback evidence",
      "textarea",
      null,
      "A write response is not readback. Record what you actually observed.",
    ),
    field("next_action", "Remaining action", "textarea"),
  ],
  settings: [
    field("name", "Preferred name"),
    field("target_term", "Target term"),
    field("roles", "Role interests"),
    field("locations", "Locations and work arrangement"),
    field("goals", "Goals and priorities", "textarea"),
    field("tracker_url", "Private application tracker URL", "url"),
    field("profile_url", "Private career profile URL", "url"),
    field("archive_url", "Private writing archive URL", "url"),
    field("dashboard_url", "Private hosted dashboard URL", "url"),
  ],
};
function fieldHTML(f, d) {
  const v = d[f.key] ?? (f.values ? f.values[0] : "");
  return `<label class="form-field ${f.type === "textarea" ? "wide" : ""}"><span>${esc(f.label)}</span>${f.type === "select" ? `<select name="${f.key}">${options(f.values, v)}</select>` : f.type === "textarea" ? `<textarea name="${f.key}" rows="4">${esc(v)}</textarea>` : `<input name="${f.key}" type="${f.type}" value="${esc(v)}" ${f.key === "title" || (f.key === "company" && editing?.kind === "applications") ? "required" : ""}>`}${f.help ? `<small>${esc(f.help)}</small>` : ""}</label>`;
}
function questionHTML(q = {}) {
  return `<div class="question" data-question-id="${esc(q.id || crypto.randomUUID())}"><div class="form-grid">${fieldHTML(field("q_prompt", "Exact question prompt", "textarea"), { q_prompt: q.prompt })}${fieldHTML(field("q_answer", "Draft answer", "textarea"), { q_answer: q.answer })}${fieldHTML(field("q_grounding", "Grounding and missing facts", "textarea"), { q_grounding: q.grounding })}${fieldHTML(field("q_condition", "Condition / choices"), { q_condition: q.condition })}${fieldHTML(field("q_review", "Review", "select", reviews), { q_review: q.review || "Draft" })}${fieldHTML(field("q_required", "Required?", "select", ["unknown", "yes", "no"]), { q_required: q.required || "unknown" })}</div><div class="inline-actions">${button("Remove question", "remove-question")}</div></div>`;
}
function openEditor(kind, id = null) {
  const r = id ? records.find((r) => r.kind === kind && r.id === id) : null;
  if (id && !r)
    return notice("Record not found. Refresh your workspace.", true);
  editing = {
    kind,
    id: r?.id || crypto.randomUUID(),
    revision: r?.revision || 0,
    original: r?.data || {},
  };
  const d = editing.original;
  $("#editor-title").textContent =
    (r ? "Edit " : "New ") +
    {
      applications: "application",
      profile: "experience",
      resumes: "resume record",
      writing: "answer",
      sync: "sync task",
      settings: "workspace preferences",
    }[kind];
  $("#editor-error").textContent = "";
  $("#show-history").hidden = !r;
  $("#fields").innerHTML =
    `<div class="form-grid">${schemas[kind].map((f) => fieldHTML(f, d)).join("")}${
      kind === "applications"
        ? `<label class="form-field wide"><span>Selected resume</span><select name="resume_id"><option value="">No resume selected</option>${active(
            "resumes",
          )
            .map(
              (r) =>
                `<option value="${esc(r.id)}" ${d.resume_id === r.id ? "selected" : ""}>${esc(r.data.title)} · ${esc(r.data.version || "Version unknown")}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }${kind !== "settings" ? `<label class="form-field"><span>Archive record</span><input name="archived" type="checkbox" ${d.archived ? "checked" : ""}><small>Preserves history; hides this record from active views.</small></label>` : ""}</div>${kind === "applications" ? `<h3 class="section-title">Observed questions & drafts</h3><p class="subtle">Capture actual prompts. Record inaccessible pages and conditional gaps in notes.</p><div id="questions">${(d.questions || []).map(questionHTML).join("")}</div>${button("Add question", "add-question")}` : ""}`;
  $("#editor").showModal();
}
async function load() {
  records = (await api("/api/state")).records;
  render();
}
async function saveEditor(e) {
  e.preventDefault();
  const submit = $("button[type=submit]", $("#record-form"));
  submit.disabled = true;
  try {
    const form = $("#record-form"),
      d = { ...editing.original };
    for (const f of schemas[editing.kind])
      d[f.key] = form.elements[f.key].value.trim();
    if (editing.kind !== "settings")
      d.archived = form.elements.archived.checked;
    if (editing.kind === "applications") {
      d.resume_id = form.elements.resume_id.value;
      d.questions = $$(".question", form).map((el) => {
        const v = (n) => $(`[name="q_${n}"]`, el).value.trim();
        const old =
          (editing.original.questions || []).find(
            (q) => q.id === el.dataset.questionId,
          ) || {};
        return {
          ...old,
          id: el.dataset.questionId,
          prompt: v("prompt"),
          answer: v("answer"),
          grounding: v("grounding"),
          condition: v("condition"),
          required: v("required"),
          review: v("review"),
        };
      });
    }
    const saved = await api("/api/save", {
      kind: editing.kind,
      id: editing.id,
      expected_revision: editing.revision,
      data: d,
    });
    const reset =
      (saved.data.questions || []).some(
        (q, i) =>
          q.review === "Needs review" &&
          d.questions?.[i]?.review === "User-approved",
      ) ||
      (saved.data.review === "Needs review" && d.review === "User-approved");
    $("#editor").close();
    await load();
    notice(
      reset
        ? "Saved. Changed content needs a new review; the previous approval was reset."
        : "Saved locally. Cloud destinations have not been updated.",
    );
  } catch (error) {
    $("#editor-error").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}
async function download(path, name) {
  const r = await fetch(path, { headers: { "X-Workspace-Token": token } });
  if (!r.ok) throw Error("Export failed.");
  const url = URL.createObjectURL(await r.blob()),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function demo() {
  if (records.length)
    throw Error("Demo data is available only in an empty workspace.");
  for (const [company, title, priority] of [
    ["Example Robotics", "Robotics software intern", "Priority"],
    ["Example Systems", "Infrastructure intern", "Strong"],
    ["Example Studio", "Product engineering intern", "Selective"],
  ])
    await api("/api/save", {
      kind: "applications",
      id: crypto.randomUUID(),
      expected_revision: 0,
      data: {
        company,
        title,
        priority,
        stage: "Need Action",
        availability: "unverified",
        outcome: "active",
        term: "Demo term",
        location: "Fictional location",
        notes: "FICTIONAL DEMO — not a real employer or verified posting.",
        next_action:
          "Replace this fictional example with a verified official role.",
        questions: [],
      },
    });
  await load();
  notice(
    "Loaded three fictional examples, not real opportunities. Archive them before starting your search.",
  );
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.view) return switchView(b.dataset.view);
    const a = b.dataset.action;
    if (a === "new") openEditor(b.dataset.kind || view);
    if (a === "edit") openEditor(b.dataset.kind, b.dataset.id);
    if (a === "settings") switchView("settings");
    if (a === "preferences")
      openEditor("settings", group("settings")[0]?.id || null);
    if (a === "add-question")
      $("#questions").insertAdjacentHTML("beforeend", questionHTML());
    if (a === "remove-question") b.closest(".question").remove();
    if (a === "demo") await demo();
    if (a === "export-json")
      await download("/api/export", "internship-workspace-backup.json");
    if (a === "export-md")
      await download("/api/export.md", "internship-workspace.md");
    if (a === "restore") $("#restore-file").click();
  } catch (error) {
    notice(error.message, true);
  }
});
$("#add").addEventListener("click", () =>
  openEditor(view === "home" ? "applications" : view),
);
$("#refresh").addEventListener("click", () =>
  load()
    .then(() => notice("Refreshed saved records."))
    .catch((e) => notice(e.message, true)),
);
$("#record-form").addEventListener("submit", saveEditor);
for (const id of ["close-editor", "cancel-editor"])
  $("#" + id).addEventListener("click", () => $("#editor").close());
$("#close-history").addEventListener("click", () =>
  $("#history-dialog").close(),
);
$("#show-history").addEventListener("click", async () => {
  try {
    const rows = await api(`/api/history/${editing.kind}/${editing.id}`);
    $("#history-content").innerHTML = rows
      .map(
        (r) =>
          `<div class="history-item"><h3>Version ${r.revision}</h3><p class="subtle">${esc(r.updated_at)}</p><pre>${esc(JSON.stringify(r.data, null, 2))}</pre></div>`,
      )
      .join("");
    $("#history-dialog").showModal();
  } catch (e) {
    $("#editor-error").textContent = e.message;
  }
});
$("#restore-file").addEventListener("change", async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024)
      throw Error("Backup exceeds the 8 MB restore limit.");
    const result = await api("/api/restore", JSON.parse(await f.text()));
    await load();
    notice(`Restored ${result.restored} records with version history.`);
  } catch (error) {
    notice(error.message, true);
  } finally {
    e.target.value = "";
  }
});
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1) || "home";
  if (meta[next] && view !== next) {
    view = next;
    render();
  }
});
(async () => {
  try {
    token = (await api("/api/session")).token;
    view = meta[location.hash.slice(1)] ? location.hash.slice(1) : "home";
    await load();
  } catch (error) {
    notice(error.message, true);
  }
})();
