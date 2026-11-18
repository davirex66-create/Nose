/* ECOCRACIA · Gobierno: fiscalidad, decisiones políticas, legislación e inversiones */
(function (E) {
  'use strict';

  /* Política fiscal: solo puede cambiarse una vez al año */
  E.TAXES = {
    bajo: {
      name: 'Impuestos bajos', icon: '🪶', mult: 0.8, eff: { felicidad: 3, economia: 2, igualdad: -4 }, ods: {},
      desc: 'Menos presión fiscal: alivia a familias y empresas, pero reduce los ingresos públicos y la capacidad de redistribuir.'
    },
    moderado: {
      name: 'Impuestos moderados', icon: '⚖️', mult: 1.0, eff: {}, ods: {},
      desc: 'Un sistema equilibrado. Es el punto de partida de la región.'
    },
    alto: {
      name: 'Impuestos altos', icon: '🏦', mult: 1.25, eff: { felicidad: -5, economia: -3, igualdad: 2 }, ods: { 1: 2 },
      desc: 'Maximiza la recaudación (+25 %), aunque frena la economía y genera malestar.'
    },
    progresivo: {
      name: 'Fiscalidad progresiva', icon: '📊', mult: 1.12, eff: { felicidad: -1, economia: -1, igualdad: 6 }, ods: { 1: 4, 10: 6 },
      desc: 'Quien más tiene, más aporta. Recauda un 12 % más y reduce las desigualdades.'
    }
  };

  /* Decisiones políticas: únicas e irreversibles, efectos permanentes */
  E.DECISIONS = {
    presupuestos_participativos: {
      name: 'Presupuestos participativos', icon: '🗳️', cost: 200, eff: { felicidad: 3, igualdad: 2 }, ods: { 11: 3, 10: 2 },
      desc: 'Los vecinos y vecinas deciden en asambleas en qué se invierte una parte del presupuesto.'
    },
    cooperacion_regional: {
      name: 'Cooperación con regiones vecinas', icon: '🤝', cost: 350, income: 50, eff: { economia: 3, empleo: 1 }, ods: { 8: 2, 11: 1 },
      desc: 'Acuerdo para compartir servicios, mercados e investigación con las regiones vecinas. Genera 50 monedas al año.'
    },
    emergencia_climatica: {
      name: 'Declarar la emergencia climática', icon: '🌍', cost: 250, eff: { medioambiente: 3, economia: -1 }, ods: { 13: 8 },
      desc: 'Compromiso oficial de reducir las emisiones y adaptar la región al cambio climático en todas las políticas.'
    },
    gobierno_abierto: {
      name: 'Gobierno abierto y transparencia', icon: '🔍', cost: 150, eff: { felicidad: 2, economia: 1, igualdad: 1 }, ods: { 10: 1, 11: 1 },
      desc: 'Portal público con todas las cuentas, contratos y decisiones del gobierno regional.'
    },
    comedores_sociales: {
      name: 'Red de comedores y bancos de alimentos', icon: '🍲', cost: 250, eff: { igualdad: 3, felicidad: 2 }, ods: { 1: 6, 10: 2 },
      desc: 'Garantiza una alimentación digna a todas las familias, en colaboración con asociaciones locales.'
    },
    ecoturismo: {
      name: 'Promover el ecoturismo', icon: '🥾', cost: 300, income: 40, requires: 'parque_natural', eff: { economia: 3, empleo: 2, medioambiente: 1 }, ods: { 8: 3, 12: 3, 15: 2 },
      desc: 'Rutas de naturaleza, alojamientos rurales y guías locales. Genera 40 monedas al año. Requiere un parque natural.'
    },
    turismo_masivo: {
      name: 'Promover el turismo masivo', icon: '🏖️', cost: 200, income: 90, eff: { economia: 4, empleo: 3, medioambiente: -5, igualdad: -2, felicidad: -1 }, ods: { 8: 2, 12: -4, 11: -2 },
      desc: 'Grandes hoteles y campañas publicitarias. Genera 90 monedas al año, pero encarece la vida y presiona el entorno.'
    },
    industria_pesada: {
      name: 'Atraer una gran industria contaminante', icon: '🏗️', cost: -800, eff: { economia: 5, empleo: 4, medioambiente: -10, felicidad: -2 }, ods: { 12: -6, 13: -6, 15: -4 }, warn: true,
      desc: 'Una multinacional paga 800 monedas por instalarse sin exigencias ambientales. Dinero rápido con un coste ecológico permanente.'
    }
  };

  /* Legislación: leyes activables con coste de aprobación y coste anual */
  E.LAWS = {
    jornada_justa: {
      name: 'Jornada laboral más justa', icon: '⏰', enact: 100, annual: 40, eff: { felicidad: 6, igualdad: 2, empleo: 3, economia: -4 }, ods: { 8: 6, 10: 3 },
      desc: 'Jornada de 35 horas semanales sin pérdida salarial. Reparte el trabajo y mejora la conciliación, pero eleva los costes empresariales.'
    },
    derechos_laborales: {
      name: 'Mejorar los derechos laborales', icon: '📜', enact: 150, annual: 30, eff: { igualdad: 5, felicidad: 3, economia: -3, empleo: -1 }, ods: { 8: 8, 10: 4, 1: 3 },
      desc: 'Salario mínimo digno, contratos estables y protección frente a los abusos.'
    },
    igualdad_salarial: {
      name: 'Plan de igualdad salarial', icon: '🟰', enact: 120, annual: 50, eff: { igualdad: 6, felicidad: 2, economia: -1 }, ods: { 10: 6, 8: 4, 1: 2 },
      desc: 'Elimina la brecha salarial entre mujeres y hombres y garantiza la igualdad en el acceso a cualquier puesto.'
    },
    ayudas_familias: {
      name: 'Ayudas para familias vulnerables', icon: '🤲', enact: 150, annual: 160, eff: { igualdad: 7, felicidad: 4 }, ods: { 1: 10, 10: 6 },
      desc: 'Ingreso mínimo, becas de comedor y ayudas al alquiler para los hogares con menos recursos.'
    },
    subvencion_renovables: {
      name: 'Subvencionar las energías renovables', icon: '🔆', enact: 200, annual: 110, eff: { medioambiente: 2, economia: -1 }, ods: { 7: 6, 13: 4 },
      special: 'La producción de todas las centrales renovables aumenta un 25 %.',
      desc: 'Ayudas a la instalación y a la producción de energía limpia.'
    },
    proteger_bosques: {
      name: 'Proteger los bosques', icon: '🌲', enact: 100, annual: 40, eff: { medioambiente: 6, economia: -2, empleo: -1 }, ods: { 15: 10, 13: 3 },
      special: 'Prohíbe talar bosques para construir (salvo parques naturales) y reduce el riesgo de incendios.',
      desc: 'Declara los bosques suelo protegido y financia guardas forestales.'
    },
    economia_circular: {
      name: 'Ley de economía circular', icon: '🔄', enact: 200, annual: 60, eff: { medioambiente: 4, economia: -2, empleo: 1 }, ods: { 12: 10, 13: 2 },
      desc: 'Obliga a reducir envases, reparar y reutilizar. Crea empleo verde, aunque exige un esfuerzo de adaptación a las empresas.'
    },
    bajas_emisiones: {
      name: 'Zonas de bajas emisiones', icon: '🚗', enact: 150, annual: 30, eff: { medioambiente: 5, felicidad: -3, economia: -1 }, ods: { 11: 5, 13: 5 },
      special: 'Si existe una red de transporte público, la población la acepta mucho mejor (+3 felicidad).',
      desc: 'Restringe la entrada de los vehículos más contaminantes en el centro urbano.'
    }
  };

  /* Inversiones: pago único con efectos temporales y periodo de espera */
  E.INVESTMENTS = {
    inversion_educativa: {
      name: 'Aumentar la inversión educativa', icon: '📚', cost: 450, years: 6, cooldown: 6, eff: { educacion: 8, igualdad: 2 }, ods: { 4: 6, 10: 1 },
      desc: 'Más docentes, menos alumnos por aula, becas y materiales actualizados.'
    },
    investigacion_cientifica: {
      name: 'Financiar la investigación científica', icon: '🧪', cost: 550, years: 6, cooldown: 6, eff: { educacion: 4, economia: 5, empleo: 2 }, ods: { 8: 3, 4: 2, 13: 1 },
      desc: 'Becas de investigación y proyectos con universidades y empresas locales.'
    },
    transporte_publico: {
      name: 'Mejorar el transporte público', icon: '🚍', cost: 500, years: 6, cooldown: 6, eff: { medioambiente: 5, felicidad: 3, igualdad: 2 }, ods: { 11: 6, 13: 3 },
      desc: 'Más frecuencias, tarifas reducidas y renovación de la flota con vehículos eléctricos.'
    },
    formacion_profesional: {
      name: 'Programa de formación profesional', icon: '🛠️', cost: 350, years: 5, cooldown: 5, eff: { empleo: 5, educacion: 3, igualdad: 1 }, ods: { 8: 4, 4: 2 },
      desc: 'Cursos gratuitos en oficios con futuro: energías renovables, cuidados, digitalización…'
    },
    sanidad_publica: {
      name: 'Reforzar la sanidad pública', icon: '🩺', cost: 450, years: 6, cooldown: 6, eff: { felicidad: 5, igualdad: 3 }, ods: { 1: 3, 10: 2, 11: 1 },
      desc: 'Más personal sanitario, centros de salud rurales y reducción de listas de espera.'
    },
    reforestacion: {
      name: 'Plan de reforestación', icon: '🌱', cost: 400, years: 5, cooldown: 5, eff: { medioambiente: 2 }, ods: { 15: 4, 13: 2 }, plant: 2,
      special: 'Planta bosque nuevo en hasta 2 llanuras vacías de tu territorio (cambio permanente en el mapa).',
      desc: 'Repoblación con especies autóctonas en terrenos degradados.'
    },
    rehabilitacion_energetica: {
      name: 'Rehabilitación energética de edificios', icon: '🏠', cost: 600, years: null, cooldown: 4, maxUses: 3, eff: {}, ods: { 7: 2, 11: 1 }, demandCut: 0.12,
      special: 'Reduce un 12 % la demanda de energía de forma permanente (máximo 3 veces).',
      desc: 'Aislamiento de fachadas, ventanas eficientes y bombas de calor en viviendas y edificios públicos.'
    }
  };

  ['DECISIONS', 'LAWS', 'INVESTMENTS'].forEach((g) => Object.keys(E[g]).forEach((k) => { E[g][k].key = k; }));
})(window.ECO);
