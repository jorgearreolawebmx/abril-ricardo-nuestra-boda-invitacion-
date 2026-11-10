# Galería infinita: análisis, arquitectura y configuración

## 1. Análisis del video de referencia

Se extrajeron fotogramas a lo largo de los 36 segundos de grabación (1910 × 902 px), a 1 fotograma por segundo y en secuencias de 4–5 por segundo en los tramos de movimiento. El video no muestra cursor ni entrada del usuario, así que lo que sigue distingue **lo observado** de **lo inferido**.

| # | Pregunta | Resultado |
|---|----------|-----------|
| 1 | Distribución inicial | **Observado.** Muchas fotografías sueltas, sin cuadrícula ni columnas, repartidas por toda la pantalla. Algunas quedan cortadas por los bordes. Hay zonas más densas y otras más vacías. |
| 2 | Tamaño respecto a la pantalla | **Observado.** Desde ~40 px hasta ~365 px de ancho (menos del 20 % del ancho de pantalla). Ninguna ocupa la pantalla completa. |
| 3 | Tamaños, escalas y rotaciones | **Observado.** Tamaños muy distintos, proporciones originales respetadas. **No hay rotaciones**: todas están rectas. |
| 4 | Arrastre | **Observado.** El espacio se desplaza en cualquier dirección. Las fotos grandes se mueven más rápido que las pequeñas (**paralaje**), lo que indica un espacio con profundidad real, no un plano 2D. |
| 5 | Desplazamiento vertical/horizontal | **Observado.** Libre en ambos ejes, sin límites visibles. |
| 6 | Rueda del mouse | **Inferido.** El video no muestra cursor ni entrada del usuario. La referencia lleva la etiqueta `#SCROLL`, y por el modelo con profundidad lo coherente es que la rueda avance y retroceda en profundidad. Así está implementado. |
| 7 | Zoom | **No determinable.** No se ve un zoom independiente. El acercamiento aparece como avance en profundidad. Se añadió además un zoom de campo visual con límites (Ctrl + rueda, teclas `+`/`-`) por requerimiento del proyecto. |
| 8 | Inercia | **Observado.** El movimiento continúa y se frena progresivamente. Los valores de fricción se calibraron a ojo, no se pueden medir con precisión desde el video. |
| 9 | Acercarse, alejarse, cambiar de tamaño | **Observado.** Las fotos crecen al acercarse y se encogen al alejarse según la perspectiva. |
| 10 | Aparición y desaparición | **Observado.** Las fotos lejanas se ven como siluetas muy tenues (niebla) y ganan nitidez al acercarse. Las que se acercan demasiado también se desvanecen. No hay "pop" brusco. |
| 11 | Selección de una foto | **No determinable.** No se observa clic ni visor. El visor ampliado es un requerimiento del proyecto y se diseñó como propuesta coherente. |
| 12 | Animaciones y transiciones | **Observado.** Solo movimiento continuo de cámara y desvanecimiento por distancia. |
| 13 | Pantallas de distintos tamaños | **Inferido.** Se mantiene la misma escena, con más o menos fotos visibles según el área. Se implementó escalando el campo visual con el tamaño de pantalla. |

**Interfaz observada:** un título grande y fijo al centro, que queda **por encima** de las fotos (en la referencia cambia de color según lo que haya detrás), y pequeños textos en las cuatro esquinas. Aquí se conserva el título fijo central (configurable) y solo una breve sugerencia de uso que desaparece al primer gesto. No se reproducen los textos de las esquinas porque no tienen función en este proyecto.

## 2. Arquitectura

### Por qué Canvas 2D y no WebGL

La referencia parece construida con WebGL. Aquí se usa **Canvas 2D con proyección en perspectiva propia**, porque bajo `file://` (doble clic) los navegadores marcan las imágenes locales como de origen distinto y **WebGL se niega a usarlas como texturas**. Canvas 2D sí las dibuja. El resultado visual es el mismo (planos con perspectiva y niebla) y no necesita librerías, servidor ni CDN.

### Modelo del espacio

- **Espacio 3D infinito dividido en sectores (chunks)** de `chunkSize` unidades.
- Cada sector se genera **de forma determinista** a partir de `seed` y sus coordenadas. Dentro de cada sector hay una rejilla `grid` (por defecto 3×3×2) con **una foto por celda y posición aleatoria dentro de la celda**. Esto da aspecto orgánico sin grandes huecos.
- Cada foto se asigna con una "baraja" por sector para que no se repitan fotos vecinas.
- Solo se generan y dibujan los sectores que caen dentro del campo visual y la niebla. Los sectores lejanos se descartan de la memoria.
- La **cámara** tiene posición `(x, y, z)`. El avance es ilimitado en las tres direcciones.

### Proyección y niebla

Para cada foto: `escala = focal / profundidad`. La opacidad es 1 en la zona media, baja hasta 0 entre `fogStart` y `fogEnd` (lejos) y entre `nearFade` y `near` (muy cerca). Se dibuja de lejos a cerca.

Las fotos se convierten al inicio en una **pirámide de miniaturas** (mipmaps) para evitar el aspecto granulado de reducir una foto grande a 40 px.

### Movimiento

- **Arrastre:** mueve la cámara en X/Y. La profundidad `dragDepth` es la que sigue al cursor 1:1. Lo más cercano se mueve más rápido y lo lejano más lento.
- **Suavizado:** la cámara persigue un objetivo con amortiguación exponencial (no copia el cursor de golpe).
- **Inercia:** al soltar se toma la velocidad de los últimos ~110 ms y decae con `friction`. Si el usuario se detiene antes de soltar, no hay inercia.
- **Rueda:** aplica un impulso de avance en Z que decae con `wheelFriction`.
- **Ctrl + rueda, `+`/`-`:** zoom del campo visual con límites `zoom.min`/`zoom.max`, anclado al cursor.
- **Táctil:** un dedo arrastra, dos dedos pellizcan (separar = avanzar, juntar = retroceder) y mueven a la vez. Se usa `touch-action: none` para que el navegador no haga scroll ni zoom de página.

### Visor ampliado

Capa DOM sobre el lienzo. La foto "viaja" desde su posición en el espacio hasta el centro (y regresa al cerrar). Respeta proporciones y se adapta a pantalla vertical. Mientras está abierto, el lienzo ignora gestos. Cierra con `Esc`, botón, o clic/toque fuera de la foto. Navega con flechas, botones o deslizando (táctil).

## 3. Configuración

El motor no contiene datos propios. Cada invitación define su configuración y llama a:

```js
var g = initInfiniteGallery(document.getElementById('galeria'), configuracion);
```

Solo se necesita `photos`; todo lo demás tiene un valor por defecto.

| Opción | Por defecto | Qué hace |
|--------|-------------|----------|
| `seed` | `'galeria'` | Cambia la distribución de fotos. Otra semilla = otra composición. |
| `photos` | `[]` | Lista de rutas o de objetos `{src, full, alt, scale}`. `scale` agranda o reduce esa foto; `full` es una versión de mayor calidad para el visor. |
| `background.src` | `''` | Fotografía de fondo (cubre toda la pantalla). |
| `background.position` | `'50% 50%'` | Encuadre del fondo. Útil para cuidar rostros en horizontal. |
| `background.shade` | `0.16` | Oscurecimiento sutil, de 0 a 1. |
| `texts.title` | `''` | Título fijo central. Vacío = sin título. |
| `texts.hintMouse` / `hintTouch` | español | Sugerencia inicial. |
| `space.grid` | `[3,3,2]` | Densidad: celdas por sector. Más celdas = más fotos. |
| `space.chunkSize` | `30` | Tamaño de cada sector. |
| `space.minSize` / `maxSize` | `1.7` / `5.8` | Rango de tamaños de las fotos. |
| `space.sizeBias` | `1.7` | Mayor valor = más fotos pequeñas que grandes. |
| `space.fogStart` / `fogEnd` | `27` / `70` | Dónde empieza y termina la niebla. |
| `space.start` | `{x:0,y:0,z:0}` | Posición inicial de la cámara. |
| `camera.focal` | `1.1` | Campo visual general. |
| `camera.dragDepth` | `20` | Sensibilidad del arrastre. |
| `camera.smoothing` | `13` | Suavidad de seguimiento. |
| `camera.friction` | `2.5` | Mayor = la inercia se detiene antes. |
| `camera.inertia` | `1` | 0 = sin inercia; 1 = normal; 1.5 = más impulso. |
| `camera.wheelSpeed` | `0.2` | Intensidad de la rueda. |
| `camera.invertWheel` | `false` | Invierte el sentido de la rueda. |
| `zoom.min` / `zoom.max` | `0.65` / `2.2` | Límites del zoom. |
| `hover.scale` | `1.045` | Cuánto crece la foto al pasar el cursor. |
| `shadow` | `'auto'` | Sombra bajo fotos grandes (`auto` = solo con mouse). |
| `viewer.enabled` | `true` | Activa o desactiva el visor. |
| `viewer.scrim` | `0.88` | Opacidad del fondo del visor. |
| `viewer.maxWidth` / `maxHeight` | `0.88` / `0.84` | Fracción de pantalla que ocupa la foto ampliada. |
| `intro` | `true` | Entrada inicial (las fotos emergen de la niebla). |
| `maxTextureSize` | `1280` | Resolución máxima en memoria. Bájala (ej. 1024) para móviles modestos. |
| `maxDPR` | `2` | Límite de densidad de píxeles del lienzo. |

### Ejemplo para otra invitación

```html
<link rel="stylesheet" href="css/infinite-gallery.css">
<div id="galeria" style="position:fixed; inset:0"></div>
<script src="js/infinite-gallery.js"></script>
<script>
  initInfiniteGallery(document.getElementById('galeria'), {
    seed: 'mis-xv-nicole',
    background: { src: 'img/fondo.jpg', position: '50% 30%' },
    photos: ['img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg', 'img/5.jpg'],
    texts: { title: 'Mis XV Años' },
    camera: { inertia: 1.2 }
  });
</script>
```

Funciona en cualquier contenedor (no solo pantalla completa) y se pueden tener varias galerías en una página. Se adapta si el contenedor cambia de tamaño.

### API devuelta

`open(i)`, `close()`, `next()`, `prev()`, `setZoom(z)`, `resize()`, `count()`, `destroy()`.

## 4. Pruebas realizadas (Chromium, desde `file://`)

- Carga con doble clic: fondo a pantalla completa, 13 fotos, indicador de carga desaparece, sin errores en consola.
- Arrastre horizontal y vertical, con inercia que decae hasta cero.
- Rueda: avance y retroceso. Ctrl + rueda: zoom limitado entre 0.65 y 2.2.
- Espacio infinito: recorridos de más de 2 500 unidades en profundidad, −1 355 hacia atrás y cientos lateralmente, siempre con 56–70 fotos visibles y memoria acotada.
- Hover (cursor y realce), clic, visor, navegación, cierre con `Esc`, botón y clic fuera. El lienzo no se mueve con el visor abierto.
- Móvil (390 × 844, táctil): arrastre con inercia, pellizco, toque, deslizamiento en el visor, sin scroll ni zoom de página.
- Cambio de tamaño de ventana y tableta vertical.

## 5. Limitaciones conocidas

- La foto de fondo es de 1080 × 1350 px. En pantallas grandes horizontales se amplía bastante y pierde nitidez. Con una versión de mayor resolución se verá mejor.
- Se usa una tipografía serif del sistema (Palatino/Georgia). Si se desea otra, hay que incluir el archivo de fuente en el proyecto, no un CDN.
- La rueda como avance en profundidad es una inferencia (ver tabla, punto 6).
