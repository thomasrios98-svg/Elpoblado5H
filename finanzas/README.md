# Finanzas · El Poblado 5H

Sistema financiero web para El Poblado 5H: control de ingresos, gastos, saldos,
rentabilidad y análisis mediante IA para las tres unidades (Apto 5H, Kichi y
Yamaha). Es una app independiente del sitio de reservas (raíz del repo).

Todos los montos son en USD. No tiene login, calendario, módulo de clientes,
deudas, metas, modo oscuro, auditoría, backups manuales, búsqueda por texto ni
notificaciones externas — por diseño.

## Stack

- **Frontend**: React + Vite, React Router (`HashRouter`, para no depender de
  reglas de rewrite del hosting), Recharts (gráficos), ExcelJS + jsPDF
  (exportación de reportes).
- **Datos**: Firebase Firestore, en tiempo real (`onSnapshot`), sin
  autenticación (según especificación). Las reglas de Firestore validan la
  forma de los datos pero no distinguen usuarios — ver advertencia en
  `firestore.rules`.
- **Asistente IA**: Cloud Function (`functions/index.js`) que actúa como proxy
  hacia la API de Anthropic (Claude). La clave de API nunca llega al
  navegador; el cliente solo envía la pregunta y un resumen de los datos
  financieros ya calculados.

## Estructura

```
finanzas/
  src/
    lib/           cálculos financieros, constantes, detección de recurrentes,
                    exportación a Excel/PDF, formato
    context/        DataContext.jsx (listeners de Firestore + CRUD)
    components/     Layout, formularios y piezas reutilizables
    pages/          Dashboard, Movimientos, Saldos, Rentabilidad,
                    Estadísticas, Recurrentes, Asistente IA, Reportes
  functions/        Cloud Function `financialAssistant` (proxy IA)
  firestore.rules
  firebase.json
```

## 1. Crear el proyecto de Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y
   crea un proyecto nuevo (plan Blaze, necesario para llamar a Cloud
   Functions a una API externa).
2. Activa **Firestore Database** (modo producción, cualquier región).
3. En **Configuración del proyecto → General → Tus apps**, crea una app web y
   copia el objeto `firebaseConfig`.
4. Copia `.env.example` a `.env` y pega esos valores:

   ```
   cp .env.example .env
   ```

5. Instala [firebase-tools](https://firebase.google.com/docs/cli) si no lo
   tienes (`npm install -g firebase-tools`), inicia sesión (`firebase login`)
   y reemplaza el project id en `.firebaserc`.

## 2. Instalar dependencias

```
npm install
cd functions && npm install && cd ..
```

## 3. Desarrollo local

```
npm run dev
```

Con `.env` apuntando a tu proyecto real de Firebase, la app lee y escribe en
Firestore en tiempo real. Todo empieza en $0 (sin movimientos ni transferencias
iniciales) tal como lo pide el diseño.

## 4. Desplegar reglas de Firestore

```
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Configurar y desplegar el Asistente IA

La función usa un **secret** de Firebase (nunca queda en el código ni en el
navegador):

```
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Pega tu clave de la API de Anthropic cuando la pida. El modelo usado por
defecto es `claude-sonnet-5`; si quieres cambiarlo sin tocar código, crea
`functions/.env` (no se sube a git) con:

```
ANTHROPIC_MODEL=otro-modelo-id
```

Luego despliega la función:

```
firebase deploy --only functions
```

La función `financialAssistant` es de **solo lectura**: recibe la pregunta y
un resumen de tus datos financieros ya calculado en el navegador, llama a
Claude con instrucciones estrictas (no proyecciones, no modifica nada) y
devuelve la respuesta. Nunca escribe en Firestore.

## 6. Build y despliegue del sitio

```
npm run build
firebase deploy --only hosting
```

O sirve `dist/` en cualquier hosting estático (Netlify, Vercel, Firebase
Hosting, etc.) — es una SPA con `HashRouter`, así que no necesita reglas de
rewrite especiales.

## Notas de seguridad

- **Sin login** es un requisito explícito del producto. Esto significa que
  cualquier persona con la configuración de Firebase del proyecto (los
  valores de `firebaseConfig`, que no son secretos por diseño de Firebase)
  puede leer y escribir en Firestore, sujeto solo a las validaciones de forma
  en `firestore.rules`. Si más adelante se quiere restringir el acceso, la
  opción más simple es activar **Firebase App Check** o agregar
  autenticación (aunque esto último contradice el requisito actual).
- La clave de la API de Anthropic vive solo como *secret* de Cloud Functions
  y nunca se expone al navegador.

## Módulo de Recurrentes

La detección de gastos recurrentes es un heurístico local (agrupa por
descripción + categoría + unidad, cadencia ~mensual, montos similares) — no
usa IA externa ni crea nada automáticamente. Las decisiones de "confirmar" o
"ignorar" un patrón se guardan en la colección `recurringPatterns`.

## Reparto de gastos generales

Los gastos marcados como **generales** se dividen en partes iguales (⅓ + ⅓ +
⅓) entre Apto 5H, Kichi y Yamaha al calcular la rentabilidad de cada unidad.
Los gastos **individuales** solo afectan a la unidad seleccionada.

## Estado de esta entrega

El código quedó verificado con `npm run build` y `npm run lint` (sin errores)
y con pruebas de renderizado de todas las rutas. No se pudo hacer una prueba
end-to-end con datos reales porque este entorno no tiene un proyecto de
Firebase propio: sigue los pasos 1–5 de arriba con tus propias credenciales
para dejarlo funcionando por completo.
