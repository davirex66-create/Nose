/* ECOCRACIA · Componentes de interfaz: modales, confirmaciones, notificaciones, tooltips, gráficas */
(function (E) {
  'use strict';
  const U = E.util;
  const UI = E.ui = {};

  /* ---------------- Chips de efectos ---------------- */
  UI.effChips = (eff, opts) => {
    opts = opts || {};
    const keys = E.IND_KEYS.filter((k) => eff && eff[k] && Math.abs(eff[k]) >= (opts.min || 0.05));
    if (!keys.length) return opts.empty || '';
    return keys.map((k) => {
      const v = eff[k];
      const cls = v > 0 ? 'pos' : 'neg';
      const txt = U.signed(v, opts.dec != null ? opts.dec : (Math.abs(v) < 1 ? 1 : 0));
      return '<span class="chip ' + cls + '" title="' + E.IND[k].name + '">' + E.IND[k].icon + ' ' + txt + (opts.suffix || '') + '</span>';
    }).join('');
  };
  UI.odsChips = (ods) => {
    const ns = Object.keys(ods || {}).filter((n) => ods[n]);
    return ns.map((n) => {
      const o = E.ODS_MAP[n]; const v = ods[n];
      return '<span class="chip ods ' + (v > 0 ? 'pos' : 'neg') + '" style="--odsc:' + o.color + '" title="ODS ' + n + ': ' + o.name + '"><b>' + n + '</b> ' + U.signed(v) + '</span>';
    }).join('');
  };
  UI.money = (n, plain) => (plain ? '' : '🪙 ') + U.fmt(n);

  /* ---------------- Modales ---------------- */
  const stack = [];
  UI.openModal = (o) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    wrap.innerHTML =
      '<div class="modal ' + (o.cls || '') + (o.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(o.title || '') + '">' +
      (o.title ? '<header class="modal-head">' + (o.icon ? '<span class="modal-icon">' + o.icon + '</span>' : '') + '<h2>' + o.title + '</h2>' +
        (o.dismissible !== false ? '<button class="icon-btn modal-x" data-mclose aria-label="Cerrar">✕</button>' : '') + '</header>' : '') +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      (o.buttons && o.buttons.length ? '<footer class="modal-foot">' + o.buttons.map((b, i) =>
        '<button class="btn ' + (b.cls || '') + '" data-mbtn="' + i + '"' + (b.disabled ? ' disabled' : '') + '>' + b.label + '</button>').join('') + '</footer>' : '') +
      '</div>';
    const entry = { el: wrap, o };
    wrap.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mbtn]');
      if (b && wrap.contains(b)) {
        const btn = o.buttons[+b.dataset.mbtn];
        if (btn.close !== false) UI.closeModal(entry);
        if (btn.onClick) btn.onClick();
        return;
      }
      if (ev.target.closest('[data-mclose]') || (ev.target === wrap && o.dismissible !== false)) {
        UI.closeModal(entry);
        if (o.onClose) o.onClose();
      }
    });
    root.appendChild(wrap);
    stack.push(entry);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const focusEl = wrap.querySelector('.btn-primary') || wrap.querySelector('.btn');
    if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 60);
    return entry;
  };
  UI.closeModal = (entry) => {
    entry = entry || stack[stack.length - 1];
    if (!entry) return;
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    entry.el.classList.remove('show');
    entry.el.classList.add('hide');
    setTimeout(() => entry.el.remove(), 220);
  };
  UI.closeAllModals = () => { while (stack.length) UI.closeModal(stack[stack.length - 1]); };
  UI.topModal = () => stack[stack.length - 1] || null;
  UI.hasModal = () => stack.length > 0;

  UI.confirm = (o) => new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    UI.openModal({
      title: o.title, icon: o.icon || '❓', body: o.body, cls: 'modal-confirm ' + (o.cls || ''),
      onClose: () => fin(false),
      buttons: [
        { label: o.cancel || 'Cancelar', cls: 'btn-ghost', onClick: () => fin(false) },
        { label: o.ok || 'Confirmar', cls: o.danger ? 'btn-danger' : 'btn-primary', onClick: () => fin(true) }
      ]
    });
  });

  UI.alert = (o) => new Promise((resolve) => {
    UI.openModal({ title: o.title, icon: o.icon, body: o.body, cls: o.cls, wide: o.wide, onClose: resolve, buttons: [{ label: o.ok || 'Aceptar', cls: 'btn-primary', onClick: resolve }] });
  });

  /* ---------------- Notificaciones ---------------- */
  UI.toast = (html, type, timeout) => {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.innerHTML = '<div class="toast-body">' + html + '</div><button class="toast-x" aria-label="Cerrar">✕</button>';
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    requestAnimationFrame(() => t.classList.add('show'));
    const kill = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); };
    t.querySelector('.toast-x').addEventListener('click', kill);
    setTimeout(kill, timeout || 4200);
  };

  /* ---------------- Tooltip ---------------- */
  const tip = { el: null, providers: {} };
  UI.tipProvider = (attr, fn) => { tip.providers[attr] = fn; };
  UI.showTip = (html, x, y) => {
    if (!tip.el) tip.el = document.getElementById('tooltip');
    tip.el.innerHTML = html;
    tip.el.classList.add('show');
    UI.moveTip(x, y);
  };
  UI.moveTip = (x, y) => {
    if (!tip.el || !tip.el.classList.contains('show')) return;
    const r = tip.el.getBoundingClientRect();
    let nx = x + 16, ny = y + 18;
    if (nx + r.width > window.innerWidth - 8) nx = x - r.width - 12;
    if (ny + r.height > window.innerHeight - 8) ny = y - r.height - 12;
    tip.el.style.transform = 'translate(' + Math.max(6, nx) + 'px,' + Math.max(6, ny) + 'px)';
  };
  UI.hideTip = () => { if (tip.el) tip.el.classList.remove('show'); };

  function tipFor(el) {
    if (el.dataset.tip) return U.esc(el.dataset.tip);
    for (const attr in tip.providers) if (el.dataset[attr] != null) return tip.providers[attr](el.dataset[attr], el);
    return null;
  }
  UI.initTooltips = () => {
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (!canHover) return;
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-tip],[data-tip-b],[data-tip-ind],[data-tip-law],[data-tip-ods]');
      if (!el) return;
      const html = tipFor(el);
      if (html) UI.showTip(html, e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => UI.moveTip(e.clientX, e.clientY));
    document.addEventListener('mouseout', (e) => {
      const el = e.target.closest('[data-tip],[data-tip-b],[data-tip-ind],[data-tip-law],[data-tip-ods]');
      if (el && !el.contains(e.relatedTarget)) UI.hideTip();
    });
    document.addEventListener('pointerdown', UI.hideTip);
  };

  /* ---------------- Gráfica de líneas en SVG ---------------- */
  UI.lineChart = (o) => {
    const W = o.w || 560, Hh = o.h || 220, P = { l: 40, r: 12, t: 12, b: 24 };
    const labels = o.labels || [];
    const n = labels.length;
    let min = o.min, max = o.max;
    if (min == null || max == null) {
      let lo = Infinity, hi = -Infinity;
      o.series.forEach((s) => s.values.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }));
      if (!isFinite(lo)) { lo = 0; hi = 1; }
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.1;
      if (min == null) min = lo - pad;
      if (max == null) max = hi + pad;
    }
    const x = (i) => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1));
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * (Hh - P.t - P.b);
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = min + (max - min) * k / 4;
      g += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="grid"/>';
      g += '<text x="' + (P.l - 6) + '" y="' + (y(v) + 4) + '" class="axis" text-anchor="end">' + (o.fmt ? o.fmt(v) : Math.round(v)) + '</text>';
    }
    const step = Math.max(1, Math.ceil(n / 7));
    labels.forEach((l, i) => {
      if (i % step === 0 || i === n - 1) g += '<text x="' + x(i) + '" y="' + (Hh - 6) + '" class="axis" text-anchor="middle">' + l + '</text>';
    });
    (o.thresholds || []).forEach((t) => {
      g += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(t.v) + '" y2="' + y(t.v) + '" class="thr" stroke="' + t.color + '"/>';
    });
    o.series.forEach((s) => {
      if (!s.values.length) return;
      const pts = s.values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      const li = s.values.length - 1;
      g += '<circle cx="' + x(li) + '" cy="' + y(s.values[li]) + '" r="3.5" fill="' + s.color + '"><title>' + U.esc(s.name) + ': ' + (o.fmt ? o.fmt(s.values[li]) : Math.round(s.values[li])) + '</title></circle>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + U.esc(o.title || 'Gráfica') + '">' + g + '</svg>';
  };

  UI.bar = (v, color, goal) => '<div class="pbar"><i style="width:' + U.clamp(v, 0, 100) + '%;' + (color ? 'background:' + color : '') + '"></i>' +
    (goal != null ? '<b class="goal" style="left:' + goal + '%"></b>' : '') + '</div>';
})(window.ECO);
