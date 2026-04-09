# Documentación Técnica: Formulario Técnico (WIN)

Este documento centraliza la información arquitectónica, flujos de estado y lógicas de datos de la plataforma técnica "Formulario Técnico", diseñada para uso en campo. La aplicación está construida sobre **React** (Vite) utilizando un patrón estructurado de uniones parentales para modelar Topologías de Red MESH y Fibra Óptica.

---

## 🏗️ 1. Arquitectura y Escalabilidad

El proyecto sigue una estructura base React SPA (Single Page Application) enfocada en componentes funcionales. 
La estructura principal transita la data por **Lifting State Up**, lo que significa que el estado global reside en un componente padre (Dashboard Instanciador) y baña por cascada a los componentes especializados.

```text
src/
├── components/
│   ├── features/
│   │   ├── TopologiaRed.jsx          // Dibuja el grafo jerárquico recursivamente
│   │   ├── FormularioMediciones.jsx  // Grid de datos en modo Edición / Lectura (Lock)
│   │   └── ...css                    // Estilos encapsulados incompatibles (ej. line-gradients vs html2canvas) resueltos
│   ├── layout/                       // Navbars y Footers decorativos
│   └── ui/                           // Componentes atómicos (Cards, Inputs, Buttons)
├── pages/
│   ├── Login.jsx                     // Pantalla 0: Accesibilidad
│   ├── BuscadorCliente.jsx           // Pantalla 1: Falsificador de Auth, enruteador e instanciador `tipoVivienda`
│   └── DashboardInstalacion.jsx      // Pantalla 2 (Core): El cerebro central que amalgama Estados.
└── utils/
    └── constants.js                  // Diccionarios estáticos (UBICACIONES, LEYENDA RSSI)
```

---

## 🧠 2. Gestión de Estados (State Management)

No se utiliza Redux ni Context API. El componente `DashboardInstalacion.jsx` funge como cerebro controlador. Gestiona tres estados vitales y los transmite vía `Props`:

1.  `equipos`: Array de objetos que define todos los nodos físicos que existen (La ONT y los Access Points MESH).
2.  `mediciones`: Array que lleva el registro de los ambientes medidos. Se relaciona asíncronamente con un id de la lista de `equipos` marcándolo como su "padre emisor".
3.  `listaUbicaciones`: Diccionario precargado con ubicaciones por defecto ("Sala", "Baño"). Su naturaleza dinámica permite que si un técnico teclea un ambiente *manual*, este se agregue globalmente sirviendo como opción nativa para el siguiente equipo creado.

---

## 🛠️ 3. Lógicas del Negocio Críticas

### 3.1. Recursividad en la Topología MESH (Grafo Visual)
El componente `TopologiaRed` modela el gráfico de conexiones físicas emulando un *Árbol DOM*.
La función clave `renderArbol(parentId)` escanea el array de `<equipos>` encontrando a los hijos de la raíz (ONT). Luego, para cada hijo dibuja su nodo y vuelve a ejecutar *dentro de sí misma* `renderArbol(hijo.id)`. Esto produce profundidad infinita para graficar NAPs anidados a NAPs.

### 3.2 El Motor de Análisis CSV (Relacional)
El mayor desafío criptográfico del proyecto reside en la exportación CSV ubicada en `handleExportCSV()` (en `DashboardInstalacion`). 
Dado que el requerimiento de negocio exige indicar en una tabla plana conceptos como *"Quién es tu ancestro"* y *"Qué calidad Backhaul tiene tu enlace"*, la iteración hace lo siguiente por cada `m` (Medición):
1.  Busca a su "Padre" (El AP al que el celular se vinculó para hacer la prueba) en el array de `equipos`.
2.  Busca a su "Abuelo" (El nodo al que dicho AP está conectado, o si es la matriz).
3.  Imprime la `conexión Padre-Abuelo` para reportar si la cadena fue Inalámbrica o FO, calculando los puntajes RSSI arrastrados, inyectando todo envuelto en comillas y separándolo nativamente por comas `(,)`.

### 3.3 Bloqueadores Numéricos (Sanitization)
Los flujos preveen errores humamos de campo mediante Event Listeners en el `onChange`:
*   Para evitar caídas de validación posterior, el **Piso** intercepta números menores a 1 extirpándolos mediante Regex `\D`.
*   El **RSSI (Sensibilidad de dBm)** siempre es purgado y auto-multiplicado por negativo (`-`). De esta forma si el operador escribe `50`, el teclado reacciona incrustando `-50`.

### 3.4. Exportador de Canvas Estricto (PDF)
Para permitir que la topología se extraiga a un PDF, la herramienta recurre a un Screenshot local empleando `html2canvas`. 
Se utiliza la clase de utilidad `.exporting-hide`. Minutos antes del *screenshot*, un delay esconde basureros (botones Eliminar y Agregar), el canvas tira el destello (capturando un árbol estético con lineas punteadas nativas compatibles) y devuelve a pintar los botones de interactividad.
