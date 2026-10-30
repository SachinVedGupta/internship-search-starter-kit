"""Check generic kit integrity. Does not test cloud integrations or employer entry."""
from pathlib import Path
import json
import re
from build_pack import render

ROOT = Path(__file__).resolve().parents[1]
errors = []
for path in ROOT.rglob("*.json"):
    if ".git" not in path.parts:
        try:
            json.loads(path.read_text())
        except (ValueError, OSError) as error:
            errors.append(f"Invalid JSON: {path.name}: {error}")
for path in ROOT.rglob("*.md"):
    if ".git" in path.parts or path.name == "CHATGPT-SETUP-PACK.md":
        continue
    for link in re.findall(r"\]\(([^)]+)\)", path.read_text()):
        if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", link) or link.startswith("#"):
            continue
        target = link.split("#")[0]
        if target and not (path.parent / target).exists():
            errors.append(f"Broken link: {path.relative_to(ROOT)} -> {target}")
if (ROOT / "CHATGPT-SETUP-PACK.md").read_text() != render():
    errors.append("Setup pack differs from sources; run scripts/build_pack.py")
application = json.loads((ROOT / "templates/application.example.json").read_text())
if application["stage"] != "Need Action" or application["applied_date"] is not None:
    errors.append("Blank application must not imply submission")
registry = json.loads((ROOT / "templates/workspace.example.json").read_text())
if any(v["url"] or v["id"] for v in registry["destinations"].values()):
    errors.append("Generic registry contains configured destination")
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or "__pycache__" in path.parts:
        continue
    text = path.read_text()
    for pattern in [r"docs\.google\.com/(?:document|spreadsheets)/d/[A-Za-z0-9_-]{15,}",
                    ("/" + "Users/"), r"sk-proj-[A-Za-z0-9]", r"gh[opsu]_[A-Za-z0-9]{20,}"]:
        if re.search(pattern, text):
            errors.append(f"Potential private data in {path.relative_to(ROOT)}")
if errors:
    raise SystemExit("\n".join(errors))
print("PASS: JSON, relative links, source/pack parity, blank record defaults and basic private-data patterns")
print("This checks the kit only; account setup and live workflow acceptance are not tested here.")
