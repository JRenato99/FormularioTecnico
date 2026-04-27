# Documentación Técnica Completa: Formulario Técnico WIN

Esta documentación está diseñada para ayudar a ingenieros de sistemas o desarrolladores a comprender, modificar y escalar la aplicación web "Formulario Técnico" de WIN. 

La aplicación es una Single Page Application (SPA) construida en React usando Vite, enfocada en recopilar información técnica de la instalación en campo de clientes de fibra óptica y redes MESH, sin depender (temporalmente) de un backend activo, operando puramente sobre Caché Local (`localStorage`).

---

## 1. Arquitectura del Proyecto

El proyecto sigue un patrón de diseño basado en componentes funcionales de React, organizados lógicamente por su propósito:

```text
src/
├── components/
│   ├── features/          // Módulos centrales (Topología, Mediciones, Winbox, Wintv)
│   ├── layout/            // Estructuras persistentes (Header, ProtectedRoute)
│   └── ui/                // Componentes atómicos reutilizables (Botones, Inputs, Cards)
├── pages/
│   ├── Login.jsx                 // (Pantalla 0) Autenticación y Captcha
│   ├── BuscadorCliente.jsx       // (Pantalla 1) Búsqueda, historial y enrutamiento
│   ├── FormularioTecnico.jsx     // (Pantalla 2 - CORE) Contenedor Maestro y Manejo Global del Estado
│   └── PanelAdmin.jsx            // (Pantalla 3) Panel para supervisores
├── utils/
│   └── constants.js       // Archivo de constantes (Leyenda RSSI, Ubicaciones base)
├── App.jsx                // Definición del Router (HashRouter) y protección de rutas
└── main.jsx               // Punto de entrada de la aplicación
```

---

## 2. Gestión del Estado (State Management)

La aplicación utiliza un patrón de **Lifting State Up** en lugar de gestores globales complejos como Redux.

El "Cerebro" de la aplicación es `FormularioTecnico.jsx`. Este componente mantiene en su estado interno toda la data que los componentes hijos manipulan:
*   `equipos`: Nodos físicos (ONT y APs MESH).
*   `mediciones`: Evaluaciones de señal por ambiente.
*   `winboxes` y `televisores`: Inventario de servicios adicionales.
*   `listaUbicaciones`: Diccionario dinámico de ambientes.

Estos estados y sus setters (`setEquipos`, `setMediciones`) son pasados como **Props** a los componentes de `features/`. Cuando un hijo modifica un dato, el componente padre (Dashboard) se vuelve a renderizar, y por consiguiente, todos los hijos reciben la data actualizada.

### Almacenamiento Persistente (Caché Local)
Al no existir base de datos, el flujo depende de `localStorage`.
*   `win_session`: Guarda el token/datos del usuario logueado (Rol, Correo, Cuadrilla).
*   `win_orders`: Guarda el arreglo gigante de todas las órdenes trabajadas.
Cada vez que el estado cambia en `FormularioTecnico.jsx`, un `useEffect` escucha y autoguarda silenciosamente la orden dentro de `win_orders`.

---

## 3. Análisis de Componentes Clave (Cómo editar el código)

### A. Login y Ruteo (`Login.jsx`, `BuscadorCliente.jsx`)
*   **Modificaciones en Auth:** Si conectas una API real para el login, el cambio se hace en la función `handleLogin` de `Login.jsx`. Reemplaza la lógica mock por un `fetch/axios`, espera el JWT y guárdalo en `localStorage`.
*   **Búsqueda:** `BuscadorCliente.jsx` simula una respuesta del servidor en `handleBuscar`. Para integrar una API de clientes, aquí se debe realizar la petición enviando el `codigo`.

### B. El Grafo de Topología (`TopologiaRed.jsx`)
Este es el componente más complejo visualmente. Funciona recursivamente:
*   La función `renderArbol(parentId)` escanea el array de equipos para encontrar los hijos del ID pasado, los dibuja, y dentro de cada hijo, se llama a sí misma `renderArbol(hijo.id)`.
*   **Para modificar la lógica MESH:** Si necesitas agregar nuevos tipos de conexión, modifica el array `initialApState`, y ajusta cómo `renderArbol` asigna las clases CSS `line-fo`, `line-5g` en base a la conexión y banda.

### C. Sistema de Bloqueo de Formularios (`FormularioMediciones.jsx` y similares)
*   **Lógica de IsSaved:** Cada objeto en la grilla tiene un boolean `isSaved`. Si es falso, los inputs se muestran como editables. Si el técnico da clic a "Guardar", se pasa a `true` y el form se bloquea.
*   **Sanitización (Regex):** En estos formularios hay funciones como `handlePisoChange` o `handleRssiChange` que usan expresiones regulares para evitar que el usuario tipee letras en lugar de números. 
*   **¿Cómo añadir un nuevo campo?** 
    1. Agrega el campo al objeto inicial `nuevaMedicion`.
    2. Crea el `<Input>` respectivo en la UI.
    3. Asegúrate de añadir el campo al sistema de exportación CSV en `FormularioTecnico.jsx`.

### D. Exportador CSV y PDF (`FormularioTecnico.jsx`)
*   **El PDF:** Emplea `html2canvas` para tomar una foto del DOM. La clase `.exporting-hide` es crucial: oculta botones como "Eliminar" justo 100ms antes de la captura.
*   **El CSV (Motor Relacional):** `generateCSVContent()` realiza joins iterativos. Por cada medición, busca a su equipo `parent` usando `m.equipoId === e.id`, y a su `grandparent` para armar la lógica MESH relacional exigida en un CSV plano. Si necesitas exportar una nueva columna, añade el Header y empuja el dato al mapeo del Array.

### E. Panel de Administración (`PanelAdmin.jsx`)
*   Actúa como un CRUD básico leyendo `win_orders` filtrando por el campo `status` ('EN PROCESO', 'ENVIADO', 'APROBADO', 'RECHAZADO').
*   Incluye un mockup de control de usuarios.

---

## 4. Guía de Integración Futura a Backend (Siguientes Pasos)

Para migrar esta aplicación a Producción Real con Backend (Node.js/Python):

1.  **Reemplazar LocalStorage por API Calls:**
    *   Sustituir las lecturas de `localStorage.getItem('win_orders')` por un Context API, Redux Thunk o React Query que llame a `GET /api/orders`.
2.  **Modificar el Autoguardado:**
    *   En `FormularioTecnico.jsx`, el `useEffect` de autoguardado debe enviar una petición `PATCH /api/orders/:id` implementando un *Debounce* de 2 segundos para no ahogar al servidor.
3.  **Subida de Archivos:**
    *   El PDF autogenerado con `jsPDF` puede enviarse al servidor obteniendo su Blob (`pdf.output('blob')`) e insertándolo en un `FormData`.
4.  **Gestión de JWT:**
    *   `ProtectedRoute.jsx` debe validar el JWT real decodificándolo, en lugar de validar un rol en texto plano.
