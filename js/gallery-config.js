/* Galería de Abril y Ricardo — fotografías originales proporcionadas por los novios.
   La fotografía 04 también es la portada; aparece aquí como parte del recorrido infinito. */
window.ABRIL_RICARDO_GALLERY_CONFIG = {
  seed: 'abril-ricardo-2027-real-photos',
  background: {
    src: 'assets/pareja-portada.webp',
    position: '50% 50%',
    shade: 0.34,
    color: '#e9dfd0'
  },
  photos: [
    { src: 'assets/galeria-01.webp', alt: 'Abril y Ricardo — retrato en blanco y negro', scale: 1.02 },
    { src: 'assets/galeria-02.webp', alt: 'Abril y Ricardo — retrato juntos', scale: 1.00 },
    { src: 'assets/galeria-03.webp', alt: 'Ricardo — retrato de boda en blanco y negro', scale: 1.02 },
    { src: 'assets/galeria-04.webp', alt: 'Abril y Ricardo — beso bajo el arco de cantera', scale: 1.08 },
    { src: 'assets/galeria-05.webp', alt: 'Abril y Ricardo — paseo por la ciudad', scale: 1.00 },
    { src: 'assets/galeria-06.webp', alt: 'Abril y Ricardo — mirada y abrazo', scale: 1.00 },
    { src: 'assets/galeria-07.webp', alt: 'Abril y Ricardo — detalle del anillo', scale: 1.00 },
    { src: 'assets/galeria-08.webp', alt: 'Abril y Ricardo — retrato vertical', scale: 1.05 },
    { src: 'assets/galeria-09.webp', alt: 'Abril y Ricardo — momento de boda', scale: 1.02 },
    { src: 'assets/galeria-10.webp', alt: 'Abril y Ricardo — sesión entre flores', scale: 1.00 },
    { src: 'assets/galeria-11.webp', alt: 'Abril y Ricardo — sesión en el campo', scale: 1.02 },
    { src: 'assets/galeria-12.webp', alt: 'Abril y Ricardo — abrazo entre los pastos', scale: 1.00 },
    { src: 'assets/galeria-13.webp', alt: 'Abril y Ricardo — retrato de pareja', scale: 1.04 },
    { src: 'assets/galeria-extra-01.webp', alt: 'Abril y Ricardo — fotografía adicional 01', scale: 1.0 },
    { src: 'assets/galeria-extra-02.webp', alt: 'Abril y Ricardo — fotografía adicional 02', scale: 1.0 },
    { src: 'assets/galeria-extra-03.webp', alt: 'Abril y Ricardo — fotografía adicional 03', scale: 1.0 },
    { src: 'assets/galeria-extra-04.webp', alt: 'Abril y Ricardo — fotografía adicional 04', scale: 1.0 },
    { src: 'assets/galeria-extra-05.webp', alt: 'Abril y Ricardo — fotografía adicional 05', scale: 1.0 },
    { src: 'assets/galeria-extra-06.webp', alt: 'Abril y Ricardo — fotografía adicional 06', scale: 1.0 },
    { src: 'assets/galeria-extra-07.webp', alt: 'Abril y Ricardo — fotografía adicional 07', scale: 1.0 },
    { src: 'assets/galeria-extra-08.webp', alt: 'Abril y Ricardo — fotografía adicional 08', scale: 1.0 },
    { src: 'assets/galeria-extra-09.webp', alt: 'Abril y Ricardo — fotografía adicional 09', scale: 1.0 },
    { src: 'assets/galeria-extra-10.webp', alt: 'Abril y Ricardo — fotografía adicional 10', scale: 1.0 },
    { src: 'assets/galeria-extra-11.webp', alt: 'Abril y Ricardo — fotografía adicional 11', scale: 1.0 },
    { src: 'assets/galeria-extra-12.webp', alt: 'Abril y Ricardo — fotografía adicional 12', scale: 1.0 },
    { src: 'assets/galeria-extra-13.webp', alt: 'Abril y Ricardo — fotografía adicional 13', scale: 1.0 },
    { src: 'assets/galeria-extra-14.webp', alt: 'Abril y Ricardo — fotografía adicional 14', scale: 1.0 },
    { src: 'assets/galeria-extra-15.webp', alt: 'Abril y Ricardo — fotografía adicional 15', scale: 1.0 },
    { src: 'assets/galeria-extra-16.webp', alt: 'Abril y Ricardo — fotografía adicional 16', scale: 1.0 },
    { src: 'assets/galeria-extra-17.webp', alt: 'Abril y Ricardo — fotografía adicional 17', scale: 1.0 },
    { src: 'assets/galeria-extra-18.webp', alt: 'Abril y Ricardo — fotografía adicional 18', scale: 1.0 },
    { src: 'assets/galeria-extra-19.webp', alt: 'Abril y Ricardo — fotografía adicional 19', scale: 1.0 },
    { src: 'assets/galeria-extra-20.webp', alt: 'Abril y Ricardo — fotografía adicional 20', scale: 1.0 }
  ],
  texts: {
    title: 'Nuestra galería infinita como nuestro amor',
    hintMouse: 'Arrastra para recorrer. Usa la rueda para acercarte.',
    hintTouch: 'Desliza para recorrer. Pellizca para acercarte.',
    close: 'Cerrar',
    prev: 'Fotografía anterior',
    next: 'Fotografía siguiente',
    error: 'No se pudieron cargar las fotografías de la galería.',
    region: 'Galería infinita de Abril y Ricardo'
  },
  space: {
    grid: [3, 3, 2],
    minSize: 2.0,
    maxSize: 5.6,
    sizeBias: 1.42,
    fogStart: 28,
    fogEnd: 72
  },
  camera: { inertia: 1.08, smoothing: 12, friction: 2.8 },
  viewer: { enabled: true, scrim: 0.9, maxWidth: 0.9, maxHeight: 0.82, duration: 560 },
  intro: true,
  maxTextureSize: 1280,
  maxDPR: 1.6
};
