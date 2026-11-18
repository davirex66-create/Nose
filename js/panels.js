/* ECOCRACIA · Contenido de los paneles laterales y de la ficha de casilla */
(function (E) {
  'use strict';
  const U = E.util, UI = E.ui, EN = E.engine, H = E.hex;
  const P = E.panels = {};

  const tabs = (panel, list, cur) => '<div class="tabs" role="tablist">' + list.map((t) =>
    '<button class="tab' + (t[0] === cur ? ' active' : '') + '" role="tab" data-action="subtab" data-panel="' + panel + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  const energyU = (v) => Math.round(v * 10) + ' MW';
  const jobsU = (v) => U.fmt(v * 1000);

  /* ---------- Estadísticas de un edificio (para tarjetas y tooltips) ---------- */
  P.buildingStats = (def) => {
    const parts = [];
    const st = E.game && E.game.state;
    const mm = st ? (E.DIFFICULTY[st.difficulty] || E.DIFFICULTY.normal).maintMult : 1;
    parts.push('<span>🔧 ' + Math.round(def.maint * mm) + '/año</span>');
    if (def.income) parts.push('<span>💵 +' + def.income + '/año</span>');
    if (def.jobs >= 0.05) parts.push('<span>👷 ' + jobsU(def.jobs) + ' empleos</span>');
    if (def.energyProd) parts.push('<span class="hl">⚡ +' + energyU(def.energyProd) + '</span>');
    if (def.energyUse) parts.push('<span>🔌 −' + energyU(def.energyUse) + '</span>');
    return parts.join('');
  };
  P.buildingTip = (key) => {
    const d = E.BUILDINGS[key]; if (!d) return '';
    return '<div class="tip-title">' + d.icon + ' ' + d.name + '</div><div class="tip-desc">' + d.desc + '</div>' +
      '<div class="tip-stats">' + (d.buildable === false ? '' : '<span>💰 ' + U.fmt(d.cost) + '</span>') + P.buildingStats(d) + '</div>' +
      '<div class="chips">' + UI.effChips(d.eff) + '</div>' +
      (d.special ? '<div class="tip-note">✨ ' + d.special + '</div>' : '') +
      '<div class="tip-note">Terreno: ' + d.terrain.map((x) => E.TERRAINS[x].name).join(', ') + (d.nearWater ? ' (junto al agua)' : '') + (d.requires ? ' · Requiere: ' + E.BUILDINGS[d.requires].name : '') + '</div>';
  };

  /* ================= MAPA ================= */
  P.mapa = (s, ui) => {
    const tab = ui.tabs.mapa;
    let h = tabs('mapa', [['territorio', 'Territorio'], ['edificios', 'Edificios'], ['terrenos', 'Terrenos']], tab);
    const st = EN.computeStats(s);
    if (tab === 'territorio') {
      const owned = s.tiles.filter((t) => t.owned);
      const byT = {};
      owned.forEach((t) => { byT[t.terrain] = (byT[t.terrain] || 0) + 1; });
      const free = owned.filter((t) => !t.building && ['llanura', 'colinas', 'bosque', 'montana', 'rio'].includes(t.terrain)).length;
      h += '<div class="card hero-card"><div class="hero-row"><div class="hero-icon">🏛️</div><div><div class="kicker">Región</div><h3>' + U.esc(s.regionName) + '</h3><div class="muted">Capital: ' + U.esc(s.capitalName) + '</div></div></div>' +
        '<div class="stat-grid">' +
        '<div class="stat"><b>' + U.fmt(s.pop * 1000) + '</b><span>habitantes</span></div>' +
        '<div class="stat"><b>' + owned.length + '/' + s.tiles.length + '</b><span>casillas</span></div>' +
        '<div class="stat"><b>' + s.tiles.filter((t) => t.owned && t.building).length + '</b><span>edificios</span></div>' +
        '<div class="stat"><b>' + free + '</b><span>casillas libres</span></div></div></div>';
      h += '<div class="card"><h4>Recursos del territorio</h4>' +
        '<div class="kv"><span>⚡ Producción energética</span><b>' + energyU(st.prod) + '</b></div>' +
        '<div class="kv"><span>🔌 Demanda energética</span><b>' + energyU(st.demand) + '</b></div>' +
        '<div class="kv"><span>🌞 Cuota renovable</span><b>' + Math.round(st.renewShare * 100) + ' %</b></div>' +
        '<div class="kv"><span>👷 Puestos de trabajo</span><b>' + jobsU(st.jobs) + '</b></div>' +
        '<div class="kv"><span>🧑‍🤝‍🧑 Población activa</span><b>' + jobsU(st.workforce) + '</b></div>' +
        '<div class="kv"><span>🌲 Superficie forestal</span><b>' + Math.round(st.forestRatio * 100) + ' %</b></div></div>';
      h += '<div class="card"><h4>Composición del territorio</h4>' + Object.keys(E.TERRAINS).filter((k) => byT[k]).map((k) =>
        '<div class="terrain-row"><span class="tsw tsw-' + k + '"></span><span>' + E.TERRAINS[k].icon + ' ' + E.TERRAINS[k].name + '</span><b>' + byT[k] + '</b></div>').join('') + '</div>';
      h += '<div class="card tip-card">🗺️ <b>Ampliar la región:</b> selecciona una casilla oscurecida vecina a tu frontera dorada y pulsa «Integrar». Coste actual: <b>' + UI.money(EN.integrateCost(s)) + '</b>. Los pueblos integrados aportan 1.200 habitantes.</div>';
    } else if (tab === 'edificios') {
      const list = s.tiles.filter((t) => t.owned && t.building);
      if (!list.length) h += '<p class="empty">Todavía no hay edificios.</p>';
      E.CATEGORIES.concat([E.CAT.legado]).forEach((cat) => {
        const items = list.filter((t) => E.BUILDINGS[t.building.type].cat === cat.key);
        if (!items.length) return;
        h += '<h4 class="sect" style="--c:' + cat.color + '">' + cat.icon + ' ' + cat.name + ' <small>(' + items.length + ')</small></h4>';
        items.forEach((t) => {
          const d = E.BUILDINGS[t.building.type];
          h += '<button class="row-btn" data-action="locate" data-i="' + t.i + '" data-tip-b="' + d.key + '"><span class="ricon">' + d.icon + '</span><span class="rname">' + d.name +
            '<small>' + E.TERRAINS[t.terrain].name + ' · desde ' + t.building.year + '</small></span><span class="rval">🔧 ' + d.maint + '</span></button>';
        });
      });
    } else {
      Object.keys(E.TERRAINS).forEach((k) => {
        const T = E.TERRAINS[k];
        const allowed = Object.values(E.BUILDINGS).filter((d) => d.buildable !== false && d.terrain.includes(k));
        h += '<div class="card terrain-card"><div class="terrain-head"><span class="tsw big tsw-' + k + '"></span><h4>' + T.icon + ' ' + T.name + '</h4></div><p>' + T.desc + '</p>' +
          (allowed.length ? '<div class="mini-icons">' + allowed.map((d) => '<span data-tip-b="' + d.key + '">' + d.icon + '</span>').join('') + '</div>' : '<div class="muted small">No edificable</div>') + '</div>';
      });
      h += '<div class="card"><h4>Leyenda</h4><div class="legend-row"><span class="lg lg-border"></span> Frontera de tu región</div><div class="legend-row"><span class="lg lg-adj"></span> Casilla integrable</div><div class="legend-row"><span class="lg lg-fog"></span> Territorio lejano</div><div class="legend-row"><span class="lg lg-valid"></span> Ubicación válida al construir</div></div>';
    }
    return h;
  };

  /* ================= CONSTRUIR ================= */
  P.construir = (s, ui) => {
    const cat = ui.buildCat;
    let h = '';
    if (ui.buildTarget != null) {
      const t = s.tiles[ui.buildTarget];
      h += '<div class="target-banner">📍 Construir en: <b>' + E.TERRAINS[t.terrain].name + '</b> <button class="link" data-action="clear-target">Quitar</button></div>';
    } else {
      h += '<p class="hint">Elige un edificio y colócalo en una casilla resaltada del mapa. Pasa el cursor por encima para ver sus detalles.</p>';
    }
    h += '<div class="cat-tabs">' + E.CATEGORIES.map((c) => '<button class="cat-tab' + (c.key === cat ? ' active' : '') + '" style="--c:' + c.color + '" data-action="build-cat" data-cat="' + c.key + '" data-tip="' + c.name + '"><span>' + c.icon + '</span><small>' + c.name + '</small></button>').join('') + '</div>';
    const st = EN.computeStats(s);
    Object.values(E.BUILDINGS).filter((d) => d.cat === cat && d.buildable !== false).forEach((d) => {
      const reqOk = EN.requirementMet(s, d.key);
      const poor = s.money < d.cost;
      let tileOk = true, tileMsg = '';
      if (ui.buildTarget != null) { const c = EN.placementCheck(s, d.key, ui.buildTarget); tileOk = c.ok; tileMsg = c.msg || ''; }
      const n = st.counts[d.key] || 0;
      const disabled = !reqOk || (ui.buildTarget != null && !tileOk);
      h += '<button class="bcard' + (disabled ? ' locked' : '') + (poor ? ' poor' : '') + (ui.placing === d.key ? ' picked' : '') + '" data-action="pick-building" data-b="' + d.key + '" data-tip-b="' + d.key + '" style="--c:' + E.CAT[d.cat].color + '">' +
        '<div class="bicon-big">' + d.icon + (n ? '<i class="count">' + n + '</i>' : '') + '</div>' +
        '<div class="binfo"><div class="bhead"><h4>' + d.name + '</h4><span class="price' + (poor ? ' bad' : '') + '">🪙 ' + U.fmt(d.cost) + '</span></div>' +
        '<div class="bstats">' + P.buildingStats(d) + '</div>' +
        '<div class="chips">' + UI.effChips(d.eff) + '</div>' +
        (!reqOk ? '<div class="req">🔒 Requiere ' + E.BUILDINGS[d.requires].name + '</div>' : '') +
        (ui.buildTarget != null && !tileOk && reqOk ? '<div class="req">⛔ ' + U.esc(tileMsg) + '</div>' : '') +
        (n ? '<div class="dimnote">La próxima unidad aportará el ' + Math.round(Math.pow(EN.C.DIM, n) * 100) + ' % de sus efectos</div>' : '') +
        '</div></button>';
    });
    return h;
  };

  /* ================= ECONOMÍA ================= */
  P.economia = (s, ui) => {
    const tab = ui.tabs.economia;
    const st = EN.computeStats(s);
    let h = tabs('economia', [['resumen', 'Resumen'], ['construcciones', 'Construcciones'], ['evolucion', 'Evolución']], tab);
    if (tab === 'resumen') {
      h += '<div class="card money-card"><div class="kicker">Dinero disponible</div><div class="big-money' + (s.money < 0 ? ' bad' : '') + '">🪙 ' + U.fmt(s.money) + '</div>' +
        '<div class="net ' + (st.net >= 0 ? 'pos' : 'neg') + '">' + (st.net >= 0 ? '▲ +' : '▼ ') + U.fmt(st.net) + ' monedas el próximo año</div></div>';
      if (s.money < 0) h += '<div class="card warn-card">⚠️ <b>La región está endeudada.</b> Pagas un 8 % de intereses y la deuda reduce la economía y la felicidad. Si la deuda supera las ' + U.fmt(-EN.C.BANKRUPTCY) + ' monedas, la administración quebrará.</div>';
      else if (st.net < 0) h += '<div class="card warn-card">⚠️ Tus gastos superan a tus ingresos. Revisa leyes, mantenimiento e impuestos antes de quedarte sin fondos.</div>';
      const row = (l, v, cls) => '<div class="kv ' + (cls || '') + '"><span>' + l + '</span><b>' + v + '</b></div>';
      h += '<div class="card"><h4>💵 Ingresos anuales</h4>' +
        row('Impuestos (' + E.TAXES[s.tax].name.toLowerCase() + ')', '+' + U.fmt(st.taxes)) +
        row('Actividad de los edificios', '+' + U.fmt(st.bIncome)) +
        (st.extra ? row('Acuerdos y turismo', '+' + U.fmt(st.extra)) : '') +
        row('<b>Total</b>', '+' + U.fmt(st.income), 'total') + '</div>';
      h += '<div class="card"><h4>💸 Gastos anuales</h4>' +
        row('Mantenimiento de edificios', '−' + U.fmt(st.maint)) +
        row('Servicios públicos básicos (' + U.fmt(s.pop * 1000) + ' hab.)', '−' + U.fmt(st.services)) +
        row('Leyes en vigor', '−' + U.fmt(st.lawCost)) +
        (st.interest ? row('Intereses de la deuda', '−' + U.fmt(st.interest), 'bad') : '') +
        row('<b>Total</b>', '−' + U.fmt(st.expenses), 'total') + '</div>';
      h += '<div class="card tip-card">💡 La recaudación depende de la población, de la política fiscal y del indicador de <b>Economía</b>: una economía fuerte recauda más. Un presupuesto con superávit también mejora la economía.</div>';
    } else if (tab === 'construcciones') {
      const rows = Object.keys(st.typeMoney).map((k) => ({ d: E.BUILDINGS[k], m: st.typeMoney[k] }));
      if (!rows.length) h += '<p class="empty">No hay construcciones.</p>';
      else {
        h += '<div class="card"><table class="tbl"><thead><tr><th>Edificio</th><th>Nº</th><th>Ingresos</th><th>Mant.</th><th>Neto</th></tr></thead><tbody>' +
          rows.map((r) => '<tr><td>' + r.d.icon + ' ' + r.d.name + '</td><td>' + r.m.n + '</td><td>+' + r.m.income + '</td><td>−' + r.m.maint + '</td><td class="' + (r.m.income - r.m.maint >= 0 ? 'pos' : 'neg') + '">' + U.signed(r.m.income - r.m.maint) + '</td></tr>').join('') +
          '</tbody><tfoot><tr><td>Total</td><td>' + rows.reduce((a, r) => a + r.m.n, 0) + '</td><td>+' + U.fmt(st.bIncome) + '</td><td>−' + U.fmt(st.maint) + '</td><td class="' + (st.bIncome - st.maint >= 0 ? 'pos' : 'neg') + '">' + U.signed(st.bIncome - st.maint) + '</td></tr></tfoot></table></div>';
      }
      h += '<div class="card tip-card">💡 Muchos servicios públicos (escuelas, hospitales…) no generan ingresos directos, pero mejoran los indicadores, y con ellos la economía y la recaudación.</div>';
    } else {
      const hist = s.history;
      h += '<div class="card"><h4>Dinero disponible</h4>' + UI.lineChart({ labels: hist.map((x) => x.y), series: [{ name: 'Dinero', color: '#e3b34a', values: hist.map((x) => x.m) }], fmt: (v) => U.fmt(v) }) + '</div>';
      h += '<div class="card"><h4>Balance anual</h4>' + UI.lineChart({ labels: hist.map((x) => x.y), series: [{ name: 'Balance', color: '#7cc47f', values: hist.map((x) => x.net) }], fmt: (v) => U.fmt(v) }) + '</div>';
      h += '<div class="card"><h4>Población (miles)</h4>' + UI.lineChart({ labels: hist.map((x) => x.y), series: [{ name: 'Población', color: '#6c9be0', values: hist.map((x) => x.p) }], fmt: (v) => v.toFixed(1) }) + '</div>';
    }
    return h;
  };

  /* ================= GOBIERNO ================= */
  P.gobierno = (s, ui) => {
    const tab = ui.tabs.gobierno;
    let h = tabs('gobierno', [['decisiones', 'Decisiones'], ['legislacion', 'Legislación'], ['inversiones', 'Inversiones']], tab);
    if (tab === 'decisiones') {
      h += '<h4 class="sect">📊 Política fiscal</h4><p class="hint">Solo puede cambiarse una vez al año.' + (s.taxChanged === s.year ? ' <b>Ya la has cambiado este año.</b>' : '') + '</p><div class="tax-grid">';
      for (const k in E.TAXES) {
        const T = E.TAXES[k];
        h += '<button class="tax-card' + (s.tax === k ? ' active' : '') + '" data-action="tax" data-key="' + k + '"' + (s.tax === k ? ' aria-pressed="true"' : '') + '>' +
          '<div class="tax-head"><span>' + T.icon + '</span><b>' + T.name + '</b></div><div class="tax-mult">Recaudación ×' + T.mult.toFixed(2).replace('.', ',') + '</div>' +
          '<div class="chips">' + UI.effChips(T.eff, { empty: '<span class="muted small">Sin efectos adicionales</span>' }) + '</div><p>' + T.desc + '</p></button>';
      }
      h += '</div><h4 class="sect">🏛️ Decisiones políticas</h4><p class="hint">Decisiones únicas e irreversibles con efectos permanentes.</p>';
      for (const id in E.DECISIONS) {
        const D = E.DECISIONS[id];
        const taken = s.decisions[id] != null;
        const av = EN.decisionAvailability(s, id);
        h += '<div class="pcard' + (taken ? ' done' : '') + (D.warn ? ' warnish' : '') + '"><div class="pcard-head"><span class="picon">' + D.icon + '</span><div><h4>' + D.name + '</h4>' +
          '<div class="pmeta">' + (D.cost >= 0 ? '🪙 ' + U.fmt(D.cost) : '<span class="pos">Ingresas 🪙 ' + U.fmt(-D.cost) + '</span>') + (D.income ? ' · <span class="pos">+' + D.income + '/año</span>' : '') + '</div></div></div>' +
          '<p>' + D.desc + '</p><div class="chips">' + UI.effChips(D.eff) + UI.odsChips(D.ods) + '</div>' +
          (taken ? '<div class="pstatus ok">✔ Aprobada en ' + s.decisions[id] + '</div>' :
            '<button class="btn btn-sm ' + (D.warn ? 'btn-danger' : 'btn-primary') + '" data-action="decide" data-id="' + id + '"' + (av.ok ? '' : ' disabled') + '>Tomar decisión</button>' + (av.ok ? '' : '<div class="pstatus">' + U.esc(av.msg) + '</div>')) + '</div>';
      }
    } else if (tab === 'legislacion') {
      h += '<p class="hint">Las leyes tienen un coste de aprobación y un coste anual mientras están en vigor. Cada ley solo puede modificarse una vez al año.</p>';
      for (const id in E.LAWS) {
        const L = E.LAWS[id];
        const on = !!s.laws[id];
        const locked = s.lawChanged[id] === s.year;
        h += '<div class="pcard' + (on ? ' active' : '') + '"><div class="pcard-head"><span class="picon">' + L.icon + '</span><div><h4>' + L.name + '</h4>' +
          '<div class="pmeta">Aprobación 🪙 ' + L.enact + ' · Coste anual 🪙 ' + L.annual + '</div></div>' + (on ? '<span class="badge on">EN VIGOR</span>' : '') + '</div>' +
          '<p>' + L.desc + '</p>' + (L.special ? '<p class="special">✨ ' + L.special + '</p>' : '') +
          '<div class="chips">' + UI.effChips(L.eff) + UI.odsChips(L.ods) + '</div>' +
          '<button class="btn btn-sm ' + (on ? 'btn-ghost' : 'btn-primary') + '" data-action="law" data-id="' + id + '"' + (locked || (!on && s.money < L.enact) ? ' disabled' : '') + '>' + (on ? 'Derogar ley' : 'Aprobar ley') + '</button>' +
          (locked ? '<div class="pstatus">Modificada este año</div>' : (!on && s.money < L.enact ? '<div class="pstatus">Fondos insuficientes</div>' : '')) + '</div>';
      }
    } else {
      h += '<p class="hint">Inversiones puntuales con efectos durante varios años. Después hay que esperar para repetirlas.</p>';
      for (const id in E.INVESTMENTS) {
        const I = E.INVESTMENTS[id];
        const av = EN.investAvailability(s, id);
        const active = s.mods.find((m) => m.id === 'inv_' + id && m.years != null);
        h += '<div class="pcard' + (active ? ' active' : '') + '"><div class="pcard-head"><span class="picon">' + I.icon + '</span><div><h4>' + I.name + '</h4>' +
          '<div class="pmeta">🪙 ' + U.fmt(I.cost) + (I.years ? ' · Dura ' + I.years + ' años' : ' · Permanente') + ' · Espera ' + I.cooldown + ' años</div></div>' + (active ? '<span class="badge on">' + active.years + ' AÑOS</span>' : '') + '</div>' +
          '<p>' + I.desc + '</p>' + (I.special ? '<p class="special">✨ ' + I.special + '</p>' : '') +
          '<div class="chips">' + UI.effChips(I.eff) + UI.odsChips(I.ods) + '</div>' +
          '<button class="btn btn-sm btn-primary" data-action="invest" data-id="' + id + '"' + (av.ok ? '' : ' disabled') + '>Invertir</button>' + (av.ok ? '' : '<div class="pstatus">' + U.esc(av.msg) + '</div>') + '</div>';
      }
    }
    return h;
  };

  /* ================= ODS ================= */
  P.ods = (s) => {
    const st = EN.computeStats(s);
    const det = EN.computeODS(s, st, true);
    const vs = EN.victoryStatus(s);
    const vals = Object.values(s.ods);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const n = EN.odsAchieved(s);
    let h = '<div class="card ods-summary"><div class="stat-grid three">' +
      '<div class="stat"><b>' + n + '/9</b><span>ODS alcanzados</span></div>' +
      '<div class="stat"><b>' + Math.round(avg) + ' %</b><span>progreso medio</span></div>' +
      '<div class="stat"><b>' + vs.done + '/' + vs.total + '</b><span>metas de victoria</span></div></div>' +
      UI.lineChart({ labels: s.history.map((x) => x.y), series: [{ name: 'Progreso medio ODS', color: '#56c02b', values: s.history.map((x) => x.odsAvg) }], min: 0, max: 100, h: 140, thresholds: [{ v: 75, color: '#f2c94c' }] }) + '</div>';
    h += '<div class="card victory-card"><h4>🏆 Condiciones de victoria</h4>' + vs.items.map((it) =>
      '<div class="vrow ' + (it.ok ? 'ok' : '') + '"><span>' + (it.ok ? '✅' : '⬜') + ' ' + it.icon + ' ' + it.label + '</span><b>' + (it.isCount ? it.value + ' / ' + it.need : Math.round(it.value) + ' / >' + it.need) + '</b></div>').join('') + '</div>';
    h += '<p class="hint">Un ODS se considera <b>alcanzado</b> al llegar al 75 %. El progreso combina tus indicadores con los puntos de tus edificios, leyes y decisiones (máximo +25).</p>';
    E.ODS.forEach((o) => {
      const d = det[o.n];
      const p = d.progress;
      const lvl = p >= 75 ? ['Alcanzado', 'lvl4'] : p >= 60 ? ['Avanzado', 'lvl3'] : p >= 40 ? ['En progreso', 'lvl2'] : ['Crítico', 'lvl1'];
      const items = d.items.slice().sort((a, b) => b.v - a.v);
      h += '<div class="ods-card" style="--odsc:' + o.color + '"><div class="ods-head"><div class="ods-num">' + o.n + '</div><div class="ods-title"><h4>' + o.name + '</h4><span class="lvl ' + lvl[1] + '">' + lvl[0] + '</span></div><div class="ods-pct">' + Math.round(p) + '%</div></div>' +
        UI.bar(p, o.color, 75) + '<p>' + o.desc + '</p>' +
        '<details><summary>¿Cómo contribuyes?</summary><p class="how">' + o.how + '</p>' +
        '<div class="kv"><span>Base (indicadores ' + Object.keys(o.w).map((k) => E.IND[k].icon).join(' ') + ')</span><b>' + Math.round(d.base) + '</b></div>' +
        items.map((it) => '<div class="kv small"><span>' + U.esc(it.label) + '</span><b class="' + (it.v >= 0 ? 'pos' : 'neg') + '">' + U.signed(it.v, 1) + '</b></div>').join('') +
        (d.bonus > 25 ? '<div class="kv small muted"><span>Bonificación limitada a +25</span><b></b></div>' : '') + '</details></div>';
    });
    return h;
  };

  /* ================= HISTORIAL ================= */
  P.historial = (s, ui) => {
    const tab = ui.tabs.historial;
    let h = tabs('historial', [['registro', 'Registro'], ['evolucion', 'Indicadores'], ['estadisticas', 'Estadísticas']], tab);
    if (tab === 'registro') {
      const f = ui.histFilter;
      const F = [['all', 'Todo'], ['build', 'Construcción'], ['gov', 'Gobierno'], ['event', 'Acontecimientos'], ['system', 'Años']];
      h += '<div class="filters">' + F.map((x) => '<button class="pill' + (x[0] === f ? ' active' : '') + '" data-action="hist-filter" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
      const entries = s.log.filter((e) => f === 'all' || e.t === f).slice().reverse();
      if (!entries.length) h += '<p class="empty">Sin entradas todavía.</p>';
      let lastY = null;
      h += '<div class="log">';
      entries.slice(0, 200).forEach((e) => {
        if (e.y !== lastY) { h += '<div class="log-year">' + e.y + '</div>'; lastY = e.y; }
        h += '<div class="log-entry log-' + e.t + '"><span class="log-i">' + e.i + '</span><span>' + U.esc(e.x) + '</span></div>';
      });
      h += '</div>';
    } else if (tab === 'evolucion') {
      const hist = s.history;
      h += '<div class="filters">' + E.INDICATORS.map((d) => '<button class="pill ind-pill' + (ui.chart[d.key] ? ' active' : '') + '" style="--c:' + d.color + '" data-action="chart-toggle" data-ind="' + d.key + '">' + d.icon + ' ' + d.name + '</button>').join('') + '</div>';
      const series = E.INDICATORS.filter((d) => ui.chart[d.key]).map((d) => ({ name: d.name, color: d.color, values: hist.map((x) => x.ind[d.key]) }));
      h += '<div class="card">' + UI.lineChart({ labels: hist.map((x) => x.y), series, min: 0, max: 100, h: 260 }) + '</div>';
      h += '<div class="card"><table class="tbl"><thead><tr><th>Indicador</th><th>' + hist[0].y + '</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>' +
        E.INDICATORS.map((d) => { const a = hist[0].ind[d.key], b = s.ind[d.key]; return '<tr><td>' + d.icon + ' ' + d.name + '</td><td>' + Math.round(a) + '</td><td>' + Math.round(b) + '</td><td class="' + (b - a >= 0 ? 'pos' : 'neg') + '">' + U.signed(b - a) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    } else {
      const st = s.stats;
      const years = s.year - s.startYear;
      h += '<div class="card"><div class="stat-grid">' +
        '<div class="stat"><b>' + years + '</b><span>años completados</span></div>' +
        '<div class="stat"><b>' + st.built + '</b><span>construcciones</span></div>' +
        '<div class="stat"><b>' + st.events + '</b><span>acontecimientos</span></div>' +
        '<div class="stat"><b>' + st.laws + '</b><span>leyes aprobadas</span></div>' +
        '<div class="stat"><b>' + st.invest + '</b><span>inversiones</span></div>' +
        '<div class="stat"><b>' + st.decisions + '</b><span>decisiones</span></div>' +
        '<div class="stat"><b>' + U.fmt(s.pop * 1000) + '</b><span>habitantes</span></div>' +
        '<div class="stat"><b>' + U.fmt(EN.score(s)) + '</b><span>puntuación</span></div></div></div>';
      const hist = s.history;
      h += '<div class="card"><h4>Progreso de los ODS</h4>' + UI.lineChart({
        labels: hist.map((x) => x.y), min: 0, max: 100, h: 220, thresholds: [{ v: 75, color: '#f2c94c' }],
        series: E.ODS.map((o) => ({ name: 'ODS ' + o.n, color: o.color, values: hist.map((x) => x.ods[o.n] || 0) }))
      }) + '<div class="legend-inline">' + E.ODS.map((o) => '<span><i style="background:' + o.color + '"></i>' + o.n + '</span>').join('') + '</div></div>';
    }
    return h;
  };

  /* ================= FICHA DE CASILLA ================= */
  P.tileCard = (s, i) => {
    const t = s.tiles[i];
    const T = E.TERRAINS[t.terrain];
    let h = '<div class="tc-head"><span class="tsw big tsw-' + t.terrain + '"></span><div><div class="kicker">' + (t.owned ? 'Tu región' : 'Territorio exterior') + '</div><h3>' + T.icon + ' ' + (t.name ? U.esc(t.name) : T.name) + '</h3></div>' +
      '<button class="icon-btn" data-action="tile-close" aria-label="Cerrar">✕</button></div>';
    h += '<p class="tc-desc">' + T.desc + (t.cleared ? ' <i>Antes era un bosque: fue talado.</i>' : '') + (t.burned ? ' <i>Quemado por un incendio.</i>' : '') + (t.planted ? ' <i>Bosque reforestado.</i>' : '') + '</p>';
    if (t.building) {
      const d = E.BUILDINGS[t.building.type];
      h += '<div class="tc-building" style="--c:' + E.CAT[d.cat].color + '"><div class="tcb-head"><span class="bicon-big sm">' + d.icon + '</span><div><b>' + d.name + '</b><small>' + E.CAT[d.cat].name + ' · desde ' + t.building.year + '</small></div></div>' +
        '<p>' + d.desc + '</p><div class="bstats">' + P.buildingStats(d) + '</div><div class="chips">' + UI.effChips(d.eff) + UI.odsChips(d.ods) + '</div>' +
        (d.special ? '<p class="special">✨ ' + d.special + '</p>' : '') + '</div>';
      if (t.owned && s.status !== 'lost') {
        h += '<button class="btn btn-danger btn-block" data-action="tile-demolish">' + (d.demolishCost ? '🚧 Desmantelar (🪙 ' + d.demolishCost + ')' : '🚧 Demoler (recuperas 🪙 ' + Math.round(d.cost * EN.C.DEMOLISH_REFUND) + ')') + '</button>';
      }
    } else if (t.owned) {
      const ok = Object.values(E.BUILDINGS).filter((d) => d.buildable !== false && EN.placementCheck(s, d.key, i).ok);
      if (ok.length) {
        h += '<div class="tc-label">Puedes construir aquí:</div><div class="mini-icons">' + ok.map((d) => '<button data-action="quick-build" data-b="' + d.key + '" data-tip-b="' + d.key + '">' + d.icon + '</button>').join('') + '</div>';
        if (s.status !== 'lost') h += '<button class="btn btn-primary btn-block" data-action="tile-build">🏗️ Construir aquí</button>';
        if (t.terrain === 'bosque') h += '<p class="warn-text">' + (s.laws.proteger_bosques ? '🌲 Bosque protegido por ley: solo admite un parque natural.' : '⚠️ Construir aquí (salvo un parque natural) talará el bosque.') + '</p>';
      } else {
        h += '<p class="muted">No se puede construir en esta casilla.</p>';
      }
    } else {
      const adj = H.neighbors(s.cols, s.rows, i).some((n) => s.tiles[n].owned);
      if (adj) {
        const cost = EN.integrateCost(s);
        h += '<div class="tc-label">Integrar en la región</div><p class="small">Mediante un acuerdo con sus habitantes, esta casilla pasará a formar parte de tu región' + (t.terrain === 'pueblo' ? ' y aportará 1.200 habitantes' : '') + '.</p>' +
          '<button class="btn btn-primary btn-block" data-action="tile-integrate"' + (s.money < cost || s.status === 'lost' ? ' disabled' : '') + '>🗺️ Integrar (🪙 ' + U.fmt(cost) + ')</button>';
      } else {
        h += '<p class="muted">Demasiado lejos de tu frontera. Integra primero las casillas vecinas.</p>';
      }
    }
    return h;
  };

  P.tileTip = (s, i) => {
    const t = s.tiles[i];
    const T = E.TERRAINS[t.terrain];
    let h = '<div class="tip-title">' + T.icon + ' ' + (t.name ? U.esc(t.name) + ' · ' : '') + T.name + '</div>';
    if (t.building) {
      const d = E.BUILDINGS[t.building.type];
      h += '<div class="tip-sub">' + d.icon + ' <b>' + d.name + '</b></div><div class="tip-stats">' + P.buildingStats(d) + '</div><div class="chips">' + UI.effChips(d.eff) + '</div>';
    } else if (!t.owned) {
      const adj = H.neighbors(s.cols, s.rows, i).some((n) => s.tiles[n].owned);
      h += '<div class="tip-desc">' + (adj ? 'Fuera de tu región · Integrable por 🪙 ' + U.fmt(EN.integrateCost(s)) : 'Territorio lejano') + '</div>';
    } else {
      h += '<div class="tip-desc">Casilla libre de tu región</div>';
    }
    return h;
  };
})(window.ECO);
