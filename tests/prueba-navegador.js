/* ECOCRACIA · Prueba de extremo a extremo en navegador (requiere Playwright)
 * Uso: python3 -m http.server 8080 &  →  node tests/prueba-navegador.js http://localhost:8080 [carpeta-capturas]
 */
'use strict';
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:8080';
const SHOTS = process.argv[3] || null;
const errors = [];
let step = 0;
const ok = (m) => console.log('  ✔ ' + m);
function fail(m) { console.log('  ✘ ' + m); errors.push(m); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail('Error JS: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/ERR_/.test(m.text())) fail('console.error: ' + m.text()); });
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + String(++step).padStart(2, '0') + '-' + name + '.png' }); };
  const visibleTile = (pg, type) => pg.evaluate((type) => {
    const s = ECO.game.state;
    for (const t of s.tiles) {
      if (!ECO.engine.placementCheck(s, type, t.i).ok || t.terrain === 'bosque') continue;
      const el = document.querySelector('.hit[data-i="' + t.i + '"]');
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit === el) return t.i;
    }
    return -1;
  }, type);
  const state = () => page.evaluate(() => { const s = ECO.game.state; return s && { year: s.year, money: s.money, ind: s.ind, pending: s.pendingEvent, status: s.status, built: s.tiles.filter((t) => t.building).length, tut: s.tutorialDone }; });
  const closeModals = async () => { for (let k = 0; k < 4 && await page.locator('.modal-overlay.show').count(); k++) { await page.keyboard.press('Escape'); await page.waitForTimeout(260); } if (await page.locator('.modal-overlay.show').count()) { await page.evaluate(() => ECO.ui.closeAllModals()); await page.waitForTimeout(260); } };

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await shot('menu');
  console.log('Menú principal');
  (await page.locator('#btn-continue').isDisabled()) ? ok('«Continuar» desactivado sin partidas') : fail('«Continuar» debería estar desactivado');
  await page.click('[data-action="how-to-play"]'); await page.waitForTimeout(300);
  (await page.locator('.modal-help').count()) ? ok('«Cómo jugar» abre su ventana') : fail('Cómo jugar');
  await closeModals();
  await page.click('[data-action="credits"]'); await page.waitForTimeout(300);
  (await page.locator('.modal-credits').count()) ? ok('«Créditos» abre su ventana') : fail('Créditos');
  await closeModals();

  console.log('Nueva partida y tutorial');
  await page.click('#screen-menu [data-action="menu-new"]'); await page.waitForTimeout(300);
  await page.fill('#ng-name', 'Valle de Prueba');
  await page.click('.modal-new [data-mbtn="1"]'); await page.waitForTimeout(900);
  let s = await state();
  s && s.money === 2000 && s.ind.felicidad === 65 && s.ind.medioambiente === 60 && s.ind.energia === 40 && s.ind.educacion === 45 && s.ind.igualdad === 50 && s.ind.empleo === 60
    ? ok('Valores iniciales correctos (2.000 monedas, 65/60/40/45/50/60)') : fail('Valores iniciales: ' + JSON.stringify(s));
  (await page.locator('.tut-card').count()) ? ok('El tutorial aparece') : fail('Tutorial no aparece');
  await shot('tutorial-1');
  for (let k = 0; k < 3; k++) { await page.click('[data-action="tut-next"]'); await page.waitForTimeout(350); }
  // Paso: seleccionar una casilla propia (la capital)
  const capital = await page.evaluate(() => ECO.game.state.capital);
  await page.locator('.hit[data-i="' + capital + '"]').click({ force: true });
  await page.waitForTimeout(700);
  (await page.locator('#tile-card.open').count()) ? ok('Seleccionar casilla muestra su ficha') : fail('Ficha de casilla');
  await shot('tutorial-tile');
  await page.click('#sidenav [data-panel="construir"]'); await page.waitForTimeout(700);
  await shot('tutorial-construir');
  (await page.locator('.tut-card h3').innerText()).includes('primera') ? ok('El tutorial avanza al abrir Construir') : fail('Tutorial no avanzó con Construir');
  await page.click('.bcard[data-b="central_solar"]'); await page.waitForTimeout(400);
  const validCount = await page.locator('.l-over .valid').count();
  validCount > 0 ? ok('Modo colocación: ' + validCount + ' casillas válidas resaltadas') : fail('No se resaltan casillas válidas');
  // casilla válida para la central solar
  (await page.locator('#panel.open').count()) === 0 ? ok('El panel se oculta para dejar el mapa libre al colocar') : fail('El panel tapa el mapa al colocar');
  const tileI = await visibleTile(page, 'central_solar');
  await page.locator('.hit[data-i="' + tileI + '"]').click({ force: true }); await page.waitForTimeout(400);
  await shot('confirm-build');
  (await page.locator('.modal-confirm .preview').count()) ? ok('Confirmación con vista previa de efectos') : fail('Sin confirmación de construcción');
  const before = await state();
  await page.click('.modal-confirm .btn-primary'); await page.waitForTimeout(800);
  s = await state();
  s.money === before.money - 700 ? ok('La construcción descuenta 700 monedas') : fail('Dinero tras construir: ' + s.money);
  s.ind.energia > before.ind.energia + 5 ? ok('La central solar sube la energía al instante (' + Math.round(before.ind.energia) + ' → ' + Math.round(s.ind.energia) + ')') : fail('Energía no subió');
  for (let k = 0; k < 2; k++) { if (await page.locator('[data-action="tut-next"]').count()) { await page.click('[data-action="tut-next"]'); await page.waitForTimeout(350); } }
  await shot('tutorial-next-year');
  await page.click('#btn-next'); await page.waitForTimeout(900);
  s = await state();
  s.year === 2026 ? ok('«Pasar al siguiente año» avanza a 2026') : fail('Año: ' + s.year);
  if (await page.locator('[data-action="tut-next"]').count()) { await page.click('[data-action="tut-next"]'); await page.waitForTimeout(300); }
  s = await state();
  s.tut ? ok('Tutorial completado') : fail('Tutorial no marcado como completado');
  await closeModals();

  console.log('Paneles');
  for (const p of ['mapa', 'construir', 'economia', 'gobierno', 'ods', 'historial']) {
    await page.click('#sidenav [data-panel="' + p + '"]'); await page.waitForTimeout(350);
    const html = await page.locator('#panel-body').innerHTML();
    html.length > 200 ? ok('Panel ' + p + ' con contenido') : fail('Panel vacío: ' + p);
    const tabsN = await page.locator('#panel-body .tab').count();
    for (let k = 0; k < tabsN; k++) { await page.locator('#panel-body .tab').nth(k).click(); await page.waitForTimeout(150); }
    await shot('panel-' + p);
  }

  console.log('Gobierno');
  await page.click('#sidenav [data-panel="gobierno"]'); await page.waitForTimeout(300);
  await page.click('#panel-body [data-tab="decisiones"]'); await page.waitForTimeout(200);
  await page.click('[data-action="tax"][data-key="progresivo"]'); await page.waitForTimeout(300);
  await page.click('.modal-confirm .btn-primary'); await page.waitForTimeout(400);
  (await page.evaluate(() => ECO.game.state.tax)) === 'progresivo' ? ok('Cambio de política fiscal') : fail('Impuestos no cambiaron');
  await page.click('#panel-body [data-tab="legislacion"]'); await page.waitForTimeout(200);
  const m0 = (await state()).money;
  await page.click('[data-action="law"][data-id="proteger_bosques"]'); await page.waitForTimeout(300);
  await page.click('.modal-confirm .btn-primary'); await page.waitForTimeout(400);
  const lawOn = await page.evaluate(() => !!ECO.game.state.laws.proteger_bosques);
  lawOn && (await state()).money === m0 - 100 ? ok('Ley aprobada y cobrada') : fail('Ley no aprobada');
  await page.click('#panel-body [data-tab="inversiones"]'); await page.waitForTimeout(200);
  await page.click('[data-action="invest"][data-id="inversion_educativa"]'); await page.waitForTimeout(300);
  await page.click('.modal-confirm .btn-primary'); await page.waitForTimeout(400);
  (await page.evaluate(() => ECO.game.state.mods.some((m) => m.id === 'inv_inversion_educativa'))) ? ok('Inversión realizada') : fail('Inversión');
  await page.click('[data-action="close-panel"]'); await page.waitForTimeout(300);

  console.log('Indicador y guardado');
  await page.click('.ind[data-ind="educacion"]'); await page.waitForTimeout(300);
  (await page.locator('.modal-ind .factors').count()) ? ok('Detalle del indicador con desglose') : fail('Detalle de indicador');
  await shot('indicador');
  await closeModals();

  console.log('Varios años con acontecimientos');
  let events = 0;
  for (let y = 0; y < 12; y++) {
    if (!(await page.locator('.modal-event').count())) await closeModals();
    const st = await state();
    if (st.pending) {
      if (!(await page.locator('.modal-event').count())) { await page.click('#btn-event'); await page.waitForTimeout(350); }
      if (events === 0) await shot('evento');
      await page.locator('.ev-opt:not([disabled])').first().click(); await page.waitForTimeout(400);
      events++;
      await closeModals();
      continue;
    }
    // intentar avanzar con un acontecimiento pendiente debe bloquearse (se comprueba más abajo)
    await page.click('#btn-next'); await page.waitForTimeout(1000);
  }
  events > 0 ? ok(events + ' acontecimientos resueltos desde la interfaz') : console.log('  · (no salió ningún acontecimiento en estos años)');
  // forzar acontecimiento y comprobar bloqueo
  await closeModals();
  await page.evaluate(() => { const s = ECO.game.state; if (!s.pendingEvent) ECO.engine.rollEvent(s, true); ECO.game.render(); });
  const yb = (await state()).year;
  await page.locator('#btn-next').click({ force: true }); await page.waitForTimeout(600);
  (await state()).year === yb ? ok('No se puede avanzar con una decisión pendiente') : fail('Se avanzó con decisión pendiente');
  (await page.locator('.modal-event').count()) ? ok('Al intentarlo se abre el acontecimiento pendiente') : fail('No se abrió el acontecimiento');
  await page.locator('.ev-opt:not([disabled])').first().click(); await page.waitForTimeout(400);
  await closeModals();

  await page.click('#topbar [data-action="open-save"]'); await page.waitForTimeout(300);
  await page.click('[data-action="save-slot"][data-slot="1"]'); await page.waitForTimeout(400);
  await closeModals();
  const savedYear = (await state()).year;
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
  (await page.locator('#btn-continue').isDisabled()) ? fail('Continuar desactivado tras guardar') : ok('Tras recargar, «Continuar» está disponible');
  await page.click('#btn-continue'); await page.waitForTimeout(800);
  (await state()).year === savedYear ? ok('La partida persiste tras recargar el navegador (año ' + savedYear + ')') : fail('Año tras recargar');
  await closeModals();
  await page.click('#topbar [data-action="open-load"]'); await page.waitForTimeout(300);
  await page.click('[data-action="load-slot"][data-slot="1"]'); await page.waitForTimeout(300);
  await page.click('.modal-confirm .btn-primary'); await page.waitForTimeout(700);
  (await state()).year === savedYear ? ok('Carga manual desde la ranura 1') : fail('Carga manual');
  await closeModals();
  await page.click('#topbar [data-action="open-load"]'); await page.waitForTimeout(300);
  await page.click('[data-action="delete-slot"][data-slot="1"]'); await page.waitForTimeout(300);
  (await page.locator('.modal-confirm').count()) ? ok('Confirmación antes de borrar') : fail('Sin confirmación al borrar');
  await page.click('.modal-confirm .btn-danger'); await page.waitForTimeout(400);
  (await page.evaluate(() => ECO.save.read('1'))) === null ? ok('Ranura borrada') : fail('No se borró');
  await closeModals();

  console.log('Fin de partida');
  await page.evaluate(() => { const s = ECO.game.state; s.pendingEvent = null; s.ind.energia = 0.2; s.mods.push({ id: 'apagon', label: 'Prueba de apagón', eff: { energia: -300 }, ods: {}, years: 1 }); ECO.game.render(); });
  await page.click('#btn-next'); await page.waitForTimeout(1200);
  await shot('derrota');
  (await page.locator('.modal-end.defeat').count()) ? ok('Pantalla de derrota con explicación') : fail('Sin pantalla de derrota');
  await closeModals();
  await page.evaluate(() => {
    const s = ECO.game.state; s.status = 'playing'; s.defeat = null; s.pendingEvent = null; s.mods = s.mods.filter((m) => m.id !== 'apagon');
    Object.assign(s.ind, { economia: 90, felicidad: 95, medioambiente: 95, energia: 95, educacion: 95, igualdad: 95, empleo: 95 });
    s.mods.push({ id: 'test', label: 'Prueba', eff: { economia: 60, felicidad: 60, medioambiente: 60, energia: 60, educacion: 60, igualdad: 60, empleo: 60 }, ods: { 1: 25, 4: 25, 7: 25, 8: 25, 10: 25, 11: 25, 12: 25, 13: 25, 15: 25 }, years: null });
    ECO.game.render();
  });
  await page.click('#btn-next'); await page.waitForTimeout(1200);
  if (await page.locator('.modal-end.victory').count()) { ok('Pantalla de victoria'); await shot('victoria'); } else fail('Sin pantalla de victoria');
  await page.locator('.modal-end .btn-primary').click(); await page.waitForTimeout(400);
  (await page.evaluate(() => ECO.game.state.sandbox)) ? ok('«Seguir gobernando» activa el modo libre') : fail('Modo libre');

  console.log('Pantalla de móvil');
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const mp = await mob.newPage();
  mp.on('pageerror', (e) => fail('Error JS (móvil): ' + e.message));
  await mp.goto(URL); await mp.waitForTimeout(400);
  if (SHOTS) await mp.screenshot({ path: SHOTS + '/90-movil-menu.png' });
  await mp.click('[data-action="menu-new"]'); await mp.waitForTimeout(300);
  await mp.click('#ng-tut'); await mp.click('.modal-new [data-mbtn="1"]'); await mp.waitForTimeout(800);
  if (SHOTS) await mp.screenshot({ path: SHOTS + '/91-movil-juego.png' });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  !overflow ? ok('Sin desbordamiento horizontal en móvil') : fail('Desbordamiento horizontal en móvil');
  await mp.click('#sidenav [data-panel="construir"]'); await mp.waitForTimeout(500);
  if (SHOTS) await mp.screenshot({ path: SHOTS + '/92-movil-construir.png' });
  await mp.click('[data-action="build-cat"][data-cat="medioambiente"]'); await mp.waitForTimeout(300);
  await mp.click('.bcard[data-b="parque_natural"]'); await mp.waitForTimeout(500);
  const ti = await visibleTile(mp, 'parque_natural');
  await mp.locator('.hit[data-i="' + ti + '"]').tap({ force: true }); await mp.waitForTimeout(400);
  await mp.click('.modal-confirm .btn-primary'); await mp.waitForTimeout(600);
  (await mp.evaluate(() => ECO.game.state.tiles.some((t) => t.building && t.building.type === 'parque_natural'))) ? ok('Construcción táctil en móvil') : fail('Construcción táctil');
  if (SHOTS) await mp.screenshot({ path: SHOTS + '/93-movil-construido.png' });
  await mp.click('#btn-next'); await mp.waitForTimeout(600);
  if (SHOTS) await mp.screenshot({ path: SHOTS + '/94-movil-turno.png' });

  await browser.close();
  console.log(errors.length ? '\n' + errors.length + ' PROBLEMAS' : '\nTodo correcto');
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
