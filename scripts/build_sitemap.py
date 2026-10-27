"""Собирает sitemap.xml: все страницы, кроме служебных, с датой последнего изменения из git.
Запуск из корня репозитория: python scripts/build_sitemap.py (в публикации запускается автоматически)."""
import glob
import subprocess

SITE = "https://alenafit.com/"
SKIP = {"404.html", "offline.html"}
# главная и ключевые инструменты — выше приоритет
PRIORITY = {"index.html": "1.0", "progress.html": "0.8", "servisy.html": "0.8", "kalorii.html": "0.8",
            "vozvrat.html": "0.8", "testy.html": "0.8", "trener.html": "0.8"}


def lastmod(fn):
    try:
        d = subprocess.run(["git", "log", "-1", "--format=%cs", "--", fn], capture_output=True, text=True).stdout.strip()
        return d or None
    except Exception:
        return None


def main():
    pages = sorted(glob.glob("*.html"), key=lambda f: (f != "index.html", f))
    rows = []
    for fn in pages:
        if fn in SKIP:
            continue
        s = open(fn, encoding="utf-8").read()
        if 'name="robots" content="noindex' in s:
            continue
        loc = SITE if fn == "index.html" else SITE + fn
        lm = lastmod(fn)
        rows.append("  <url><loc>%s</loc>%s<priority>%s</priority></url>" % (
            loc, "<lastmod>%s</lastmod>" % lm if lm else "", PRIORITY.get(fn, "0.6")))
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    open("sitemap.xml", "w", encoding="utf-8").write(xml)
    print("sitemap:", len(rows), "страниц")


if __name__ == "__main__":
    main()
