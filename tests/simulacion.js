/* ECOCRACIA · Simulación de equilibrio (node tests/simulacion.js)
 * Carga el motor real del juego y juega muchas partidas con distintas estrategias automáticas:
 *  - "equilibrada": invierte según las necesidades de todos los indicadores (debe poder ganar)
 *  - "pasiva": no hace nada (no debe ganar)
 *  - "solo-economia", "solo-energia", "solo-social": abusan de una única categoría (no deben ganar)
 *  - "contaminante": industria tradicional y decisiones dañinas (debe acercarse a la derrota)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/utils.js', 'js/data/indicators.js', 'js/data/buildings.js', 'js/data/policies.js', 'js/data/events.js', 'js/data/ods.js', 'js/mapgen.js', 'js/engine.js'];
const ctx = { console, Math, JSON, Date };
ctx.window = ctx;
vm.createContext(ctx);
FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const E = ctx.ECO, EN = E.engine, K = E.IND_KEYS;

function seeded(seed) { return E.util.rng(seed); }

function needWeights(s) {
  const w = {};
  E.INDICATORS.forEach((d) => {
    const gap = d.victory + 6 - s.ind[d.key];
    w[d.key] = gap > 0 ? 0.4 + gap / 8 : 0.15;
    if (s.ind[d.key] < 20) w[d.key] += 3;
  });
  return w;
}
function valueOf(s, pv, w) {
  let v = 0;
  for (const k in pv.long) v += w[k] * pv.long[k];
  for (const k in pv.now) v += w[k] * pv.now[k] * 0.3;
  v += pv.net * 0.03;
  return v;
}

function bestTile(s, type) {
  let best = -1, bs = -1;
  for (const t of s.tiles) {
    if (!EN.placementCheck(s, type, t.i).ok) continue;
    const sc = t.terrain === 'bosque' && type !== 'parque_natural' ? 0 : 1;
    if (sc > bs) { bs = sc; best = t.i; }
  }
  return best;
}

function candidates(s, filter) {
  const out = [];
  for (const type in E.BUILDINGS) {
    const def = E.BUILDINGS[type];
    if (def.buildable === false) continue;
    if (filter && !filter('build', type)) continue;
    const i = bestTile(s, type);
    if (i >= 0) out.push({ a: 'build', args: [type, i], cost: def.cost });
  }
  for (const id in E.LAWS) if (!s.laws[id] && (!filter || filter('law', id))) out.push({ a: 'setLaw', args: [id, true], cost: E.LAWS[id].enact + E.LAWS[id].annual * 3 });
  for (const id in E.INVESTMENTS) if ((!filter || filter('invest', id)) && EN.investAvailability(s, id).ok) out.push({ a: 'invest', args: [id], cost: E.INVESTMENTS[id].cost });
  for (const id in E.DECISIONS) if ((!filter || filter('decide', id)) && EN.decisionAvailability(s, id).ok) out.push({ a: 'decide', args: [id], cost: Math.max(50, E.DECISIONS[id].cost) });
  if (s.tax !== 'progresivo' && s.taxChanged !== s.year && (!filter || filter('tax', 'progresivo'))) out.push({ a: 'setTax', args: ['progresivo'], cost: 50 });
  return out;
}

function resolveEventSmart(s) {
  const ev = E.EVENT_MAP[s.pendingEvent.id];
  const w = needWeights(s);
  let best = 0, bv = -1e9;
  ev.options.forEach((o, idx) => {
    if ((o.cost || 0) > s.money - 100 && (o.cost || 0) > 0) return;
    const pv = EN.preview(s, 'resolveEvent', idx);
    if (!pv.ok) return;
    let v = 0;
    for (const k in pv.now) v += w[k] * pv.now[k];
    for (const k in pv.long) v += w[k] * pv.long[k] * 2;
    v += pv.money * 0.006;
    if (v > bv) { bv = v; best = idx; }
  });
  return EN.act(s, 'resolveEvent', best);
}

function strategyBalanced(s) {
  // Cerrar el carbón cuando las renovables lo permitan
  const coal = s.tiles.find((t) => t.owned && t.building && t.building.type === 'central_carbon');
  if (coal && s.money > 500) {
    const pv = EN.preview(s, 'demolish', coal.i);
    if (pv.ok && pv.targetAfter.energia >= 72) EN.act(s, 'demolish', coal.i);
  }
  // Ampliar el territorio cuando queda poco suelo libre
  const free = s.tiles.filter((t) => t.owned && !t.building && (t.terrain === 'llanura' || t.terrain === 'colinas')).length;
  if (free < 3 && s.money > EN.integrateCost(s) + 400) {
    const adj = s.tiles.filter((t) => EN.canIntegrate(s, t.i).ok);
    const rank = (t) => (t.terrain === 'pueblo' ? 3 : t.terrain === 'llanura' ? 2 : t.terrain === 'colinas' ? 1 : 0);
    adj.sort((a, b) => rank(b) - rank(a));
    if (adj.length) EN.act(s, 'integrate', adj[0].i);
  }
  for (let n = 0; n < 5; n++) {
    const w = needWeights(s);
    let best = null, bv = 0;
    for (const c of candidates(s, (kind, id) => !['industria_pesada', 'turismo_masivo'].includes(id) && id !== 'fabrica_tradicional')) {
      if (c.cost > s.money - 150) continue;
      const pv = EN.preview(s, c.a, ...c.args);
      if (!pv.ok) continue;
      if (pv.net < 0 && s.money + pv.net * 4 < 0) continue;
      const v = valueOf(s, pv, w) / Math.sqrt(c.cost + 100);
      if (v > bv) { bv = v; best = c; }
    }
    if (!best) {
      // integrar territorio si no hay donde construir
      const adj = s.tiles.filter((t) => EN.canIntegrate(s, t.i).ok);
      if (adj.length && s.money > EN.integrateCost(s) + 600) {
        adj.sort((a, b) => (b.terrain === 'pueblo') - (a.terrain === 'pueblo') || (b.terrain === 'llanura') - (a.terrain === 'llanura'));
        EN.act(s, 'integrate', adj[0].i);
        continue;
      }
      break;
    }
    EN.act(s, best.a, ...best.args);
  }
}

function strategyOnly(cat) {
  return (s) => {
    for (let n = 0; n < 4; n++) {
      const types = Object.keys(E.BUILDINGS).filter((t) => E.BUILDINGS[t].cat === cat && E.BUILDINGS[t].buildable !== false);
      let done = false;
      for (const t of types) {
        const i = bestTile(s, t);
        if (i >= 0 && s.money >= E.BUILDINGS[t].cost) { EN.act(s, 'build', t, i); done = true; break; }
      }
      if (!done) {
        const adj = s.tiles.filter((t) => EN.canIntegrate(s, t.i).ok);
        if (adj.length && s.money > EN.integrateCost(s) + 500) EN.act(s, 'integrate', adj[0].i); else break;
      }
    }
  };
}

function strategyPolluter(s) {
  if (!s.decisions.industria_pesada) EN.act(s, 'decide', 'industria_pesada');
  if (!s.decisions.turismo_masivo) EN.act(s, 'decide', 'turismo_masivo');
  if (s.tax !== 'bajo') EN.act(s, 'setTax', 'bajo');
  for (let n = 0; n < 3; n++) {
    const i = bestTile(s, 'fabrica_tradicional');
    if (i >= 0 && s.money >= 450) EN.act(s, 'build', 'fabrica_tradicional', i);
    else {
      const j = s.tiles.findIndex((t) => t.owned && t.terrain === 'bosque' && !t.building);
      if (j >= 0 && s.money >= 300) EN.act(s, 'build', 'mercado', j);
    }
  }
}

const DIFF = process.argv[3] || 'normal';
function play(seed, strategy, eventMode, maxYears) {
  const s = EN.newGame({ seed, difficulty: DIFF, skipTutorial: true });
  const rng = seeded(seed * 31 + 7);
  const minInd = {}; K.forEach((k) => { minInd[k] = 100; });
  for (let y = 0; y < maxYears; y++) {
    if (s.pendingEvent) {
      if (eventMode === 'worst') {
        const ev = E.EVENT_MAP[s.pendingEvent.id];
        const idx = ev.options.findIndex((o) => !o.cost && !o.gain) >= 0 ? ev.options.length - 1 : 0;
        EN.act(s, 'resolveEvent', idx);
      } else resolveEventSmart(s);
    }
    if (strategy) strategy(s);
    const r = EN.endTurn(s, { rng });
    if (!r.ok) throw new Error('endTurn falló: ' + r.msg);
    K.forEach((k) => { minInd[k] = Math.min(minInd[k], s.ind[k]); });
    for (const k of K) if (!(s.ind[k] >= 0 && s.ind[k] <= 100)) throw new Error('Indicador fuera de rango ' + k + '=' + s.ind[k]);
    if (!isFinite(s.money)) throw new Error('Dinero no finito');
    if (r.won || r.lost) break;
  }
  return s;
}

function summary(name, strategy, eventMode, n, maxYears) {
  let wins = 0, losses = 0; const years = []; const finals = [];
  for (let seed = 1; seed <= n; seed++) {
    const s = play(seed * 1013, strategy, eventMode, maxYears);
    if (s.status === 'won') { wins++; years.push(s.wonYear - s.startYear); }
    if (s.status === 'lost') losses++;
    finals.push(s);
  }
  const avg = (f) => Math.round(finals.reduce((a, s) => a + f(s), 0) / finals.length);
  const indAvg = K.map((k) => k.slice(0, 5) + ':' + avg((s) => s.ind[k])).join(' ');
  years.sort((a, b) => a - b);
  console.log(`\n[${name}] victorias ${wins}/${n} · derrotas ${losses}/${n}` + (years.length ? ` · años hasta ganar: min ${years[0]}, mediana ${years[Math.floor(years.length / 2)]}, max ${years[years.length - 1]}` : ''));
  console.log('   media final → ' + indAvg + ' · dinero ' + avg((s) => s.money) + ' · ODS≥75: ' + avg((s) => EN.odsAchieved(s)) + ' · edificios ' + avg((s) => s.tiles.filter((t) => t.building).length));
  return { wins, losses, finals };
}

const N = Number(process.argv[2] || 20);
console.log('ECOCRACIA · simulación de equilibrio con ' + N + ' mapas por estrategia · dificultad ' + DIFF);
const results = {
  equilibrada: summary('equilibrada', strategyBalanced, 'smart', N, 60),
  pasiva: summary('pasiva (no hace nada)', null, 'smart', N, 60),
  pasivaPeor: summary('pasiva + ignora todos los acontecimientos', null, 'worst', N, 60),
  economia: summary('solo economía', strategyOnly('economia'), 'smart', N, 60),
  energia: summary('solo energía', strategyOnly('energia'), 'smart', N, 60),
  social: summary('solo sociedad', strategyOnly('sociedad'), 'smart', N, 60),
  contaminante: summary('contaminante', strategyPolluter, 'worst', N, 60)
};

let ok = true;
const check = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) ok = false; };
console.log('\nComprobaciones:');
check(results.equilibrada.wins >= Math.ceil(N * 0.8), 'La estrategia equilibrada gana en la mayoría de mapas');
check(results.pasiva.wins === 0, 'No hacer nada nunca da la victoria');
check(results.economia.wins === 0 && results.energia.wins === 0 && results.social.wins === 0, 'Ninguna estrategia de un solo ámbito gana');
check(results.contaminante.wins === 0, 'La estrategia contaminante no gana');
check(results.contaminante.losses + results.pasivaPeor.losses > 0, 'Las malas decisiones pueden llevar a la derrota');
process.exit(ok ? 0 : 1);
