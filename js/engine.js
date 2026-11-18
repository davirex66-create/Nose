/* ECOCRACIA · Motor de simulación (sin dependencias del DOM)
 *
 * Modelo: cada indicador tiene un valor actual y un OBJETIVO calculado a partir de la región
 * (edificios, leyes, impuestos, población, efectos temporales…). Cada año el valor recorre un 30 %
 * de la distancia hacia su objetivo. Al tomar una decisión, el valor se desplaza al instante un 40 %
 * del cambio del objetivo, de modo que las acciones se notan enseguida y se consolidan con el tiempo.
 */
(function (E) {
  'use strict';
  const U = E.util, H = E.hex, K = E.IND_KEYS;

  const C = E.CONST = {
    DRIFT: 0.3, IMMEDIATE: 0.4, TAX_BASE: 40, ODS_GOAL: 75, ODS_REQUIRED: 6, BANKRUPTCY: -3000,
    START_YEAR: 2025, EVENT_COOLDOWN: 7, DIM: 0.7, DEMOLISH_REFUND: 0.25
  };
  E.DIFFICULTY = {
    facil: { name: 'Fácil', money: 3000, eventChance: 0.6, maintMult: 0.8, desc: '3.000 monedas iniciales y un 20 % menos de mantenimiento.' },
    normal: { name: 'Normal', money: 2000, eventChance: 0.6, maintMult: 1, desc: '2.000 monedas iniciales. La experiencia recomendada.' },
    dificil: { name: 'Difícil', money: 1500, eventChance: 0.7, maintMult: 1.15, desc: '1.500 monedas, mantenimiento un 15 % más caro y más acontecimientos.' }
  };

  const zero = () => { const o = {}; K.forEach((k) => { o[k] = 0; }); return o; };
  const dimf = (k) => Math.pow(C.DIM, k);
  const fail = (msg) => ({ ok: false, msg });

  function log(s, type, icon, text) {
    s.log.push({ y: s.year, t: type, i: icon, x: text });
    if (s.log.length > 500) s.log.splice(0, s.log.length - 500);
  }

  /* ------------------------------------------------------------------ */
  /* Estadísticas físicas y económicas                                   */
  /* ------------------------------------------------------------------ */
  function computeStats(s) {
    const B = E.BUILDINGS;
    const counts = {};
    for (const t of s.tiles) if (t.owned && t.building) counts[t.building.type] = (counts[t.building.type] || 0) + 1;
    const renewMult = 1 + (s.laws.subvencion_renovables ? 0.25 : 0) + ((counts.centro_investigacion || 0) > 0 ? 0.1 : 0);

    const seen = {}, typeEff = {}, odsItems = {}, typeMoney = {};
    let bIncome = 0, maint = 0, jobs = 0, use = 0, prod = 0, renew = 0;
    for (const t of s.tiles) {
      if (!t.owned || !t.building) continue;
      const type = t.building.type, def = B[type];
      if (!def) continue;
      const k = seen[type] || 0;
      seen[type] = k + 1;
      const d = dimf(k);
      bIncome += def.income || 0; maint += def.maint || 0; jobs += def.jobs || 0; use += def.energyUse || 0;
      typeMoney[type] = typeMoney[type] || { income: 0, maint: 0, n: 0 };
      typeMoney[type].income += def.income || 0; typeMoney[type].maint += def.maint || 0; typeMoney[type].n++;
      if (def.energyProd) {
        const p = def.energyProd * (def.renewable ? renewMult : 1);
        prod += p; if (def.renewable) renew += p;
      }
      if (def.eff) for (const ik in def.eff) {
        typeEff[type] = typeEff[type] || zero();
        typeEff[type][ik] += def.eff[ik] * d;
      }
      if (def.ods) for (const n in def.ods) {
        odsItems[n] = odsItems[n] || {};
        odsItems[n][def.name] = (odsItems[n][def.name] || 0) + def.ods[n] * d;
      }
    }
    let owned = 0, forest = 0, villages = 0, capital = 0;
    for (const t of s.tiles) {
      if (!t.owned) continue;
      owned++;
      if (t.terrain === 'ciudad') capital++;
      if (t.terrain === 'pueblo') villages++;
      if (t.terrain === 'bosque' && (!t.building || t.building.type === 'parque_natural')) forest++;
    }
    jobs += capital * 2.0 + villages * 0.4;
    const forestRatio = owned ? forest / owned : 0;

    const tax = E.TAXES[s.tax] || E.TAXES.moderado;
    const taxes = s.pop * C.TAX_BASE * tax.mult * (0.6 + s.ind.economia / 125);
    const services = s.pop * 12;
    let lawCost = 0;
    for (const id in s.laws) if (s.laws[id] && E.LAWS[id]) lawCost += E.LAWS[id].annual;
    const maintMult = (E.DIFFICULTY[s.difficulty] || E.DIFFICULTY.normal).maintMult;
    maint *= maintMult;
    for (const k in typeMoney) typeMoney[k].maint = Math.round(typeMoney[k].maint * maintMult);
    const interest = s.money < 0 ? -s.money * 0.08 : 0;
    const extra = s.extraIncome || 0;
    const income = taxes + bIncome + extra;
    const expenses = maint + services + lawCost + interest;
    const demand = Math.max(0.5, (s.pop * 0.3 + use) * s.demandMult);
    const workforce = s.pop * 0.5;

    return {
      counts, typeEff, odsItems, typeMoney, renewMult,
      bIncome, maint, jobs, use, prod, renew, renewShare: prod > 0 ? renew / prod : 0,
      owned, forest, forestRatio, villages,
      taxes, services, lawCost, interest, extra, income, expenses, net: income - expenses,
      demand, ratio: prod / demand, workforce
    };
  }

  /* ------------------------------------------------------------------ */
  /* Objetivos de los indicadores (con desglose de factores)             */
  /* ------------------------------------------------------------------ */
  function computeTargets(s, st) {
    const I = s.ind, raw = zero(), F = {};
    K.forEach((k) => { F[k] = []; });
    const add = (k, label, v) => { raw[k] += v; if (Math.abs(v) >= 0.05) F[k].push({ label, v }); };

    add('economia', 'Nivel de empleo', 0.3 * I.empleo);
    add('economia', 'Nivel educativo', 0.2 * I.educacion);
    add('economia', 'Balance presupuestario anual', U.clamp(st.net / 40, -8, 8));
    add('felicidad', 'Empleo', 0.2 * I.empleo);
    add('felicidad', 'Igualdad', 0.15 * I.igualdad);
    add('felicidad', 'Calidad ambiental', 0.15 * I.medioambiente);
    add('felicidad', 'Congestión y presión sobre los servicios', -s.pop * 0.35);
    add('medioambiente', 'Presión de la población', -s.pop * 0.6);
    add('medioambiente', 'Bosques (' + Math.round(st.forestRatio * 100) + ' % del territorio)', 20 * st.forestRatio);
    add('energia', 'Cobertura energética (' + Math.round(st.ratio * 100) + ' % de la demanda)', 100 * st.ratio - 40);
    add('educacion', 'Necesidades educativas de la población', -s.pop * 0.8);
    add('igualdad', 'Nivel educativo', 0.1 * I.educacion);
    add('empleo', 'Puestos de trabajo / población activa', 100 * st.jobs / st.workforce);

    for (const type in st.typeEff) {
      const def = E.BUILDINGS[type], n = st.counts[type];
      for (const k in st.typeEff[type]) add(k, def.name + (n > 1 ? ' ×' + n : ''), st.typeEff[type][k]);
    }
    if (I.energia < 35) {
      const p = (35 - I.energia) * 0.25;
      add('economia', 'Cortes de suministro eléctrico', -p);
      add('felicidad', 'Cortes de suministro eléctrico', -p * 0.8);
    }
    if (s.money < 0) {
      const p = Math.min(30, -s.money / 60);
      add('economia', 'Deuda pública', -p);
      add('felicidad', 'Recortes por la deuda', -p * 0.5);
    }
    const tax = E.TAXES[s.tax];
    for (const k in tax.eff) add(k, tax.name, tax.eff[k]);
    for (const id in s.laws) if (s.laws[id] && E.LAWS[id]) { const L = E.LAWS[id]; for (const k in L.eff) add(k, 'Ley: ' + L.name, L.eff[k]); }
    if (s.laws.bajas_emisiones && st.counts.red_transporte) add('felicidad', 'Alternativas de transporte público', 3);
    for (const m of s.mods) for (const k in (m.eff || {})) add(k, m.label + (m.years != null ? ' (' + m.years + ' años)' : ''), m.eff[k]);
    K.forEach((k) => add(k, 'Base estructural de la región', s.calib[k] || 0));

    const targets = {};
    K.forEach((k) => { targets[k] = U.clamp(raw[k], 0, 100); });
    return { raw, targets, factors: F };
  }

  /* ------------------------------------------------------------------ */
  /* Progreso de los ODS                                                 */
  /* ------------------------------------------------------------------ */
  function computeODS(s, st, detail) {
    const res = {};
    for (const o of E.ODS) {
      let A = 0;
      for (const k in o.w) A += o.w[k] * s.ind[k];
      const items = [];
      let bonus = 0;
      const addB = (label, v) => { bonus += v; if (Math.abs(v) >= 0.1) items.push({ label, v }); };
      const bi = st.odsItems[o.n] || {};
      for (const name in bi) addB(name, bi[name]);
      const tax = E.TAXES[s.tax];
      if (tax.ods[o.n]) addB(tax.name, tax.ods[o.n]);
      for (const id in s.laws) if (s.laws[id] && E.LAWS[id] && E.LAWS[id].ods[o.n]) addB('Ley: ' + E.LAWS[id].name, E.LAWS[id].ods[o.n]);
      const modAgg = {};
      for (const m of s.mods) if (m.ods && m.ods[o.n]) modAgg[m.label] = (modAgg[m.label] || 0) + m.ods[o.n];
      for (const l in modAgg) addB(l, modAgg[l]);
      if (o.n === 7) addB('Cuota renovable (' + Math.round(st.renewShare * 100) + ' %)', st.renewShare * 20);
      if (o.n === 13) addB('Cuota renovable (' + Math.round(st.renewShare * 100) + ' %)', st.renewShare * 12);
      if (o.n === 15) addB('Superficie forestal (' + Math.round(st.forestRatio * 100) + ' %)', st.forestRatio * 25);
      const b = U.clamp(bonus, -30, 25);
      const p = U.clamp(A * 0.8 + b, 0, 100);
      res[o.n] = detail ? { progress: p, base: A * 0.8, bonus, bonusCapped: b, items } : Math.round(p * 10) / 10;
    }
    return res;
  }

  function odsAchieved(s) { return Object.values(s.ods).filter((v) => v >= C.ODS_GOAL).length; }

  function pushHistory(s, st) {
    const ind = {};
    K.forEach((k) => { ind[k] = Math.round(s.ind[k] * 10) / 10; });
    const vals = Object.values(s.ods);
    const h = { y: s.year, ind, m: Math.round(s.money), p: Math.round(s.pop * 100) / 100, ods: { ...s.ods }, odsAvg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10, net: Math.round(st.net) };
    const last = s.history[s.history.length - 1];
    if (last && last.y === s.year) s.history[s.history.length - 1] = h; else s.history.push(h);
  }

  /* ------------------------------------------------------------------ */
  /* Nueva partida                                                       */
  /* ------------------------------------------------------------------ */
  function newGame(opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2147483647);
    const diffKey = E.DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    const diff = E.DIFFICULTY[diffKey];
    const map = E.mapgen.generate(seed);
    const s = {
      version: 1, seed, difficulty: diffKey,
      regionName: (opts.regionName || '').trim().slice(0, 40) || map.regionName,
      capitalName: map.capitalName,
      year: C.START_YEAR, startYear: C.START_YEAR,
      money: diff.money, pop: 12, ind: { ...E.START_VALUES }, calib: {},
      cols: map.cols, rows: map.rows, tiles: map.tiles, river: map.river, capital: map.capital, initialOwned: 0,
      laws: {}, lawChanged: {}, tax: 'moderado', taxChanged: null,
      decisions: {}, invest: {}, investUses: {}, mods: [], demandMult: 1, extraIncome: 0,
      pendingEvent: null, eventLast: {},
      log: [], history: [], ods: {},
      status: 'playing', sandbox: false, wonYear: null, defeat: null,
      tutorialDone: !!opts.skipTutorial,
      stats: { built: 0, demolished: 0, events: 0, laws: 0, invest: 0, decisions: 0 },
      created: Date.now()
    };
    s.initialOwned = s.tiles.filter((t) => t.owned).length;
    K.forEach((k) => { s.calib[k] = 0; });
    const st = computeStats(s);
    const { raw } = computeTargets(s, st);
    K.forEach((k) => { s.calib[k] = E.START_VALUES[k] - raw[k]; });
    s.ods = computeODS(s, st);
    pushHistory(s, st);
    log(s, 'system', '🌱', 'Comienza tu mandato en ' + s.regionName + '. La capital, ' + s.capitalName + ', tiene 12.000 habitantes.');
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Acciones                                                            */
  /* ------------------------------------------------------------------ */
  /** Ejecuta fn y desplaza los indicadores un 40 % del cambio que provoca en sus objetivos. */
  function withImmediate(s, fn) {
    const snap = { ...s.ind };
    const before = computeTargets(s, computeStats(s)).targets;
    const r = fn();
    const after = computeTargets(s, computeStats(s)).targets;
    K.forEach((k) => { s.ind[k] = U.clamp(s.ind[k] + (after[k] - before[k]) * C.IMMEDIATE, 0, 100); });
    const deltas = {};
    K.forEach((k) => { const d = s.ind[k] - snap[k]; if (Math.abs(d) >= 0.05) deltas[k] = d; });
    s.ods = computeODS(s, computeStats(s));
    return { deltas, r };
  }

  function isNearWater(s, i) {
    return H.neighbors(s.cols, s.rows, i).some((n) => s.tiles[n].terrain === 'rio' || s.tiles[n].terrain === 'lago');
  }

  /** Comprueba si un edificio puede ubicarse en una casilla (sin mirar el dinero). */
  function placementCheck(s, type, i) {
    const def = E.BUILDINGS[type];
    if (!def || def.buildable === false) return fail('Este edificio no se puede construir.');
    const t = s.tiles[i];
    if (!t) return fail('Casilla no válida.');
    if (!t.owned) return fail('Esta casilla no pertenece a tu región. Intégrala primero.');
    if (t.building) return fail('La casilla ya está ocupada por: ' + E.BUILDINGS[t.building.type].name + '.');
    if (t.terrain === 'ciudad' || t.terrain === 'pueblo') return fail('No se puede construir dentro de un núcleo urbano existente.');
    if (!def.terrain.includes(t.terrain)) {
      return fail(def.name + ' solo se puede construir en: ' + def.terrain.map((x) => E.TERRAINS[x].name.toLowerCase()).join(', ') + '.');
    }
    if (def.nearWater && !isNearWater(s, i)) return fail(def.name + ' debe construirse junto al río o al lago.');
    if (def.requires && !s.tiles.some((x) => x.owned && x.building && x.building.type === def.requires)) {
      return fail('Requiere haber construido antes: ' + E.BUILDINGS[def.requires].name + '.');
    }
    if (t.terrain === 'bosque' && type !== 'parque_natural' && s.laws.proteger_bosques) {
      return fail('La ley de protección de los bosques impide talar esta casilla.');
    }
    return { ok: true };
  }

  function canBuild(s, type, i) {
    const p = placementCheck(s, type, i);
    if (!p.ok) return p;
    const def = E.BUILDINGS[type];
    if (s.money < def.cost) return fail('No tienes dinero suficiente: necesitas ' + U.fmt(def.cost) + ' monedas.');
    return { ok: true };
  }

  function requirementMet(s, type) {
    const def = E.BUILDINGS[type];
    return !def.requires || s.tiles.some((x) => x.owned && x.building && x.building.type === def.requires);
  }

  function placeBuilding(s, type, i) {
    const t = s.tiles[i];
    if (t.terrain === 'bosque' && type !== 'parque_natural') { t.terrain = 'llanura'; t.cleared = true; }
    t.building = { type, year: s.year };
  }

  const A = {};

  A.build = (s, type, i) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const c = canBuild(s, type, i);
    if (!c.ok) return c;
    const def = E.BUILDINGS[type];
    const t = s.tiles[i];
    const wasForest = t.terrain === 'bosque' && type !== 'parque_natural';
    const res = withImmediate(s, () => { s.money -= def.cost; placeBuilding(s, type, i); });
    s.stats.built++;
    log(s, 'build', def.icon, 'Construido: ' + def.name + ' (' + U.fmt(def.cost) + ' monedas)' + (wasForest ? '. Se ha talado una casilla de bosque.' : '.'));
    return { ok: true, deltas: res.deltas, msg: def.icon + ' ' + def.name + ' construido' + (wasForest ? ' (bosque talado)' : '') };
  };

  A.demolish = (s, i) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const t = s.tiles[i];
    if (!t || !t.building) return fail('No hay ningún edificio en esta casilla.');
    const def = E.BUILDINGS[t.building.type];
    const cost = def.demolishCost || 0;
    if (cost > s.money) return fail('Desmantelar esta instalación cuesta ' + U.fmt(cost) + ' monedas.');
    const refund = cost ? 0 : Math.round(def.cost * C.DEMOLISH_REFUND);
    const res = withImmediate(s, () => { s.money += refund - cost; t.building = null; });
    s.stats.demolished++;
    log(s, 'build', '🚧', (cost ? 'Desmantelada: ' : 'Demolido: ') + def.name + (refund ? ' (se recuperan ' + refund + ' monedas).' : cost ? ' (coste: ' + cost + ' monedas).' : '.'));
    return { ok: true, deltas: res.deltas, msg: '🚧 ' + def.name + (cost ? ' desmantelada' : ' demolido') };
  };

  function integrateCost(s) {
    const owned = s.tiles.filter((t) => t.owned).length;
    return 150 + 25 * Math.max(0, owned - s.initialOwned);
  }
  function canIntegrate(s, i) {
    const t = s.tiles[i];
    if (!t || t.owned) return fail('Esta casilla ya forma parte de tu región.');
    if (!H.neighbors(s.cols, s.rows, i).some((n) => s.tiles[n].owned)) return fail('Solo puedes integrar casillas vecinas a tu territorio.');
    const cost = integrateCost(s);
    if (s.money < cost) return fail('Integrar esta casilla cuesta ' + U.fmt(cost) + ' monedas.');
    return { ok: true, cost };
  }
  A.integrate = (s, i) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const c = canIntegrate(s, i);
    if (!c.ok) return c;
    const t = s.tiles[i];
    const res = withImmediate(s, () => {
      s.money -= c.cost;
      t.owned = true;
      if (t.terrain === 'pueblo') s.pop += 1.2;
    });
    log(s, 'gov', '🗺️', 'Integrada una casilla de ' + E.TERRAINS[t.terrain].name.toLowerCase() + (t.name ? ' (' + t.name + ', +1.200 habitantes)' : '') + ' mediante un acuerdo con sus habitantes.');
    return { ok: true, deltas: res.deltas, msg: '🗺️ Nueva casilla integrada en la región' };
  };

  A.setTax = (s, key) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    if (!E.TAXES[key]) return fail('Política fiscal desconocida.');
    if (s.tax === key) return fail('Esa ya es la política fiscal vigente.');
    if (s.taxChanged === s.year) return fail('La política fiscal solo puede cambiarse una vez al año.');
    const res = withImmediate(s, () => { s.tax = key; s.taxChanged = s.year; });
    log(s, 'gov', E.TAXES[key].icon, 'Nueva política fiscal: ' + E.TAXES[key].name + '.');
    return { ok: true, deltas: res.deltas, msg: E.TAXES[key].icon + ' ' + E.TAXES[key].name };
  };

  A.setLaw = (s, id, on) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const L = E.LAWS[id];
    if (!L) return fail('Ley desconocida.');
    on = !!on;
    if (!!s.laws[id] === on) return fail(on ? 'La ley ya está en vigor.' : 'La ley no está en vigor.');
    if (s.lawChanged[id] === s.year) return fail('Ya has modificado esta ley este año. Espera al año que viene.');
    if (on && s.money < L.enact) return fail('Aprobar esta ley cuesta ' + U.fmt(L.enact) + ' monedas.');
    const res = withImmediate(s, () => {
      if (on) { s.money -= L.enact; s.laws[id] = true; } else { delete s.laws[id]; }
      s.lawChanged[id] = s.year;
    });
    if (on) s.stats.laws++;
    log(s, 'gov', L.icon, (on ? 'Aprobada la ley: ' : 'Derogada la ley: ') + L.name + '.');
    return { ok: true, deltas: res.deltas, msg: L.icon + ' ' + (on ? 'Ley aprobada: ' : 'Ley derogada: ') + L.name };
  };

  function investAvailability(s, id) {
    const I = E.INVESTMENTS[id];
    if (!I) return fail('Inversión desconocida.');
    if (I.maxUses && (s.investUses[id] || 0) >= I.maxUses) return fail('Ya has realizado esta inversión el número máximo de veces.');
    if (s.invest[id] != null && s.year - s.invest[id] < I.cooldown) {
      return fail('Disponible de nuevo en ' + (I.cooldown - (s.year - s.invest[id])) + ' año(s).');
    }
    if (I.plant && plantCandidates(s).length === 0) return fail('No hay llanuras vacías en tu territorio para reforestar.');
    if (s.money < I.cost) return fail('Necesitas ' + U.fmt(I.cost) + ' monedas.');
    return { ok: true };
  }
  function plantCandidates(s) {
    return s.tiles.filter((t) => t.owned && t.terrain === 'llanura' && !t.building);
  }
  A.invest = (s, id) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const c = investAvailability(s, id);
    if (!c.ok) return c;
    const I = E.INVESTMENTS[id];
    let planted = 0;
    const res = withImmediate(s, () => {
      s.money -= I.cost;
      s.invest[id] = s.year;
      s.investUses[id] = (s.investUses[id] || 0) + 1;
      s.mods.push({ id: 'inv_' + id, label: I.name, eff: { ...I.eff }, ods: { ...I.ods }, years: I.years });
      if (I.demandCut) s.demandMult *= (1 - I.demandCut);
      if (I.plant) {
        const cands = plantCandidates(s).sort((a, b) => {
          const fa = H.neighbors(s.cols, s.rows, a.i).filter((n) => s.tiles[n].terrain === 'bosque').length;
          const fb = H.neighbors(s.cols, s.rows, b.i).filter((n) => s.tiles[n].terrain === 'bosque').length;
          return fb - fa;
        });
        cands.slice(0, I.plant).forEach((t) => { t.terrain = 'bosque'; t.cleared = false; t.burned = false; t.planted = true; planted++; });
      }
    });
    s.stats.invest++;
    log(s, 'gov', I.icon, 'Inversión: ' + I.name + ' (' + U.fmt(I.cost) + ' monedas)' + (planted ? '. Se han reforestado ' + planted + ' casillas.' : '.'));
    return { ok: true, deltas: res.deltas, msg: I.icon + ' ' + I.name };
  };

  function decisionAvailability(s, id) {
    const D = E.DECISIONS[id];
    if (!D) return fail('Decisión desconocida.');
    if (s.decisions[id]) return fail('Ya has tomado esta decisión.');
    if (D.requires && !s.tiles.some((t) => t.owned && t.building && t.building.type === D.requires)) return fail('Requiere: ' + E.BUILDINGS[D.requires].name + '.');
    if (D.cost > 0 && s.money < D.cost) return fail('Necesitas ' + U.fmt(D.cost) + ' monedas.');
    return { ok: true };
  }
  A.decide = (s, id) => {
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const c = decisionAvailability(s, id);
    if (!c.ok) return c;
    const D = E.DECISIONS[id];
    const res = withImmediate(s, () => {
      s.money -= D.cost;
      s.decisions[id] = s.year;
      s.extraIncome = (s.extraIncome || 0) + (D.income || 0);
      s.mods.push({ id: 'dec_' + id, label: D.name, eff: { ...D.eff }, ods: { ...D.ods }, years: null });
    });
    s.stats.decisions++;
    log(s, 'gov', D.icon, 'Decisión política: ' + D.name + '.');
    return { ok: true, deltas: res.deltas, msg: D.icon + ' ' + D.name };
  };

  /* ---------- Acontecimientos ---------- */
  function eventText(ev, s, st) { return typeof ev.text === 'function' ? ev.text(s, st) : ev.text; }
  function optionEff(opt, s, st) { return typeof opt.eff === 'function' ? opt.eff(s, st) : (opt.eff || {}); }

  function findFreeTile(s, type) {
    const cands = s.tiles.filter((t) => t.terrain !== 'bosque' && placementCheck(s, type, t.i).ok);
    if (!cands.length) return -1;
    const cap = s.tiles[s.capital];
    cands.sort((a, b) => H.dist(a, cap) - H.dist(b, cap));
    return cands[0].i;
  }

  function runSpecial(s, spec) {
    const [kind, arg] = spec.split(':');
    if (kind === 'build') {
      const def = E.BUILDINGS[arg];
      const i = findFreeTile(s, arg);
      if (i >= 0) { placeBuilding(s, arg, i); s.stats.built++; return { text: 'Se ha construido: ' + def.name + '.', tile: i }; }
      s.mods.push({ id: 'ev_' + arg, label: def.name + ' (instalaciones provisionales)', eff: { ...def.eff }, ods: {}, years: 8 });
      return { text: 'Al no quedar suelo libre, se habilitan instalaciones provisionales durante 8 años.' };
    }
    if (kind === 'upgrade') {
      const t = s.tiles.find((x) => x.owned && x.building && x.building.type === 'fabrica_tradicional');
      if (t) { t.building = { type: 'fabrica_sostenible', year: s.year }; return { text: 'Una fábrica tradicional se ha convertido en una fábrica sostenible.', tile: t.i }; }
      s.mods.push({ id: 'ev_filtros', label: 'Filtros en la central de carbón', eff: { medioambiente: 3 }, ods: {}, years: 6 });
      return { text: 'Se instalan filtros en la central de carbón durante 6 años.' };
    }
    if (kind === 'burn') {
      const cands = s.tiles.filter((t) => t.owned && t.terrain === 'bosque' && !t.building);
      if (cands.length) { const t = U.pick(cands); t.terrain = 'llanura'; t.burned = true; return { text: 'Se ha perdido una casilla de bosque.', tile: t.i }; }
      return { text: '' };
    }
    if (kind === 'law') {
      s.laws[arg] = true; s.lawChanged[arg] = s.year; s.stats.laws++;
      return { text: 'Ley aprobada: ' + E.LAWS[arg].name + '.' };
    }
    return { text: '' };
  }

  A.resolveEvent = (s, idx) => {
    if (!s.pendingEvent) return fail('No hay ningún acontecimiento pendiente.');
    const ev = E.EVENT_MAP[s.pendingEvent.id];
    const opt = ev && ev.options[idx];
    if (!opt) return fail('Opción no válida.');
    const cost = opt.cost || 0;
    if (cost > 0 && s.money < cost) return fail('No dispones de fondos suficientes para esta opción.');
    const st0 = computeStats(s);
    const eff = optionEff(opt, s, st0);
    let note = { text: '' };
    const res = withImmediate(s, () => {
      s.money += (opt.gain || 0) - cost;
      for (const k in eff) s.ind[k] = U.clamp(s.ind[k] + eff[k], 0, 100);
      (opt.mods || []).forEach((m) => s.mods.push({ id: 'ev_' + ev.id, label: ev.title + ': ' + opt.label, eff: { ...(m.eff || {}) }, ods: { ...(m.ods || {}) }, years: m.years === undefined ? null : m.years }));
      if (opt.pop) s.pop += opt.pop;
      if (opt.special) note = runSpecial(s, opt.special);
    });
    s.pendingEvent = null;
    s.stats.events++;
    log(s, 'event', ev.icon, ev.title + ' → ' + opt.label + '.' + (note.text ? ' ' + note.text : ''));
    return { ok: true, deltas: res.deltas, title: ev.title, icon: ev.icon, result: opt.result + (note.text ? ' ' + note.text : ''), tile: note.tile, msg: ev.icon + ' ' + opt.label };
  };

  function eligibleEvents(s, st) {
    return E.EVENTS.filter((e) => (!e.cond || e.cond(s, st)) && !(s.eventLast[e.id] != null && s.year - s.eventLast[e.id] < C.EVENT_COOLDOWN));
  }
  function rollEvent(s, force, rng) {
    rng = rng || Math.random;
    if (s.pendingEvent) return null;
    const diff = E.DIFFICULTY[s.difficulty] || E.DIFFICULTY.normal;
    if (!force && (s.year - s.startYear < 2 || rng() > diff.eventChance)) return null;
    const st = computeStats(s);
    const ev = U.weighted(eligibleEvents(s, st), (e) => (e.weight ? e.weight(s, st) : 1), rng);
    if (!ev) return null;
    s.pendingEvent = { id: ev.id, year: s.year };
    s.eventLast[ev.id] = s.year;
    log(s, 'event', ev.icon, 'Acontecimiento: ' + ev.title + '.');
    return ev;
  }

  /* ------------------------------------------------------------------ */
  /* Fin de turno                                                        */
  /* ------------------------------------------------------------------ */
  function victoryStatus(s) {
    const items = E.INDICATORS.map((d) => ({ key: d.key, label: d.name, icon: d.icon, value: s.ind[d.key], need: d.victory, ok: s.ind[d.key] > d.victory }));
    const n = odsAchieved(s);
    items.push({ key: 'ods', label: 'ODS alcanzados (≥ ' + C.ODS_GOAL + ' %)', icon: '🎯', value: n, need: C.ODS_REQUIRED, ok: n >= C.ODS_REQUIRED, isCount: true });
    return { items, done: items.filter((i) => i.ok).length, total: items.length, won: items.every((i) => i.ok) };
  }

  function checkDefeat(s) {
    const causes = K.filter((k) => s.ind[k] < 0.5);
    if (s.money <= C.BANKRUPTCY) causes.push('quiebra');
    if (!causes.length) return false;
    s.status = 'lost';
    s.defeat = { year: s.year, causes };
    log(s, 'system', '⚠️', 'La región entra en una crisis grave. Fin del mandato.');
    return true;
  }

  function endTurn(s, opts) {
    opts = opts || {};
    if (s.pendingEvent) return fail('Hay un acontecimiento pendiente que debes resolver antes de avanzar.');
    if (s.status === 'lost') return fail('La partida ha terminado.');
    const prevInd = { ...s.ind }, prevMoney = s.money, prevPop = s.pop;
    const prevOdsN = odsAchieved(s);
    let st = computeStats(s);
    const net = st.net;
    s.money += net;

    const growth = U.clamp(0.003 + (s.ind.felicidad - 60) * 0.00025 + (s.ind.empleo - 60) * 0.00015 + (st.counts.viviendas_sociales ? 0.002 : 0), -0.015, 0.018);
    s.pop = Math.max(3, s.pop * (1 + growth));

    st = computeStats(s);
    const { targets } = computeTargets(s, st);
    const noise = opts.noNoise ? () => 0 : () => (Math.random() - 0.5) * 0.6;
    K.forEach((k) => { s.ind[k] = U.clamp(s.ind[k] + (targets[k] - s.ind[k]) * C.DRIFT + noise(), 0, 100); });

    s.mods.forEach((m) => { if (m.years != null) m.years--; });
    const expired = s.mods.filter((m) => m.years != null && m.years <= 0);
    s.mods = s.mods.filter((m) => m.years == null || m.years > 0);

    s.year++;
    st = computeStats(s);
    s.ods = computeODS(s, st);
    pushHistory(s, st);

    const deltas = {};
    K.forEach((k) => { deltas[k] = s.ind[k] - prevInd[k]; });
    const report = {
      ok: true, year: s.year, net, moneyDelta: s.money - prevMoney, popDelta: s.pop - prevPop, deltas,
      expired: expired.map((m) => m.label), warnings: K.filter((k) => s.ind[k] < 15),
      odsNew: odsAchieved(s) - prevOdsN, event: null, won: false, lost: false
    };
    log(s, 'system', '📅', 'Año ' + s.year + ': balance ' + (net >= 0 ? '+' : '') + U.fmt(net) + ' monedas · población ' + U.fmt(s.pop * 1000) + ' hab.');

    if (checkDefeat(s)) { report.lost = true; return report; }
    if (!s.sandbox && s.status === 'playing' && victoryStatus(s).won) {
      s.status = 'won'; s.wonYear = s.year; report.won = true;
      log(s, 'system', '🏆', '¡Victoria! La región se ha convertido en una sociedad avanzada, justa y sostenible.');
    }
    if (!opts.noEvents) {
      const ev = rollEvent(s, false, opts.rng);
      report.event = ev ? ev.id : null;
    }
    return report;
  }

  function continueSandbox(s) {
    if (s.status !== 'won') return fail('Solo disponible tras la victoria.');
    s.status = 'playing'; s.sandbox = true;
    log(s, 'system', '🌍', 'Sigues gobernando en modo libre.');
    return { ok: true };
  }

  function score(s) {
    const avg = K.reduce((a, k) => a + s.ind[k], 0) / K.length;
    const odsAvg = Object.values(s.ods).reduce((a, b) => a + b, 0) / E.ODS.length;
    const years = (s.wonYear || s.year) - s.startYear;
    const speed = s.status === 'won' || s.wonYear ? Math.max(0, 60 - years) * 15 : 0;
    return Math.round(avg * 10 + odsAvg * 8 + odsAchieved(s) * 60 + speed);
  }

  /** Simula una acción sobre una copia del estado para mostrar sus consecuencias antes de confirmarla. */
  function preview(s, action) {
    const args = Array.prototype.slice.call(arguments, 2);
    const c = U.clone(s);
    const tBefore = computeTargets(s, computeStats(s)).targets;
    const r = A[action].apply(null, [c].concat(args));
    if (!r.ok) return r;
    const tAfter = computeTargets(c, computeStats(c)).targets;
    const now = {}, long = {};
    K.forEach((k) => {
      const d = c.ind[k] - s.ind[k]; if (Math.abs(d) >= 0.3) now[k] = d;
      const l = tAfter[k] - tBefore[k]; if (Math.abs(l) >= 0.3) long[k] = l;
    });
    const stA = computeStats(s), stB = computeStats(c);
    return { ok: true, now, long, money: c.money - s.money, net: stB.net - stA.net, targetAfter: tAfter, indAfter: c.ind };
  }

  function act(s, action) {
    const args = Array.prototype.slice.call(arguments, 2);
    if (!A[action]) return fail('Acción desconocida.');
    return A[action].apply(null, [s].concat(args));
  }

  E.engine = {
    C, newGame, computeStats, computeTargets, computeODS, odsAchieved, victoryStatus, endTurn, rollEvent, act, preview,
    placementCheck, canBuild, requirementMet, integrateCost, canIntegrate, investAvailability, decisionAvailability,
    eventText, optionEff, continueSandbox, score, isNearWater, eligibleEvents, actions: A
  };
})(window.ECO);
