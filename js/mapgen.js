/* ECOCRACIA · Generación procedimental del mapa (rejilla hexagonal "odd-r", hexágonos con vértice arriba) */
(function (E) {
  'use strict';
  const U = E.util;
  const COLS = 15, ROWS = 11;

  // Direcciones en orden: E, SE, SO, O, NO, NE (coinciden con las aristas 0..5 del hexágono)
  const DIRS_EVEN = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
  const DIRS_ODD = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];

  const H = {};
  H.neighborCR = (c, r, d) => { const o = (r & 1) ? DIRS_ODD[d] : DIRS_EVEN[d]; return [c + o[0], r + o[1]]; };
  /** Índice del vecino en la dirección d, o -1 si se sale del mapa. */
  H.neighborIdx = (cols, rows, i, d) => {
    const c = i % cols, r = Math.floor(i / cols);
    const [nc, nr] = H.neighborCR(c, r, d);
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return -1;
    return nr * cols + nc;
  };
  H.neighbors = (cols, rows, i) => {
    const out = [];
    for (let d = 0; d < 6; d++) { const n = H.neighborIdx(cols, rows, i, d); if (n >= 0) out.push(n); }
    return out;
  };
  H.cube = (c, r) => { const x = c - (r - (r & 1)) / 2; const z = r; return [x, -x - z, z]; };
  H.dist = (a, b) => {
    const A = H.cube(a.col, a.row), B = H.cube(b.col, b.row);
    return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
  };
  E.hex = H;

  function noiseField(rng, cell) {
    const gw = Math.ceil(COLS / cell) + 3, gh = Math.ceil(ROWS / cell) + 3;
    const g = [];
    for (let i = 0; i < gw * gh; i++) g.push(rng());
    const sm = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx0 = x / cell, fy0 = y / cell;
      const x0 = Math.floor(fx0), y0 = Math.floor(fy0);
      const fx = sm(fx0 - x0), fy = sm(fy0 - y0);
      const v = (i, j) => g[j * gw + i];
      const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }

  const CAPITALS = ['Verdalia', 'Robledo', 'Fuentesol', 'Valdeclara', 'Alameda', 'Riosereno', 'Encinares', 'Brisaverde'];
  const VILLAGES = ['Prado Alto', 'Los Sauces', 'Molinar', 'La Vega', 'Collado', 'Brezal', 'Fresneda', 'Olmedilla', 'Peñaclara', 'Valdemoras', 'El Romeral', 'Arroyuelo'];
  const REGIONS = ['Valle del Sereno', 'Comarca de los Robles', 'Tierras del Alba', 'Valle Esmeralda', 'Comarca del Cierzo', 'Sierra Clara'];

  function tryGenerate(rng) {
    const e1 = noiseField(rng, 4), e2 = noiseField(rng, 2), m1 = noiseField(rng, 3), m2 = noiseField(rng, 1.7);
    const tiles = [], elev = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c + 0.5 * (r & 1);
        const north = 1 - r / (ROWS - 1);
        const n = 0.65 * e1(x, r) + 0.35 * e2(x, r);
        const el = 0.55 * n + 0.45 * Math.pow(north, 1.4);
        const mo = 0.6 * m1(x, r) + 0.4 * m2(x, r);
        let terrain = 'llanura';
        if (el > 0.68) terrain = 'montana';
        else if (el > 0.55) terrain = 'colinas';
        else if (mo > 0.57) terrain = 'bosque';
        tiles.push({ i: r * COLS + c, col: c, row: r, terrain, owned: false, building: null, v: Math.round(rng() * 1000) / 1000 });
        elev.push(el);
      }
    }
    const T = (c, r) => tiles[r * COLS + c];

    // Lago en el sur
    let lake = null, best = 9;
    for (let r = ROWS - 3; r < ROWS - 1; r++) for (let c = 3; c < COLS - 3; c++) {
      const v = elev[r * COLS + c] + rng() * 0.08;
      if (v < best) { best = v; lake = T(c, r); }
    }
    lake.terrain = 'lago';
    const ln = H.neighbors(COLS, ROWS, lake.i).filter((i) => tiles[i].row >= ROWS - 3);
    if (ln.length && rng() < 0.7) tiles[U.pick(ln, rng)].terrain = 'lago';

    // Río: nace en la montaña del norte y baja hasta el lago o el borde sur
    let sources = tiles.filter((t) => t.row <= 2 && t.terrain === 'montana' && t.col >= 4 && t.col <= COLS - 5);
    if (!sources.length) sources = tiles.filter((t) => t.row === 0 && t.col >= 5 && t.col <= COLS - 6);
    const src = U.pick(sources, rng);
    src.terrain = 'montana';
    const path = [src.i];
    const visited = new Set(path);
    let cur = src;
    for (let step = 0; step < 40; step++) {
      const cands = H.neighbors(COLS, ROWS, cur.i).map((i) => tiles[i]).filter((t) => {
        if (visited.has(t.i) || t.row < cur.row) return false;
        // evitar que el río se toque a sí mismo
        const touching = H.neighbors(COLS, ROWS, t.i).filter((n) => visited.has(n) && n !== cur.i);
        return touching.length === 0;
      });
      if (!cands.length) break;
      let pick = null, ps = 99;
      for (const t of cands) {
        const s = elev[t.i] + rng() * 0.3 - (t.row - cur.row) * 0.12 + Math.abs(t.col - COLS / 2) * 0.012;
        if (s < ps) { ps = s; pick = t; }
      }
      visited.add(pick.i);
      path.push(pick.i);
      if (pick.terrain === 'lago') break;
      pick.terrain = 'rio';
      cur = pick;
      if (pick.row === ROWS - 1) break;
    }
    const riverTiles = path.filter((i) => tiles[i].terrain === 'rio');
    if (riverTiles.length < 6) return null;

    // Capital junto al río, cerca del centro
    const caps = tiles.filter((t) => (t.terrain === 'llanura' || t.terrain === 'bosque') && t.row >= 3 && t.row <= ROWS - 4 && t.col >= 3 && t.col <= COLS - 4 &&
      H.neighbors(COLS, ROWS, t.i).some((n) => tiles[n].terrain === 'rio'));
    if (!caps.length) return null;
    const center = { col: COLS / 2, row: ROWS / 2 };
    caps.sort((a, b) => (Math.hypot(a.col - center.col, a.row - center.row) + rng()) - (Math.hypot(b.col - center.col, b.row - center.row) + rng()));
    const capital = caps[0];
    capital.terrain = 'ciudad';

    tiles.forEach((t) => { if (H.dist(t, capital) <= 2) t.owned = true; });

    // Pueblos
    const villages = [];
    const vcands = U.shuffle(tiles.filter((t) => (t.terrain === 'llanura' || t.terrain === 'bosque') && t.col > 0 && t.col < COLS - 1 && t.row > 0 && t.row < ROWS - 1), rng);
    const first = vcands.find((t) => H.dist(t, capital) === 3);
    if (first) villages.push(first);
    for (const t of vcands) {
      if (villages.length >= 4) break;
      if (villages.includes(t)) continue;
      if (H.dist(t, capital) < 4) continue;
      if (villages.some((v) => H.dist(v, t) < 3)) continue;
      villages.push(t);
    }
    if (villages.length < 3) return null;
    villages.forEach((v) => { v.terrain = 'pueblo'; });
    if (first) {
      first.owned = true;
      H.neighbors(COLS, ROWS, first.i).forEach((n) => { if (H.dist(tiles[n], capital) <= 3) tiles[n].owned = true; });
    }

    // Central de carbón heredada
    const coalC = tiles.filter((t) => t.owned && (t.terrain === 'llanura' || t.terrain === 'colinas') && H.dist(t, capital) >= 1 && H.dist(t, capital) <= 2 &&
      !H.neighbors(COLS, ROWS, t.i).some((n) => tiles[n].terrain === 'rio'));
    const coalPool = coalC.length ? coalC : tiles.filter((t) => t.owned && (t.terrain === 'llanura' || t.terrain === 'colinas') && t !== capital);
    if (!coalPool.length) return null;
    const coal = U.pick(coalPool, rng);
    coal.building = { type: 'central_carbon', year: 1978 };

    // Validación de jugabilidad
    const owned = tiles.filter((t) => t.owned);
    const freeFlat = owned.filter((t) => t.terrain === 'llanura' && !t.building).length;
    const ownedRiver = owned.filter((t) => t.terrain === 'rio').length;
    const ownedForest = owned.filter((t) => t.terrain === 'bosque').length;
    const windy = tiles.filter((t) => (t.terrain === 'colinas' || t.terrain === 'montana') && H.dist(t, capital) <= 4).length;
    const buildableOwned = owned.filter((t) => (t.terrain === 'llanura' || t.terrain === 'colinas') && !t.building).length;
    if (freeFlat < 6 || ownedRiver < 2 || ownedForest < 2 || windy < 3 || buildableOwned < 9) return null;

    // Nombres
    const capitalName = U.pick(CAPITALS, rng);
    capital.name = capitalName;
    U.shuffle(VILLAGES, rng).slice(0, villages.length).forEach((n, k) => { villages[k].name = n; });

    return { cols: COLS, rows: ROWS, tiles, river: path, capital: capital.i, capitalName, regionName: U.pick(REGIONS, rng) };
  }

  E.mapgen = {
    COLS, ROWS,
    generate(seed) {
      for (let attempt = 0; attempt < 300; attempt++) {
        const rng = U.rng(seed + attempt * 7919);
        const m = tryGenerate(rng);
        if (m) return m;
      }
      throw new Error('No se pudo generar un mapa válido');
    }
  };
})(window.ECO);
