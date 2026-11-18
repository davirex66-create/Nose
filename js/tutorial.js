/* ECOCRACIA · Tutorial interactivo inicial */
(function (E) {
  'use strict';

  const STEPS = [
    { title: '¡Te damos la bienvenida a ECOCRACIA!', text: 'Acabas de asumir el gobierno de una pequeña región. Tu misión: transformarla en una sociedad <b>avanzada, justa y sostenible</b>, equilibrando economía, sociedad y medioambiente.<br><br>Este breve tutorial te enseñará lo básico. Puedes saltarlo cuando quieras.' },
    { target: '#indicators', title: 'Los indicadores', text: 'Estos son los 7 indicadores de tu región (de 0 a 100). La marca blanca de cada barra señala el valor necesario para ganar. Pasa el cursor por encima para ver qué los mejora y <b>haz clic</b> en uno para ver su desglose.<br><br>⚠️ Si alguno llega a 0, la región entra en crisis y pierdes.' },
    { target: '#res-money', title: 'El dinero', text: 'Las monedas sirven para construir y aplicar políticas. Debajo verás el balance previsto para el próximo año: ingresos por impuestos y edificios menos los gastos de mantenimiento.' },
    { target: '#map-wrap', title: 'El mapa de tu región', text: 'El borde dorado marca tu territorio. Hay llanuras, bosques, colinas, montañas, el río y un lago. Arrastra para desplazarte y usa la rueda o los botones para hacer zoom.<br><br>👉 <b>Haz clic en una casilla de tu territorio</b> para ver su información.', wait: 'tile' },
    { target: '[data-panel="construir"]', title: 'El menú Construir', text: 'Tu mayor problema es la <b>energía</b> (40 puntos): la vieja central de carbón no da para más y contamina mucho.<br><br>👉 <b>Abre el menú Construir.</b>', wait: 'panel:construir' },
    {
      target: () => (E.game.ui.placing ? '#map-wrap' : '#panel'), title: 'Tu primera construcción',
      text: '👉 Elige la <b>Central solar</b> y colócala en una de las casillas que se resaltan en verde (llanuras o colinas). Antes de construir verás una confirmación con sus efectos.',
      wait: 'built', enter: () => { E.game.ui.buildCat = 'energia'; E.game.openPanel('construir'); }
    },
    { target: '[data-panel="gobierno"]', title: 'Gobierno', text: 'En <b>Gobierno</b> decides la política fiscal, aprobarás leyes (jornada justa, protección de bosques, ayudas sociales…) y harás inversiones. Todas tienen costes y consecuencias.' },
    { target: '[data-panel="ods"]', title: 'Objetivos de Desarrollo Sostenible', text: 'Aquí sigues el progreso de los 9 ODS de la Agenda 2030 que trabaja el juego. Para ganar necesitas superar todas las metas de los indicadores y <b>alcanzar al menos 6 ODS</b> (75 %).' },
    { target: '#btn-next', title: 'Pasar al siguiente año', text: 'Cada turno es un año: se cobran impuestos, se pagan los gastos, los indicadores evolucionan y pueden ocurrir acontecimientos que tendrás que resolver antes de continuar.<br><br>👉 <b>Pulsa «Pasar al siguiente año».</b>', wait: 'turn' },
    { title: '¡Ya sabes lo esencial!', text: 'Consejos para empezar:<ul><li>⚡ Construye renovables antes de cerrar la central de carbón.</li><li>🎓 La educación tarda en subir: invierte pronto.</li><li>💰 Vigila el mantenimiento: cada edificio cuesta dinero cada año.</li><li>⚖️ Ninguna estrategia de un solo ámbito funciona: busca el equilibrio.</li></ul>¡Mucha suerte construyendo una sociedad sostenible!' }
  ];

  const T = E.tutorial = { active: false, step: 0 };
  let layer = null;

  T.start = () => {
    layer = document.getElementById('tutorial-layer');
    T.active = true; T.step = 0; T.show();
  };
  T.stop = () => {
    T.active = false;
    if (layer) layer.innerHTML = '';
    document.body.classList.remove('tut-on');
    const s = E.game.state;
    if (s && !s.tutorialDone) { s.tutorialDone = true; E.game.autosave(); }
  };
  T.next = () => {
    if (!T.active) return;
    T.step++;
    if (T.step >= STEPS.length) T.stop(); else T.show();
  };
  T.notify = (evt) => {
    if (!T.active) return;
    const st = STEPS[T.step];
    if (st && st.wait === evt) setTimeout(T.next, 450);
    else T.reposition();
  };
  T.show = () => {
    const st = STEPS[T.step];
    if (st.enter) st.enter();
    document.body.classList.add('tut-on');
    layer.innerHTML = '<div class="tut-spot"></div><div class="tut-card" role="dialog" aria-label="Tutorial">' +
      '<div class="tut-step">Tutorial · ' + (T.step + 1) + ' / ' + STEPS.length + '</div><h3>' + st.title + '</h3><div class="tut-text">' + st.text + '</div>' +
      '<div class="tut-actions"><button class="btn btn-ghost btn-sm" data-action="tut-skip">Saltar tutorial</button>' +
      (st.wait ? '<button class="btn btn-sm" data-action="tut-next">Saltar este paso</button>' : '<button class="btn btn-primary btn-sm" data-action="tut-next">' + (T.step === STEPS.length - 1 ? '¡A jugar!' : 'Siguiente') + '</button>') +
      '</div></div>';
    requestAnimationFrame(T.reposition);
  };
  T.reposition = () => {
    if (!T.active || !layer) return;
    const st = STEPS[T.step];
    const spot = layer.querySelector('.tut-spot'), card = layer.querySelector('.tut-card');
    if (!spot || !card) return;
    const sel = typeof st.target === 'function' ? st.target() : st.target;
    const el = sel ? document.querySelector(sel) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    if (!el || !el.offsetParent && el.tagName !== 'BODY') {
      spot.style.cssText = 'left:50%;top:50%;width:0;height:0;';
      card.style.left = Math.max(8, (vw - cw) / 2) + 'px';
      card.style.top = Math.max(8, (vh - ch) / 2) + 'px';
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    spot.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px;';
    let x, y;
    const big = r.width > vw * 0.5 && r.height > vh * 0.45;
    if (big) { x = r.left + (r.width - cw) / 2; y = r.top + 16; }
    else if (r.bottom + ch + 16 < vh) { x = r.left + r.width / 2 - cw / 2; y = r.bottom + 14; }
    else if (r.top - ch - 16 > 0) { x = r.left + r.width / 2 - cw / 2; y = r.top - ch - 14; }
    else if (r.right + cw + 16 < vw) { x = r.right + 14; y = r.top; }
    else { x = r.left - cw - 14; y = r.top; }
    card.style.left = Math.min(vw - cw - 8, Math.max(8, x)) + 'px';
    card.style.top = Math.min(vh - ch - 8, Math.max(8, y)) + 'px';
  };
  window.addEventListener('resize', () => T.reposition());
})(window.ECO);
