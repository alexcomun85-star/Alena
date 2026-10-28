"""Небольшая открытая выборка товаров рынка РФ; при отказе API сохраняется прежний файл.
Данные Open Food Facts, ODbL: https://opendatacommons.org/licenses/odbl/1-0/.
Запросы не содержат данных посетителей. Это не полная база российских продуктов.
"""
import datetime
import html
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen


def select(products):
    out, seen = [], set()
    for p in products:
        code = str(p.get('code', ''))
        name = html.unescape(p.get('product_name_ru') or p.get('product_name') or '').strip()
        n = p.get('nutriments') or {}
        fields = ['energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g']
        values = [n.get(k) for k in fields]
        if not (code.isdigit() and 8 <= len(code) <= 14 and code not in seen and 0 < len(name) <= 200):
            continue
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in values):
            continue
        k, protein, fat, carb = values
        if not (0 <= k <= 910 and all(0 <= v <= 100 for v in values[1:]) and sum(values[1:]) <= 101.5):
            continue
        seen.add(code)
        brands = p.get('brands') or []
        out.append({'code': code, 'product_name_ru': name,
                    'brands': ', '.join(brands) if isinstance(brands, list) else str(brands),
                    'nutriments': dict(zip(fields, values))})
    return out


def refresh(path='data/products-ru.json'):
    rows = []
    for q, size in [('countries_tags:"en:russia"', 100),
                    ('countries_tags:"en:russia" AND молоко', 30),
                    ('countries_tags:"en:russia" AND творог', 30)]:
        try:
            payload = {'q': q, 'langs': ['ru', 'en'], 'page_size': size,
                       'fields': ['code', 'product_name', 'product_name_ru', 'brands', 'nutriments']}
            request = Request('https://search.openfoodfacts.org/search', data=json.dumps(payload).encode(),
                              headers={'Content-Type': 'application/json', 'User-Agent': 'ALENAFIT/1.0 (https://alenafit.com/)'})
            with urlopen(request, timeout=15) as response:
                rows.extend(json.load(response).get('hits', []))
        except Exception as error:
            print('products: source unavailable', type(error).__name__)
    rows = select(rows)
    if not rows:
        print('products: keeping previous snapshot')
        return
    destination = Path(path)
    # A partial outage must not replace a larger usable snapshot with just a handful of results.
    if destination.exists():
        try:
            old = json.loads(destination.read_text())
            if len(rows) < len(old.get('products', [])) // 2:
                print('products: keeping fuller previous snapshot')
                return
        except (ValueError, OSError):
            pass
    destination.parent.mkdir(exist_ok=True, parents=True)
    destination.write_text(json.dumps({'source': 'Open Food Facts', 'license': 'ODbL-1.0',
        'updated': datetime.date.today().isoformat(), 'products': rows}, ensure_ascii=False, indent=1))
    print('products:', len(rows))


if __name__ == '__main__':
    refresh()
