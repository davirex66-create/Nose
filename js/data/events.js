/* ECOCRACIA · Acontecimientos aleatorios
 * Cada opción: cost (pago), gain (ingreso), eff (cambio inmediato), mods (efectos duraderos sobre
 * el objetivo de los indicadores o puntos ODS; years:null = permanente), pop (población, miles),
 * special: 'build:<edificio>' | 'upgrade' | 'burn' | 'law:<ley>'
 */
(function (E) {
  'use strict';
  const has = (st, t) => (st.counts[t] || 0) > 0;

  E.EVENTS = [
    {
      id: 'ola_calor', title: 'Ola de calor', icon: '🌡️',
      text: 'Una ola de calor sin precedentes golpea la región. Durante días se superan los 42 °C y las personas mayores y las familias sin climatización son las más afectadas.',
      weight: (s) => 1 + (s.ind.medioambiente < 55 ? 1 : 0),
      options: [
        { label: 'Invertir en zonas verdes', desc: 'Plantar árboles, crear sombra y fuentes en calles y plazas.', cost: 350, eff: { felicidad: 2, medioambiente: 2 }, mods: [{ eff: { medioambiente: 2, felicidad: 1 }, ods: { 11: 2, 13: 2 }, years: 6 }],
          result: 'Las nuevas zonas verdes reducen varios grados la temperatura de los barrios. La ciudadanía valora la apuesta por adaptarse al cambio climático.' },
        { label: 'Crear refugios climáticos', desc: 'Abrir bibliotecas, escuelas y centros cívicos climatizados para todo el mundo.', cost: 180, eff: { felicidad: 1, igualdad: 3 },
          result: 'Miles de personas vulnerables encuentran alivio en los refugios climáticos. Una respuesta rápida y solidaria.' },
        { label: 'No realizar ninguna intervención', desc: 'Esperar a que pase el calor.', cost: 0, eff: { felicidad: -6, igualdad: -3, empleo: -1 }, mods: [{ eff: { felicidad: -2 }, years: 2 }],
          result: 'El calor provoca golpes de calor, cierres de comercios y mucho malestar. La población siente que nadie la protege.' }
      ]
    },
    {
      id: 'crisis_industrial', title: 'Crisis industrial', icon: '🏭',
      text: (s, st) => has(st, 'fabrica_tradicional')
        ? 'Una de tus fábricas tradicionales está vertiendo residuos al río. Los peces aparecen muertos y los agricultores de la ribera exigen soluciones.'
        : 'Las cenizas de la vieja central de carbón están contaminando el río. Los peces aparecen muertos y los agricultores de la ribera exigen soluciones.',
      cond: (s, st) => has(st, 'fabrica_tradicional') || has(st, 'central_carbon'),
      weight: (s, st) => (has(st, 'fabrica_tradicional') ? 2 : 0.8),
      options: [
        { label: 'Financiar su modernización', desc: 'Instalar filtros y procesos limpios (una fábrica tradicional se convierte en sostenible).', cost: 500, eff: { medioambiente: 3, empleo: 1 }, special: 'upgrade',
          result: 'La instalación se moderniza con tecnología limpia y mantiene todos sus empleos.' },
        { label: 'Aplicar una regulación medioambiental', desc: 'Multas y normas estrictas de vertidos para toda la industria.', cost: 0, eff: { medioambiente: 4, economia: -3, empleo: -2 }, mods: [{ eff: { medioambiente: 2 }, ods: { 12: 2 }, years: 4 }],
          result: 'Los vertidos se detienen. Algunas empresas protestan por los costes, pero el río empieza a recuperarse.' },
        { label: 'Mantener la producción actual', desc: 'No molestar a la industria para proteger el empleo.', cost: 0, eff: { medioambiente: -7, felicidad: -3 }, mods: [{ eff: { medioambiente: -3 }, ods: { 12: -3 }, years: 4 }],
          result: 'La contaminación se extiende río abajo. Los agricultores pierden cosechas y la confianza en el gobierno cae.' }
      ]
    },
    {
      id: 'crisis_educativa', title: 'Crisis educativa', icon: '📚',
      text: 'Las aulas están saturadas y faltan plazas escolares. Las familias denuncian que sus hijos e hijas no reciben la atención que necesitan.',
      weight: (s) => (s.ind.educacion < 55 ? 2 : 0.7),
      options: [
        { label: 'Construir nuevas escuelas', desc: 'Se levanta una escuela en una zona libre de tu territorio.', cost: 400, eff: { educacion: 2 }, special: 'build:escuela',
          result: 'La nueva escuela abre sus puertas y alivia la saturación de las aulas.' },
        { label: 'Aumentar la financiación educativa', desc: 'Contratar profesorado y ampliar horarios en los centros actuales.', cost: 300, eff: { educacion: 2 }, mods: [{ eff: { educacion: 5 }, ods: { 4: 2 }, years: 5 }],
          result: 'Llegan nuevos docentes y las ratios bajan. La calidad educativa mejora curso a curso.' },
        { label: 'No intervenir', desc: 'Las familias tendrán que arreglárselas.', cost: 0, eff: { educacion: -5, igualdad: -3, felicidad: -2 },
          result: 'Quienes pueden pagarlo se marchan a centros privados; el resto se queda atrás. La brecha educativa crece.' }
      ]
    },
    {
      id: 'crisis_vivienda', title: 'Crisis de vivienda', icon: '🏠',
      text: 'Los precios del alquiler han subido un 30 % en dos años. Muchas personas jóvenes no pueden independizarse y algunas familias se ven obligadas a abandonar sus barrios.',
      weight: (s) => (s.ind.igualdad < 60 ? 1.5 : 0.8),
      options: [
        { label: 'Construir viviendas sociales', desc: 'Se edifica un bloque de viviendas sociales en una zona libre.', cost: 600, eff: { igualdad: 2 }, special: 'build:viviendas_sociales',
          result: 'Cientos de familias acceden a una vivienda digna y asequible.' },
        { label: 'Regular el mercado del alquiler', desc: 'Limitar las subidas abusivas en las zonas más tensionadas.', cost: 0, eff: { igualdad: 3, felicidad: 2, economia: -3 }, mods: [{ eff: { igualdad: 2, economia: -1 }, ods: { 10: 2, 11: 2 }, years: 4 }],
          result: 'Los precios se estabilizan. Algunos propietarios protestan, pero las familias respiran.' },
        { label: 'No intervenir', desc: 'Dejar que el mercado se ajuste solo.', cost: 0, eff: { igualdad: -6, felicidad: -4 }, mods: [{ eff: { igualdad: -2 }, years: 3 }],
          result: 'La vivienda se convierte en un lujo y los barrios pierden a sus vecinos de toda la vida.' }
      ]
    },
    {
      id: 'sequia', title: 'Sequía prolongada', icon: '🏜️',
      text: 'Llevamos meses sin lluvias. Los embalses están bajo mínimos, las cosechas peligran y hay que decidir cómo repartir el agua.',
      weight: (s, st) => (has(st, 'planta_agua') ? 0.5 : 1.2),
      options: [
        { label: 'Plan de ahorro de agua', desc: 'Campañas, riego eficiente y tarifas por tramos de consumo.', cost: 250, eff: { medioambiente: 2, felicidad: -1 }, mods: [{ eff: { medioambiente: 1 }, ods: { 12: 2 }, years: 4 }],
          result: 'El consumo de agua baja un 20 %. La región aprende a gestionar mejor un recurso escaso.' },
        { label: 'Ayudas a los agricultores', desc: 'Compensar las pérdidas para mantener las explotaciones.', cost: 400, eff: { empleo: 2, igualdad: 1, economia: 1 },
          result: 'Las explotaciones familiares resisten la sequía y se mantienen los empleos rurales.' },
        { label: 'No intervenir', desc: 'Confiar en que vuelva a llover.', cost: 0, eff: { economia: -4, empleo: -3, medioambiente: -3 },
          result: 'Se pierden cosechas, cierran granjas y los acuíferos se sobreexplotan.' }
      ]
    },
    {
      id: 'inundacion', title: 'Inundaciones', icon: '🌊',
      text: 'Unas lluvias torrenciales desbordan el río. El agua anega calles, campos y viviendas de la ribera.',
      weight: () => 0.9,
      options: [
        { label: 'Restaurar las riberas', desc: 'Recuperar las llanuras de inundación y la vegetación natural del río.', cost: 450, eff: { medioambiente: 3, felicidad: 1 }, mods: [{ eff: { medioambiente: 2 }, ods: { 15: 2, 13: 2 }, years: 6 }],
          result: 'Las riberas recuperadas absorberán futuras crecidas. Una solución basada en la naturaleza.' },
        { label: 'Construir diques de hormigón', desc: 'Muros de contención a lo largo del cauce.', cost: 550, eff: { felicidad: 2, economia: 1, medioambiente: -2 },
          result: 'Los diques protegen los barrios, aunque el río pierde parte de su vida natural.' },
        { label: 'Ayudas de emergencia', desc: 'Atender primero a las familias afectadas.', cost: 250, eff: { igualdad: 2, felicidad: 1, economia: -2 },
          result: 'Las familias afectadas reciben apoyo inmediato para reparar sus hogares.' },
        { label: 'Reparar solo lo imprescindible', desc: 'Limpiar el barro y seguir adelante.', cost: 0, eff: { felicidad: -5, economia: -4, igualdad: -2 },
          result: 'Muchos negocios tardan meses en reabrir y las familias más humildes lo pierden todo.' }
      ]
    },
    {
      id: 'incendio', title: 'Incendio forestal', icon: '🔥',
      text: 'Un incendio forestal avanza por los bosques de la región, empujado por el viento y la sequedad.',
      cond: (s, st) => st.forest > 0,
      weight: (s) => (s.laws.proteger_bosques ? 0.35 : 1) + (s.ind.medioambiente < 50 ? 0.5 : 0),
      options: [
        { label: 'Crear brigadas de prevención', desc: 'Retenes forestales todo el año, limpieza de montes y vigilancia.', cost: 350, eff: { medioambiente: 1, empleo: 1 }, mods: [{ eff: { medioambiente: 2 }, ods: { 15: 2 }, years: 5 }],
          result: 'El fuego se controla a tiempo y las nuevas brigadas evitarán incendios futuros.' },
        { label: 'Pedir ayuda a las regiones vecinas', desc: 'Medios aéreos compartidos para apagar el fuego.', cost: 150, eff: { medioambiente: -2, felicidad: 1 },
          result: 'La cooperación entre regiones salva la mayor parte del bosque.' },
        { label: 'No intervenir', desc: 'Dejar actuar solo a los medios habituales.', cost: 0, eff: { medioambiente: -6, felicidad: -3 }, special: 'burn',
          result: 'El incendio arrasa una parte del bosque, que tardará décadas en recuperarse.' }
      ]
    },
    {
      id: 'empresa_tecnologica', title: 'Una empresa tecnológica quiere instalarse', icon: '💻',
      text: 'Una gran empresa tecnológica quiere abrir su sede en la región. Ofrece inversión y empleo, pero sus condiciones son negociables.',
      cond: (s) => s.year >= s.startYear + 3,
      weight: () => 0.8,
      options: [
        { label: 'Aceptar con condiciones sociales', desc: 'Empleo local, salarios justos y compromiso ambiental.', cost: 0, gain: 300, eff: { economia: 3, empleo: 3, igualdad: 1 }, mods: [{ eff: { economia: 2, empleo: 2 }, ods: { 8: 2 }, years: 6 }],
          result: 'La empresa se instala con un acuerdo justo. Crea empleo de calidad y colabora con la universidad.' },
        { label: 'Aceptar sin condiciones', desc: 'Máxima inversión inmediata, sin exigencias.', cost: 0, gain: 700, eff: { economia: 4, empleo: 3, igualdad: -4, medioambiente: -2 }, mods: [{ eff: { igualdad: -1 }, years: 4 }],
          result: 'Llega mucho dinero, pero los empleos son precarios y los beneficios se van fuera de la región.' },
        { label: 'Rechazar la propuesta', desc: 'Preferimos otro modelo de desarrollo.', cost: 0, eff: { felicidad: -1 },
          result: 'La empresa se instala en otra región. Algunas personas lamentan la oportunidad perdida.' }
      ]
    },
    {
      id: 'protesta_transporte', title: 'Protesta por el transporte', icon: '🚏',
      text: 'Cientos de personas se manifiestan: los pueblos están mal comunicados y quien no tiene coche no puede ir a trabajar ni al médico.',
      cond: (s, st) => !has(st, 'red_transporte'),
      weight: () => 1,
      options: [
        { label: 'Ampliar las líneas de autobús', desc: 'Nuevas rutas y frecuencias entre la capital y los pueblos.', cost: 400, eff: { felicidad: 3, medioambiente: 2 }, mods: [{ eff: { medioambiente: 2, felicidad: 1 }, ods: { 11: 2 }, years: 5 }],
          result: 'Los pueblos quedan mejor conectados y miles de coches dejan de circular cada día.' },
        { label: 'Crear una mesa de diálogo', desc: 'Escuchar a la ciudadanía antes de decidir.', cost: 100, eff: { felicidad: 1 },
          result: 'La protesta se calma, aunque la gente espera hechos pronto.' },
        { label: 'Ignorar la protesta', desc: 'No hay presupuesto para esto.', cost: 0, eff: { felicidad: -5, igualdad: -2 },
          result: 'El malestar crece, sobre todo entre las personas mayores y las que viven en zonas rurales.' }
      ]
    },
    {
      id: 'crisis_sanitaria', title: 'Brote epidémico', icon: '🦠',
      text: (s, st) => has(st, 'hospital')
        ? 'Un brote de gripe muy contagiosa se extiende por la región. Por suerte, el hospital público puede atender a los enfermos graves.'
        : 'Un brote de gripe muy contagiosa se extiende por la región. Sin un hospital propio, los enfermos graves deben ser trasladados lejos.',
      weight: (s, st) => (has(st, 'hospital') ? 0.6 : 1.2),
      options: [
        { label: 'Campaña de vacunación', desc: 'Vacunación gratuita priorizando a la población de riesgo.', cost: 300, eff: { felicidad: 2 },
          result: 'La vacunación frena el brote en pocas semanas.' },
        { label: 'Reforzar el personal sanitario', desc: 'Contratar médicos y enfermeras de refuerzo.', cost: 500, eff: { felicidad: 4, empleo: 1, igualdad: 2 }, mods: [{ eff: { felicidad: 1 }, ods: { 1: 1, 10: 1 }, years: 4 }],
          result: 'El sistema sanitario sale reforzado de la crisis y la población lo agradece.' },
        { label: 'No intervenir', desc: 'Esperar a que el brote remita.', cost: 0,
          eff: (s, st) => (has(st, 'hospital') ? { felicidad: -3, empleo: -1 } : { felicidad: -7, empleo: -3, economia: -3 }),
          result: 'El brote paraliza la región durante semanas: bajas laborales, colegios cerrados y mucha preocupación.' }
      ]
    },
    {
      id: 'crisis_energetica', title: 'Crisis energética', icon: '🔌',
      text: 'El precio internacional de los combustibles se dispara. Las facturas de la luz se duplican y muchas familias no pueden pagarlas.',
      weight: (s, st) => (st.renewShare < 0.5 ? 1.4 : 0.4),
      options: [
        { label: 'Invertir en autoconsumo solar', desc: 'Placas solares en tejados públicos y ayudas a comunidades de vecinos.', cost: 500, eff: { energia: 3, medioambiente: 1 }, mods: [{ eff: { energia: 6 }, ods: { 7: 2 }, years: 6 }],
          result: 'Los tejados se llenan de placas solares. La región depende menos del exterior.' },
        { label: 'Ayudas al recibo para familias', desc: 'Bono social energético para los hogares vulnerables.', cost: 300, eff: { igualdad: 3, felicidad: 2 },
          result: 'Ninguna familia se queda sin luz ni calefacción este invierno.' },
        { label: 'No intervenir', desc: 'Los precios bajarán algún día.', cost: 0, eff: { felicidad: -4, igualdad: -3, economia: -3 },
          result: 'La pobreza energética se extiende y muchas empresas reducen su actividad.' }
      ]
    },
    {
      id: 'festival', title: 'Propuesta de gran festival', icon: '🎪',
      text: 'Una productora propone celebrar un gran festival de música en la región este verano.',
      cond: (s) => s.year >= s.startYear + 2,
      weight: () => 0.8,
      options: [
        { label: 'Festival sostenible', desc: 'Transporte público, vasos reutilizables y artistas locales.', cost: 200, eff: { felicidad: 4, economia: 2 }, mods: [{ ods: { 11: 1, 12: 1 }, years: 3 }],
          result: 'Un festival memorable, con residuo cero y gran ambiente. ¡Un ejemplo para otras regiones!' },
        { label: 'Gran festival comercial', desc: 'Patrocinadores, mucho público y beneficios rápidos.', cost: 100, gain: 300, eff: { felicidad: 3, economia: 2, medioambiente: -3 },
          result: 'Gran éxito de público… y toneladas de basura en el recinto.' },
        { label: 'Cancelar la propuesta', desc: 'No es el momento.', cost: 0, eff: { felicidad: -1 },
          result: 'La juventud de la región lamenta la decisión.' }
      ]
    },
    {
      id: 'migracion_climatica', title: 'Llegada de familias desplazadas', icon: '🧳',
      text: 'Cientos de familias desplazadas por la sequía y las inundaciones en otras zonas del mundo llegan a la región buscando un nuevo hogar.',
      weight: () => 0.9,
      options: [
        { label: 'Acoger e integrar', desc: 'Vivienda, clases de idioma y acceso al empleo (+1.500 habitantes).', cost: 300, pop: 1.5, eff: { igualdad: 2, felicidad: 1, empleo: -2 }, mods: [{ eff: { economia: 2 }, ods: { 10: 3 }, years: 6 }],
          result: 'Las nuevas familias se integran, abren negocios y rejuvenecen los pueblos.' },
        { label: 'Acogida temporal', desc: 'Alojamiento de emergencia durante un tiempo (+500 habitantes).', cost: 100, pop: 0.5, eff: { igualdad: 1 },
          result: 'Se atiende la emergencia, aunque sin un plan a largo plazo.' },
        { label: 'Rechazar la acogida', desc: 'Cerrar la puerta a las familias desplazadas.', cost: 0, eff: { igualdad: -4, felicidad: -2 },
          result: 'Muchas personas de la región se avergüenzan de esta decisión, contraria a los derechos humanos.' }
      ]
    },
    {
      id: 'especie_protegida', title: 'Descubrimiento de una especie protegida', icon: '🦅',
      text: 'Un equipo de biólogos descubre una colonia de águila imperial, una especie en peligro de extinción, en una zona donde hay previstas construcciones.',
      weight: () => 0.8,
      options: [
        { label: 'Declarar una reserva natural', desc: 'Proteger su hábitat de forma permanente.', cost: 150, eff: { medioambiente: 3, economia: -1 }, mods: [{ eff: { medioambiente: 2 }, ods: { 15: 4 }, years: null }],
          result: 'La colonia de águilas prospera. La reserva atrae a observadores de aves de todo el país.' },
        { label: 'Compatibilizar usos', desc: 'Corredores ecológicos y limitaciones en época de cría.', cost: 50, eff: { medioambiente: 1 },
          result: 'Se alcanza un equilibrio razonable entre la actividad humana y la especie.' },
        { label: 'Ignorar el hallazgo', desc: 'El desarrollo es lo primero.', cost: 0, eff: { medioambiente: -4, felicidad: -1 }, mods: [{ ods: { 15: -3 }, years: 5 }],
          result: 'Las águilas abandonan la zona. Las asociaciones ecologistas denuncian a la región.' }
      ]
    },
    {
      id: 'huelga', title: 'Huelga por las condiciones laborales', icon: '✊',
      text: 'Los sindicatos convocan una huelga general: denuncian salarios bajos, contratos temporales y jornadas abusivas.',
      cond: (s) => !s.laws.derechos_laborales,
      weight: (s) => (s.ind.igualdad < 55 ? 1.5 : 0.8),
      options: [
        { label: 'Negociar mejoras', desc: 'Acuerdo con sindicatos y empresas.', cost: 300, eff: { igualdad: 3, felicidad: 3, economia: -1 },
          result: 'El diálogo social da fruto: se firma un acuerdo que mejora los salarios.' },
        { label: 'Aprobar la ley de derechos laborales', desc: 'Se aprueba sin coste de tramitación (se pagará su coste anual de 30 monedas).', cost: 0, eff: { felicidad: 2 }, special: 'law:derechos_laborales',
          result: 'La nueva ley garantiza un trabajo digno para toda la población trabajadora.' },
        { label: 'Ignorar la huelga', desc: 'Esperar a que se desconvoque.', cost: 0, eff: { economia: -5, felicidad: -5, empleo: -2 },
          result: 'La huelga paraliza la región durante días y el conflicto se enquista.' }
      ]
    },
    {
      id: 'fondos_sostenibilidad', title: 'Fondos internacionales para la sostenibilidad', icon: '🇪🇺',
      text: 'Un programa internacional concede a la región 400 monedas para proyectos alineados con la Agenda 2030. ¿A qué los destinas?',
      cond: (s) => s.year >= s.startYear + 4,
      weight: () => 0.7,
      options: [
        { label: 'Energías renovables', desc: 'Proyectos de autoconsumo y comunidades energéticas.', cost: 0, gain: 400, mods: [{ eff: { energia: 5, medioambiente: 1 }, ods: { 7: 3 }, years: 6 }],
          result: 'Los fondos impulsan comunidades energéticas en los pueblos.' },
        { label: 'Educación', desc: 'Digitalización de las aulas y becas.', cost: 0, gain: 400, mods: [{ eff: { educacion: 5 }, ods: { 4: 3 }, years: 6 }],
          result: 'Las aulas se modernizan y cientos de estudiantes reciben becas.' },
        { label: 'Inclusión social', desc: 'Programas contra la pobreza y la exclusión.', cost: 0, gain: 400, mods: [{ eff: { igualdad: 5 }, ods: { 10: 3, 1: 2 }, years: 6 }],
          result: 'Los programas de inclusión llegan a las familias que más lo necesitan.' }
      ]
    },
    {
      id: 'plaga', title: 'Plaga en los cultivos', icon: '🐛',
      text: 'Una plaga de insectos amenaza los cultivos de la comarca. Los agricultores piden ayuda urgente.',
      weight: () => 0.8,
      options: [
        { label: 'Control biológico', desc: 'Liberar depredadores naturales de la plaga.', cost: 300, eff: { medioambiente: 2, empleo: 1 },
          result: 'Las mariquitas y otros aliados naturales controlan la plaga sin dañar el ecosistema.' },
        { label: 'Pesticidas químicos', desc: 'La solución más barata y rápida.', cost: 100, eff: { medioambiente: -5, empleo: 1, economia: 1 }, mods: [{ ods: { 15: -2, 12: -2 }, years: 4 }],
          result: 'La plaga desaparece, pero también las abejas y otros insectos beneficiosos.' },
        { label: 'No intervenir', desc: 'La plaga seguirá su curso.', cost: 0, eff: { empleo: -4, economia: -3 },
          result: 'Se pierde buena parte de la cosecha y muchos jornaleros se quedan sin trabajo.' }
      ]
    },
    {
      id: 'contaminacion_aire', title: 'Episodio de contaminación del aire', icon: '😷',
      text: 'Una boina de contaminación cubre la capital. Aumentan las consultas por problemas respiratorios.',
      cond: (s, st) => has(st, 'central_carbon') || has(st, 'fabrica_tradicional') || s.ind.medioambiente < 55,
      weight: () => 1,
      options: [
        { label: 'Restringir el tráfico', desc: 'Limitar la circulación de coches durante los días críticos.', cost: 0, eff: { medioambiente: 4, felicidad: -2, economia: -1 },
          result: 'El aire mejora rápidamente, aunque a algunos conductores no les gusta la medida.' },
        { label: 'Plan de movilidad limpia', desc: 'Transporte público gratuito y ayudas al vehículo eléctrico.', cost: 400, eff: { medioambiente: 3, felicidad: 2 }, mods: [{ eff: { medioambiente: 2 }, ods: { 11: 2, 13: 1 }, years: 5 }],
          result: 'La movilidad de la región se transforma hacia un modelo más limpio.' },
        { label: 'No intervenir', desc: 'Esperar a que el viento disperse la contaminación.', cost: 0, eff: { felicidad: -4, medioambiente: -4 }, mods: [{ eff: { felicidad: -2 }, years: 3 }],
          result: 'Los hospitales se llenan de personas con problemas respiratorios.' }
      ]
    },
    {
      id: 'desempleo_juvenil', title: 'Desempleo juvenil', icon: '🧑‍💼',
      text: 'Uno de cada tres jóvenes de la región no encuentra trabajo y muchos se plantean emigrar.',
      cond: (s) => s.ind.empleo < 72,
      weight: (s) => (s.ind.empleo < 60 ? 1.6 : 0.8),
      options: [
        { label: 'Programa de primer empleo', desc: 'Contratos en prácticas pagadas en empresas y administración.', cost: 400, eff: { empleo: 4, igualdad: 2 }, mods: [{ eff: { empleo: 2 }, ods: { 8: 2 }, years: 5 }],
          result: 'Cientos de jóvenes consiguen su primer empleo y deciden quedarse en la región.' },
        { label: 'Becas de formación', desc: 'Estudiar ahora para trabajar mejor mañana.', cost: 300, eff: { educacion: 3, empleo: 1 },
          result: 'Muchos jóvenes se forman en profesiones con futuro.' },
        { label: 'No intervenir', desc: 'El mercado laboral se recuperará.', cost: 0, eff: { empleo: -4, igualdad: -2, felicidad: -2 },
          result: 'La región pierde a una generación de jóvenes que emigra en busca de oportunidades.' }
      ]
    },
    {
      id: 'cooperativas', title: 'Auge de las cooperativas', icon: '🧺',
      text: 'Un grupo de vecinas y vecinos quiere crear cooperativas agrícolas y de energía. Piden apoyo para arrancar.',
      weight: () => 0.8,
      options: [
        { label: 'Apoyar a las cooperativas', desc: 'Microcréditos, asesoría y locales cedidos.', cost: 250, eff: { empleo: 3, igualdad: 3, economia: 2 }, mods: [{ ods: { 8: 2, 12: 1 }, years: 5 }],
          result: 'Nacen cinco cooperativas que generan empleo estable y reparten los beneficios de forma justa.' },
        { label: 'No apoyarlas', desc: 'Que lo intenten por su cuenta.', cost: 0, eff: {},
          result: 'Solo una cooperativa consigue salir adelante.' }
      ]
    },
    {
      id: 'brecha_digital', title: 'Brecha digital', icon: '📶',
      text: 'Los pueblos de la región no tienen una buena conexión a internet. El alumnado rural no puede seguir las clases en línea y los negocios pierden clientes.',
      weight: () => 0.8,
      options: [
        { label: 'Llevar la fibra óptica a los pueblos', desc: 'Conectividad de calidad en todo el territorio.', cost: 450, eff: { igualdad: 3, educacion: 2, economia: 2 },
          result: 'Los pueblos quedan conectados: llegan teletrabajadores y nuevas empresas.' },
        { label: 'Puntos de acceso públicos', desc: 'Salas con ordenadores y wifi en cada pueblo.', cost: 150, eff: { igualdad: 1, educacion: 1 },
          result: 'Una solución modesta pero útil para quien no tiene conexión en casa.' },
        { label: 'No intervenir', desc: 'Las operadoras ya llegarán.', cost: 0, eff: { igualdad: -3, educacion: -2 },
          result: 'El mundo rural se queda atrás y la despoblación se acelera.' }
      ]
    }
  ];

  E.EVENT_MAP = {};
  E.EVENTS.forEach((e) => { E.EVENT_MAP[e.id] = e; });
})(window.ECO);
