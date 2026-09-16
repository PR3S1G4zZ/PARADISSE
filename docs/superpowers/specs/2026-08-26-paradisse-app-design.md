# PARADISSE APP — diseño técnico

## Propósito

Convertir el diseño de Figma de PARADISSE APP en una aplicación web React +
TypeScript funcional. No será un prototipo estático: las pantallas conservarán
sus recorridos y manejarán estado local persistente hasta que exista una API.

## Alcance inicial

La primera versión cubre las pantallas identificadas en Figma:

- Inicio y presentación del Suroeste Antioqueño.
- Nosotros.
- Destinos y catálogo de municipios.
- Fichas de municipios: Jardín, Andes, Urrao, Concordia, Jericó y Támesis.
- Guías y categorías de Jardín: cultura e historia, y gastronomía.
- Registro, inicio de sesión y método de pago.

Las rutas internas, los formularios, la selección de destinos, favoritos,
planificación de visita y el checkout serán interactivos. La autenticación y
el pago se simularán localmente: no se enviarán credenciales ni se procesarán
cobros reales.

## Arquitectura

```text
App shell
├── routes
│   ├── public: inicio, nosotros, destinos, municipio, guía
│   └── access: registro, inicio de sesión, pago
├── features
│   ├── destinations: catálogo, detalle y plan de visita
│   ├── guides: cultura y gastronomía
│   ├── auth: sesión y registro local
│   └── checkout: resumen y confirmación local
├── shared
│   ├── ui: navegación, tarjeta, botón, campo y pie de página
│   ├── layout: contenedores y secciones reutilizables
│   └── lib: validación, rutas y almacenamiento
└── data
    ├── municipalities
    └── guides
```

Cada dominio expone su propia interfaz pública. Las pantallas sólo componen
esas piezas; no leerán ni escribirán directamente `localStorage`.

## Datos y persistencia

Los datos editoriales se modelarán con tipos `Municipality`, `Experience` y
`Guide`. Los datos de interacción estarán detrás de un repositorio:

- `session`: usuario local autenticado.
- `favorites`: identificadores de destinos guardados.
- `visitPlan`: municipios y experiencias seleccionadas.
- `checkout`: método seleccionado y confirmación local.

El repositorio se implementará inicialmente con `localStorage`. Su contrato
asíncrono permitirá sustituirlo por un cliente HTTP sin reescribir las
pantallas.

## Recorridos

1. Inicio muestra el contexto regional, los municipios destacados y el mapa.
2. Destinos filtra y abre la ficha de un municipio.
3. La ficha abre guías por categoría y permite añadir experiencias al plan.
4. El plan dirige al registro o inicio de sesión cuando no hay sesión.
5. Con sesión, el usuario confirma el método de pago y recibe una confirmación
   local de reserva/plan.

## Diseño visual y responsive

La implementación traduce la identidad observada en Figma: fotografías de
destinos, superposiciones oscuras, oliva/dorado, tipografía Montserrat,
tarjetas con bordes redondeados, cabecera y pie de página compartidos. Los
tokens CSS centralizan color, tipografía, espaciado, radios y sombras.

Las vistas pasarán de rejillas de escritorio a una columna en móvil, con una
navegación accesible. No se conservarán coordenadas absolutas del export de
Figma: el layout se realizará con grid y flex para que responda al contenido y
crezca de forma horizontal.

## Errores y límites

- Los formularios validan campos requeridos, correo y contraseña antes de
  persistir.
- Acciones de pago serán explícitamente locales y no representarán un cobro.
- Rutas inválidas mostrarán una pantalla de recuperación.
- El repositorio local tolerará JSON dañado restaurando el valor por defecto.

## Verificación

- Pruebas unitarias de validación y repositorios locales.
- Pruebas de integración para sesión, plan de visita y checkout local.
- Pruebas de rutas para los destinos y guías principales.
- Build de producción y comprobación manual responsive de Inicio, Destinos,
  detalle de municipio, Registro, Inicio de sesión y Pago.

## Decisiones

| Decisión | Motivo |
| --- | --- |
| React + TypeScript | Requisito del proyecto y contratos seguros. |
| CSS propio con tokens | El repositorio no tiene stack existente; evita introducir Tailwind sin necesidad. |
| Datos tipados por dominio | Añadir municipios y guías será principalmente añadir contenido, no copiar pantallas. |
| Persistencia local aislada | Hace funcional la experiencia ahora y permite conectar APIs después. |
