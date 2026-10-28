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
            summary = clean(e.get("summary", ""), 420)
            if summary.lower().startswith(title.lower()[:40]):
                summary = ""
            items.append({"title": title, "summary": summary, "link": link, "source": source, "lang": lang, "date": date})
    items.sort(key=lambda x: x["date"] or "", reverse=True)
    return items[:LIMIT_NEWS]


TR_URL = "https://translate.api.cloud.yandex.net/translate/v2/translate"
TR_STATUS = {"state": "not_run"}
CACHE = os.path.expanduser(os.environ.get("TR_CACHE", "~/tr-cache/translations.json"))


def translate(items):
    """Переводит новые заголовки через Яндекс Переводчик. Без ключа — оставляет оригинал.
    Уже переведённые заголовки берутся из кэша, чтобы не платить за них повторно."""
    key, folder = os.environ.get("YC_API_KEY", "").strip(), os.environ.get("YC_FOLDER_ID", "").strip()
    try:
        cache = json.load(open(CACHE, encoding="utf-8"))
    except Exception:
        cache = {}
    texts = []
    for it in items:
        if it.get("lang") == "en":
            texts += [it["title"]] + ([it["summary"]] if it.get("summary") else [])
    todo = [t for t in dict.fromkeys(texts) if t not in cache]
    TR_STATUS.update(state="no_key" if not (key and folder) else ("cached" if not todo else "pending"),
                     has_key=bool(key), has_folder=bool(folder), folder_prefix=folder[:3])
    if todo and key and folder:
        try:
            r = requests.post(TR_URL, headers={"Authorization": f"Api-Key {key}"}, timeout=30,
                              json={"folderId": folder, "texts": todo, "sourceLanguageCode": "en", "targetLanguageCode": "ru"})
            if r.status_code != 200:
                TR_STATUS.update(state="error", http=r.status_code, message=r.text[:300])
            r.raise_for_status()
            for src, t in zip(todo, r.json().get("translations", [])):
                if t.get("text"):
                    cache[src] = t["text"]
            print("translated", len(todo))
            TR_STATUS.update(state="ok", translated=len(todo))
        except Exception as e:  # перевод недоступен — показываем оригинал
            print("translate fail", e)
            if TR_STATUS.get("state") != "error":
                TR_STATUS.update(state="error", message=str(e)[:300])
    for it in items:
        if it["title"] in cache:
            it["title_ru"] = cache[it["title"]]
        if it.get("summary") in cache:
            it["summary_ru"] = cache[it["summary"]]
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    keep = {it["title"] for it in items} | {it.get("summary") for it in items if it.get("summary")}
    json.dump({k: v for k, v in cache.items() if k in keep}, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return items


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
    seen = set()
    for m in soup.select(".tgme_widget_message[data-post]"):
        if "service_message" in (m.get("class") or []):  # «канал создан», «сообщение закреплено»
            continue
        txt = m.select_one(".tgme_widget_message_text")
        if not txt:
            continue
        text = clean(txt.decode_contents().replace("<br/>", " "), 280)
        if not text or text in seen or re.match(r"(channel created|канал создан|.*\b(pinned|закрепил))", text, re.I):
            continue
        seen.add(text)
        tm = m.select_one("time[datetime]")
        posts.append({
            "text": text,
            "link": "https://t.me/" + m["data-post"],
            "date": tm["datetime"][:10] if tm else None,
        })
    return list(reversed(posts))[:LIMIT_POSTS]


ANSWER_TAGS = ("#вопрос", "#разбор")


def answers(name, pages=6, tags=ANSWER_TAGS):
    """Посты с нужными тегами (по умолчанию #вопрос / #разбор). Листаем ленту назад."""
    if not name:
        return []
    out, seen, before = [], set(), None
    for _ in range(pages):
        url = f"https://t.me/s/{name}" + (f"?before={before}" if before else "")
        try:
            r = requests.get(url, headers=UA, timeout=20)
            r.raise_for_status()
        except Exception as e:
            print("answers fail", e)
            break
        soup = BeautifulSoup(r.text, "html.parser")
        msgs = soup.select(".tgme_widget_message[data-post]")
        if not msgs:
            break
        ids = []
        for m in msgs:
            try:
                ids.append(int(m["data-post"].rsplit("/", 1)[1]))
            except (ValueError, IndexError):
                pass
            txt = m.select_one(".tgme_widget_message_text")
            if not txt or m["data-post"] in seen:
                continue
            raw = clean(txt.decode_contents().replace("<br/>", " "), 5000)
            low = raw.lower()
            if not any(t in low for t in tags):
                continue
            seen.add(m["data-post"])
            tm = m.select_one("time[datetime]")
            out.append({
                "tag": next((t[1:] for t in tags if t in low), tags[0][1:]),
                "text": clean(raw, 600),
                "link": "https://t.me/" + m["data-post"],
                "date": tm["datetime"][:10] if tm else None,
            })
        new_before = min(ids) if ids else None
        if not new_before or new_before == before or new_before <= 1:
            break
        before = new_before
    out.sort(key=lambda x: x["date"] or "", reverse=True)
    return out[:40]


def write(path, data):
    os.makedirs("data", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    ch = os.environ.get("TG_CHANNEL", "").strip().lstrip("@")
    items = translate(news())
    write("data/news.json", {"updated": NOW, "translation": TR_STATUS, "items": items})
    write("data/channel.json", {"updated": NOW, "channel": ch, "items": channel(ch)})
    write("data/answers.json", {"updated": NOW, "channel": ch, "items": answers(ch)})
    write("data/recipes.json", {"updated": NOW, "channel": ch, "items": answers(ch, tags=("#рецепт",))})
    from update_products import refresh
    refresh()
    print("done")
