/* ECOCRACIA · Utilidades comunes */
window.ECO = window.ECO || {};
(function (E) {
  'use strict';
  const U = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** Formatea un número entero con separador de miles español. */
  U.fmt = (n) => {
    const r = Math.round(n);
    const s = Math.abs(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (r < 0 ? '−' : '') + s;
  };

  /** Número con signo (+3, −2). */
  U.signed = (n, dec) => {
    const f = dec ? Math.abs(n).toFixed(dec) : String(Math.round(Math.abs(n)));
    if (Number(f) === 0) return '0';
    return (n > 0 ? '+' : '−') + f;
  };

  /** Generador pseudoaleatorio con semilla (mulberry32). */
  U.rng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.clone = (o) => JSON.parse(JSON.stringify(o));

  U.pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

  U.shuffle = (arr, rng = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.weighted = (items, wfn, rng = Math.random) => {
    const ws = items.map(wfn);
    const tot = ws.reduce((a, b) => a + Math.max(0, b), 0);
    if (tot <= 0) return null;
    let r = rng() * tot;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, ws[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  E.util = U;
})(window.ECO);
