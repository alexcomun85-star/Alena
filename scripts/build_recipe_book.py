#!/usr/bin/env python3
"""Собирает js/recipe-book.js из data/recipe-book.src.json.

КБЖУ считается по js/food-db.js (USDA FDC и этикетки), «польза» — только по
правилам из посчитанного состава. Ничего не придумывается: продукт, которого нет
в FOOD_DB, или неизвестный id — ошибка сборки.

Запуск: python3 scripts/build_recipe_book.py
"""
import json, re, subprocess, sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'recipe-book.src.json'
OUT = ROOT / 'js' / 'recipe-book.js'

MEALS = {'breakfast': 'Завтрак', 'lunch': 'Обед', 'soup': 'Суп', 'dinner': 'Ужин', 'snack': 'Перекус', 'dessert': 'Десерт'}
WHOLE_GRAINS = {'Гречка сухая', 'Овсяные хлопья сухие', 'Хлеб цельнозерновой'}
CALCIUM_DAIRY = {'Молоко 2,5%', 'Молоко 3,2%', 'Кефир 1%', 'Кефир 2,5%', 'Ряженка 4%', 'Йогурт натуральный 2%',
                 'Греческий йогурт 2%', 'Творог 2%', 'Творог 5%', 'Творог 9%', 'Сыр твёрдый (типа Российского)', 'Сыр моцарелла'}
FREE_SUGARS = {'Мёд', 'Сахар'}
REFS = {
    'who': ['ВОЗ: здоровое питание', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'],
    'issn': ['ISSN: позиция по белку, 2017', 'https://doi.org/10.1186/s12970-017-0177-8'],
    'usda': ['USDA FoodData Central', 'https://fdc.nal.usda.gov/'],
}


def r(x, places='0.1'):
    return float(Decimal(str(x)).quantize(Decimal(places), rounding=ROUND_HALF_UP))


def load_db():
    js = (ROOT / 'js' / 'food-db.js').read_text(encoding='utf-8')
    code = "global.window={};" + js + ";process.stdout.write(JSON.stringify(window.FOOD_DB))"
    rows = json.loads(subprocess.run(['node', '-e', code], capture_output=True, text=True, check=True).stdout)
    return {row[0]: {'k': row[1], 'p': row[2], 'f': row[3], 'c': row[4], 'cat': row[5], 'src': row[6]} for row in rows}


def engine_ids():
    js = (ROOT / 'js' / 'recipe-engine.js').read_text(encoding='utf-8')
    block = js.split('const I={', 1)[1].split('\n};', 1)[0]
    return set(re.findall(r"(\w+):\['", block))


def fmt(x):
    s = ('%g' % x)
    return s.replace('.', ',')


def build():
    db, ids = load_db(), engine_ids()
    src = json.loads(SRC.read_text(encoding='utf-8'))['recipes']
    errors, out, seen = [], [], set()
    for rec in src:
        rid = rec['id']
        if rid in seen:
            errors.append(f'{rid}: повтор id')
        seen.add(rid)
        if rec['meal'] not in MEALS:
            errors.append(f'{rid}: неизвестный приём пищи {rec["meal"]}')
        req, opt = rec['required'].split(), rec['optional'].split()
        for i in req + opt:
            if i not in ids:
                errors.append(f'{rid}: id «{i}» нет в recipe-engine.js')
        if len(rec['ing']) > 8:
            errors.append(f'{rid}: больше 8 продуктов')
        if rec['time'] > 45:
            errors.append(f'{rid}: дольше 45 минут')
        tot = {'k': 0, 'p': 0, 'f': 0, 'c': 0}
        veg = grains = legumes = dairy = sugar = 0
        contains, ing_out = [], []
        for label, grams, name, factor, iid in rec['ing']:
            row = db.get(name)
            if not row:
                errors.append(f'{rid}: «{name}» нет в FOOD_DB')
                continue
            ready = grams * factor
            for key in tot:
                tot[key] += row[key] * ready / 100
            if row['cat'] in ('Овощи и грибы', 'Фрукты и ягоды'):
                veg += grams
            if name in WHOLE_GRAINS:
                grains += grams
            if iid in ('lentil', 'beans', 'chickpea'):
                legumes += ready
            if name in CALCIUM_DAIRY:
                dairy += grams
            if name in FREE_SUGARS:
                sugar += row['c'] * ready / 100
            contains.append(iid)
            ing_out.append([label, grams])
        n = rec['servings']
        per = {'k': r(tot['k'] / n, '1'), 'p': r(tot['p'] / n), 'f': r(tot['f'] / n), 'c': r(tot['c'] / n)}
        kcal_from_macros = per['p'] * 4 + per['f'] * 9 + per['c'] * 4
        if per['k'] and abs(kcal_from_macros - per['k']) / per['k'] > 0.12:
            errors.append(f'{rid}: ккал {per["k"]} не сходятся с БЖУ ({kcal_from_macros:.0f})')
        good, refs = [], {'usda'}
        if per['p'] >= 20:
            good.append(f'Белка {fmt(per["p"])} г на порцию. Тем, кто тренируется, обычно советуют 1,4–2 г белка на кг веса в день.')
            refs.add('issn')
        vp = veg / n
        if vp >= 100:
            good.append(f'Овощей и фруктов около {fmt(r(vp, "1"))} г на порцию. ВОЗ советует не меньше 400 г в день, картофель не в счёт.')
            refs.add('who')
        if grains:
            good.append('Цельное зерно: ВОЗ относит цельные злаки к основе здорового рациона.')
            refs.add('who')
        if legumes:
            good.append('Бобовые дают растительный белок и клетчатку; ВОЗ советует включать их в рацион.')
            refs.add('who')
        if dairy / n >= 150:
            good.append('Молочные продукты — один из основных источников кальция.')
        if sugar:
            good.append(f'Мёд добавляет около {fmt(r(sugar / n))} г свободных сахаров на порцию. ВОЗ советует держать свободные сахара ниже 10% калорий за день.')
            refs.add('who')
        if not good:
            errors.append(f'{rid}: нет ни одного обоснованного пункта пользы')
        out.append({
            'id': rid, 'title': rec['title'], 'meal': rec['meal'], 'mealName': MEALS[rec['meal']],
            'servings': n, 'time': rec['time'], 'required': req, 'optional': opt, 'contains': sorted(set(contains)),
            'ing': ing_out, 'taste': rec.get('taste', ''), 'steps': rec['steps'], 'note': rec.get('note', ''),
            'n': per, 'good': good, 'refs': [REFS[k] for k in ('usda', 'issn', 'who') if k in refs],
        })
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        sys.exit(1)
    head = ('/* Книга рецептов Афиты. СГЕНЕРИРОВАНО scripts/build_recipe_book.py из data/recipe-book.src.json — вручную не править.\n'
            '   КБЖУ на порцию по js/food-db.js; выход мяса и рыбы 0,75, сухой чечевицы 2,5 (допущения). */\n')
    body = 'window.AFITA_BOOK=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n' \
           "if(typeof module!=='undefined'&&module.exports)module.exports=window.AFITA_BOOK;\n"
    OUT.write_text(head + "(function(window){" + body + "})(typeof window!=='undefined'?window:globalThis);\n", encoding='utf-8')
    by = {}
    for x in out:
        by[x['mealName']] = by.get(x['mealName'], 0) + 1
    print(f'{len(out)} рецептов → {OUT.relative_to(ROOT)}: ' + ', '.join(f'{k} {v}' for k, v in by.items()))
    for x in out:
        print(f"  {x['title']}: {x['n']['k']:.0f} ккал · Б {x['n']['p']} · Ж {x['n']['f']} · У {x['n']['c']} (порций {x['servings']})")


if __name__ == '__main__':
    build()
