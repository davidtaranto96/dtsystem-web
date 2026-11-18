/* ============================================================
   DT SYSTEM · teclas.js — las teclas 3D del pie.
   Salio de main.js (ronda del 18/11) para que el pie de las paginas de
   servicio tambien las tenga. Rutas absolutas: anda en cualquier pagina.
   ============================================================ */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 24. Teclas del pie, en 3D ----------
     Como las pelotitas del pie de wearestokt.com, con teclas del mismo estilo
     que los objetos de Servicios. Las teclas son modelos 3D de verdad (Three.js,
     que se baja recien cuando el pie se acerca): base con bisel, tapa mas
     angosta, materiales y luces de estudio. La fisica es propia y en 2D (Verlet
     con choques entre circulos): cada tecla choca como un circulo un poco mas
     grande que su cara. Siete forman DT y SALTA. Corre solo con el
     pie en pantalla y se duerme cuando todo quedo quieto. Sin WebGL, las teclas
     se dibujan con las imagenes de assets/teclas/; con movimiento reducido, la
     pila aparece ya asentada. */
  (() => {
    const pie = $(".footer");
    if (!pie) return;
    const cv = document.createElement("canvas");
    cv.className = "teclas-pie";
    cv.setAttribute("aria-hidden", "true");
    pie.prepend(cv);
    const dpr = Math.min(2, devicePixelRatio || 1);
    let W = 0, H = 0, teclas = [], raf = 0, visible = false, quietos = 0, soltadas = false, listo = false;
    const mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
    const TIPOS = ["gris", "blanca", "grafito", "gris", "blanca", "acrilico", "gris", "grafito", "blanca", "celeste"];
    // las letras forman DT y SALTA (ronda del 12/11 15:12); el espacio no es tecla
    const LETRAS = "DTSALTA";
    const fuente = getComputedStyle(document.querySelector("h2, h1") || document.body).fontFamily;

    // ---- fisica (la misma para el 3D y para el respaldo plano)
    const armarFisica = () => {
      W = pie.clientWidth; H = cv.clientHeight || 300;
      const chico = W < 720;
      const lado = chico ? 54 : 92;
      const r = lado * 0.6;
      // el lienzo es mas alto que el foso (las teclas entran cayendo): se cuenta solo el foso
      const foso = Math.max(160, H - 220);
      const n = Math.round(Math.min(chico ? 20 : 40, (W * foso * 0.62) / (lado * lado * 1.3)));
      teclas = Array.from({ length: n }, (_, i) => {
        const tipo = TIPOS[i % TIPOS.length];
        // las de las letras caen ultimas, asi quedan arriba del monticulo
        const letra = i >= n - LETRAS.length ? LETRAS[i - (n - LETRAS.length)] : "";
        // caen desde el centro, asi se amontonan en un monticulo y no tapizan el piso
        const gauss = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const x = Math.max(r, Math.min(W - r, W / 2 + gauss * W * (chico ? 0.34 : 0.26)));
        const y = -r - Math.random() * H * 1.4 - (letra ? H * 0.6 : 0);
        const a0 = (Math.random() - 0.5) * 0.6;
        // giro en el aire: cada tecla cae dando vueltas y se acomoda al apoyarse
        return { x, y, px: x, py: y, r, lado, tipo, letra, a: a0, a0, z: Math.random(),
          gx: Math.random() * 6.28, gy: Math.random() * 6.28, vgx: (Math.random() - 0.5) * 0.25, vgy: (Math.random() - 0.5) * 0.25 };
      });
    };
    const paso = () => {
      const G = 0.5, AMORT = 0.992;
      for (const b of teclas) {
        const vx = (b.x - b.px) * AMORT, vy = (b.y - b.py) * AMORT;
        b.px = b.x; b.py = b.y;
        b.x += vx; b.y += vy + G;
        // una tecla no rueda: cabecea con el golpe y vuelve a su angulo
        b.a += vx / (b.r * 4); b.a += (b.a0 - b.a) * 0.02;
        // apoyada (piso u otra tecla) y lenta: deja de girar y se endereza
        const rapida = Math.abs(vx) + Math.abs(vy) > 1.2 && !(b.toca > 0 && Math.abs(vy) < 3);
        if (b.toca > 0) b.toca--;
        b.vgx *= rapida ? 0.995 : 0.85; b.vgy *= rapida ? 0.995 : 0.85;
        b.gx += b.vgx; b.gy += b.vgy;
        if (!rapida) { b.gx += (Math.round(b.gx / 6.2832) * 6.2832 - b.gx) * 0.12; b.gy += (Math.round(b.gy / 6.2832) * 6.2832 - b.gy) * 0.12; }
        const dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx, dy), lim = b.r + 46;
        if (d < lim && d > 0.01) {
          const f = (lim - d) / lim;
          b.x += (dx / d) * f * 6 + mouse.vx * 0.25 * f;
          b.y += (dy / d) * f * 6 + mouse.vy * 0.25 * f;
          b.vgx += (Math.random() - 0.5) * f * 0.2; b.vgy += (Math.random() - 0.5) * f * 0.2;
        }
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < teclas.length; i++) {
          const a = teclas[i];
          for (let j = i + 1; j < teclas.length; j++) {
            const b = teclas[j];
            const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, d2 = dx * dx + dy * dy;
            if (d2 < min * min && d2 > 0.0001) {
              const d = Math.sqrt(d2), sobra = (min - d) / 2, nx = dx / d, ny = dy / d;
              a.x -= nx * sobra; a.y -= ny * sobra; b.x += nx * sobra; b.y += ny * sobra;
              // rozamiento entre teclas: frena el deslizamiento de costado, asi la pila se sostiene
              a.px = a.x - (a.x - a.px) * 0.92; b.px = b.x - (b.x - b.px) * 0.92;
              a.toca = b.toca = 4;
            }
          }
          // contra la pared se corre un poco: si no, se apilan en torre perfecta
          if (a.x < a.r) a.x = a.r + Math.random() * 1.5; else if (a.x > W - a.r) a.x = W - a.r - Math.random() * 1.5;
          if (a.y > H - a.r) { a.y = H - a.r; a.px = a.x - (a.x - a.px) * 0.5; a.toca = 4; }
          // una vez adentro, el borde de arriba del lienzo es techo: no se corta
          if (a.y > a.r) a.entro = true; else if (a.entro) { a.y = a.r; a.py = a.r; }
        }
      }
    };

    // ---- dibujo: 3D con Three.js, o plano con las imagenes si no hay WebGL
    let dibujar = () => {}, redimensionar = () => {};

    const plano = async () => {
      const ctx = cv.getContext("2d");
      const imgs = {};
      await Promise.all([...new Set(TIPOS)].map((t) => new Promise((ok) => {
        const im = new Image(); im.onload = im.onerror = () => { imgs[t] = im; ok(); };
        im.src = "/assets/teclas/" + t + ".png";
      })));
      const cache = {};
      const sprite = (b) => {
        const k = b.tipo + b.letra + b.lado;
        if (cache[k]) return cache[k];
        const c = document.createElement("canvas"), s = Math.ceil(b.lado * dpr);
        c.width = c.height = s;
        const g = c.getContext("2d");
        if (imgs[b.tipo] && imgs[b.tipo].width) g.drawImage(imgs[b.tipo], 0, 0, s, s);
        if (b.letra) {
          g.fillStyle = b.tipo === "grafito" || b.tipo === "celeste" ? "rgba(255,255,255,.92)" : "rgba(28,30,34,.82)";
          g.font = "500 " + Math.round(s * 0.34) + "px " + fuente;
          g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText(b.letra, s * 0.5, s * 0.47);
        }
        return (cache[k] = c);
      };
      redimensionar = () => { cv.width = W * dpr; cv.height = H * dpr; };
      dibujar = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        for (const b of teclas) {
          if (b.y < -b.r) continue;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
          ctx.drawImage(sprite(b), -b.lado / 2, -b.lado / 2, b.lado, b.lado);
          ctx.restore();
        }
      };
    };

    const tresD = async () => {
      const THREE = await import(new URL("/assets/vendor/three-0.160.0.module.min.js", location.origin).href);
      const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(dpr);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const escena = new THREE.Scene();
      // camara con perspectiva real, ubicada para que el plano z=0 coincida
      // pixel a pixel con la fisica: las teclas tienen profundidad y paralaje
      const cam = new THREE.PerspectiveCamera(28, 1, 10, 6000);
      // ambiente de estudio para los reflejos: una caja gris con tres paneles
      // de luz, horneada una vez con PMREM (sin archivos HDR que bajar)
      const pm = new THREE.PMREMGenerator(renderer);
      const estudio = new THREE.Scene();
      estudio.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x55585e, side: THREE.BackSide })));
      for (const [x, y, z, w, h, k] of [[-3, 3, 2, 4, 3, 3.2], [3.5, 1, 1, 2, 4, 1.4], [0, -1, -4.5, 6, 2, 1.1]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) }));
        p.position.set(x, y, z); p.lookAt(0, 0, 0); estudio.add(p);
      }
      escena.environment = pm.fromScene(estudio, 0.04).texture;
      escena.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.35));
      const luz = new THREE.DirectionalLight(0xffffff, 2.4);
      luz.castShadow = true; luz.shadow.mapSize.set(1024, 1024); luz.shadow.radius = 6; luz.shadow.bias = -0.0008;
      escena.add(luz); escena.add(luz.target);
      const borde = new THREE.DirectionalLight(0xdfe8ff, 0.9); borde.position.set(0.3, 1, -1.2); escena.add(borde);

      // la tecla: un cuadrado redondeado extruido con bisel, y la tapa mas angosta
      const geos = {};
      const geometria = (lado) => {
        if (geos[lado]) return geos[lado];
        const s = lado * 0.86, rad = lado * 0.14, h = s / 2;
        const f = new THREE.Shape();
        f.moveTo(-h + rad, -h); f.lineTo(h - rad, -h); f.quadraticCurveTo(h, -h, h, -h + rad);
        f.lineTo(h, h - rad); f.quadraticCurveTo(h, h, h - rad, h); f.lineTo(-h + rad, h);
        f.quadraticCurveTo(-h, h, -h, h - rad); f.lineTo(-h, -h + rad); f.quadraticCurveTo(-h, -h, -h + rad, -h);
        const alto = lado * 0.42;
        const g = new THREE.ExtrudeGeometry(f, { depth: alto, bevelEnabled: true, bevelThickness: lado * 0.06,
          bevelSize: lado * 0.05, bevelSegments: 4, curveSegments: 6 });
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i), k = 1 - 0.18 * Math.min(1, Math.max(0, z / alto));   // se angosta hacia arriba
          p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k);
        }
        g.computeVertexNormals();
        g.translate(0, 0, -alto / 2);
        return (geos[lado] = g);
      };
      const COLOR = { gris: 0xcfccc6, blanca: 0xefede8, grafito: 0x3b3e45, celeste: 0x52bffe, acrilico: 0xf4f7fb };
      const material = (tipo, cara) => {
        // plastico PBT mate con un barniz leve; la celeste, brillante; la de acrilico, translucida
        const base = { color: COLOR[tipo], roughness: tipo === "celeste" ? 0.28 : 0.5, metalness: 0,
          clearcoat: tipo === "celeste" ? 0.8 : 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.9 };
        if (cara) Object.assign(base, { map: cara, color: 0xffffff });
        const m = new THREE.MeshPhysicalMaterial(base);
        if (tipo === "acrilico") { m.transparent = true; m.opacity = 0.6; m.roughness = 0.15; m.clearcoat = 1; }
        return m;
      };
      // la cara de arriba lleva la letra: una textura con el color de la tecla y la letra impresa
      const cara = (tipo, letra, lado) => {
        const c = document.createElement("canvas"); c.width = c.height = 256;
        const g = c.getContext("2d");
        g.fillStyle = "#" + COLOR[tipo].toString(16).padStart(6, "0"); g.fillRect(0, 0, 256, 256);
        if (letra) {
          g.fillStyle = tipo === "grafito" || tipo === "celeste" ? "rgba(255,255,255,.95)" : "rgba(28,30,34,.85)";
          g.font = "500 124px " + fuente; g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText(letra, 128, 134);
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        // las UV de la tapa vienen en unidades de la forma: se llevan a 0..1
        const s = lado * 0.86;
        t.repeat.set(1 / s, 1 / s); t.offset.set(0.5, 0.5);
        return t;
      };
      const mats = {};
      const mallas = [];
      const montar = () => {
        mallas.forEach((m) => escena.remove(m)); mallas.length = 0;
        for (const b of teclas) {
          const k = b.tipo + b.letra + b.lado;
          mats[k] = mats[k] || [material(b.tipo, cara(b.tipo, b.letra, b.lado)), material(b.tipo)];
          const pivote = new THREE.Group();
          const m = new THREE.Mesh(geometria(b.lado), mats[k]);
          m.castShadow = true; m.receiveShadow = true;
          // la tapa mira a la camara inclinada hacia abajo: se ve la cara y el frente, con volumen
          const giro = new THREE.Group();
          giro.add(m); m.rotation.x = -0.62; m.rotation.y = 0.18;
          pivote.add(giro); escena.add(pivote); mallas.push(pivote);
          b.malla = pivote; b.giro = giro;
        }
      };
      redimensionar = () => {
        renderer.setSize(W, H, false);
        const dist = (H / 2) / Math.tan((cam.fov * Math.PI) / 360);
        cam.aspect = W / H; cam.position.set(W / 2, -H / 2, dist); cam.lookAt(W / 2, -H / 2, 0);
        cam.updateProjectionMatrix();
        luz.position.set(W * 0.25, H * 0.6, 900); luz.target.position.set(W / 2, -H / 2, 0);
        const sc = luz.shadow.camera; sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 10; sc.far = 3000;
        sc.updateProjectionMatrix();
        montar();
      };
      dibujar = () => {
        for (const b of teclas) {
          b.malla.position.set(b.x, -b.y, b.z * 24);
          b.malla.rotation.z = -b.a;
          b.giro.rotation.set(b.gx, b.gy, 0);
          b.malla.visible = b.y > -b.r * 2;
        }
        renderer.render(escena, cam);
      };
    };

    const vuelta = () => {
      paso(); dibujar();
      let e = 0;
      for (const b of teclas) e += Math.abs(b.x - b.px) + Math.abs(b.y - b.py);
      quietos = e / teclas.length < 0.02 ? quietos + 1 : 0;
      raf = visible && quietos < 90 ? requestAnimationFrame(vuelta) : 0;
    };
    const despertar = () => { quietos = 0; if (listo && !raf && visible) raf = requestAnimationFrame(vuelta); };

    const arrancar = async () => {
      armarFisica();
      const gl = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } })();
      try { if (!gl) throw 0; await tresD(); }
      catch (e) { await plano(); }
      redimensionar();
      listo = true;
      if (reduced) { for (let i = 0; i < 900; i++) paso(); dibujar(); return; }
      despertar();
    };

    // Three.js se baja recien cuando el pie esta por aparecer
    let pedido = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !pedido) { pedido = true; arrancar(); }
    }, { rootMargin: "600px 0px" }).observe(pie);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { soltadas = true; despertar(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.05 }).observe(cv);
    const mover = (e) => {
      const r = cv.getBoundingClientRect(), t = performance.now();
      const x = e.clientX - r.left, y = e.clientY - r.top, dt = Math.max(16, t - mouse.t);
      mouse.vx = ((x - mouse.x) / dt) * 16; mouse.vy = ((y - mouse.y) / dt) * 16;
      if (Math.abs(mouse.vx) > 60) mouse.vx = 0;
      if (Math.abs(mouse.vy) > 60) mouse.vy = 0;
      mouse.x = x; mouse.y = y; mouse.t = t;
      if (soltadas) despertar();
    };
    pie.addEventListener("pointermove", mover, { passive: true });
    pie.addEventListener("pointerdown", mover, { passive: true });
    pie.addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });
    // con el dedo (13/11): un toque hace saltar las teclas de alrededor, y al
    // pasar la pagina se sacuden un poco. En Verlet el impulso es correr la
    // posicion anterior.
    if (matchMedia("(hover: none), (pointer: coarse)").matches && !reduced) {
      pie.addEventListener("pointerdown", (e) => {
        if (!listo) return;
        const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        teclas.forEach((b) => {
          const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
          if (d > 170) return;
          const f = (1 - d / 170) * 26;
          b.px -= (dx / d) * f; b.py -= (dy / d) * f - f * 0.6;
          b.vgx += (Math.random() - 0.5) * 0.5; b.vgy += (Math.random() - 0.5) * 0.5;
        });
        despertar();
      }, { passive: true });
      let ys = scrollY, pendS = false;
      addEventListener("scroll", () => {
        if (pendS || !visible || !listo) return;
        pendS = true;
        requestAnimationFrame(() => {
          pendS = false;
          const d = scrollY - ys; ys = scrollY;
          if (Math.abs(d) < 6) return;
          const f = Math.min(9, Math.abs(d) * 0.12);
          teclas.forEach((b) => { if (Math.random() < 0.5) { b.py += f * (0.4 + Math.random()); b.px += (Math.random() - 0.5) * f; } });
          despertar();
        });
      }, { passive: true });
    }
    let ancho = innerWidth;
    addEventListener("resize", () => {
      if (!listo || Math.abs(innerWidth - ancho) < 40) return;   // la barra del celular no rearma
      ancho = innerWidth; armarFisica(); redimensionar(); if (soltadas) despertar();
    });
  })();
})();
