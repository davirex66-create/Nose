# 🌿 ECOCRACIA · Construye una sociedad sostenible

**ECOCRACIA** es un videojuego web de estrategia y gestión por turnos sobre los **Objetivos de Desarrollo Sostenible (ODS)** de la Agenda 2030 de la ONU.

Gobiernas una pequeña región ficticia y tienes que convertirla en una sociedad **avanzada, justa y sostenible**. Para ello tendrás que construir infraestructuras, aprobar leyes, invertir, ampliar el territorio y responder a acontecimientos imprevistos. No basta con acumular dinero: solo ganas si equilibras **economía, sociedad y medioambiente**.

> Proyecto educativo. Sin violencia, sin guerras: los conflictos se resuelven con decisiones políticas, cooperación y diálogo.

---

## 🎮 Cómo se juega

| Elemento | Descripción |
|---|---|
| **Turnos** | Cada turno es un año. El botón **«Pasar al siguiente año»** cobra los impuestos, paga el mantenimiento, actualiza los indicadores, hace crecer la población y puede desencadenar un acontecimiento. |
| **Indicadores (0-100)** | Economía, Felicidad, Medioambiente, Energía, Educación, Igualdad y Empleo. Cada uno tiende hacia un *objetivo* calculado a partir de tu región (flecha ▲/▼). Al hacer clic en un indicador se muestra el desglose de su cálculo. |
| **Dinero** | Se usa para construir y gobernar. Si entras en números rojos pagas intereses; si la deuda supera las 3.000 monedas, la administración quiebra. |
| **Construcción** | 19 edificios en 6 categorías (Economía, Educación, Energía, Medioambiente, Sociedad y Transporte), además de la central de carbón que la región hereda. Cada edificio tiene precio, mantenimiento, ingresos, empleos, energía, efectos y requisitos de terreno. |
| **Territorio** | Mapa hexagonal procedimental con llanuras, bosques, colinas, montañas, río, lago, capital y pueblos. Puedes integrar casillas vecinas mediante acuerdos con sus habitantes. |
| **Gobierno** | Política fiscal (4 modelos), 8 decisiones políticas irreversibles, 8 leyes con coste anual y 7 inversiones temporales. |
| **Acontecimientos** | 20 acontecimientos aleatorios (ola de calor, crisis industrial, crisis educativa, crisis de vivienda, sequía, inundaciones, incendios, migración climática, huelga…), con 2-4 opciones y consecuencias distintas. Hay que resolverlos antes de avanzar. |
| **ODS** | Se trabajan 9 ODS: 1, 4, 7, 8, 10, 11, 12, 13 y 15. Cada uno muestra su número, nombre, descripción, progreso y cómo contribuyes a él, con el desglose de lo que suma y lo que resta. |

### 🏆 Victoria
Al cerrar un año se tienen que cumplir **a la vez** todas estas condiciones:

- Economía > 60 · Felicidad > 70 · Medioambiente > 75 · Energía > 70
- Educación > 70 · Igualdad > 65 · Empleo > 65
- Al menos **6 ODS alcanzados** (progreso ≥ 75 %)

Tras ganar puedes seguir gobernando en **modo libre**.

### ⚠️ Derrota
Si cualquier indicador llega a **0**, o la deuda supera las **3.000 monedas**, la región entra en una crisis grave. El juego explica qué ha pasado, qué factores agravaron la crisis y qué se puede hacer mejor la próxima vez.

### ⚖️ Equilibrio del juego
- Las copias repetidas de un mismo edificio rinden cada vez menos (−30 % por copia), así que conviene diversificar.
- La población crece con la felicidad y el empleo, y con ella aumenta la demanda de energía, educación, empleo y servicios.
- Antes de confirmar cualquier decisión se muestra una **vista previa** de su efecto inmediato, su tendencia a largo plazo y su coste.

---

## 📁 Estructura del proyecto

```
ecocracia/
├── index.html              # Pantallas (menú y partida) y capas de interfaz
├── netlify.toml            # Configuración de despliegue (sitio estático)
├── README.md
├── assets/
│   ├── logo.svg            # Logotipo
│   └── favicon.svg         # Icono de la pestaña
├── css/
│   ├── base.css            # Tema, botones, modales, notificaciones, menú principal
│   └── game.css            # Interfaz de partida, mapa, paneles y adaptación a móvil
├── js/
│   ├── utils.js            # Utilidades (formato, aleatoriedad con semilla…)
│   ├── data/
│   │   ├── indicators.js   # Indicadores, valores iniciales y terrenos
│   │   ├── buildings.js    # Catálogo de edificios
│   │   ├── policies.js     # Fiscalidad, decisiones, leyes e inversiones
│   │   ├── events.js       # Acontecimientos aleatorios
│   │   └── ods.js          # Objetivos de Desarrollo Sostenible
│   ├── mapgen.js           # Generación procedimental del mapa hexagonal
│   ├── engine.js           # Motor de simulación (sin DOM): turnos, economía, ODS, victoria y derrota
│   ├── save.js             # Guardado en LocalStorage (autoguardado + 3 ranuras)
│   ├── ui.js               # Modales, confirmaciones, notificaciones, tooltips, gráficas SVG
│   ├── map.js              # Renderizado SVG del mapa, zoom y desplazamiento
│   ├── panels.js           # Paneles: Mapa, Construir, Economía, Gobierno, ODS, Historial
│   ├── tutorial.js         # Tutorial interactivo
│   └── main.js             # Controlador: acciones del jugador, turnos, fin de partida
└── tests/
    ├── simulacion.js       # Simulación de equilibrio con estrategias automáticas (Node)
    └── prueba-navegador.js # Prueba completa en navegador (Playwright)
```

Está hecho con **HTML5, CSS3 y JavaScript puro**: no hay dependencias ni paso de compilación. Los scripts son clásicos (no módulos), así que el juego también funciona abriendo `index.html` directamente.

---

## 💻 Ejecución en local

**Opción rápida:** haz doble clic en `index.html`.

**Opción recomendada** (servidor local):

```bash
cd ecocracia
```

```bash
python3 -m http.server 8080
```

Después abre <http://localhost:8080> en el navegador. También sirve `npx serve .`.

---

## 🚀 Despliegue en Netlify

El proyecto es un sitio estático y ya incluye `netlify.toml` (carpeta de publicación: la raíz del proyecto; sin comando de compilación).

**Opción A · Arrastrar y soltar**
1. Entra en <https://app.netlify.com/drop>.
2. Arrastra la carpeta `ecocracia` completa.
3. Netlify publica el juego y te da una URL pública.

**Opción B · Desde un repositorio Git (GitHub, GitLab…)**
1. Sube la carpeta a un repositorio.
2. En Netlify: *Add new site → Import an existing project* y elige el repositorio.
3. Deja **Build command** vacío y pon **Publish directory** en `.` (ya viene así en `netlify.toml`).
4. Pulsa *Deploy*.

**Opción C · Netlify CLI**

```bash
npm install -g netlify-cli
```

```bash
netlify deploy --prod --dir .
```

---

## 🧪 Pruebas

**Simulación de equilibrio** (requiere Node.js 16 o superior). Juega cientos de años con distintas estrategias automáticas y comprueba que solo la equilibrada gana:

```bash
node tests/simulacion.js 20
```

**Prueba completa en navegador** (requiere [Playwright](https://playwright.dev) y un servidor local en marcha). Recorre el menú, el tutorial, la construcción, los paneles, el gobierno, los acontecimientos, el guardado y la carga, la derrota, la victoria y la versión móvil:

```bash
node tests/prueba-navegador.js http://localhost:8080
```

---

## 💾 Guardado

- **Autoguardado** tras cada acción y al final de cada año.
- **3 ranuras manuales** desde el botón 💾.
- **Cargar** desde el menú principal o desde el botón 📂.
- Siempre se pide **confirmación** antes de sobrescribir o borrar una partida.
- Los datos se guardan en el `localStorage` del navegador, así que persisten al cerrarlo (salvo en modo incógnito).

---

## 🌍 Créditos

Proyecto educativo individual sobre los Objetivos de Desarrollo Sostenible.
Los ODS y sus colores pertenecen a las Naciones Unidas y se usan aquí con fines exclusivamente educativos. La región, sus pueblos y sus acontecimientos son ficticios. Tipografías: Cinzel y Nunito (Google Fonts). Los iconos son emoji del sistema y el mapa se dibuja en SVG.
