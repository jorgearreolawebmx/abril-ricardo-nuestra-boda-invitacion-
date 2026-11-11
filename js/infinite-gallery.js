/*!
 * Infinite Gallery — motor reutilizable de galería fotográfica infinita
 * Sin dependencias. Script clásico (sin módulos): funciona con doble clic (file://).
 *
 * Uso:   var g = initInfiniteGallery(document.getElementById('galeria'), configuracion);
 * Ver docs/ARQUITECTURA.md para todas las opciones.
 *
 * Modelo (reconstruido del video de referencia):
 *  - Espacio 3D dividido en sectores (chunks) que se generan de forma determinista.
 *  - Cada foto es un plano a una profundidad distinta; se proyecta con perspectiva.
 *  - Niebla: las fotos lejanas se desvanecen; las que pasan muy cerca también.
 *  - Arrastrar mueve la cámara en X/Y (con inercia); la rueda avanza/retrocede en Z.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Configuración por defecto                                           */
  /* ------------------------------------------------------------------ */
  var DEFAULTS = {
    seed: 'galeria',
    photos: [],                       // ['a.jpg', ...] o [{src, full, alt, scale}]
    background: {
      src: '',                        // fotografía de fondo (cubre toda la pantalla)
      position: '50% 50%',            // background-position
      shade: 0.16,                    // oscurecimiento sutil 0..1
      color: '#0d0b09'
    },
    texts: {
      title: '',
      hintMouse: 'Arrastra para recorrer. Usa la rueda para acercarte.',
      hintTouch: 'Arrastra para recorrer. Pellizca para acercarte.',
      close: 'Cerrar',
      prev: 'Fotografía anterior',
      next: 'Fotografía siguiente',
      error: 'No se pudieron cargar las fotografías.',
      region: 'Galería de fotografías'
    },
    space: {
      chunkSize: 30,                  // tamaño de cada sector (unidades de mundo)
      grid: [3, 3, 2],                // celdas por sector (x, y, z): 1 foto por celda → densidad uniforme
      near: 2.6,                      // plano de corte cercano
      nearFade: 8,                    // a partir de aquí empieza a desvanecerse al acercarse
      fogStart: 27,                   // inicio de la niebla
      fogEnd: 70,                     // distancia donde la foto ya es invisible
      minSize: 1.7,                   // lado mayor mínimo de una foto
      maxSize: 5.8,                   // lado mayor máximo
      sizeBias: 1.7,                  // >1 = más fotos pequeñas que grandes
      start: { x: 0, y: 0, z: 0 }     // posición inicial de la cámara
    },
    camera: {
      focal: 1.1,                     // multiplicador del campo visual
      dragDepth: 20,                  // profundidad que "sigue al cursor" al arrastrar
      smoothing: 13,                  // suavizado de seguimiento (más = más directo)
      friction: 2.5,                  // fricción de la inercia X/Y (más = frena antes)
      inertia: 1,                     // intensidad de la inercia (0 = sin inercia)
      wheelSpeed: 0.2,                // impulso de la rueda (unidades/s por px)
      wheelFriction: 4.2,             // fricción del avance con la rueda
      maxSpeed: 110,                  // velocidad máxima de avance
      pinchDepth: 15,                 // avance por cada "e-fold" de pellizco
      invertWheel: false
    },
    zoom: { min: 0.65, max: 2.2, step: 1.14 },   // zoom del campo visual (Ctrl+rueda, +/-)
    hover: { scale: 1.045 },
    shadow: 'auto',                   // true | false | 'auto' (auto = solo con ratón)
    viewer: {
      enabled: true,
      scrim: 0.88,
      maxWidth: 0.88,
      maxHeight: 0.84,
      duration: 560
    },
    intro: true,
    maxTextureSize: 720,
    maxDPR: 1.5,
    loadConcurrency: 4,
    initialLoadCount: 8
  };

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function deepMerge(base, extra) {
    var out = {}, k;
    for (k in base) { out[k] = isObj(base[k]) ? deepMerge(base[k], {}) : base[k]; }
    for (k in extra) {
      if (isObj(extra[k]) && isObj(out[k])) { out[k] = deepMerge(out[k], extra[k]); }
      else { out[k] = extra[k]; }
    }
    return out;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (parent) { parent.appendChild(n); }
    return n;
  }

  /* Pirámide de miniaturas (mipmaps): evita aliasing al dibujar fotos pequeñas */
  function buildMips(img, maxSize) {
    var nw = img.naturalWidth, nh = img.naturalHeight;
    var long = Math.max(nw, nh);
    var s = Math.min(1, maxSize / long);
    var w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, w, h);
    var levels = [{ c: c, w: w }];
    while (Math.max(w, h) > 120) {
      var w2 = Math.max(1, Math.round(w / 2)), h2 = Math.max(1, Math.round(h / 2));
      var c2 = document.createElement('canvas');
      c2.width = w2; c2.height = h2;
      var x2 = c2.getContext('2d');
      x2.imageSmoothingQuality = 'high';
      x2.drawImage(levels[levels.length - 1].c, 0, 0, w2, h2);
      levels.push({ c: c2, w: w2 });
      w = w2; h = h2;
    }
    return levels.reverse(); // de menor a mayor
  }
  function pickMip(levels, pxWidth) {
    for (var i = 0; i < levels.length; i++) { if (levels[i].w >= pxWidth) { return levels[i].c; } }
    return levels[levels.length - 1].c;
  }

  /* ------------------------------------------------------------------ */
  /* Inicialización                                                      */
  /* ------------------------------------------------------------------ */
  function initInfiniteGallery(container, userConfig) {
    if (!container) { throw new Error('initInfiniteGallery: falta el contenedor'); }
    var cfg = deepMerge(DEFAULTS, userConfig || {});
    var sp = cfg.space, cm = cfg.camera;
    var reduceMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var coarse = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    var useShadow = cfg.shadow === 'auto' ? !coarse : !!cfg.shadow;

    /* ---------- DOM ---------- */
    container.classList.add('ig-root');
    container.setAttribute('tabindex', '0');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', cfg.texts.region);
    container.style.backgroundColor = cfg.background.color;

    var bgEl = el('div', 'ig-bg', container);
    if (cfg.background.src) {
      bgEl.style.backgroundImage = 'url("' + cfg.background.src + '")';
      bgEl.style.backgroundPosition = cfg.background.position;
    }
    var shadeEl = el('div', 'ig-shade', container);
    shadeEl.style.background = 'rgba(0,0,0,' + cfg.background.shade + ')';
    var canvas = el('canvas', 'ig-canvas', container);
    var ctx = canvas.getContext('2d');
    var titleEl = null;
    if (cfg.texts.title) {
      titleEl = el('div', 'ig-title', container);
      titleEl.textContent = cfg.texts.title;
    }
    var hintEl = el('div', 'ig-hint', container);
    hintEl.textContent = coarse ? cfg.texts.hintTouch : cfg.texts.hintMouse;
    var progressEl = el('div', 'ig-progress', container);
    var msgEl = el('div', 'ig-message', container);
    msgEl.style.display = 'none';

    /* ---------- Estado ---------- */
    var photos = [];            // {src, full, alt, scale, ar, mips}
    var chunks = new Map();
    var list = [];              // fotos visibles del último fotograma (lejos → cerca)
    var W = 1, H = 1, dpr = 1;
    var cam = { x: sp.start.x, y: sp.start.y, z: sp.start.z };
    var target = { x: cam.x, y: cam.y, z: cam.z };
    var vel = { x: 0, y: 0, z: 0 };
    var zoom = { cur: 1, target: 1, ax: 0, ay: 0 };
    var pointers = {};
    var nPointers = 0;
    var dragging = false, moved = 0, downT = 0, lastMoveT = 0, samples = [];
    var mouse = { x: 0, y: 0, inside: false, type: 'mouse' };
    var hoverId = null;
    var keys = {};
    var ready = false, destroyed = false;
    var introT = 0;
    var forceRender = true;
    var frameId = 0, rafId = 0, lastT = 0;
    var hovered = false;
    var hiddenId = null;
    var hintGone = false;
    var maxPhotoScale = 1;
    var listeners = [];

    function scheduleFrame() {
      if (!destroyed && !rafId) { rafId = global.requestAnimationFrame(step); }
    }
    function on(t, type, fn, opts) {
      var wrapped = function () {
        fn.apply(this, arguments);
        scheduleFrame();
      };
      t.addEventListener(type, wrapped, opts);
      listeners.push([t, type, wrapped, opts]);
    }

    /* ---------- Cámara / proyección ---------- */
    function focal() { return Math.sqrt(W * H) * cm.focal * zoom.cur; }

    function fogAlpha(d) {
      var aFar = d <= sp.fogStart ? 1 : 1 - smooth((d - sp.fogStart) / (sp.fogEnd - sp.fogStart));
      var aNear = d >= sp.nearFade ? 1 : smooth((d - sp.near) / (sp.nearFade - sp.near));
      return aFar * aNear;
    }

    /* ---------- Sectores (generación determinista) ---------- */
    function getChunk(cx, cy, cz) {
      var key = cx + ',' + cy + ',' + cz;
      var c = chunks.get(key);
      if (c) { c.stamp = frameId; return c; }
      var rnd = mulberry32(hash(cfg.seed + '|' + key));
      var S = sp.chunkSize, P = photos.length;
      var gx = sp.grid[0], gy = sp.grid[1], gz = sp.grid[2], n = gx * gy * gz;
      var cells = [], items = [], deck = [], i;
      for (i = 0; i < n; i++) { cells.push(i); }
      shuffle(cells, rnd);
      for (i = 0; i < n; i++) {
        if (!deck.length) {
          for (var q = 0; q < P; q++) { deck.push(q); }
          shuffle(deck, rnd);
        }
        var pi = deck.pop();
        var ph = photos[pi];
        var L = (sp.minSize + (sp.maxSize - sp.minSize) * Math.pow(rnd(), sp.sizeBias)) * ph.scale;
        var w = ph.ar >= 1 ? L : L * ph.ar;
        var h = ph.ar >= 1 ? L / ph.ar : L;
        var cell = cells[i];
        var ix = cell % gx, iy = Math.floor(cell / gx) % gy, iz = Math.floor(cell / (gx * gy));
        items.push({
          id: key + '#' + i, p: pi,
          x: (cx + (ix + rnd()) / gx) * S,
          y: (cy + (iy + rnd()) / gy) * S,
          z: (cz + (iz + rnd()) / gz) * S,
          w: w, h: h, hov: 0
        });
      }
      c = { items: items, stamp: frameId };
      chunks.set(key, c);
      return c;
    }
    function pruneChunks() {
      if (chunks.size < 500) { return; }
      chunks.forEach(function (c, k) { if (frameId - c.stamp > 240) { chunks['delete'](k); } });
    }

    /* ---------- Render ---------- */
    function collect() {
      var f = focal(), S = sp.chunkSize;
      var margin = sp.maxSize * maxPhotoScale * 0.5;
      list.length = 0;
      var czA = Math.floor((cam.z + sp.near) / S), czB = Math.floor((cam.z + sp.fogEnd) / S);
      for (var cz = czA; cz <= czB; cz++) {
        var dFar = Math.min(sp.fogEnd, (cz + 1) * S - cam.z);
        var hx = (W / 2) / f * dFar + margin, hy = (H / 2) / f * dFar + margin;
        var cxA = Math.floor((cam.x - hx) / S), cxB = Math.floor((cam.x + hx) / S);
        var cyA = Math.floor((cam.y - hy) / S), cyB = Math.floor((cam.y + hy) / S);
        for (var cy = cyA; cy <= cyB; cy++) {
          for (var cx = cxA; cx <= cxB; cx++) {
            var items = getChunk(cx, cy, cz).items;
            for (var i = 0; i < items.length; i++) {
              var it = items[i];
              var d = it.z - cam.z;
              if (d <= sp.near || d >= sp.fogEnd) { continue; }
              var k = f / d, w = it.w * k, h = it.h * k;
              var x = W / 2 + (it.x - cam.x) * k - w / 2;
              var y = H / 2 + (it.y - cam.y) * k - h / 2;
              if (x > W || y > H || x + w < 0 || y + h < 0) { continue; }
              var a = fogAlpha(d);
              if (a < 0.01) { continue; }
              list.push({ it: it, x: x, y: y, w: w, h: h, a: a, d: d });
            }
          }
        }
      }
      list.sort(function (p, q) { return q.d - p.d; });
    }

    function pickAt(px, py) {
      for (var i = list.length - 1; i >= 0; i--) {
        var r = list[i];
        if (r.a > 0.4 && r.it.id !== hiddenId && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) { return r; }
      }
      return null;
    }

    function render(dt) {
      collect();
      var animating = false;

      // hover (solo ratón, sin arrastrar y sin visor)
      var newHover = null;
      if (mouse.inside && mouse.type === 'mouse' && !dragging && !viewer.open && !viewer.busy) {
        var h = pickAt(mouse.x, mouse.y);
        newHover = h ? h.it.id : null;
      }
      if (newHover !== hoverId) {
        hoverId = newHover;
        container.classList.toggle('is-hover', !!hoverId);
      }
      var kh = 1 - Math.exp(-14 * dt);
      var introA = cfg.intro && !reduceMotion ? smooth(introT / 1.1) : 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.shadowColor = 'rgba(0,0,0,0.34)';

      for (var i = 0; i < list.length; i++) {
        var r = list[i], it = r.it;
        var tgt = it.id === hoverId ? 1 : 0;
        if (Math.abs(it.hov - tgt) > 0.002) { it.hov += (tgt - it.hov) * kh; animating = true; }
        else { it.hov = tgt; }
        if (it.id === hiddenId) { continue; }
        var sc = 1 + (cfg.hover.scale - 1) * it.hov;
        var w = r.w * sc, hh = r.h * sc;
        var x = r.x - (w - r.w) / 2, y = r.y - (hh - r.h) / 2;
        var a = Math.min(1, r.a + it.hov * 0.6) * introA;
        ctx.globalAlpha = a;
        if (useShadow && w > 120 && a > 0.55) {
          ctx.shadowBlur = Math.min(30, w * 0.08);
          ctx.shadowOffsetY = Math.min(10, w * 0.025);
        } else {
          ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        }
        var ph = photos[it.p];
        ctx.drawImage(pickMip(ph.mips, w * dpr), x, y, w, hh);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      return animating;
    }

    /* ---------- Bucle principal ---------- */
    function step(now) {
      rafId = 0;
      if (destroyed) { return; }
      var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;
      if (!ready) { return; }
      frameId++;
      if (frameId % 120 === 0) { pruneChunks(); }

      var introActive = cfg.intro && !reduceMotion && introT < 2.4;
      if (introActive) { introT += dt; }

      // teclado (desplazamiento con flechas / W-S)
      if (!viewer.open) {
        var kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
        var ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
        var kz = (keys.w || keys.PageUp ? 1 : 0) - (keys.s || keys.PageDown ? 1 : 0);
        if (kx || ky) { vel.x += kx * 70 * dt; vel.y += ky * 70 * dt; }
        if (kz) { vel.z += kz * 90 * dt; }
      }

      var moving = false;

      // zoom suavizado, anclado al cursor
      if (Math.abs(zoom.target - zoom.cur) > 0.0005) {
        var fOld = focal();
        zoom.cur += (zoom.target - zoom.cur) * (1 - Math.exp(-10 * dt));
        var fNew = focal();
        var shift = cm.dragDepth * (1 / fOld - 1 / fNew);
        var dx = (zoom.ax - W / 2) * shift, dy = (zoom.ay - H / 2) * shift;
        cam.x += dx; target.x += dx; cam.y += dy; target.y += dy;
        moving = true;
      }

      // integración de velocidades (inercia)
      if (!dragging) {
        target.x += vel.x * dt; target.y += vel.y * dt;
        var dampXY = Math.exp(-cm.friction * dt);
        vel.x *= dampXY; vel.y *= dampXY;
        if (Math.abs(vel.x) < 0.01) { vel.x = 0; }
        if (Math.abs(vel.y) < 0.01) { vel.y = 0; }
      }
      target.z += vel.z * dt;
      vel.z *= Math.exp(-cm.wheelFriction * dt);
      if (Math.abs(vel.z) < 0.01) { vel.z = 0; }

      // seguimiento suave de la cámara hacia el objetivo
      var sm = introActive ? 2.4 : cm.smoothing;
      var k = 1 - Math.exp(-sm * dt);
      var ex = target.x - cam.x, ey = target.y - cam.y, ez = target.z - cam.z;
      cam.x += ex * k; cam.y += ey * k; cam.z += ez * k;
      if (Math.abs(ex) + Math.abs(ey) + Math.abs(ez) > 0.0008 || vel.x || vel.y || vel.z) { moving = true; }

      if (moving || dragging || introActive || forceRender || hoverBusy() || viewer.busy) {
        var anim = render(dt);
        forceRender = anim;
      }
      // El motor duerme cuando la cámara está quieta. Los eventos vuelven a despertarlo.
      if (moving || introActive || forceRender || hoverBusy() || viewer.busy || keys.ArrowRight || keys.ArrowLeft || keys.ArrowDown || keys.ArrowUp || keys.w || keys.s || keys.PageUp || keys.PageDown) {
        scheduleFrame();
      }
    }
    function hoverBusy() { return false; }

    /* ---------- Tamaño ---------- */
    function resize() {
      var r = container.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(cfg.maxDPR, global.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      forceRender = true;
      if (viewer.open) { layoutViewerImage(); }
      scheduleFrame();
    }

    /* ---------- Entrada: puntero ---------- */
    function local(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function dismissHint() {
      if (hintGone) { return; }
      hintGone = true; hintEl.classList.add('is-gone');
    }
    function setPan(dxPx, dyPx) {
      var f = focal();
      target.x -= dxPx * cm.dragDepth / f;
      target.y -= dyPx * cm.dragDepth / f;
    }

    on(canvas, 'pointerdown', function (e) {
      if (!ready || viewer.open || viewer.busy) { return; }
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      var p = local(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      pointers[e.pointerId] = { x: p.x, y: p.y };
      nPointers++;
      dismissHint();
      container.focus({ preventScroll: true });
      // al agarrar el lienzo se detiene cualquier movimiento previo
      vel.x = vel.y = vel.z = 0;
      target.x = cam.x; target.y = cam.y; target.z = cam.z;
      if (nPointers === 1) {
        dragging = true; moved = 0; downT = e.timeStamp; lastMoveT = e.timeStamp; samples = [];
        container.classList.add('is-dragging');
      } else {
        moved = 999;
      }
    });

    on(canvas, 'pointermove', function (e) {
      var p = local(e);
      mouse.x = p.x; mouse.y = p.y; mouse.inside = true; mouse.type = e.pointerType;
      forceRender = true;
      var pt = pointers[e.pointerId];
      if (!pt) { return; }
      var dx = p.x - pt.x, dy = p.y - pt.y;
      if (nPointers === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        setPan(dx, dy);
        samples.push({ t: e.timeStamp, dx: dx, dy: dy });
        while (samples.length && e.timeStamp - samples[0].t > 110) { samples.shift(); }
        lastMoveT = e.timeStamp;
        pt.x = p.x; pt.y = p.y;
      } else if (nPointers === 2) {
        // pellizco: distancia entre dedos = avance en profundidad; punto medio = desplazamiento
        var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
        var d0 = Math.hypot(a.x - b.x, a.y - b.y);
        var oldx = pt.x, oldy = pt.y;
        pt.x = p.x; pt.y = p.y;
        var d1 = Math.hypot(a.x - b.x, a.y - b.y);
        if (d0 > 8 && d1 > 8) { target.z += Math.log(d1 / d0) * cm.pinchDepth; }
        setPan((p.x - oldx) / 2, (p.y - oldy) / 2);
        moved = 999;
      }
      forceRender = true;
    });

    function release(e, cancelled) {
      var pt = pointers[e.pointerId];
      if (!pt) { return; }
      var p = local(e);
      delete pointers[e.pointerId];
      nPointers = Math.max(0, nPointers - 1);
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      if (nPointers > 0) { return; }
      dragging = false;
      container.classList.remove('is-dragging');
      if (cancelled) { return; }

      var isClick = moved < 7 && (e.timeStamp - downT) < 600;
      if (isClick) {
        var hit = pickAt(p.x, p.y);
        if (hit && cfg.viewer.enabled) { openViewer(hit.it.p, hit); }
        return;
      }
      // velocidad de salida (inercia) a partir de las últimas muestras
      if (e.timeStamp - lastMoveT < 70 && samples.length > 1 && cfg.camera.inertia > 0) {
        var sx = 0, sy = 0, t0 = samples[0].t, t1 = samples[samples.length - 1].t;
        for (var i = 0; i < samples.length; i++) { sx += samples[i].dx; sy += samples[i].dy; }
        var span = Math.max(40, t1 - t0 + 16) / 1000;
        var f = focal(), k = cm.dragDepth / f * cm.inertia;
        vel.x = clamp(-sx / span * k, -cm.maxSpeed, cm.maxSpeed);
        vel.y = clamp(-sy / span * k, -cm.maxSpeed, cm.maxSpeed);
      }
    }
    on(canvas, 'pointerup', function (e) { release(e, false); });
    on(canvas, 'pointercancel', function (e) { release(e, true); });
    on(canvas, 'pointerleave', function (e) { if (e.pointerType === 'mouse') { mouse.inside = false; forceRender = true; } });
    on(canvas, 'pointerenter', function (e) { mouse.type = e.pointerType; });
    on(container, 'pointerenter', function () { hovered = true; });
    on(container, 'pointerleave', function () { hovered = false; });

    on(canvas, 'wheel', function (e) {
      e.preventDefault();
      if (!ready || viewer.open || viewer.busy) { return; }
      dismissHint();
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? 400 : 1));
      dy = clamp(dy, -160, 160);
      if (e.ctrlKey) {
        var p = local(e);
        zoom.ax = p.x; zoom.ay = p.y;
        zoom.target = clamp(zoom.target * Math.exp(-dy * 0.0022), cfg.zoom.min, cfg.zoom.max);
      } else {
        vel.z = clamp(vel.z + (cm.invertWheel ? -dy : dy) * cm.wheelSpeed, -cm.maxSpeed, cm.maxSpeed);
      }
      forceRender = true;
    }, { passive: false });

    /* ---------- Entrada: teclado ---------- */
    on(document, 'keydown', function (e) {
      if (destroyed) { return; }
      var key = e.key;
      if (viewer.open) {
        if (key === 'Escape') { e.preventDefault(); closeViewer(); }
        else if (key === 'ArrowRight') { e.preventDefault(); navViewer(1); }
        else if (key === 'ArrowLeft') { e.preventDefault(); navViewer(-1); }
        return;
      }
      var active = document.activeElement === container || hovered;
      if (!active || !ready) { return; }
      var kk = key.length === 1 ? key.toLowerCase() : key;
      if (kk === '+' || kk === '=') { setZoom(zoom.target * cfg.zoom.step); e.preventDefault(); return; }
      if (kk === '-' || kk === '_') { setZoom(zoom.target / cfg.zoom.step); e.preventDefault(); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'PageUp', 'PageDown'].indexOf(kk) >= 0) {
        keys[kk] = true; dismissHint(); e.preventDefault();
      }
    });
    on(document, 'keyup', function (e) {
      var kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      delete keys[kk];
    });
    on(global, 'blur', function () { keys = {}; });

    function setZoom(z) {
      zoom.ax = W / 2; zoom.ay = H / 2;
      zoom.target = clamp(z, cfg.zoom.min, cfg.zoom.max);
      forceRender = true;
      scheduleFrame();
    }

    /* ------------------------------------------------------------------ */
    /* Visor ampliado                                                      */
    /* ------------------------------------------------------------------ */
    var viewer = { open: false, busy: false, index: -1, img: null, root: null };
    var vRoot = el('div', 'ig-viewer', container);
    vRoot.setAttribute('role', 'dialog');
    vRoot.setAttribute('aria-modal', 'true');
    vRoot.setAttribute('tabindex', '-1');
    vRoot.setAttribute('aria-hidden', 'true');
    var vScrim = el('div', 'ig-viewer__scrim', vRoot);
    vScrim.style.background = 'rgba(8,7,6,' + cfg.viewer.scrim + ')';
    var vStage = el('div', 'ig-viewer__stage', vRoot);
    var bClose = el('button', 'ig-viewer__btn ig-viewer__close', vRoot);
    bClose.type = 'button'; bClose.setAttribute('aria-label', cfg.texts.close);
    bClose.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var bPrev = el('button', 'ig-viewer__btn ig-viewer__prev', vRoot);
    bPrev.type = 'button'; bPrev.setAttribute('aria-label', cfg.texts.prev);
    bPrev.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var bNext = el('button', 'ig-viewer__btn ig-viewer__next', vRoot);
    bNext.type = 'button'; bNext.setAttribute('aria-label', cfg.texts.next);
    bNext.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var vCount = el('div', 'ig-viewer__count', vRoot);
    vCount.setAttribute('aria-live', 'polite');

    function fitRect(ph) {
      var maxW = W * cfg.viewer.maxWidth, maxH = H * cfg.viewer.maxHeight;
      var w = maxW, h = w / ph.ar;
      if (h > maxH) { h = maxH; w = h * ph.ar; }
      return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
    }
    function tf(x, y, sx, sy) { return 'translate(' + x + 'px,' + y + 'px) scale(' + sx + ',' + sy + ')'; }
    function makeViewerImg(ph) {
      var im = document.createElement('img');
      im.className = 'ig-viewer__img';
      im.alt = ph.alt || '';
      im.draggable = false;
      im.src = ph.full;
      var fr = fitRect(ph);
      im.style.width = fr.w + 'px'; im.style.height = fr.h + 'px';
      im.style.transform = tf(fr.x, fr.y, 1, 1);
      vStage.appendChild(im);
      return im;
    }
    function layoutViewerImage() {
      if (!viewer.img || viewer.busy) { return; }
      var fr = fitRect(photos[viewer.index]);
      viewer.img.style.width = fr.w + 'px'; viewer.img.style.height = fr.h + 'px';
      viewer.img.style.transform = tf(fr.x, fr.y, 1, 1);
    }
    function updateCount() { vCount.textContent = (viewer.index + 1) + ' / ' + photos.length; }
    var dur = function (ms) { return reduceMotion ? 1 : ms; };
    var EASE = 'cubic-bezier(.2,.75,.15,1)';

    function whenDecoded(im, cb) {
      var done = false;
      function go() { if (!done) { done = true; cb(); } }
      if (im.decode) { im.decode().then(go, go); } else if (im.complete) { go(); } else { im.onload = go; im.onerror = go; }
      setTimeout(go, 900);
    }

    function openViewer(index, fromRect) {
      if (viewer.open || viewer.busy) { return; }
      viewer.busy = true; viewer.open = true; viewer.index = index;
      var ph = photos[index];
      hiddenId = fromRect ? fromRect.it.id : null;
      forceRender = true;
      vRoot.classList.add('is-open');
      vRoot.setAttribute('aria-hidden', 'false');
      updateCount();
      var im = makeViewerImg(ph);
      viewer.img = im;
      im.style.opacity = '0';
      whenDecoded(im, function () {
        var fr = fitRect(ph);
        im.style.opacity = '1';
        var from = fromRect
          ? tf(fromRect.x, fromRect.y, fromRect.w / fr.w, fromRect.h / fr.h)
          : tf(fr.x, fr.y, 0.92, 0.92);
        var anim = im.animate(
          [{ transform: from, opacity: fromRect ? 1 : 0 }, { transform: tf(fr.x, fr.y, 1, 1), opacity: 1 }],
          { duration: dur(cfg.viewer.duration), easing: EASE, fill: 'both' });
        vScrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur(cfg.viewer.duration), easing: 'ease-out', fill: 'both' });
        [bClose, bPrev, bNext, vCount].forEach(function (n, i) {
          n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur(360), delay: dur(220 + i * 40), easing: 'ease-out', fill: 'both' });
        });
        anim.onfinish = function () { viewer.busy = false; try { anim.commitStyles(); } catch (e2) { /* noop */ } anim.cancel(); layoutViewerImage(); };
        vRoot.focus({ preventScroll: true });
      });
    }

    function navViewer(dir) {
      if (!viewer.open || photos.length < 2) { return; }
      var oldIm = viewer.img, oldIdx = viewer.index;
      var n = (oldIdx + dir + photos.length) % photos.length;
      viewer.index = n;
      hiddenId = null; forceRender = true;
      updateCount();
      var ph = photos[n], fr = fitRect(ph), fo = fitRect(photos[oldIdx]);
      var im = makeViewerImg(ph);
      viewer.img = im;
      var slide = Math.min(70, W * 0.08) * dir;
      im.style.opacity = '0';
      whenDecoded(im, function () {
        im.style.opacity = '1';
        im.animate([{ transform: tf(fr.x + slide, fr.y, 1, 1), opacity: 0 }, { transform: tf(fr.x, fr.y, 1, 1), opacity: 1 }],
          { duration: dur(460), easing: EASE, fill: 'both' });
      });
      if (oldIm) {
        var o = oldIm.animate([{ transform: tf(fo.x, fo.y, 1, 1), opacity: 1 }, { transform: tf(fo.x - slide, fo.y, 1, 1), opacity: 0 }],
          { duration: dur(340), easing: 'ease-in', fill: 'both' });
        o.onfinish = function () { if (oldIm.parentNode) { oldIm.parentNode.removeChild(oldIm); } };
      }
    }

    function bestRectFor(pi) {
      var best = null, bestScore = 0;
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.it.p !== pi || r.a < 0.5) { continue; }
        var vw = Math.min(W, r.x + r.w) - Math.max(0, r.x), vh = Math.min(H, r.y + r.h) - Math.max(0, r.y);
        if (vw <= 0 || vh <= 0) { continue; }
        var score = vw * vh * r.a;
        if (score > bestScore) { bestScore = score; best = r; }
      }
      return best;
    }

    function closeViewer() {
      if (!viewer.open || viewer.busy) { return; }
      viewer.busy = true;
      var im = viewer.img, ph = photos[viewer.index], fr = fitRect(ph);
      var dest = bestRectFor(viewer.index);
      hiddenId = dest ? dest.it.id : null;
      forceRender = true;
      var d = dur(cfg.viewer.duration - 60);
      vScrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: 'ease-in-out', fill: 'both' });
      [bClose, bPrev, bNext, vCount].forEach(function (n) {
        n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur(200), easing: 'ease-in', fill: 'both' });
      });
      var to = dest
        ? { transform: tf(dest.x, dest.y, dest.w / fr.w, dest.h / fr.h), opacity: 1 }
        : { transform: tf(fr.x, fr.y, 0.94, 0.94), opacity: 0 };
      var a = im.animate([{ transform: tf(fr.x, fr.y, 1, 1), opacity: 1 }, to],
        { duration: d, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'both' });
      a.onfinish = function () {
        viewer.open = false; viewer.busy = false; viewer.img = null;
        hiddenId = null; forceRender = true;
        vRoot.classList.remove('is-open');
        vRoot.setAttribute('aria-hidden', 'true');
        while (vStage.firstChild) { vStage.removeChild(vStage.firstChild); }
        [vScrim, bClose, bPrev, bNext, vCount].forEach(function (n) { n.getAnimations().forEach(function (x) { x.cancel(); }); });
        container.focus({ preventScroll: true });
      };
    }

    on(bClose, 'click', closeViewer);
    on(bPrev, 'click', function () { navViewer(-1); });
    on(bNext, 'click', function () { navViewer(1); });
    on(vScrim, 'click', closeViewer);
    // clic fuera de la imagen (en el escenario) cierra
    on(vStage, 'click', function (e) { if (e.target === vStage) { closeViewer(); } });
    // deslizar horizontalmente en el visor cambia de foto
    var swipe = null;
    on(vRoot, 'pointerdown', function (e) { if (e.pointerType === 'mouse' || e.target.closest('button')) { return; } swipe = { x: e.clientX, y: e.clientY }; });
    on(vRoot, 'pointerup', function (e) {
      if (!swipe) { return; }
      var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) { navViewer(dx < 0 ? 1 : -1); }
    });
    on(vRoot, 'wheel', function (e) { e.preventDefault(); }, { passive: false });

    /* ------------------------------------------------------------------ */
    /* Carga de fotografías                                                */
    /* ------------------------------------------------------------------ */
    function loadPhotos() {
      var raw = (cfg.photos || []).map(function (p) {
        return typeof p === 'string' ? { src: p } : p;
      });
      var total = raw.length + (cfg.background.src ? 1 : 0), loaded = 0;
      function tick() {
        loaded++;
        progressEl.style.transform = 'scaleX(' + (total ? loaded / total : 1) + ')';
        if (loaded >= total) { progressEl.classList.add('is-done'); }
      }
      var results = new Array(raw.length);
      var nextLoad = 0, nextAppend = 0, completed = 0;
      var concurrency = Math.max(1, Math.min(8, Number(cfg.loadConcurrency) || 4));
      var firstBatch = Math.min(raw.length, Math.max(1, Number(cfg.initialLoadCount) || 8));
      var activated = false;

      function activate() {
        if (activated || !photos.length) { return; }
        activated = true;
        photos.forEach(function (p) { maxPhotoScale = Math.max(maxPhotoScale, p.scale); });
        if (cfg.intro && !reduceMotion) { cam.z = sp.start.z - 14; }
        ready = true;
        container.classList.add('is-ready');
        forceRender = true;
        scheduleFrame();
      }

      function appendCompletedInOrder() {
        // Mantiene el orden recibido (más recientes primero) aunque las descargas terminen fuera de orden.
        while (nextAppend < raw.length && results[nextAppend] !== undefined) {
          if (results[nextAppend]) {
            photos.push(results[nextAppend]);
            maxPhotoScale = Math.max(maxPhotoScale, results[nextAppend].scale);
          }
          nextAppend++;
        }
        if (!activated && photos.length && (photos.length >= firstBatch || nextAppend >= firstBatch || completed === raw.length)) {
          activate();
        } else if (activated && photos.length) {
          forceRender = true;
          scheduleFrame();
        }
        if (completed >= raw.length) {
          progressEl.classList.add('is-done');
          if (!photos.length) {
            msgEl.textContent = cfg.texts.error;
            msgEl.style.display = 'block';
          }
          scheduleFrame();
        }
      }

      if (cfg.background.src) {
        var bg = new Image();
        bg.onload = bg.onerror = tick;
        bg.src = cfg.background.src;
      }
      if (!raw.length) {
        if (!cfg.background.src) progressEl.classList.add('is-done');
        msgEl.textContent = cfg.texts.error;
        msgEl.style.display = 'block';
        return;
      }

      function worker() {
        if (nextLoad >= raw.length) { return; }
        var index = nextLoad++;
        var p = raw[index];
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () {
          try {
            results[index] = {
              src: p.src, full: p.full || p.src, alt: p.alt || '',
              scale: p.scale || 1,
              ar: im.naturalWidth / im.naturalHeight,
              mips: buildMips(im, cfg.maxTextureSize)
            };
          } catch (err) {
            results[index] = null;
            if (global.console) { console.warn('[InfiniteGallery] no se pudo procesar', p.src, err); }
          }
          completed++; tick(); appendCompletedInOrder(); worker();
        };
        im.onerror = function () {
          results[index] = null;
          if (global.console) { console.warn('[InfiniteGallery] no se pudo cargar', p.src); }
          completed++; tick(); appendCompletedInOrder(); worker();
        };
        im.src = p.src;
      }
      for (var i = 0; i < Math.min(concurrency, raw.length); i++) { worker(); }
    }

    /* ---------- Arranque ---------- */
    resize();
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(resize); ro.observe(container);
      listeners.push([{ removeEventListener: function () { ro.disconnect(); } }, '', null]);
    } else { on(global, 'resize', resize); }
    loadPhotos();
    lastT = performance.now();
    scheduleFrame();

    /* ---------- API pública ---------- */
    return {
      open: function (i) { if (ready && i >= 0 && i < photos.length) { openViewer(i, bestRectFor(i)); } },
      close: closeViewer,
      next: function () { navViewer(1); },
      prev: function () { navViewer(-1); },
      resize: resize,
      setZoom: setZoom,
      count: function () { return photos.length; },
      destroy: function () {
        destroyed = true;
        global.cancelAnimationFrame(rafId);
        listeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e3) { /* noop */ } });
        while (container.firstChild) { container.removeChild(container.firstChild); }
        container.classList.remove('ig-root', 'is-ready', 'is-dragging', 'is-hover');
      },
      /* Solo para diagnóstico y pruebas */
      debug: {
        state: function () {
          return { cam: { x: cam.x, y: cam.y, z: cam.z }, target: { x: target.x, y: target.y, z: target.z },
            vel: { x: vel.x, y: vel.y, z: vel.z }, zoom: zoom.cur, ready: ready, chunks: chunks.size,
            visible: list.length, viewerOpen: viewer.open, viewerIndex: viewer.index, W: W, H: H };
        },
        visible: function () {
          return list.map(function (r) { return { p: r.it.p, x: r.x, y: r.y, w: r.w, h: r.h, a: r.a, d: r.d }; }).reverse();
        }
      }
    };
  }

  global.initInfiniteGallery = initInfiniteGallery;
  global.InfiniteGallery = { init: initInfiniteGallery, defaults: DEFAULTS };
})(typeof window !== 'undefined' ? window : this);
