/* ECOCRACIA · Controlador principal: pantallas, acciones del jugador, turnos y guardado */
(function (E) {
  'use strict';
  const U = E.util, UI = E.ui, EN = E.engine, P = E.panels, SV = E.save;
  const $ = (sel) => document.querySelector(sel);

  const PANEL_TITLES = { mapa: '🗺️ Mapa', construir: '🏗️ Construir', economia: '💰 Economía', gobierno: '🏛️ Gobierno', ods: '🎯 Objetivos de Desarrollo Sostenible', historial: '📜 Historial' };

  const G = E.game = {
    state: null,
    ui: {
      panel: null, tabs: { mapa: 'territorio', economia: 'resumen', gobierno: 'decisiones', historial: 'registro' },
      buildCat: 'energia', placing: null, selected: null, buildTarget: null, histFilter: 'all', chart: {}, prevInd: null, prevMoney: null
    }
  };
  E.IND_KEYS.forEach((k) => { G.ui.chart[k] = true; });

  /* =============== Pantallas =============== */
  G.showScreen = (name) => {
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('is-active', el.id === 'screen-' + name));
    if (name === 'menu') refreshMenu();
  };
  function refreshMenu() {
    const latest = SV.latest();
    const btn = $('#btn-continue');
    btn.disabled = !latest;
    btn.innerHTML = 'Continuar partida' + (latest ? '<small>' + U.esc(latest.meta.region || '') + ' · año ' + latest.meta.year + '</small>' : '<small>No hay partidas guardadas</small>');
    $('#storage-warning').hidden = SV.available();
  }

  G.autosave = () => {
    if (!G.state) return;
    const r = SV.write('auto', G.state);
    const el = $('#save-indicator');
    if (el && r.ok) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  };

  /* =============== Inicio de partida =============== */
  G.newGameDialog = async () => {
    const existing = SV.read('auto');
    if (existing && existing.state.status !== 'lost') {
      const ok = await UI.confirm({
        title: 'Comenzar una nueva partida', icon: '⚠️', danger: true, ok: 'Sí, empezar de nuevo',
        body: '<p>Hay una partida en curso en el <b>autoguardado</b> (' + U.esc(existing.meta.region) + ', año ' + existing.meta.year + '). Si empiezas una nueva, el autoguardado se sobrescribirá.</p><p class="muted">Las partidas de las ranuras manuales no se borran.</p>'
      });
      if (!ok) return;
    }
    const diffs = Object.keys(E.DIFFICULTY).map((k) => '<label class="diff"><input type="radio" name="diff" value="' + k + '"' + (k === 'normal' ? ' checked' : '') + '><span><b>' + E.DIFFICULTY[k].name + '</b><small>' + E.DIFFICULTY[k].desc + '</small></span></label>').join('');
    UI.openModal({
      title: 'Nueva partida', icon: '🌱', cls: 'modal-new',
      body: '<label class="field"><span>Nombre de tu región (opcional)</span><input id="ng-name" maxlength="40" placeholder="Se generará uno al azar"></label>' +
        '<div class="field"><span>Dificultad</span><div class="diff-grid">' + diffs + '</div></div>' +
        '<label class="check"><input type="checkbox" id="ng-tut" checked> Mostrar el tutorial inicial</label>',
      buttons: [
        { label: 'Cancelar', cls: 'btn-ghost' },
        {
          label: 'Comenzar', cls: 'btn-primary', close: false, onClick: () => {
            const name = $('#ng-name').value;
            const diff = (document.querySelector('input[name="diff"]:checked') || {}).value || 'normal';
            const tut = $('#ng-tut').checked;
            UI.closeAllModals();
            G.start(EN.newGame({ regionName: name, difficulty: diff, skipTutorial: !tut }), true);
          }
        }
      ]
    });
  };

  G.start = (state, fresh) => {
    G.state = state;
    Object.assign(G.ui, { panel: null, placing: null, selected: null, buildTarget: null, prevInd: { ...state.ind }, prevMoney: state.money });
    G.showScreen('game');
    E.map.base = null;
    G.render();
    G.autosave();
    if (fresh) UI.toast('🌱 Bienvenida al gobierno de <b>' + U.esc(state.regionName) + '</b>. ¡Buena suerte!', 'good');
    if (!state.tutorialDone) setTimeout(() => E.tutorial.start(), 400);
    else if (state.status === 'lost' || (state.status === 'won' && !state.sandbox)) setTimeout(G.showEnd, 300);
    else if (state.pendingEvent) setTimeout(G.openEvent, 400);
  };

  G.loadSlot = async (slot) => {
    const d = SV.read(slot);
    if (!d) { UI.toast('No se pudo cargar la partida: los datos no son válidos.', 'bad'); return; }
    if (G.state && $('#screen-game').classList.contains('is-active')) {
      const ok = await UI.confirm({ title: 'Cargar partida', icon: '📂', ok: 'Cargar', body: '<p>Se cargará <b>' + U.esc(d.meta.region) + '</b> (año ' + d.meta.year + '). El progreso actual que no esté guardado se perderá.</p>' });
      if (!ok) return;
    }
    E.tutorial.stop();
    UI.closeAllModals();
    G.start(d.state, false);
    if (slot !== 'auto') G.autosave();
    UI.toast('📂 Partida cargada: ' + U.esc(d.meta.region) + ' · año ' + d.meta.year, 'good');
  };

  /* =============== Guardar / cargar =============== */
  function slotRow(x, mode) {
    const m = x.meta;
    const info = m ? '<b>' + U.esc(m.region) + '</b><small>Año ' + m.year + ' · ' + U.fmt(m.pop * 1000) + ' hab. · ' + (m.status === 'won' ? '🏆 Victoria' : m.status === 'lost' ? '⚠️ Derrota' : '🪙 ' + U.fmt(m.money)) + '<br>' + new Date(m.savedAt).toLocaleString('es-ES') + '</small>' : '<span class="muted">Vacía</span>';
    let btns = '';
    if (mode === 'save' && x.slot !== 'auto') btns += '<button class="btn btn-sm btn-primary" data-action="save-slot" data-slot="' + x.slot + '">Guardar aquí</button>';
    if (mode === 'load' && m) btns += '<button class="btn btn-sm btn-primary" data-action="load-slot" data-slot="' + x.slot + '">Cargar</button>';
    if (m) btns += '<button class="btn btn-sm btn-ghost" data-action="delete-slot" data-slot="' + x.slot + '" data-mode="' + mode + '" aria-label="Borrar">🗑️</button>';
    return '<div class="slot"><div class="slot-name">' + (x.slot === 'auto' ? '🔄' : '💾') + ' ' + SV.slotName(x.slot) + '</div><div class="slot-info">' + info + '</div><div class="slot-btns">' + btns + '</div></div>';
  }
  G.openSlots = (mode) => {
    if (!SV.available()) { UI.alert({ title: 'Guardado no disponible', icon: '⚠️', body: '<p>Tu navegador tiene bloqueado el almacenamiento local (LocalStorage), así que no se pueden guardar ni cargar partidas.</p>' }); return; }
    const list = SV.list().filter((x) => mode === 'load' || x.slot !== 'auto');
    UI.closeAllModals();
    UI.openModal({
      title: mode === 'save' ? 'Guardar partida' : 'Cargar partida', icon: mode === 'save' ? '💾' : '📂', cls: 'modal-slots',
      body: (mode === 'save' ? '<p class="hint">La partida también se guarda automáticamente al final de cada año y tras cada acción.</p>' : '') + '<div class="slots">' + list.map((x) => slotRow(x, mode)).join('') + '</div>',
      buttons: [{ label: 'Cerrar', cls: 'btn-ghost' }]
    });
  };
  async function saveSlot(slot) {
    const ex = SV.read(slot);
    if (ex) {
      const ok = await UI.confirm({ title: 'Sobrescribir partida', icon: '💾', ok: 'Sobrescribir', danger: true, body: '<p>La ' + SV.slotName(slot) + ' ya contiene <b>' + U.esc(ex.meta.region) + '</b> (año ' + ex.meta.year + '). ¿Quieres sustituirla por la partida actual?</p>' });
      if (!ok) { G.openSlots('save'); return; }
    }
    const r = SV.write(slot, G.state);
    if (r.ok) { UI.toast('💾 Partida guardada en la ' + SV.slotName(slot) + '.', 'good'); E.game.state.log.push({ y: G.state.year, t: 'system', i: '💾', x: 'Partida guardada en la ' + SV.slotName(slot) + '.' }); }
    else UI.toast(r.msg, 'bad');
    G.openSlots('save');
  }
  async function deleteSlot(slot, mode) {
    const ex = SV.read(slot);
    if (!ex) return;
    const ok = await UI.confirm({ title: 'Borrar partida', icon: '🗑️', danger: true, ok: 'Borrar definitivamente', body: '<p>¿Seguro que quieres borrar <b>' + U.esc(ex.meta.region) + '</b> (año ' + ex.meta.year + ') de la ' + SV.slotName(slot) + '?</p><p class="muted">Esta acción no se puede deshacer.</p>' });
    if (ok) { SV.remove(slot); UI.toast('🗑️ Partida borrada.', 'info'); refreshMenu(); }
    G.openSlots(mode);
  }

  /* =============== Render =============== */
  G.render = () => {
    const s = G.state;
    if (!s) return;
    renderTop(s);
    renderTurnbar(s);
    renderPanel(s);
    renderTileCard(s);
    renderPlacementBanner(s);
    E.map.render(s, G.ui);
    document.body.classList.toggle('game-lost', s.status === 'lost');
    E.tutorial.reposition();
  };

  function renderTop(s) {
    const st = EN.computeStats(s);
    const prevM = G.ui.prevMoney;
    $('#res-money').innerHTML = '<span class="res-icon">🪙</span><div><div class="res-val' + (s.money < 0 ? ' bad' : '') + '">' + U.fmt(s.money) + '</div><div class="res-sub ' + (st.net >= 0 ? 'pos' : 'neg') + '">' + (st.net >= 0 ? '+' : '') + U.fmt(st.net) + '/año</div></div>';
    if (prevM != null && Math.round(prevM) !== Math.round(s.money)) floatDelta($('#res-money'), s.money - prevM, true);
    G.ui.prevMoney = s.money;
    const { targets } = EN.computeTargets(s, st);
    const prev = G.ui.prevInd || s.ind;
    const box = $('#indicators');
    if (!box.children.length) {
      box.innerHTML = E.INDICATORS.map((d) => '<button class="ind" data-ind="' + d.key + '" data-tip-ind="' + d.key + '" data-action="ind-detail" style="--c:' + d.color + '">' +
        '<span class="ind-icon">' + d.icon + '</span><span class="ind-body"><span class="ind-name">' + d.name + '</span><span class="ind-val"><b></b><i class="trend"></i></span>' +
        '<span class="ind-bar"><i></i><em style="left:' + d.victory + '%"></em></span></span></button>').join('');
    }
    E.INDICATORS.forEach((d) => {
      const el = box.querySelector('[data-ind="' + d.key + '"]');
      const v = s.ind[d.key], t = targets[d.key];
      el.querySelector('b').textContent = Math.round(v);
      const tr = el.querySelector('.trend');
      const diff = t - v;
      tr.className = 'trend ' + (diff > 1 ? 'up' : diff < -1 ? 'down' : 'flat');
      tr.textContent = diff > 1 ? '▲' : diff < -1 ? '▼' : '●';
      el.querySelector('.ind-bar i').style.width = U.clamp(v, 0, 100) + '%';
      el.classList.toggle('met', v > d.victory);
      el.classList.toggle('danger', v < 15);
      el.classList.toggle('warn', v >= 15 && v < 30);
      const dv = v - prev[d.key];
      if (Math.abs(dv) >= 0.5) floatDelta(el, dv);
    });
    G.ui.prevInd = { ...s.ind };
    $('#region-name').textContent = s.regionName;
  }

  function floatDelta(el, v, money) {
    const f = document.createElement('span');
    f.className = 'float-delta ' + (v > 0 ? 'pos' : 'neg');
    f.textContent = U.signed(v);
    if (money) f.textContent += ' 🪙';
    el.appendChild(f);
    el.classList.remove('pulse-pos', 'pulse-neg'); void el.offsetWidth;
    el.classList.add(v > 0 ? 'pulse-pos' : 'pulse-neg');
    setTimeout(() => f.remove(), 1600);
  }

  function renderTurnbar(s) {
    $('#tb-year').textContent = s.year;
    $('#tb-turn').textContent = 'Año ' + (s.year - s.startYear + 1) + ' de mandato · ' + U.fmt(s.pop * 1000) + ' habitantes';
    const vs = EN.victoryStatus(s);
    $('#tb-goals').innerHTML = '<span class="goal-dots">' + vs.items.map((i) => '<i class="' + (i.ok ? 'ok' : '') + '" title="' + U.esc(i.label) + '"></i>').join('') + '</span><span>Metas ' + vs.done + '/' + vs.total + '</span>';
    const ev = $('#btn-event');
    ev.hidden = !s.pendingEvent;
    if (s.pendingEvent) ev.innerHTML = '<span class="pulse-dot"></span>' + E.EVENT_MAP[s.pendingEvent.id].icon + ' Decisión pendiente';
    const nb = $('#btn-next');
    const blocked = !!s.pendingEvent || s.status === 'lost';
    nb.classList.toggle('blocked', blocked);
    nb.setAttribute('aria-disabled', blocked ? 'true' : 'false');
    nb.dataset.tip = s.pendingEvent ? 'Resuelve primero el acontecimiento pendiente' : s.status === 'lost' ? 'La partida ha terminado' : 'Cierra el año: cobra impuestos, paga gastos y actualiza los indicadores';
    if (s.sandbox) $('#tb-goals').innerHTML = '<span>🌍 Modo libre</span>';
  }

  function renderPanel(s) {
    const panel = $('#panel');
    const name = G.ui.panel;
    document.querySelectorAll('#sidenav [data-panel]').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
    panel.classList.toggle('open', !!name);
    document.body.classList.toggle('panel-open', !!name);
    if (!name) return;
    $('#panel-title').innerHTML = PANEL_TITLES[name];
    const body = $('#panel-body');
    const scroll = body.dataset.for === name ? body.scrollTop : 0;
    body.innerHTML = P[name](s, G.ui);
    body.dataset.for = name;
    body.scrollTop = scroll;
  }

  function renderTileCard(s) {
    const tc = $('#tile-card');
    const i = G.ui.selected;
    if (i == null || G.ui.placing) { tc.classList.remove('open'); return; }
    tc.innerHTML = P.tileCard(s, i);
    tc.classList.add('open');
  }

  function renderPlacementBanner(s) {
    const b = $('#placement-banner');
    if (!G.ui.placing) { b.classList.remove('open'); return; }
    const d = E.BUILDINGS[G.ui.placing];
    const n = s.tiles.filter((t) => EN.placementCheck(s, d.key, t.i).ok).length;
    b.innerHTML = '<span class="pb-icon">' + d.icon + '</span><div><b>Colocar: ' + d.name + '</b><small>' + (n ? n + ' ubicaciones válidas resaltadas en verde · 🪙 ' + U.fmt(d.cost) : 'No hay ubicaciones válidas: integra más territorio o libera una casilla.') + '</small></div><button class="btn btn-sm btn-ghost" data-action="cancel-placing">Cancelar</button>';
    b.classList.add('open');
  }

  /* =============== Paneles =============== */
  G.openPanel = (name) => {
    G.ui.panel = name;
    G.ui.placing = null;
    if (name !== 'construir') { G.ui.buildTarget = null; }
    G.render();
    E.tutorial.notify('panel:' + name);
  };
  G.closePanel = () => { G.ui.panel = null; G.ui.buildTarget = null; G.render(); };
  const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

  /* =============== Mapa =============== */
  function onTileClick(i) {
    const s = G.state;
    if (!s) return;
    if (G.ui.placing) {
      const type = G.ui.placing;
      const c = EN.placementCheck(s, type, i);
      if (!c.ok) { UI.toast('⛔ ' + U.esc(c.msg), 'bad'); return; }
      confirmBuild(type, i);
      return;
    }
    G.ui.selected = G.ui.selected === i ? null : i;
    if (G.ui.buildTarget != null) G.ui.buildTarget = G.ui.selected;
    if (isMobile() && G.ui.selected != null) G.ui.panel = null;
    G.render();
    if (G.ui.selected != null) E.tutorial.notify('tile');
  }
  function onTileHover(i, e) {
    if (i < 0 || !G.state) { UI.hideTip(); return; }
    let html = P.tileTip(G.state, i);
    if (G.ui.placing) {
      const c = EN.placementCheck(G.state, G.ui.placing, i);
      html += c.ok ? '<div class="tip-ok">✔ Ubicación válida: haz clic para construir</div>' : '<div class="tip-bad">⛔ ' + U.esc(c.msg) + '</div>';
    }
    UI.showTip(html, e.clientX, e.clientY);
  }

  /* =============== Acciones con vista previa =============== */
  function previewHtml(pv) {
    if (!pv || !pv.ok) return '';
    let h = '<div class="preview">';
    h += '<div class="pv-row"><span>Efecto inmediato</span><div class="chips">' + UI.effChips(pv.now, { empty: '<span class="muted small">Ninguno apreciable</span>' }) + '</div></div>';
    h += '<div class="pv-row"><span>Tendencia a largo plazo</span><div class="chips">' + UI.effChips(pv.long, { empty: '<span class="muted small">Sin cambios</span>' }) + '</div></div>';
    if (Math.abs(pv.money) >= 1) h += '<div class="pv-row"><span>Dinero</span><b class="' + (pv.money >= 0 ? 'pos' : 'neg') + '">' + U.signed(pv.money) + ' 🪙</b></div>';
    if (Math.abs(pv.net) >= 1) h += '<div class="pv-row"><span>Balance anual</span><b class="' + (pv.net >= 0 ? 'pos' : 'neg') + '">' + U.signed(pv.net) + ' 🪙/año</b></div>';
    const risky = E.IND_KEYS.filter((k) => pv.targetAfter[k] < 10);
    if (risky.length) h += '<div class="pv-warn">⚠️ ¡Peligro! A largo plazo, ' + risky.map((k) => E.IND[k].name.toLowerCase()).join(', ') + ' tendería a caer a niveles críticos.</div>';
    return h + '</div>';
  }

  G.run = (action, args, opts) => {
    opts = opts || {};
    const r = EN.act.apply(null, [G.state, action].concat(args));
    if (!r.ok) { UI.toast('⛔ ' + U.esc(r.msg), 'bad'); return r; }
    const chips = UI.effChips(r.deltas, { min: 0.3 });
    UI.toast('<b>' + r.msg + '</b>' + (chips ? '<div class="chips">' + chips + '</div>' : ''), 'good');
    G.autosave();
    G.render();
    return r;
  };

  async function confirmAndRun(o) {
    const pv = EN.preview.apply(null, [G.state, o.action].concat(o.args));
    if (!pv.ok) { UI.toast('⛔ ' + U.esc(pv.msg), 'bad'); return null; }
    const ok = await UI.confirm({ title: o.title, icon: o.icon, body: (o.body || '') + previewHtml(pv), ok: o.ok || 'Confirmar', danger: o.danger });
    if (!ok) return null;
    return G.run(o.action, o.args);
  }

  async function confirmBuild(type, i) {
    const s = G.state;
    const d = E.BUILDINGS[type];
    const c = EN.canBuild(s, type, i);
    if (!c.ok) { UI.toast('⛔ ' + U.esc(c.msg), 'bad'); return; }
    const t = s.tiles[i];
    const forest = t.terrain === 'bosque' && type !== 'parque_natural';
    const r = await confirmAndRun({
      action: 'build', args: [type, i], title: 'Construir ' + d.name, icon: d.icon, ok: 'Construir (🪙 ' + U.fmt(d.cost) + ')', danger: forest,
      body: '<p>' + d.desc + '</p><div class="bstats">' + P.buildingStats(d) + '</div>' + (forest ? '<p class="warn-text">⚠️ Esta casilla es un bosque: se talará de forma permanente y bajará la superficie forestal.</p>' : '')
    });
    if (r && r.ok) {
      E.map.newTile = i;
      G.ui.placing = null;
      G.ui.reopenBuild = false;
      G.ui.selected = i;
      G.ui.buildTarget = null;
      if (isMobile()) G.ui.panel = null;
      G.render();
      E.tutorial.notify('built');
    }
  }

  async function demolish() {
    const s = G.state, i = G.ui.selected;
    const t = s.tiles[i];
    if (!t || !t.building) return;
    const d = E.BUILDINGS[t.building.type];
    await confirmAndRun({
      action: 'demolish', args: [i], title: (d.demolishCost ? 'Desmantelar ' : 'Demoler ') + d.name, icon: '🚧', danger: true, ok: d.demolishCost ? 'Desmantelar' : 'Demoler',
      body: d.demolishCost ? '<p>Desmantelar la central cuesta <b>🪙 ' + d.demolishCost + '</b>. Dejará de contaminar, pero también de producir ' + Math.round(d.energyProd * 10) + ' MW. Asegúrate de tener suficiente energía renovable.</p>'
        : '<p>Se demolerá el edificio y recuperarás el 25 % de su coste (🪙 ' + Math.round(d.cost * EN.C.DEMOLISH_REFUND) + '). Sus efectos desaparecerán.</p>'
    });
  }

  async function integrate() {
    const s = G.state, i = G.ui.selected;
    const t = s.tiles[i];
    const cost = EN.integrateCost(s);
    await confirmAndRun({ action: 'integrate', args: [i], title: 'Integrar territorio', icon: '🗺️', ok: 'Integrar (🪙 ' + U.fmt(cost) + ')', body: '<p>La casilla de ' + E.TERRAINS[t.terrain].name.toLowerCase() + (t.name ? ' (' + U.esc(t.name) + ')' : '') + ' se unirá a tu región. Cada nueva casilla encarece la siguiente en 25 monedas.</p>' });
  }

  /* =============== Indicadores =============== */
  function indicatorDetail(key) {
    const s = G.state, d = E.IND[key];
    const { targets, factors } = EN.computeTargets(s, EN.computeStats(s));
    const f = factors[key].slice().sort((a, b) => b.v - a.v);
    const hist = s.history.map((x) => x.ind[key]);
    UI.openModal({
      title: d.name, icon: d.icon, wide: true, cls: 'modal-ind',
      body: '<div class="ind-detail-top"><div class="big-num" style="color:' + d.color + '">' + Math.round(s.ind[key]) + '</div><div><p>' + d.desc + '</p>' +
        '<p><b>Objetivo actual:</b> ' + Math.round(targets[key]) + ' · <b>Meta de victoria:</b> más de ' + d.victory + '</p><p class="muted small">Cada año el indicador recorre un 30 % de la distancia hacia su objetivo.</p></div></div>' +
        '<div class="two-col"><div><h4>📈 Lo mejora</h4><p>' + d.up + '</p><h4>📉 Lo empeora</h4><p>' + d.down + '</p>' +
        UI.lineChart({ labels: s.history.map((x) => x.y), series: [{ name: d.name, color: d.color, values: hist }], min: 0, max: 100, h: 150, thresholds: [{ v: d.victory, color: '#ffffff' }] }) + '</div>' +
        '<div><h4>🧮 Cálculo del objetivo</h4><div class="factors">' + f.map((x) => '<div class="kv small"><span>' + U.esc(x.label) + '</span><b class="' + (x.v >= 0 ? 'pos' : 'neg') + '">' + U.signed(x.v, 1) + '</b></div>').join('') +
        '<div class="kv total"><span>Objetivo (entre 0 y 100)</span><b>' + Math.round(targets[key]) + '</b></div></div></div></div>',
      buttons: [{ label: 'Cerrar', cls: 'btn-primary' }]
    });
  }
  UI.tipProvider('tipInd', (key) => {
    const d = E.IND[key];
    if (!G.state) return '';
    const t = EN.computeTargets(G.state, EN.computeStats(G.state)).targets[key];
    const v = G.state.ind[key];
    return '<div class="tip-title">' + d.icon + ' ' + d.name + ': ' + Math.round(v) + '</div><div class="tip-desc">' + d.desc + '</div>' +
      '<div class="tip-note">Tendencia: ' + (t > v + 1 ? '▲ sube' : t < v - 1 ? '▼ baja' : '● estable') + ' hacia ' + Math.round(t) + ' · Meta: >' + d.victory + '</div><div class="tip-note">Haz clic para ver el desglose.</div>';
  });
  UI.tipProvider('tipB', (key) => P.buildingTip(key));

  /* =============== Turnos y acontecimientos =============== */
  G.nextYear = () => {
    const s = G.state;
    if (!s) return;
    if (s.status === 'lost') { G.showEnd(); return; }
    if (s.status === 'won' && !s.sandbox) EN.continueSandbox(s);
    if (s.pendingEvent) { UI.toast('⚠️ Debes resolver el acontecimiento pendiente antes de pasar al siguiente año.', 'bad'); G.openEvent(); return; }
    G.ui.placing = null;
    const r = EN.endTurn(s);
    if (!r.ok) { UI.toast('⛔ ' + U.esc(r.msg), 'bad'); return; }
    G.autosave();
    const yEl = $('#tb-year');
    yEl.classList.remove('flip'); void yEl.offsetWidth; yEl.classList.add('flip');
    $('#map-wrap').classList.remove('year-pulse'); void $('#map-wrap').offsetWidth; $('#map-wrap').classList.add('year-pulse');
    G.render();
    const chips = UI.effChips(r.deltas, { min: 0.5 });
    UI.toast('<b>📅 Año ' + r.year + '</b> · Balance ' + (r.net >= 0 ? '+' : '') + U.fmt(r.net) + ' 🪙 · Población ' + U.signed(r.popDelta * 1000) + '<div class="chips">' + (chips || '<span class="muted small">Indicadores estables</span>') + '</div>', 'info', 5500);
    if (r.expired.length) UI.toast('⌛ Han terminado sus efectos: ' + r.expired.map(U.esc).join(', ') + '.', 'info', 5000);
    if (r.odsNew > 0) UI.toast('🎯 ¡Has alcanzado ' + (r.odsNew === 1 ? 'un nuevo ODS' : r.odsNew + ' nuevos ODS') + '!', 'good', 5000);
    if (r.warnings.length && !r.lost) UI.toast('🚨 <b>Alerta:</b> ' + r.warnings.map((k) => E.IND[k].name).join(', ') + ' en niveles críticos. Si llega a 0, perderás la partida.', 'bad', 7000);
    if (s.money < 0 && !r.lost) UI.toast('💸 La región está en números rojos. La deuda genera intereses y reduce la economía.', 'bad', 6000);
    E.tutorial.notify('turn');
    if (r.lost || r.won) setTimeout(G.showEnd, 700);
    else if (s.pendingEvent && !E.tutorial.active) setTimeout(G.openEvent, 650);
    else if (s.pendingEvent) setTimeout(G.openEvent, 1500);
  };

  G.openEvent = () => {
    const s = G.state;
    if (!s || !s.pendingEvent) return;
    UI.closeAllModals();
    const ev = E.EVENT_MAP[s.pendingEvent.id];
    const st = EN.computeStats(s);
    const opts = ev.options.map((o, idx) => {
      const cost = o.cost || 0;
      const poor = cost > s.money;
      const eff = EN.optionEff(o, s, st);
      const lasting = (o.mods || []).map((m) => (m.eff && Object.keys(m.eff).length ? UI.effChips(m.eff) : '') + UI.odsChips(m.ods) + '<span class="chip dur">' + (m.years == null ? 'permanente' : m.years + ' años') + '</span>').join('');
      return '<button class="ev-opt' + (poor ? ' poor' : '') + '" data-action="event-choose" data-idx="' + idx + '"' + (poor ? ' disabled' : '') + '>' +
        '<div class="ev-opt-head"><b>' + o.label + '</b><span class="ev-cost">' + (cost ? '🪙 ' + U.fmt(cost) : o.gain ? '<span class="pos">+🪙 ' + U.fmt(o.gain) + '</span>' : 'Gratis') + (cost && o.gain ? ' · <span class="pos">+' + U.fmt(o.gain) + '</span>' : '') + '</span></div>' +
        '<p>' + o.desc + '</p><div class="chips">' + UI.effChips(eff) + (o.pop ? '<span class="chip pos">👥 +' + U.fmt(o.pop * 1000) + '</span>' : '') + '</div>' +
        (lasting ? '<div class="ev-lasting"><small>Efecto duradero:</small><div class="chips">' + lasting + '</div></div>' : '') +
        (poor ? '<div class="req">Fondos insuficientes</div>' : '') + '</button>';
    }).join('');
    UI.openModal({
      cls: 'modal-event', dismissible: true,
      body: '<div class="event-hero"><div class="event-icon">' + ev.icon + '</div><div><div class="kicker">Acontecimiento · Año ' + s.year + '</div><h2>' + ev.title + '</h2></div></div>' +
        '<p class="event-text">' + EN.eventText(ev, s, st) + '</p><div class="event-q">¿Qué decides?</div><div class="ev-opts">' + opts + '</div>',
      buttons: [{ label: 'Decidir más tarde', cls: 'btn-ghost' }]
    });
  };

  function chooseEvent(idx) {
    const r = EN.act(G.state, 'resolveEvent', idx);
    if (!r.ok) { UI.toast('⛔ ' + U.esc(r.msg), 'bad'); return; }
    UI.closeAllModals();
    if (r.tile != null) E.map.newTile = r.tile;
    G.autosave();
    G.render();
    UI.openModal({
      title: 'Consecuencias', icon: r.icon, cls: 'modal-result',
      body: '<p class="result-text">' + r.result + '</p><div class="chips">' + UI.effChips(r.deltas, { min: 0.3, empty: '<span class="muted small">Sin cambios inmediatos en los indicadores</span>' }) + '</div>',
      buttons: [{ label: 'Continuar', cls: 'btn-primary' }]
    });
  }

  /* =============== Fin de partida =============== */
  const DEFEAT = {
    economia: ['Colapso económico', 'La actividad económica se ha paralizado. Los comercios cierran, la inversión desaparece y la administración ya no puede sostener los servicios públicos.', 'Equilibra el presupuesto, evita la deuda y crea empleo con mercados y fábricas sostenibles.'],
    felicidad: ['Crisis de bienestar', 'La población ha perdido la esperanza y la confianza en sus instituciones. Miles de familias abandonan la región en busca de una vida mejor.', 'Cuida la sanidad, la cultura, el empleo y el entorno; no ignores las crisis sociales.'],
    medioambiente: ['Colapso ecológico', 'Los ríos están contaminados, el aire es irrespirable y los suelos se han degradado. La región ya no puede sostener la vida ni la economía.', 'Reduce la contaminación, protege los bosques, recicla y sustituye el carbón por renovables.'],
    energia: ['Apagón general', 'La región se ha quedado sin energía suficiente. Hospitales, escuelas y empresas no pueden funcionar y la vida cotidiana se detiene.', 'Construye centrales renovables antes de crecer y antes de cerrar la central de carbón.'],
    educacion: ['Emergencia educativa', 'El sistema educativo se ha desmoronado. Sin formación no hay futuro: la región pierde a su juventud y su capacidad de innovar.', 'Construye escuelas a medida que crece la población e invierte en educación de forma constante.'],
    igualdad: ['Fractura social', 'La desigualdad se ha vuelto insoportable. Una pequeña parte de la población lo tiene todo mientras la mayoría no puede cubrir sus necesidades básicas.', 'Apuesta por la vivienda social, la fiscalidad progresiva, los derechos laborales y las ayudas a las familias.'],
    empleo: ['Desempleo masivo', 'Casi nadie encuentra trabajo. Sin empleo, las familias no tienen ingresos y la economía de la región se hunde.', 'Crea puestos de trabajo al mismo ritmo que crece la población y apoya la formación profesional.'],
    quiebra: ['Quiebra de la administración', 'La deuda pública se ha vuelto impagable. Los acreedores bloquean las cuentas y la región no puede pagar ni a su personal ni sus servicios.', 'No construyas más de lo que puedes mantener: cada edificio y cada ley tiene un coste anual.']
  };

  G.showEnd = () => {
    const s = G.state;
    if (!s) return;
    UI.closeAllModals();
    E.tutorial.stop();
    const indRows = E.INDICATORS.map((d) => '<div class="end-ind"><span>' + d.icon + '</span><b>' + Math.round(s.ind[d.key]) + '</b><small>' + d.name + '</small></div>').join('');
    const years = (s.wonYear || s.year) - s.startYear;
    if (s.status === 'won') {
      const achieved = E.ODS.filter((o) => s.ods[o.n] >= 75);
      UI.openModal({
        cls: 'modal-end victory', dismissible: false,
        body: '<div class="end-hero"><div class="end-icon">🏆</div><div class="kicker">Victoria · Año ' + s.wonYear + '</div><h2>¡Has construido una sociedad sostenible!</h2>' +
          '<p>En ' + years + ' años, <b>' + U.esc(s.regionName) + '</b> se ha transformado en una región avanzada, justa y respetuosa con el planeta. Has demostrado que el progreso económico, la justicia social y la protección del medioambiente pueden avanzar juntos.</p></div>' +
          '<div class="end-inds">' + indRows + '</div>' +
          '<div class="end-ods">' + achieved.map((o) => '<span class="ods-badge" style="background:' + o.color + '">ODS ' + o.n + '</span>').join('') + '</div>' +
          '<div class="end-score">Puntuación final: <b>' + U.fmt(EN.score(s)) + '</b></div>',
        buttons: [
          { label: '📜 Ver historial', cls: 'btn-ghost', onClick: () => G.openPanel('historial') },
          { label: '🏠 Menú principal', cls: 'btn-ghost', onClick: () => G.showScreen('menu') },
          { label: '🌍 Seguir gobernando', cls: 'btn-primary', onClick: () => { EN.continueSandbox(s); G.autosave(); G.render(); UI.toast('🌍 Modo libre: sigue mejorando tu región sin límite de tiempo.', 'good'); } }
        ]
      });
    } else if (s.status === 'lost') {
      const causes = s.defeat.causes;
      const main = DEFEAT[causes[0]];
      const others = E.INDICATORS.filter((d) => !causes.includes(d.key) && s.ind[d.key] < 30);
      const extra = [];
      const st = EN.computeStats(s);
      if (s.money < 0) extra.push('La deuda pública (' + U.fmt(s.money) + ' monedas) obligó a recortar servicios.');
      if (st.counts.central_carbon) extra.push('La región seguía dependiendo de la central de carbón.');
      if (st.counts.fabrica_tradicional) extra.push('La industria contaminante deterioró el entorno.');
      if (st.ratio < 0.8) extra.push('La producción energética solo cubría el ' + Math.round(st.ratio * 100) + ' % de la demanda.');
      others.forEach((d) => extra.push(d.name + ' también estaba en una situación muy débil (' + Math.round(s.ind[d.key]) + ' puntos).'));
      UI.openModal({
        cls: 'modal-end defeat', dismissible: false,
        body: '<div class="end-hero"><div class="end-icon">🥀</div><div class="kicker">Crisis grave · Año ' + s.defeat.year + '</div><h2>' + main[0] + '</h2><p>' + main[1] + '</p></div>' +
          (causes.length > 1 ? '<p><b>Otras causas:</b> ' + causes.slice(1).map((c) => DEFEAT[c][0]).join(', ') + '.</p>' : '') +
          (extra.length ? '<div class="card"><h4>Factores que agravaron la crisis</h4><ul>' + extra.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' : '') +
          '<div class="card tip-card"><h4>💡 Para la próxima vez</h4><ul>' + causes.map((c) => '<li>' + DEFEAT[c][2] + '</li>').join('') + '<li>Recuerda: una sociedad sostenible necesita equilibrio entre economía, sociedad y medioambiente.</li></ul></div>' +
          '<div class="end-inds">' + indRows + '</div>',
        buttons: [
          { label: '📜 Ver historial', cls: 'btn-ghost', onClick: () => G.openPanel('historial') },
          { label: '🏠 Menú principal', cls: 'btn-ghost', onClick: () => G.showScreen('menu') },
          { label: '📂 Cargar partida', cls: 'btn-ghost', onClick: () => G.openSlots('load') },
          { label: '🌱 Nueva partida', cls: 'btn-primary', onClick: () => G.newGameDialog() }
        ]
      });
    }
  };

  /* =============== Modales informativos =============== */
  G.howToPlay = () => UI.openModal({
    title: 'Cómo jugar', icon: '📖', wide: true, cls: 'modal-help',
    body: '<div class="help-grid">' +
      '<section><h4>🎯 Objetivo</h4><p>Transforma tu región en una sociedad avanzada, justa y sostenible. Para ganar, al cerrar un año deben cumplirse a la vez:</p><ul>' +
      E.INDICATORS.map((d) => '<li>' + d.icon + ' ' + d.name + ' superior a <b>' + d.victory + '</b></li>').join('') + '<li>🎯 Al menos <b>6 ODS</b> alcanzados (75 % de progreso)</li></ul></section>' +
      '<section><h4>📅 Turnos</h4><p>Cada turno es un año. Pulsa <b>«Pasar al siguiente año»</b> para cobrar impuestos, pagar el mantenimiento, actualizar los indicadores y descubrir los acontecimientos. Si hay un acontecimiento pendiente, debes resolverlo antes de avanzar.</p>' +
      '<h4>📊 Indicadores</h4><p>Van de 0 a 100. Cada uno tiende hacia un <b>objetivo</b> que depende de tu región (flecha ▲/▼). Las decisiones tienen un efecto inmediato y otro que se consolida con los años. Haz clic en un indicador para ver su cálculo.</p></section>' +
      '<section><h4>🏗️ Construir</h4><p>Abre <b>Construir</b>, elige un edificio y colócalo en una casilla verde. Cada edificio tiene precio, mantenimiento anual y efectos. Las copias repetidas rinden menos (−30 % cada una), así que conviene diversificar.</p>' +
      '<h4>🗺️ Territorio</h4><p>Selecciona una casilla oscura junto a tu frontera para integrarla. Los pueblos aportan población.</p></section>' +
      '<section><h4>🏛️ Gobierno</h4><p>Elige la política fiscal, aprueba leyes (con coste anual) e invierte en programas temporales. Las decisiones políticas son irreversibles.</p>' +
      '<h4>⚠️ Derrota</h4><p>Si cualquier indicador llega a 0, o la deuda supera las 3.000 monedas, la región entra en una crisis grave.</p>' +
      '<h4>💾 Guardado</h4><p>La partida se guarda sola tras cada acción y cada año. Además tienes 3 ranuras manuales.</p></section></div>',
    buttons: [{ label: 'Entendido', cls: 'btn-primary' }]
  });
  G.credits = () => UI.openModal({
    title: 'Créditos', icon: '🌿', cls: 'modal-credits',
    body: '<div class="credits"><h3>ECOCRACIA</h3><p>Construye una sociedad sostenible</p><p>Videojuego educativo de estrategia y gestión sobre los <b>Objetivos de Desarrollo Sostenible</b> de la Agenda 2030 de las Naciones Unidas.</p>' +
      '<p class="muted">Proyecto educativo individual · Desarrollado con HTML5, CSS3 y JavaScript sin dependencias externas. Mapa e iconografía generados con SVG y emoji del sistema. Tipografías: Cinzel y Nunito (Google Fonts).</p>' +
      '<p class="muted small">Los ODS y sus colores pertenecen a las Naciones Unidas y se utilizan aquí con fines exclusivamente educativos. La región, sus pueblos y sus acontecimientos son ficticios.</p></div>',
    buttons: [{ label: 'Cerrar', cls: 'btn-primary' }]
  });
  G.gameMenu = () => UI.openModal({
    title: 'Menú', icon: '☰', cls: 'modal-menu',
    body: '<div class="menu-list">' +
      '<button class="btn btn-block" data-action="open-save">💾 Guardar partida</button>' +
      '<button class="btn btn-block" data-action="open-load">📂 Cargar partida</button>' +
      '<button class="btn btn-block" data-action="menu-new">🌱 Nueva partida</button>' +
      '<button class="btn btn-block" data-action="tut-restart">🎓 Repetir el tutorial</button>' +
      '<button class="btn btn-block" data-action="how-to-play">📖 Cómo jugar</button>' +
      '<button class="btn btn-block btn-ghost" data-action="to-menu">🏠 Volver al menú principal</button></div>',
    buttons: []
  });

  /* =============== Delegación de clics =============== */
  const ACTIONS = {
    'menu-new': () => { UI.closeAllModals(); G.newGameDialog(); },
    'menu-continue': () => { const l = SV.latest(); if (l) G.loadSlot(l.slot); },
    'open-load': () => G.openSlots('load'),
    'open-save': () => { if (G.state) G.openSlots('save'); },
    'save-slot': (d) => saveSlot(d.slot),
    'load-slot': (d) => G.loadSlot(d.slot),
    'delete-slot': (d) => deleteSlot(d.slot, d.mode),
    'how-to-play': () => { UI.closeAllModals(); G.howToPlay(); },
    'credits': () => G.credits(),
    'game-menu': () => G.gameMenu(),
    'to-menu': () => { UI.closeAllModals(); E.tutorial.stop(); G.autosave(); G.showScreen('menu'); },
    'tut-restart': () => { UI.closeAllModals(); G.ui.panel = null; G.render(); E.tutorial.start(); },
    'tut-next': () => E.tutorial.next(),
    'tut-skip': () => E.tutorial.stop(),
    'panel': (d) => { if (G.ui.panel === d.panel) G.closePanel(); else { if (d.panel === 'construir' && G.ui.selected != null && G.state.tiles[G.ui.selected].owned && !G.state.tiles[G.ui.selected].building) G.ui.buildTarget = null; G.openPanel(d.panel); } },
    'close-panel': () => G.closePanel(),
    'subtab': (d) => { G.ui.tabs[d.panel] = d.tab; G.render(); },
    'build-cat': (d) => { G.ui.buildCat = d.cat; G.render(); },
    'pick-building': (d) => {
      const s = G.state;
      const def = E.BUILDINGS[d.b];
      if (s.status === 'lost') return;
      if (!EN.requirementMet(s, d.b)) { UI.toast('🔒 Requiere construir antes: ' + E.BUILDINGS[def.requires].name + '.', 'bad'); return; }
      if (s.money < def.cost) { UI.toast('⛔ No tienes suficiente dinero (necesitas 🪙 ' + U.fmt(def.cost) + ').', 'bad'); return; }
      if (G.ui.buildTarget != null) { confirmBuild(d.b, G.ui.buildTarget); return; }
      G.ui.placing = G.ui.placing === d.b ? null : d.b;
      G.ui.selected = null;
      if (G.ui.placing) { G.ui.panel = null; G.ui.reopenBuild = true; }
      G.render();
    },
    'quick-build': (d) => { if (G.state.status !== 'lost') confirmBuild(d.b, G.ui.selected); },
    'cancel-placing': () => { G.ui.placing = null; if (G.ui.reopenBuild) G.ui.panel = 'construir'; G.ui.reopenBuild = false; G.render(); },
    'clear-target': () => { G.ui.buildTarget = null; G.render(); },
    'tile-close': () => { G.ui.selected = null; G.ui.buildTarget = null; G.render(); },
    'tile-build': () => { G.ui.buildTarget = G.ui.selected; const t = G.state.tiles[G.ui.selected]; const first = Object.values(E.BUILDINGS).find((b) => b.buildable !== false && EN.placementCheck(G.state, b.key, t.i).ok); if (first && !Object.values(E.BUILDINGS).some((b) => b.cat === G.ui.buildCat && EN.placementCheck(G.state, b.key, t.i).ok)) G.ui.buildCat = first.cat; G.ui.panel = 'construir'; G.render(); E.tutorial.notify('panel:construir'); },
    'tile-demolish': () => demolish(),
    'tile-integrate': () => integrate(),
    'locate': (d) => { const i = +d.i; G.ui.selected = i; E.map.focusTile(G.state, i); if (isMobile()) G.ui.panel = null; G.render(); },
    'tax': (d) => { const T = E.TAXES[d.key]; if (G.state.tax === d.key) return; confirmAndRun({ action: 'setTax', args: [d.key], title: T.name, icon: T.icon, ok: 'Aplicar', body: '<p>' + T.desc + '</p><p class="muted small">Solo podrás volver a cambiar la política fiscal el año que viene.</p>' }); },
    'law': (d) => {
      const L = E.LAWS[d.id], on = !G.state.laws[d.id];
      confirmAndRun({ action: 'setLaw', args: [d.id, on], title: (on ? 'Aprobar: ' : 'Derogar: ') + L.name, icon: L.icon, ok: on ? 'Aprobar ley (🪙 ' + L.enact + ')' : 'Derogar ley', danger: !on,
        body: '<p>' + L.desc + '</p>' + (on ? '<p>Coste de aprobación: <b>🪙 ' + L.enact + '</b> · Coste anual: <b>🪙 ' + L.annual + '</b></p>' : '<p>Dejarás de pagar 🪙 ' + L.annual + ' al año, pero perderás sus efectos.</p>') });
    },
    'invest': (d) => { const I = E.INVESTMENTS[d.id]; confirmAndRun({ action: 'invest', args: [d.id], title: I.name, icon: I.icon, ok: 'Invertir (🪙 ' + U.fmt(I.cost) + ')', body: '<p>' + I.desc + '</p>' + (I.special ? '<p class="special">✨ ' + I.special + '</p>' : '') + '<p class="muted small">' + (I.years ? 'Sus efectos duran ' + I.years + ' años.' : 'Efecto permanente.') + ' Podrás repetirla dentro de ' + I.cooldown + ' años.</p>' }); },
    'decide': (d) => { const D = E.DECISIONS[d.id]; confirmAndRun({ action: 'decide', args: [d.id], title: D.name, icon: D.icon, danger: !!D.warn, ok: 'Tomar la decisión', body: '<p>' + D.desc + '</p><p class="warn-text">Esta decisión es <b>irreversible</b>.</p>' }); },
    'event-open': () => G.openEvent(),
    'event-choose': (d) => chooseEvent(+d.idx),
    'next-year': () => G.nextYear(),
    'ind-detail': (d) => indicatorDetail(d.ind),
    'hist-filter': (d) => { G.ui.histFilter = d.f; G.render(); },
    'chart-toggle': (d) => { G.ui.chart[d.ind] = !G.ui.chart[d.ind]; if (!E.IND_KEYS.some((k) => G.ui.chart[k])) G.ui.chart[d.ind] = true; G.render(); },
    'zoom-in': () => E.map.zoom(1 / 1.25),
    'zoom-out': () => E.map.zoom(1.25),
    'zoom-reset': () => E.map.reset()
  };

  function boot() {
    UI.initTooltips();
    E.map.init($('#map'));
    E.map.onTileClick = onTileClick;
    E.map.onTileHover = onTileHover;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (!a || a.disabled) return;
      const fn = ACTIONS[a.dataset.action];
      if (fn) { e.preventDefault(); UI.hideTip(); fn(a.dataset, a); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (UI.hasModal()) { const m = UI.topModal(); if (m.o.dismissible !== false) { UI.closeModal(m); if (m.o.onClose) m.o.onClose(); } return; }
      if (G.ui.placing) { ACTIONS['cancel-placing'](); return; }
      if (G.ui.selected != null) { G.ui.selected = null; G.render(); return; }
      if (G.ui.panel) G.closePanel();
    });
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => E.tutorial.reposition(), 120); });
    window.addEventListener('beforeunload', () => { if (G.state && $('#screen-game').classList.contains('is-active')) SV.write('auto', G.state); });
    G.showScreen('menu');
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.ECO);
