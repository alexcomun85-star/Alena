/* Событие смены ширины проверяется на настоящем nav.js без запуска браузера. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const classes = new Set();
function element() {
  return { hidden: true, events: {}, attrs: {}, lastChild: { textContent: '' },
    addEventListener(k, f) { this.events[k] = f; }, setAttribute(k, v) { this.attrs[k] = v; },
    querySelectorAll() { return []; }, querySelector() { return { focus() {}, textContent: '' }; },
    focus() {}, scrollHeight: 600 };
}
const menu = element(), btn = element(), dockMenu = element();
const wide = { matches: false, addEventListener(_, f) { this.change = f; } };
const dock = element();dock.querySelector = () => null;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/nav.js'), 'utf8'), {
  location: { pathname: '/kalorii.html' },
  window: { navigator: {}, matchMedia(q) { return q === '(min-width:1024px)' ? wide : {matches:false}; } },
  document: {
    querySelectorAll() { return []; }, addEventListener() {}, createElement() { return dock; },
    getElementById(id) { return {mnav: menu, menuBtn: btn, dockMenu}[id]; },
    body: { appendChild() {}, classList: { toggle(k, on) { on ? classes.add(k) : classes.delete(k); } } },
  },
});
dockMenu.events.click();
assert.equal(menu.hidden, false);assert.equal(classes.has('menu-open'), true);
wide.matches = true;wide.change();
assert.equal(menu.hidden, true);assert.equal(classes.has('menu-open'), false);
assert.equal(dockMenu.attrs['aria-expanded'], false);
wide.matches = false;wide.change();dockMenu.events.click();
assert.equal(menu.hidden, false);assert.equal(classes.has('menu-open'), true);
console.log('7 проверок смены ширины и меню пройдены');
