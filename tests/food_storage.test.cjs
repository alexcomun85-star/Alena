/* Проверяет настоящий food.js без браузера: ошибки записи, импорт и восстановление. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/food.js'), 'utf8');
let checks = 0;
function eq(a, b) { assert.deepEqual(a, b); checks++; }

function app(initial) {
  const nodes = new Map(), data = new Map(Object.entries(initial || {}));
  let denied = false, accept = true;
  function el(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: id === 'fMeal' ? 'Завтрак' : '', textContent: '', innerHTML: '', hidden: false,
      files: [], events: {}, attrs: {}, disabled: false,
      addEventListener(type, callback) { this.events[type] = callback; },
      setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, remove() {}, click() {},
    });
    return nodes.get(id);
  }
  const context = {
    window: { FOOD_DB: [['Яблоко', 52, .3, .2, 13.8, 'Фрукты', 'U', 180, 'яблоко']] },
    document: { getElementById: el, createElement: () => el('download'), body: { appendChild() {} } },
    localStorage: {
      getItem(k) { return data.has(k) ? data.get(k) : null; },
      setItem(k, v) { if (denied) throw Error('QuotaExceededError'); data.set(k, v); },
      removeItem(k) { if (denied) throw Error('SecurityError'); data.delete(k); },
    },
    FileReader: class { readAsText(file) { this.result = file.content; this.onload(); } },
    location: {}, confirm: () => accept,
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
    Blob: class {}, setTimeout() {}, clearTimeout() {}, console,
  };
  vm.runInNewContext(source, context);
  function fire(id, type, event = {}) { return el(id).events[type].call(el(id), event); }
  return {
    el, data, fire, deny(v) { denied = v; }, accept(v) { accept = v; },
    raw() { return data.get('food_v1'); },
    state() { return JSON.parse(data.get('food_v1') || '{"custom":[],"days":{}}'); },
    product() {
      for (const [k, v] of Object.entries({ cName: 'Тестовый продукт', cK: '', cP: '10', cF: '10', cC: '20' })) el(k).value = v;
      fire('cAdd', 'click');
    },
    select() { fire('fRes', 'click', { target: { closest: () => ({ dataset: { id: 'b0' } }) } }); },
    import(value) {
      const content = typeof value === 'string' ? value : JSON.stringify(value);
      el('foodImport').files = [{ content, size: content.length }]; fire('foodImport', 'change');
    },
  };
}

let a = app();
a.product();
eq(a.state().custom[0].k, 210);
const raw = a.raw();
a.deny(true);a.product();
eq(a.raw(), raw);
eq(a.el('cName').value, 'Тестовый продукт');
eq(a.el('cMsg').textContent.includes('Не удалось сохранить'), true);
a.select();
a.el('fG').value = '200';a.fire('fG', 'input');a.fire('fAdd', 'click');
eq(a.raw(), raw);eq(a.el('fSel').hidden, false);
a.deny(false);
for (const weight of ['', '0', '-100', '0.5', '3001', 'abc', 'Infinity']) {
  a.el('fG').value = weight;a.fire('fG', 'input');a.fire('fAdd', 'click');
  eq(a.raw(), raw);eq(a.el('fSelCalc').textContent.includes('-52'), false);
}
a.el('fG').value = '200';a.fire('fG', 'input');
eq(a.el('fSelCalc').textContent.startsWith('104 ккал'), true);
a.fire('fAdd', 'click');
eq(Object.values(a.state().days)[0][0].k, 104);
const before = a.raw();
for (const bad of ['{', {}, {custom: null, days: {}}, {custom: [], days: {'2026-02-30': []}},
  {format: 'alenafit-food', version: 99, data: {custom: [], days: {}}}]) {
  a.import(bad);eq(a.raw(), before);
}
a.import('{"custom":[],"days":{"__proto__":[]}}');eq(a.raw(), before);
a.import('{"custom":[{"id":"c1","name":"x","k":1e309,"p":0,"f":0,"c":0}],"days":{}}');eq(a.raw(), before);
a.accept(false);a.import({custom: [], days: {}});eq(a.raw(), before);
a.accept(true);a.deny(true);a.import({custom: [], days: {}});eq(a.raw(), before);
a.deny(false);a.import({format: 'alenafit-food', version: 1, data: {custom: [], days: {}}});
eq(a.state(), {custom: [], days: {}});eq(a.data.get('food_v1_backup'), before);
a.fire('foodRestore', 'click');eq(a.raw(), before);
a.fire('fWipe', 'click');a.fire('fWipe', 'click');eq(a.state(), {custom: [], days: {}});
a.fire('foodRestore', 'click');eq(a.raw(), before);
a = app({food_v1: '{broken'});a.product();eq(a.raw(), '{broken');
eq(a.el('foodTransferMsg').textContent.includes('повреждены'), true);
/* Старые записи: доли грамма и длинные названия принимаются, неверная запись не блокирует дневник. */
const legacy = {custom: [{id: 'c1', name: 'Масло', k: 899, p: 0, f: 99.9, c: 0, pg: 100, pl: '100 г'}],
  days: {'2026-10-20': [{name: 'Соль', g: .5, meal: 'Обед', k: 0, p: 0, f: 0, c: 0},
    {name: 'Й'.repeat(250), g: 100, meal: 'Обед', k: 100, p: 5, f: 1, c: 10},
    {name: 'Сломанная', g: 100, meal: 'Ужин', k: -5, p: 0, f: 0, c: 0}]}};
a = app({food_v1: JSON.stringify(legacy)});
eq(a.state().days['2026-10-20'].length, 2);
eq(a.state().days['2026-10-20'][0].g, .5);
eq(a.state().days['2026-10-20'][1].name.length, 200);
eq(a.data.get('food_v1_backup'), JSON.stringify(legacy));
eq(a.el('foodTransferMsg').textContent.includes('(1)'), true);
a.product();eq(a.state().custom.length, 2);
const ok = {custom: [], days: {'2026-10-21': [{name: 'Соль', g: .5, meal: 'Обед', k: 0, p: 0, f: 0, c: 0}]}};
a = app({food_v1: JSON.stringify(ok)});
eq(a.el('foodTransferMsg').textContent, '');eq(a.data.has('food_v1_backup'), false);
console.log(`${checks} проверок food.js пройдены`);
