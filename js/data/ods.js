/* ECOCRACIA · Objetivos de Desarrollo Sostenible trabajados en el juego
 * w: peso de cada indicador en la base del progreso (suma 1)
 * Progreso = media ponderada × 0,8 + puntos de acciones (máx. +25)
 */
(function (E) {
  'use strict';
  E.ODS = [
    {
      n: 1, name: 'Fin de la pobreza', color: '#E5243B', icon: '🏠',
      desc: 'Erradicar la pobreza en todas sus formas y garantizar que todas las personas tengan acceso a recursos básicos y protección social.',
      how: 'Construye viviendas sociales y hospitales, aprueba ayudas para familias vulnerables, mejora los derechos laborales y aplica una fiscalidad progresiva. Depende de la igualdad, el empleo y la economía.',
      w: { igualdad: 0.45, empleo: 0.35, economia: 0.2 }
    },
    {
      n: 4, name: 'Educación de calidad', color: '#C5192D', icon: '📖',
      desc: 'Garantizar una educación inclusiva, equitativa y de calidad y promover oportunidades de aprendizaje durante toda la vida.',
      how: 'Construye escuelas, una universidad y un centro de investigación, abre centros culturales y aumenta la inversión educativa. Depende sobre todo de la educación.',
      w: { educacion: 0.8, igualdad: 0.2 }
    },
    {
      n: 7, name: 'Energía asequible y no contaminante', color: '#FCC30B', icon: '☀️',
      desc: 'Garantizar el acceso a una energía asequible, fiable, sostenible y moderna para todas las personas.',
      how: 'Construye centrales solares, eólicas e hidroeléctricas, subvenciona las renovables y desmantela la central de carbón. Cuanto mayor sea la cuota renovable, más avanza.',
      w: { energia: 0.6, medioambiente: 0.4 }
    },
    {
      n: 8, name: 'Trabajo decente y crecimiento económico', color: '#A21942', icon: '💼',
      desc: 'Promover un crecimiento económico sostenido, inclusivo y sostenible, el empleo pleno y productivo y el trabajo decente para todas las personas.',
      how: 'Construye mercados, fábricas sostenibles y universidades; aprueba la jornada laboral justa y los derechos laborales; impulsa la formación profesional.',
      w: { empleo: 0.5, economia: 0.35, felicidad: 0.15 }
    },
    {
      n: 10, name: 'Reducción de las desigualdades', color: '#DD1367', icon: '⚖️',
      desc: 'Reducir la desigualdad dentro de los países y entre ellos, garantizando la inclusión social, económica y política de todas las personas.',
      how: 'Viviendas sociales, fiscalidad progresiva, ayudas a familias, plan de igualdad salarial, transporte público y acogida de personas desplazadas.',
      w: { igualdad: 0.7, educacion: 0.15, felicidad: 0.15 }
    },
    {
      n: 11, name: 'Ciudades y comunidades sostenibles', color: '#FD9D24', icon: '🏙️',
      desc: 'Lograr que las ciudades sean inclusivas, seguras, resilientes y sostenibles.',
      how: 'Construye la estación de tren, la red de transporte público, carriles bici, centros culturales, parques y viviendas sociales.',
      w: { felicidad: 0.35, medioambiente: 0.35, igualdad: 0.3 }
    },
    {
      n: 12, name: 'Producción y consumo responsables', color: '#BF8B2E', icon: '♻️',
      desc: 'Garantizar modalidades de consumo y producción sostenibles, reduciendo los residuos y el uso de recursos.',
      how: 'Centros de reciclaje, fábricas sostenibles, la ley de economía circular y el ecoturismo. Las fábricas tradicionales y el turismo masivo lo frenan.',
      w: { medioambiente: 0.6, economia: 0.4 }
    },
    {
      n: 13, name: 'Acción por el clima', color: '#3F7E44', icon: '🌍',
      desc: 'Adoptar medidas urgentes para combatir el cambio climático y sus efectos.',
      how: 'Energías renovables, transporte limpio, declarar la emergencia climática y cerrar la central de carbón (que resta mucho progreso mientras funcione).',
      w: { medioambiente: 0.7, energia: 0.3 }
    },
    {
      n: 15, name: 'Vida de ecosistemas terrestres', color: '#56C02B', icon: '🌳',
      desc: 'Proteger, restablecer y promover el uso sostenible de los ecosistemas terrestres, gestionar los bosques y detener la pérdida de biodiversidad.',
      how: 'Conserva y planta bosques, crea parques naturales, aprueba la protección de los bosques y protege las especies amenazadas. Talar bosques lo perjudica.',
      w: { medioambiente: 0.8, felicidad: 0.2 }
    }
  ];
  E.ODS_MAP = {};
  E.ODS.forEach((o) => { E.ODS_MAP[o.n] = o; });
})(window.ECO);
