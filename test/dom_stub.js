/* DOM-stub loader (test helper, v0.11.5): runs the real engine + real UI files (components, views,
   app.js) in a vm sandbox with a fake document/window/localStorage, so the
   views and the click dispatcher can be exercised from Node. Read-only on
   the repo. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const { ENGINE_FILES } = require(ROOT + '/test/load_engine');
const UI_FILES = ['components.js', 'views_desk.js', 'views_talent.js', 'views_groups.js', 'views_studio.js', 'views_industry.js', 'app.js'];

function makeElement(id) {
  const e = {
    id, innerHTML: '', textContent: '', value: '', hidden: false, style: {}, dataset: {}, files: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, remove() {}, click() {}, select() {},
    closest() { return null; },
  };
  return e;
}

function load(opts) {
  opts = opts || {};
  const listeners = {};
  const store = new Map();
  const elements = {};
  const nullIds = new Set(opts.nullIds || []);
  const el = id => { if (nullIds.has(id)) return null; return elements[id] || (elements[id] = makeElement(id)); };
  const document = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    getElementById(id) { return el(id); },
    querySelector(sel) { if (sel === '.tb-company') return el('tb-company'); return null; },
    querySelectorAll() { return []; },
    createElement() { return makeElement('_tmp'); },
    body: { appendChild() {} },
    documentElement: { style: { setProperty() {}, removeProperty() {} } },
    execCommand() { return true; },
  };
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { if (opts.quotaFull) throw new Error('QuotaExceededError'); store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
    _store: store,
  };
  const sandbox = {
    console, Math, JSON, Date, setTimeout, clearTimeout, document, localStorage,
    navigator: { vibrate: null, storage: null, clipboard: null },
    location: { protocol: 'http:' },
    URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
    Blob: function () {},
    FileReader: function () {},
    scrollTo() {}, scrollY: 0,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  ENGINE_FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/engine', f), 'utf8'), sandbox, { filename: 'engine/' + f }));
  UI_FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8'), sandbox, { filename: 'ui/' + f }));
  const KP = sandbox.KP;
  const App = KP.App;
  // fire a click on a fake element carrying `dataset`
  function click(dataset) {
    const t = { dataset: Object.assign({}, dataset), closest() { return t; }, classList: { contains() { return false; } } };
    const ev = { target: { closest() { return t; }, id: '', classList: { contains() { return false; } } } };
    (listeners.click || []).forEach(fn => fn(ev));
  }
  function input(id, value, extra) {
    const t = Object.assign({ id, value, dataset: {}, classList: { contains() { return false; } }, closest() { return null; } }, extra || {});
    (listeners.input || []).forEach(fn => fn({ target: t }));
  }
  function change(id, value, dataset) {
    const t = { id, value, dataset: dataset || {}, files: null };
    (listeners.change || []).forEach(fn => fn({ target: t }));
  }
  function boot() { (listeners.load || []).forEach(fn => fn()); }
  return { KP, App, UI: KP.UI, sandbox, listeners, elements, el, localStorage, click, input, change, boot, nullIds };
}

// parse every tag carrying data-action out of an HTML string
function actionsIn(html) {
  const out = [];
  const re = /<(\w+)([^>]*?)\sdata-action="([^"]*)"([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2] + ' ' + m[4];
    const ds = {};
    const ar = /data-([\w-]+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(attrs))) ds[a[1].replace(/-(\w)/g, (_, c) => c.toUpperCase())] = a[2];
    ds.action = m[3];
    out.push({ tag: m[1], action: m[3], dataset: ds, disabled: /\sdisabled\b/.test(attrs) });
  }
  return out;
}
function stripTags(html) { return String(html).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

module.exports = { load, actionsIn, stripTags, ROOT, UI_FILES };
