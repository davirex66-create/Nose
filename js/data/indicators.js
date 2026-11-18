/* ECOCRACIA · Indicadores y terrenos */
(function (E) {
  'use strict';

  E.IND_KEYS = ['economia', 'felicidad', 'medioambiente', 'energia', 'educacion', 'igualdad', 'empleo'];

  E.INDICATORS = [
    {
      key: 'economia', name: 'Economía', icon: '📈', color: '#e3a93b', victory: 60,
      desc: 'Fortaleza de la actividad económica: comercio, industria, inversión y salud de las cuentas públicas. No es lo mismo que el dinero disponible: una región puede tener dinero ahorrado y una economía débil.',
      up: 'Mercados, fábricas, estación de tren, investigación, un buen nivel de empleo y de educación y un presupuesto con superávit.',
      down: 'Deuda pública, cortes de energía, impuestos altos y regulaciones con coste para las empresas.'
    },
    {
      key: 'felicidad', name: 'Felicidad', icon: '😊', color: '#f08a5d', victory: 70,
      desc: 'Bienestar general de la población: salud, ocio, cultura, calidad de vida y confianza en el gobierno.',
      up: 'Hospitales, centros culturales, parques, viviendas sociales, buen empleo, igualdad y un entorno limpio.',
      down: 'Paro, contaminación, desigualdad, impuestos altos, deuda y crisis sin atender.'
    },
    {
      key: 'medioambiente', name: 'Medioambiente', icon: '🌿', color: '#5cbf6a', victory: 75,
      desc: 'Calidad del aire, del agua y de los ecosistemas del territorio.',
      up: 'Parques naturales, reciclaje, depuradoras, transporte limpio, conservar los bosques y cerrar la central de carbón.',
      down: 'Industria contaminante, carbón, talar bosques y el crecimiento de la población sin infraestructuras verdes.'
    },
    {
      key: 'energia', name: 'Energía', icon: '⚡', color: '#f2c94c', victory: 70,
      desc: 'Capacidad de producción energética comparada con la demanda. Con un 110 % de cobertura se alcanza 70 puntos; por debajo del 80 % aparecen apagones.',
      up: 'Centrales solares, eólicas e hidroeléctricas, subvenciones a renovables y rehabilitación energética.',
      down: 'Cada edificio y cada habitante consume energía. Cerrar centrales sin reemplazo provoca apagones.'
    },
    {
      key: 'educacion', name: 'Educación', icon: '🎓', color: '#6c9be0', victory: 70,
      desc: 'Nivel educativo y acceso a una formación de calidad para toda la población.',
      up: 'Escuelas, universidad, centro de investigación, centro cultural e inversión educativa.',
      down: 'El aumento de población sin nuevos centros y las crisis educativas sin atender.'
    },
    {
      key: 'igualdad', name: 'Igualdad', icon: '⚖️', color: '#c77dd8', victory: 65,
      desc: 'Igualdad de oportunidades y reparto justo de los recursos entre toda la población.',
      up: 'Viviendas sociales, ayudas a familias, fiscalidad progresiva, derechos laborales, sanidad y transporte público.',
      down: 'Impuestos bajos, centros comerciales, decisiones que favorecen solo a unos pocos y crisis sociales ignoradas.'
    },
    {
      key: 'empleo', name: 'Empleo', icon: '👷', color: '#4fb3b8', victory: 65,
      desc: 'Proporción de la población activa con un trabajo. Depende de los puestos de trabajo que generan tus edificios frente al crecimiento de la población.',
      up: 'Fábricas, mercados, hospitales, universidades, formación profesional y reparto del trabajo.',
      down: 'El crecimiento de la población sin nuevos puestos de trabajo y algunas regulaciones.'
    }
  ];
  E.IND = {};
  E.INDICATORS.forEach((i) => { E.IND[i.key] = i; });

  E.START_VALUES = { economia: 50, felicidad: 65, medioambiente: 60, energia: 40, educacion: 45, igualdad: 50, empleo: 60 };

  E.TERRAINS = {
    llanura: { name: 'Llanura', icon: '🌾', desc: 'Tierras fértiles y llanas. Admiten casi cualquier construcción.' },
    bosque: { name: 'Bosque', icon: '🌲', desc: 'Bosque autóctono que mejora el medioambiente. Construir aquí (salvo un parque natural) supone talarlo para siempre.' },
    colinas: { name: 'Colinas', icon: '⛰️', desc: 'Terreno ondulado y ventoso: ideal para parques eólicos, centrales solares e industria.' },
    montana: { name: 'Montaña', icon: '🏔️', desc: 'Cumbres escarpadas y con mucho viento. Solo admiten parques eólicos.' },
    rio: { name: 'Río', icon: '🏞️', desc: 'Cauce fluvial. Solo admite centrales hidroeléctricas; las casillas vecinas permiten construir plantas de tratamiento de agua.' },
    lago: { name: 'Lago', icon: '💧', desc: 'Reserva natural de agua dulce. No es edificable.' },
    ciudad: { name: 'Capital', icon: '🏛️', desc: 'Centro administrativo y económico de la región. Aporta empleo y servicios.' },
    pueblo: { name: 'Pueblo', icon: '🏡', desc: 'Núcleo rural. Integrarlo en tu región aporta población y empleo.' }
  };
})(window.ECO);
