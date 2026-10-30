"""Build a portable, self-contained upload; no accounts or network needed."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def render():
    paths = [ROOT / "prompts/01-setup.md", ROOT / "PROJECT-INSTRUCTIONS.md"]
    paths += sorted((ROOT / "docs").glob("*.md"))
    paths += sorted((ROOT / "templates").glob("*"))
    paths += [ROOT / "prompts/02-daily-commands.md", ROOT / "prompts/03-dashboard-build.md"]
    parts = ["# Internship Search — Complete ChatGPT Setup Pack\n\n"
             "Upload this file to your own project and paste the setup prompt below. "
             "This is a generic setup kit, not a configured deployment. All example records are blank. "
             "Keep personalized records private. The full prompt and guides are embedded here; "
             "references to other kit files resolve to the corresponding sections below.\n"]
    for path in paths:
        relative = path.relative_to(ROOT).as_posix()
        body = path.read_text()
        if path.suffix == ".json":
            body = "```json\n" + body + "```\n"
        parts.append("\n---\n\n# File: " + relative + "\n\n" + body)
    return "\n".join(parts)

if __name__ == "__main__":
    output = ROOT / "CHATGPT-SETUP-PACK.md"
    output.write_text(render())
    print(f"Built {output.name}: {output.stat().st_size:,} bytes")
