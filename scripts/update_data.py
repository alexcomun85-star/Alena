"""Раз в день собирает свежие новости науки и посты Telegram-канала в data/*.json.
Запускается из GitHub Actions перед публикацией сайта. Ошибки источников не ломают сборку."""
import json, os, re, datetime, html
import requests, feedparser
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (alenafit.com site updater)"}
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes")

FEEDS = [
    ("ScienceDaily · Фитнес", "https://www.sciencedaily.com/rss/health_medicine/fitness.xml", "en"),
    ("ScienceDaily · Питание", "https://www.sciencedaily.com/rss/health_medicine/nutrition.xml", "en"),
    ("British Journal of Sports Medicine", "https://bjsm.bmj.com/rss/current.xml", "en"),
]
# Темы, которые противоречат границам бренда или звучат как кликбейт
BLOCK = re.compile(r"cannabis|marijuana|alcohol|drink|gummies|supplement|pill|drug|ozempic|semaglutide|tirzepatide|glp-1|"
                   r"burns? fat|fat[- ]burning|weight[- ]loss|lose weight|detox|miracle|secret|hidden switch|dark side|cancer|suicid|eating disorder",
                   re.I)
LIMIT_NEWS = 12
LIMIT_POSTS = 6


def clean(text, n):
    text = re.sub(r"\s+", " ", html.unescape(BeautifulSoup(text or "", "html.parser").get_text(" "))).strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def news():
    items, seen = [], set()
    for source, url, lang in FEEDS:
        try:
            r = requests.get(url, headers=UA, timeout=20)
            r.raise_for_status()
            feed = feedparser.parse(r.content)
        except Exception as e:  # источник недоступен — пропускаем
            print("news fail", source, e)
            continue
        for e in feed.entries:
            title = clean(e.get("title", ""), 200)
            link = e.get("link", "")
            if not title or not link or BLOCK.search(title) or title.lower() in seen:
                continue
            seen.add(title.lower())
            t = e.get("published_parsed") or e.get("updated_parsed")
            date = datetime.datetime(*t[:6]).date().isoformat() if t else None
            items.append({"title": title, "link": link, "source": source, "lang": lang, "date": date})
    items.sort(key=lambda x: x["date"] or "", reverse=True)
    return items[:LIMIT_NEWS]


def channel(name):
    if not name:
        return []
    try:
        r = requests.get(f"https://t.me/s/{name}", headers=UA, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print("channel fail", e)
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    posts = []
    for m in soup.select(".tgme_widget_message[data-post]"):
        txt = m.select_one(".tgme_widget_message_text")
        if not txt:
            continue
        text = clean(txt.decode_contents().replace("<br/>", " "), 280)
        tm = m.select_one("time[datetime]")
        posts.append({
            "text": text,
            "link": "https://t.me/" + m["data-post"],
            "date": tm["datetime"][:10] if tm else None,
        })
    return list(reversed(posts))[:LIMIT_POSTS]


def write(path, data):
    os.makedirs("data", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    ch = os.environ.get("TG_CHANNEL", "").strip().lstrip("@")
    write("data/news.json", {"updated": NOW, "items": news()})
    write("data/channel.json", {"updated": NOW, "channel": ch, "items": channel(ch)})
    print("done")
