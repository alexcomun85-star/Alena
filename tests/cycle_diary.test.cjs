/* Настоящие cycle.js и cycle-diary.js: отказы хранилища, старый формат, перенос, откат. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path'), base = path.join(__dirname, '..');
let count = 0;
function eq(a, b) { assert.deepEqual(a, b); count++; }
const KEY = 'cycle_diary_v1', BACK = KEY + '_backup';
const row = { date: '2026-09-01', d: 8, e: 3, t: 2 };
function app(initial = {}) {
  const data = new Map(Object.entries(initial)), els = new Map();
  let denied = false, failKey = null, accept = true, downloads = [], fileContent = '';
  function el(id) {
    if (!els.has(id)) els.set(id, { value: '', textContent: '', innerHTML: '', checked: false,
      disabled: false, files: [], events: {}, addEventListener(k, f) { this.events[k] = f; },
      focus() {}, click() { downloads.push(fileContent); }, remove() {}, });
    return els.get(id);
  }
  const doc = { readyState: 'loading', getElementById: el, addEventListener() {},
    querySelectorAll() { return []; }, querySelector(s) { return { value: s.includes('cEn') ? '3' : '2' }; },
    createElement() { return el('download'); }, body: { appendChild() {} } };
  const ctx = { window: {}, document: doc,
    localStorage: { getItem: k => data.has(k) ? data.get(k) : null,
      setItem(k, v) { if (denied || k === failKey) throw Error('QuotaExceededError'); data.set(k, v); },
      removeItem(k) { if (denied || k === failKey) throw Error('SecurityError'); data.delete(k); } },
    Blob: class { constructor(parts) { fileContent = parts.join(''); } },
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
    FileReader: class { readAsText(f) { this.result = f.content; this.onload(); } },
    confirm: () => accept, setTimeout() {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'js/cycle.js'), 'utf8'), ctx);
  ctx.Cycle = ctx.window.Cycle;
  vm.runInNewContext(fs.readFileSync(path.join(base, 'js/cycle-diary.js'), 'utf8'), ctx);
  function fire(id, type = 'click') { el(id).events[type].call(el(id)); }
  return { el, data, ctx, fire, deny(v) { denied = v; }, fail(k) { failKey = k; }, accept(v) { accept = v; },
    state() { return JSON.parse(data.get(KEY) || '[]'); },
    save(d = '12') { el('cDay').value = d; fire('cSave'); },
    import(x) { const content = typeof x === 'string' ? x : JSON.stringify(x); el('cycleImport').files = [{ content, size: content.length }]; fire('cycleImport', 'change'); },
    download(id) { fire(id); return downloads.at(-1); } };
}
let a = app({ [KEY]: JSON.stringify([row]) });
eq(a.el('cCount').textContent, 'Записей: 1.');
const original = a.data.get(KEY);
a.deny(true); a.save();
eq(a.data.get(KEY), original); eq(a.el('cCount').textContent, 'Записей: 1.');
eq(a.el('cMsg').textContent.includes('Не удалось сохранить'), true); eq(a.el('cDay').value, '12');
a.deny(false); a.save(); eq(a.state().length, 2); eq(a.el('cMsg').textContent.includes('Сохранено'), true);
for (const d of ['', '0', '61', '1.5', 'NaN', 'Infinity', '-1']) {
  const before = a.data.get(KEY); a.save(d); eq(a.data.get(KEY), before);
}
for (const raw of ['{}', 'null', '"text"', '{bad']) {
  a = app({ [KEY]: raw }); eq(a.el('cMsg').textContent.includes('повреждены'), true);
  a.save(); eq(a.data.get(KEY), raw); eq(a.download('cycleOriginal'), raw);
}
a = app({ [KEY]: JSON.stringify([row, { ...row, date: '2026-02-30' }]) });
eq(a.el('cCount').textContent, 'Записей: 1.'); eq(a.data.get(KEY + '_backup_load').includes('2026-02-30'), true);
eq(a.download('cycleOriginal').includes('2026-02-30'), true);
a = app({ [KEY]: JSON.stringify([row]) });
const exported = JSON.parse(a.download('cycleExport'));
eq(exported.format, 'alenafit-cycle-diary'); eq(exported.diary, [row]); eq('settings' in exported, false);
const incoming = { format: 'alenafit-cycle-diary', version: 1, diary: [{ ...row, date: '2026-09-02' }] };
for (const bad of ['{', {}, { ...incoming, version: 2 }, { ...incoming, diary: {} },
  { ...incoming, diary: [{ ...row, e: 6 }] }, { ...incoming, diary: [row, row] },
  { ...incoming, settings: { on: true, mode: 'regular', len: 999, per: 5 }, start: null }]) {
  const before = a.data.get(KEY); a.import(bad); eq(a.data.get(KEY), before); eq(a.el('cycleTransferMsg').textContent.includes('Файл не принят'), true);
}
a.accept(false); a.import(incoming); eq(a.state(), [row]);
a.accept(true); a.deny(true); a.import(incoming); eq(a.state(), [row]);
a.deny(false); a.import(incoming); eq(a.state(), incoming.diary); eq(JSON.parse(a.data.get(BACK)).diary, JSON.stringify([row]));
a.fire('cycleRestore'); eq(a.state(), [row]);
a.fire('cWipe'); a.fire('cWipe'); eq(a.state(), []); a.fire('cycleRestore'); eq(a.state(), [row]);
a = app({ [KEY]: JSON.stringify([row]), cycle_settings_v1: JSON.stringify({ on: false, mode: 'regular', len: 28, per: 5 }), cycle_start_v1: '2026-09-01' });
const pack = { ...incoming, settings: { on: true, mode: 'irregular', len: 30, per: 6 }, start: '2026-09-02' };
a.import(pack); eq(JSON.parse(a.data.get('cycle_settings_v1')).on, false); eq(a.data.get('cycle_start_v1'), '2026-09-01');
a.el('cycleWithSettings').checked = true;
a.fail('cycle_settings_v1'); const before = a.data.get(KEY); a.import(pack); eq(a.data.get(KEY), before); eq(a.data.get('cycle_start_v1'), '2026-09-01');
a.fail(null); a.import(pack); eq(JSON.parse(a.data.get('cycle_settings_v1')), pack.settings); eq(a.data.get('cycle_start_v1'), pack.start);
a.fire('cycleRestore'); eq(JSON.parse(a.data.get('cycle_settings_v1')).on, false); eq(a.data.get('cycle_start_v1'), '2026-09-01');
a.deny(true); eq(a.ctx.Cycle.set({ on: true }), false); eq(a.ctx.Cycle.get().on, false);
eq(a.ctx.Cycle.setStart('2026-09-03'), false); eq(a.data.get('cycle_start_v1'), '2026-09-01');
a.deny(false); eq(a.ctx.Cycle.set({ len: 100 }), false); eq(a.ctx.Cycle.get().len, 28);
eq(a.ctx.Cycle.setStart('2026-02-30'), false);
console.log(count + ' проверок дневника и настроек цикла пройдены');
