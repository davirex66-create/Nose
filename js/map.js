/* ECOCRACIA · Renderizado del mapa en SVG, zoom y desplazamiento */
(function (E) {
  'use strict';
  const U = E.util, H = E.hex;
  const R = 44, SQ3 = Math.sqrt(3), W = SQ3 * R, PAD = 34;

  const COLORS = {
    llanura: ['#b3d57c', '#93bd5d'], bosque: ['#6fa85a', '#4a8740'], colinas: ['#d2c084', '#ae9a5e'],
    montana: ['#aaa597', '#827d72'], rio: ['#a7cf74', '#8ab95a'], lago: ['#68b0dc', '#3f86bb'],
    ciudad: ['#e0d2b0', '#c2b18b'], pueblo: ['#c6d692', '#a7bc73']
  };

  const M = E.map = { svg: null, vb: null, base: null, newTile: -1, onTileClick: null, onTileHover: null };

  M.center = (t) => ({ x: PAD + W / 2 + W * (t.col + 0.5 * (t.row & 1)), y: PAD + R + 1.5 * R * t.row });
  function corner(cx, cy, i, r) { const a = Math.PI / 180 * (60 * i - 30); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function poly(cx, cy, r) {
    const p = [];
    for (let i = 0; i < 6; i++) { const c = corner(cx, cy, i, r); p.push(c[0].toFixed(1) + ',' + c[1].toFixed(1)); }
    return p.join(' ');
  }
  M.size = (s) => ({ w: PAD * 2 + W * (s.cols + 0.5), h: PAD * 2 + R * 2 + 1.5 * R * (s.rows - 1) });

  /* ---------------- Decoración del terreno ---------------- */
  function tree(x, y, k, rr) {
    if (rr() < 0.55) {
      return '<path d="M' + x + ' ' + (y - 11 * k) + 'L' + (x + 7 * k) + ' ' + (y + 3 * k) + 'L' + (x - 7 * k) + ' ' + (y + 3 * k) + 'Z" fill="#2c6531"/>' +
        '<path d="M' + x + ' ' + (y - 15 * k) + 'L' + (x + 5 * k) + ' ' + (y - 4 * k) + 'L' + (x - 5 * k) + ' ' + (y - 4 * k) + 'Z" fill="#3b7c3a"/>' +
        '<rect x="' + (x - 1.3 * k) + '" y="' + (y + 3 * k) + '" width="' + (2.6 * k) + '" height="' + (4 * k) + '" fill="#5d3f25"/>';
    }
    return '<rect x="' + (x - 1.3 * k) + '" y="' + (y + 1 * k) + '" width="' + (2.6 * k) + '" height="' + (6 * k) + '" fill="#5d3f25"/>' +
      '<circle cx="' + x + '" cy="' + (y - 3 * k) + '" r="' + (7 * k) + '" fill="#367a36"/><circle cx="' + (x - 2 * k) + '" cy="' + (y - 5 * k) + '" r="' + (3.5 * k) + '" fill="#4b9446"/>';
  }
  function house(x, y, k, roof) {
    return '<rect x="' + (x - 5 * k) + '" y="' + (y - 3 * k) + '" width="' + (10 * k) + '" height="' + (8 * k) + '" fill="#f4ead2" stroke="#8a7350" stroke-width=".8"/>' +
      '<path d="M' + (x - 6.5 * k) + ' ' + (y - 3 * k) + 'L' + x + ' ' + (y - 9 * k) + 'L' + (x + 6.5 * k) + ' ' + (y - 3 * k) + 'Z" fill="' + roof + '"/>' +
      '<rect x="' + (x - 1.3 * k) + '" y="' + (y + 1 * k) + '" width="' + (2.6 * k) + '" height="' + (4 * k) + '" fill="#7a5b3a"/>';
  }
  function deco(t, c, hasB) {
    const rr = U.rng(Math.floor(t.v * 100000) + t.i * 13);
    const x = c.x, y = c.y;
    let s = '';
    switch (t.terrain) {
      case 'bosque': {
        const spots = hasB ? [[-24, -14], [24, 12], [-22, 16]] : [[-18, -12], [2, -18], [18, -4], [-6, 4], [-22, 12], [10, 16], [24, 18]];
        spots.forEach((p) => { if (hasB || rr() < 0.85) s += tree(x + p[0] + (rr() - 0.5) * 4, y + p[1] + (rr() - 0.5) * 4, hasB ? 0.8 : 0.95 + rr() * 0.25, rr); });
        break;
      }
      case 'colinas': {
        if (hasB) break;
        [[-14, 6, 1], [10, -6, 0.9], [12, 14, 0.75]].forEach((p) => {
          const k = p[2];
          s += '<path d="M' + (x + p[0] - 15 * k) + ' ' + (y + p[1] + 5) + 'Q' + (x + p[0]) + ' ' + (y + p[1] - 16 * k) + ' ' + (x + p[0] + 15 * k) + ' ' + (y + p[1] + 5) + 'Z" fill="#b8a466" stroke="#8d7a45" stroke-width="1.2"/>';
        });
        break;
      }
      case 'montana': {
        const big = (px, py, k) => '<path d="M' + (px - 20 * k) + ' ' + (py + 14 * k) + 'L' + px + ' ' + (py - 18 * k) + 'L' + (px + 20 * k) + ' ' + (py + 14 * k) + 'Z" fill="#8a8478"/>' +
          '<path d="M' + px + ' ' + (py - 18 * k) + 'L' + (px + 20 * k) + ' ' + (py + 14 * k) + 'L' + (px + 4 * k) + ' ' + (py + 14 * k) + 'Z" fill="#6f695e"/>' +
          '<path d="M' + (px - 7 * k) + ' ' + (py - 7 * k) + 'L' + px + ' ' + (py - 18 * k) + 'L' + (px + 7 * k) + ' ' + (py - 7 * k) + 'L' + (px + 3 * k) + ' ' + (py - 9 * k) + 'L' + (px - 1 * k) + ' ' + (py - 6 * k) + 'Z" fill="#f5f3ec"/>';
        if (hasB) { s += big(x - 22, y + 4, 0.55); break; }
        s += big(x + 12, y + 6, 0.7) + big(x - 8, y, 1);
        break;
      }
      case 'llanura': {
        if (t.burned) {
          for (let k = 0; k < 5; k++) s += '<circle cx="' + (x + (rr() - 0.5) * 50) + '" cy="' + (y + (rr() - 0.5) * 40) + '" r="' + (3 + rr() * 4) + '" fill="#4a4237" opacity=".55"/>';
        }
        if (t.cleared) {
          for (let k = 0; k < 3; k++) { const px = x + (rr() - 0.5) * 50, py = y + (rr() - 0.5) * 40; s += '<ellipse cx="' + px + '" cy="' + py + '" rx="3.4" ry="2.2" fill="#8b6a43" stroke="#5b4129" stroke-width=".8"/>'; }
        }
        if (hasB) break;
        if (t.v < 0.33) {
          const ang = (t.v * 600) % 180;
          s += '<g transform="rotate(' + ang.toFixed(0) + ' ' + x + ' ' + y + ')" opacity=".55">';
          for (let k = -2; k <= 2; k++) s += '<line x1="' + (x - 22) + '" x2="' + (x + 22) + '" y1="' + (y + k * 7) + '" y2="' + (y + k * 7) + '" stroke="' + (k % 2 ? '#c9b660' : '#7fa94a') + '" stroke-width="4" stroke-linecap="round"/>';
          s += '</g>';
        } else {
          for (let k = 0; k < 6; k++) {
            const px = x + (rr() - 0.5) * 52, py = y + (rr() - 0.5) * 44;
            s += '<path d="M' + (px - 3) + ' ' + py + 'l2 -5 M' + px + ' ' + py + 'l0 -6 M' + (px + 3) + ' ' + py + 'l-2 -5" stroke="#6f9b45" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
          }
          if (t.v > 0.85) s += tree(x + 14, y - 8, 0.8, rr);
        }
        break;
      }
      case 'rio': {
        if (hasB) break;
        for (let k = 0; k < 4; k++) {
          const px = x + (rr() - 0.5) * 56, py = y + (rr() - 0.5) * 46;
          s += '<path d="M' + (px - 3) + ' ' + py + 'l2 -5 M' + px + ' ' + py + 'l0 -6" stroke="#5f8f3d" stroke-width="1.3" fill="none"/>';
        }
        break;
      }
      case 'lago': {
        for (let k = 0; k < 3; k++) {
          const px = x - 16 + k * 12, py = y - 10 + k * 10;
          s += '<path d="M' + (px - 8) + ' ' + py + 'q4 -4 8 0 t8 0" stroke="#bfe3f7" stroke-width="1.6" fill="none" opacity=".8"/>';
        }
        break;
      }
      case 'ciudad': {
        s += '<ellipse cx="' + x + '" cy="' + (y + 6) + '" rx="30" ry="20" fill="#c8b68f" opacity=".6"/>';
        s += house(x - 18, y + 8, 1, '#b5523b') + house(x + 18, y + 10, 0.95, '#a8483a') + house(x - 8, y + 18, 0.85, '#c0643f') + house(x + 6, y + 20, 0.8, '#b5523b');
        s += '<rect x="' + (x - 7) + '" y="' + (y - 20) + '" width="14" height="24" fill="#efe3c6" stroke="#7d6646" stroke-width="1"/>' +
          '<path d="M' + (x - 9) + ' ' + (y - 20) + 'L' + x + ' ' + (y - 31) + 'L' + (x + 9) + ' ' + (y - 20) + 'Z" fill="#5c7fa8"/>' +
          '<circle cx="' + x + '" cy="' + (y - 11) + '" r="3" fill="#7d6646"/>' +
          '<path d="M' + x + ' ' + (y - 31) + 'v-7 l7 2.5 -7 2.5" fill="#e3b34a" stroke="#7d6646" stroke-width=".8"/>';
        break;
      }
      case 'pueblo': {
        s += house(x - 10, y - 2, 0.9, '#b25b3c') + house(x + 10, y + 4, 0.85, '#9e4d36') + house(x - 2, y + 14, 0.75, '#c26a44');
        s += tree(x + 20, y - 12, 0.7, rr);
        break;
      }
    }
    return s;
  }

  function riverPath(s) {
    if (!s.river || s.river.length < 2) return '';
    const pts = s.river.map((i) => M.center(s.tiles[i]));
    const last = s.tiles[s.river[s.river.length - 1]];
    if (last.terrain !== 'lago') { const p = pts[pts.length - 1]; pts.push({ x: p.x, y: p.y + R * 1.3 }); }
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let d = 'M' + pts[0].x.toFixed(1) + ' ' + (pts[0].y + 8).toFixed(1);
    const m0 = mid(pts[0], pts[1]);
    d += 'L' + m0.x.toFixed(1) + ' ' + m0.y.toFixed(1);
    for (let i = 1; i < pts.length - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      d += 'Q' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + m.x.toFixed(1) + ' ' + m.y.toFixed(1);
    }
    const lp = pts[pts.length - 1];
    d += 'L' + lp.x.toFixed(1) + ' ' + lp.y.toFixed(1);
    return '<path d="' + d + '" class="river-bank"/><path d="' + d + '" class="river"/><path d="' + d + '" class="river-shine"/>';
  }

  function borderPath(s) {
    let d = '';
    for (const t of s.tiles) {
      if (!t.owned) continue;
      const c = M.center(t);
      for (let e = 0; e < 6; e++) {
        const n = H.neighborIdx(s.cols, s.rows, t.i, e);
        if (n >= 0 && s.tiles[n].owned) continue;
        const a = corner(c.x, c.y, e, R), b = corner(c.x, c.y, (e + 1) % 6, R);
        d += 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
      }
    }
    return '<path d="' + d + '" class="border-glow"/><path d="' + d + '" class="border"/>';
  }

  /* ---------------- Render principal ---------------- */
  M.render = (s, ui) => {
    if (!M.svg || !s) return;
    const sz = M.size(s);
    if (!M.base || M.base.w !== sz.w) {
      M.base = { x: 0, y: 0, w: sz.w, h: sz.h }; M.vb = { ...M.base };
      const rect = M.svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height / rect.width > (sz.h / sz.w) * 1.25) {
        // Pantalla vertical (móvil): acercar el mapa a la región del jugador
        const c = M.center(s.tiles[s.capital]);
        M.vb.w = U.clamp(sz.h * 1.2 * rect.width / rect.height, sz.w * 0.5, sz.w);
        M.vb.h = M.vb.w * sz.h / sz.w;
        M.vb.x = c.x - M.vb.w / 2; M.vb.y = c.y - M.vb.h / 2;
        clampVB();
      }
    }
    let defs = '<defs>';
    for (const k in COLORS) defs += '<linearGradient id="gt-' + k + '" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="' + COLORS[k][0] + '"/><stop offset="1" stop-color="' + COLORS[k][1] + '"/></linearGradient>';
    defs += '<radialGradient id="g-sea" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#2a4a3a"/><stop offset="1" stop-color="#14241c"/></radialGradient>' +
      '<filter id="f-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#000" flood-opacity=".45"/></filter>' +
      '<filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<pattern id="p-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-opacity=".18" stroke-width="3"/></pattern>' +
      '</defs>';

    let terrain = '', decoL = '', fog = '', labels = '', blds = '', over = '', hits = '';
    const B = E.BUILDINGS;
    const placing = ui && ui.placing;
    for (const t of s.tiles) {
      const c = M.center(t);
      const pts = poly(c.x, c.y, R);
      terrain += '<polygon points="' + pts + '" fill="url(#gt-' + t.terrain + ')" class="tile"/>';
      const tint = (t.v - 0.5) * 0.14;
      if (Math.abs(tint) > 0.01) terrain += '<polygon points="' + pts + '" fill="' + (tint > 0 ? '#fff' : '#000') + '" fill-opacity="' + Math.abs(tint).toFixed(3) + '" pointer-events="none"/>';
      decoL += deco(t, c, !!t.building);
      if (!t.owned) {
        const adj = H.neighbors(s.cols, s.rows, t.i).some((n) => s.tiles[n].owned);
        fog += '<polygon points="' + pts + '" class="fog' + (adj ? ' fog-adj' : '') + '"/>';
        if (!adj) fog += '<polygon points="' + pts + '" fill="url(#p-hatch)" pointer-events="none"/>';
      }
      if (t.name) {
        const cap = t.terrain === 'ciudad';
        labels += '<text x="' + c.x + '" y="' + (c.y + R * 0.78) + '" class="tlabel' + (cap ? ' cap' : '') + (t.owned ? '' : ' dim') + '" text-anchor="middle">' + U.esc(t.name) + '</text>';
      }
      if (t.building) {
        const def = B[t.building.type];
        const col = E.CAT[def.cat].color;
        blds += '<g class="bld' + (M.newTile === t.i ? ' bld-new' : '') + '" transform="translate(' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ')">' +
          '<g class="bld-inner"><circle r="21" fill="#fbf6e9" stroke="' + col + '" stroke-width="4" filter="url(#f-shadow)"/>' +
          '<circle r="16" fill="none" stroke="' + col + '" stroke-opacity=".25" stroke-width="2"/>' +
          '<text y="1" class="bicon" text-anchor="middle" dominant-baseline="central">' + def.icon + '</text></g></g>';
      }
      if (placing) {
        const ok = E.engine.placementCheck(s, placing, t.i).ok;
        if (ok) over += '<polygon points="' + poly(c.x, c.y, R - 3) + '" class="valid' + (t.terrain === 'bosque' && placing !== 'parque_natural' ? ' valid-warn' : '') + '"/>';
      }
      hits += '<polygon points="' + pts + '" class="hit" data-i="' + t.i + '"/>';
    }
    if (ui && ui.selected != null && s.tiles[ui.selected]) {
      const c = M.center(s.tiles[ui.selected]);
      over += '<polygon points="' + poly(c.x, c.y, R - 2) + '" class="sel"/>';
    }
    const sea = '<rect x="-2000" y="-2000" width="' + (sz.w + 4000) + '" height="' + (sz.h + 4000) + '" fill="url(#g-sea)"/>';
    M.svg.innerHTML = defs + sea +
      '<g class="l-terrain">' + terrain + '</g>' +
      '<g class="l-river">' + riverPath(s) + '</g>' +
      '<g class="l-deco" pointer-events="none">' + decoL + '</g>' +
      '<g class="l-fog" pointer-events="none">' + fog + '</g>' +
      '<g class="l-border" pointer-events="none">' + borderPath(s) + '</g>' +
      '<g class="l-labels" pointer-events="none">' + labels + '</g>' +
      '<g class="l-over" pointer-events="none">' + over + '</g>' +
      '<g class="l-blds" pointer-events="none">' + blds + '</g>' +
      '<g class="l-hit">' + hits + '</g>';
    M.applyViewBox();
    M.newTile = -1;
  };

  /* ---------------- Zoom y desplazamiento ---------------- */
  M.applyViewBox = () => {
    if (!M.vb) return;
    M.svg.setAttribute('viewBox', M.vb.x.toFixed(1) + ' ' + M.vb.y.toFixed(1) + ' ' + M.vb.w.toFixed(1) + ' ' + M.vb.h.toFixed(1));
  };
  function clampVB() {
    const b = M.base, v = M.vb;
    v.w = U.clamp(v.w, b.w * 0.3, b.w * 1.15);
    v.h = v.w * b.h / b.w;
    v.x = U.clamp(v.x, b.x - v.w * 0.5, b.x + b.w - v.w * 0.5);
    v.y = U.clamp(v.y, b.y - v.h * 0.5, b.y + b.h - v.h * 0.5);
  }
  M.zoom = (f, cx, cy) => {
    if (!M.vb) return;
    const v = M.vb;
    if (cx == null) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
    const nw = U.clamp(v.w * f, M.base.w * 0.3, M.base.w * 1.15);
    const k = nw / v.w;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.w = nw; v.h = nw * M.base.h / M.base.w;
    clampVB(); M.applyViewBox();
  };
  M.reset = () => { if (M.base) { M.vb = { ...M.base }; M.applyViewBox(); } };
  M.focusTile = (s, i) => {
    const c = M.center(s.tiles[i]);
    if (M.vb.w > M.base.w * 0.75) { M.vb.w = M.base.w * 0.7; M.vb.h = M.vb.w * M.base.h / M.base.w; }
    M.vb.x = c.x - M.vb.w / 2; M.vb.y = c.y - M.vb.h / 2;
    clampVB(); M.applyViewBox();
  };
  function svgPoint(cx, cy) {
    const pt = M.svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const m = M.svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }

  M.init = (svg) => {
    M.svg = svg;
    let drag = null;
    const pointers = new Map();
    let pinch = null;
    svg.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: M.vb.w };
        drag = null;
        return;
      }
      drag = { x: e.clientX, y: e.clientY, vb: { ...M.vb }, moved: false };
    });
    svg.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 10) { const mid = svgPoint((a.x + b.x) / 2, (a.y + b.y) / 2); M.zoom((pinch.w * pinch.d / d) / M.vb.w, mid.x, mid.y); }
        return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; svg.classList.add('panning'); E.ui.hideTip(); try { svg.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
        if (drag.moved) {
          const rect = svg.getBoundingClientRect();
          const scale = Math.max(drag.vb.w / rect.width, drag.vb.h / rect.height);
          M.vb.x = drag.vb.x - dx * scale; M.vb.y = drag.vb.y - dy * scale;
          clampVB(); M.applyViewBox();
          return;
        }
      }
      if (e.pointerType === 'mouse') {
        const hit = e.target.closest && e.target.closest('.hit');
        if (M.onTileHover) M.onTileHover(hit ? +hit.dataset.i : -1, e);
      }
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
      if (drag && !drag.moved && e.type === 'pointerup') {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const hit = el && el.closest && el.closest('.hit');
        if (hit && M.onTileClick) M.onTileClick(+hit.dataset.i);
      }
      drag = null; svg.classList.remove('panning');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && M.onTileHover) M.onTileHover(-1, e); });
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = svgPoint(e.clientX, e.clientY);
      M.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y);
    }, { passive: false });
  };
})(window.ECO);
