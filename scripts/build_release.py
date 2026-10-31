"""Рабочая главная из пилота: python3 scripts/build_release.py .
Порядок: index.html (исходник) → build_pilot → build_pilot_v2 → build_pilot_copy → index.html.
Исходник главной до пилота хранится в scripts/index_source.html; откат — ветка rollback-2026-10-31."""
import re, sys, shutil, subprocess, pathlib
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
src = root / "scripts" / "index_source.html"
if not src.exists():
    shutil.copy(root / "index.html", src)
shutil.copy(src, root / "index.html")
for s in ["build_pilot.py", "build_pilot_v2.py", "build_pilot_copy.py"]:
    subprocess.run([sys.executable, str(root / "scripts" / s), str(root)], check=True)
h = (root / "pilot.html").read_text(encoding="utf-8")
h = h.replace('<meta name="robots" content="noindex,nofollow">\n', '')
h = re.sub(r'<div class="pilot-flag"[^>]*>.*?</div>\n', '', h, count=1, flags=re.S)
h = h.replace('<title>[Пилот] ', '<title>')
assert 'noindex' not in h and 'pilot-flag"' not in h and 'СТАРТ<' not in h
(root / "index.html").write_text(h, encoding="utf-8")
(root / "pilot.html").unlink()
print("release index ok", len(h))
