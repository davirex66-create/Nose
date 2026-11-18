/* ECOCRACIA · Catálogo de edificios
 * cost: precio de construcción · maint: mantenimiento anual · income: ingresos anuales
 * jobs: miles de empleos · energyProd / energyUse: unidades de energía (1 = 10 MW)
 * eff: aportación al objetivo de cada indicador (la 2.ª copia aporta un 70 %, la 3.ª un 49 %…)
 * ods: puntos de progreso hacia cada ODS
 */
(function (E) {
  'use strict';

  E.CATEGORIES = [
    { key: 'economia', name: 'Economía', icon: '💼', color: '#d9a33b' },
    { key: 'educacion', name: 'Educación', icon: '🎓', color: '#5b7fd1' },
    { key: 'energia', name: 'Energía', icon: '⚡', color: '#e3b324' },
    { key: 'medioambiente', name: 'Medioambiente', icon: '🌳', color: '#3f9a54' },
    { key: 'sociedad', name: 'Sociedad', icon: '🤝', color: '#c8587a' },
    { key: 'transporte', name: 'Transporte', icon: '🚆', color: '#3aa3a8' }
  ];
  E.CAT = {};
  E.CATEGORIES.forEach((c) => { E.CAT[c.key] = c; });
  E.CAT.legado = { key: 'legado', name: 'Infraestructura heredada', icon: '🏚️', color: '#7a6555' };

  const URBANO = ['llanura', 'bosque'];
  const LLANO = ['llanura', 'colinas'];

  E.BUILDINGS = {
    /* ---------- ECONOMÍA ---------- */
    mercado: {
      name: 'Mercado', cat: 'economia', icon: '🏪', cost: 300, maint: 15, income: 70, jobs: 0.5, energyUse: 0.2,
      eff: { economia: 4, felicidad: 2 }, ods: { 8: 4, 1: 2 }, terrain: URBANO,
      desc: 'Mercado de abastos que impulsa el comercio de proximidad y da salida a los productos de la comarca.'
    },
    fabrica_sostenible: {
      name: 'Fábrica sostenible', cat: 'economia', icon: '⚙️', cost: 900, maint: 50, income: 150, jobs: 1.0, energyUse: 0.7,
      eff: { economia: 6, medioambiente: -1 }, ods: { 8: 6, 12: 5 }, terrain: LLANO,
      desc: 'Industria moderna con procesos limpios, eficiencia energética y empleo de calidad. Más cara, pero apenas contamina.'
    },
    fabrica_tradicional: {
      name: 'Fábrica tradicional', cat: 'economia', icon: '🏭', cost: 450, maint: 25, income: 170, jobs: 1.3, energyUse: 1.0,
      eff: { economia: 6, medioambiente: -8, felicidad: -2 }, ods: { 8: 2, 12: -8, 13: -6, 15: -2 }, terrain: LLANO,
      desc: 'Barata y muy rentable, con muchos puestos de trabajo… pero contamina el aire y el agua y consume mucha energía.'
    },
    centro_comercial: {
      name: 'Centro comercial', cat: 'economia', icon: '🛍️', cost: 700, maint: 35, income: 120, jobs: 0.7, energyUse: 0.6,
      eff: { economia: 4, felicidad: 3, medioambiente: -2, igualdad: -1 }, ods: { 8: 3, 12: -3 }, terrain: URBANO, requires: 'mercado',
      desc: 'Gran superficie comercial y de ocio. Atrae visitantes, aunque fomenta el consumo y perjudica al pequeño comercio.'
    },

    /* ---------- EDUCACIÓN ---------- */
    escuela: {
      name: 'Escuela', cat: 'educacion', icon: '🏫', cost: 400, maint: 40, income: 0, jobs: 0.3, energyUse: 0.2,
      eff: { educacion: 9, igualdad: 2, felicidad: 1 }, ods: { 4: 7, 10: 2 }, terrain: URBANO,
      desc: 'Centro público de educación infantil, primaria y secundaria. La base de la igualdad de oportunidades.'
    },
    universidad: {
      name: 'Universidad', cat: 'educacion', icon: '🎓', cost: 1100, maint: 90, income: 20, jobs: 0.5, energyUse: 0.5,
      eff: { educacion: 10, economia: 3, igualdad: 1 }, ods: { 4: 8, 8: 2 }, terrain: URBANO, requires: 'escuela',
      desc: 'Estudios superiores que forman profesionales cualificados y atraen talento a la región.'
    },
    centro_investigacion: {
      name: 'Centro de investigación', cat: 'educacion', icon: '🔬', cost: 1400, maint: 100, income: 60, jobs: 0.4, energyUse: 0.6,
      eff: { educacion: 5, economia: 5, medioambiente: 2 }, ods: { 4: 4, 8: 3, 12: 2, 13: 3 }, terrain: URBANO, requires: 'universidad',
      special: 'Sus avances aumentan un 10 % la producción de todas las centrales renovables.',
      desc: 'Laboratorios de innovación en energía limpia, salud y agricultura sostenible.'
    },

    /* ---------- ENERGÍA ---------- */
    central_solar: {
      name: 'Central solar', cat: 'energia', icon: '☀️', cost: 700, maint: 25, income: 0, jobs: 0.15, energyProd: 2.0, renewable: true,
      eff: { medioambiente: 1 }, ods: { 7: 7, 13: 5 }, terrain: LLANO,
      desc: 'Paneles fotovoltaicos que generan electricidad limpia y sin emisiones.'
    },
    parque_eolico: {
      name: 'Parque eólico', cat: 'energia', icon: '🌬️', cost: 850, maint: 30, income: 0, jobs: 0.15, energyProd: 2.6, renewable: true,
      eff: { felicidad: -1 }, ods: { 7: 8, 13: 5 }, terrain: ['colinas', 'montana'],
      desc: 'Aerogeneradores en zonas altas y ventosas. Mucha energía limpia, aunque cambian el paisaje.'
    },
    hidroelectrica: {
      name: 'Central hidroeléctrica', cat: 'energia', icon: '💧', cost: 1300, maint: 45, income: 0, jobs: 0.2, energyProd: 4.0, renewable: true,
      eff: { medioambiente: -2 }, ods: { 7: 8, 13: 4, 15: -3 }, terrain: ['rio'],
      desc: 'Aprovecha la fuerza del río. Produce mucha energía renovable, pero altera el ecosistema fluvial.'
    },

    /* ---------- MEDIOAMBIENTE ---------- */
    parque_natural: {
      name: 'Parque natural', cat: 'medioambiente', icon: '🏞️', cost: 350, maint: 20, income: 0, jobs: 0.05,
      eff: { medioambiente: 6, felicidad: 3 }, ods: { 15: 10, 11: 4, 13: 2 }, terrain: ['bosque', 'llanura', 'colinas'],
      desc: 'Espacio protegido para la biodiversidad y el disfrute ciudadano. Construido en un bosque, lo protege sin talarlo.'
    },
    centro_reciclaje: {
      name: 'Centro de reciclaje', cat: 'medioambiente', icon: '♻️', cost: 500, maint: 35, income: 0, jobs: 0.25, energyUse: 0.3,
      eff: { medioambiente: 6, economia: 1 }, ods: { 12: 10, 11: 3 }, terrain: LLANO,
      desc: 'Clasifica y recupera residuos para darles una segunda vida. Pilar de la economía circular.'
    },
    planta_agua: {
      name: 'Planta de tratamiento de agua', cat: 'medioambiente', icon: '🚰', cost: 650, maint: 40, income: 0, jobs: 0.2, energyUse: 0.4,
      eff: { medioambiente: 7, felicidad: 2 }, ods: { 11: 4, 15: 4, 12: 3 }, terrain: LLANO, nearWater: true,
      desc: 'Depura las aguas residuales antes de devolverlas al río. Debe construirse junto al río o al lago.'
    },

    /* ---------- SOCIEDAD ---------- */
    hospital: {
      name: 'Hospital', cat: 'sociedad', icon: '🏥', cost: 900, maint: 80, income: 0, jobs: 0.5, energyUse: 0.5,
      eff: { felicidad: 7, igualdad: 3 }, ods: { 1: 5, 10: 4, 11: 3 }, terrain: URBANO,
      desc: 'Sanidad pública, universal y gratuita. Mejora la salud de toda la población y reduce el impacto de las epidemias.'
    },
    viviendas_sociales: {
      name: 'Viviendas sociales', cat: 'sociedad', icon: '🏘️', cost: 600, maint: 25, income: 0, jobs: 0.05, energyUse: 0.3,
      eff: { igualdad: 7, felicidad: 4, economia: -1 }, ods: { 1: 8, 10: 8, 11: 5 }, terrain: URBANO,
      desc: 'Viviendas eficientes y asequibles para jóvenes y familias con pocos recursos.'
    },
    centro_cultural: {
      name: 'Centro cultural', cat: 'sociedad', icon: '🎭', cost: 450, maint: 30, income: 0, jobs: 0.2, energyUse: 0.2,
      eff: { felicidad: 5, educacion: 2, igualdad: 1 }, ods: { 4: 3, 11: 5, 10: 2 }, terrain: URBANO,
      desc: 'Biblioteca, teatro y talleres abiertos a toda la ciudadanía.'
    },

    /* ---------- TRANSPORTE ---------- */
    estacion_tren: {
      name: 'Estación de tren', cat: 'transporte', icon: '🚉', cost: 1000, maint: 50, income: 40, jobs: 0.3, energyUse: 0.5,
      eff: { economia: 4, medioambiente: 4, felicidad: 2 }, ods: { 11: 7, 13: 4, 8: 2 }, terrain: ['llanura'],
      desc: 'Conecta la región por ferrocarril: menos coches, más comercio y turismo.'
    },
    red_transporte: {
      name: 'Red de transporte público', cat: 'transporte', icon: '🚌', cost: 800, maint: 60, income: 0, jobs: 0.3, energyUse: 0.4,
      eff: { medioambiente: 5, felicidad: 3, igualdad: 3 }, ods: { 11: 8, 13: 4, 10: 3 }, terrain: URBANO,
      desc: 'Autobuses eléctricos y tranvía con tarifas asequibles que conectan barrios y pueblos.'
    },
    carril_bici: {
      name: 'Carril bici', cat: 'transporte', icon: '🚲', cost: 200, maint: 8, income: 0, jobs: 0.02,
      eff: { medioambiente: 3, felicidad: 2 }, ods: { 11: 4, 13: 3 }, terrain: LLANO,
      desc: 'Red de carriles seguros para moverse en bicicleta: saludable, barato y sin emisiones.'
    },

    /* ---------- HEREDADO (no construible) ---------- */
    central_carbon: {
      name: 'Central térmica de carbón', cat: 'legado', icon: '🏚️', cost: 0, maint: 40, income: 0, jobs: 0.4, energyProd: 3.0,
      eff: { medioambiente: -10, felicidad: -2 }, ods: { 7: -10, 13: -12, 15: -3 }, terrain: LLANO, buildable: false,
      demolishCost: 300,
      desc: 'Vieja central que abastece a la región quemando carbón. Muy contaminante. Desmantelarla cuesta 300 monedas y deja de producir su energía: ¡ten preparadas las renovables!'
    }
  };

  Object.keys(E.BUILDINGS).forEach((k) => { E.BUILDINGS[k].key = k; });
})(window.ECO);
