/* ============================================================
   DT SYSTEM · previas.js — las tarjetas de proyectos como mini vistas
   previas, solo cuando la persona las pide (ronda 18/11):
   - con mouse: al pasar por encima (la pagina entera baja; el video corre);
   - sin mouse: anda sola la tarjeta mas cerca del centro de la pantalla.
   Las apps (Apunto, Sencillo) pasan sus pantallas mientras se las toca o se
   tiene el mouse encima. Corre en la portada y en las paginas de servicio.
   Con movimiento reducido o ahorro de datos no hace nada.
   ============================================================ */
(() => {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData) return;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const chico = () => matchMedia("(max-width: 720px)").matches;
  const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const preparar = (shot) => {
    if (shot.dataset.video) {
      let v = shot.querySelector("video");
      if (!v) {
        v = document.createElement("video");
        v.className = "vid"; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute("aria-hidden", "true");
        v.addEventListener("playing", () => shot.classList.add("sonando"));
        v.src = (chico() && shot.dataset.videoCel) || shot.dataset.video;
        shot.append(v);
      }
      return v;
    }
    if (shot.dataset.full && !shot.querySelector(".full")) {
      const im = new Image();
      im.className = "full"; im.alt = ""; im.decoding = "async";
      im.onload = () => {
        const viaje = Math.max(0, im.offsetHeight - shot.offsetHeight);
        shot.style.setProperty("--dur", Math.min(12, Math.max(2.5, viaje / 240)).toFixed(1) + "s");
        shot.classList.add("lista");
      };
      im.src = shot.dataset.full;
      shot.append(im);
    }
    return null;
  };
  const prender = (card) => {
    const shot = card.querySelector(".demo-shot");
    if (!shot) return;
    const v = preparar(shot);
    card.classList.add("viendo");
    if (v) v.play().catch(() => {});
  };
  const apagar = (card) => {
    card.classList.remove("viendo");
    const v = card.querySelector(".demo-shot video.vid");
    if (v) { v.pause(); card.querySelector(".demo-shot").classList.remove("sonando"); }
  };

  const cards = $$(".demo").filter((c) => c.querySelector(".demo-shot[data-full], .demo-shot[data-video]"));
  if (conMouse) {
    cards.forEach((c) => {
      c.addEventListener("pointerenter", () => prender(c));
      c.addEventListener("pointerleave", () => apagar(c));
    });
  } else {
    // sin mouse (18/11): anda sola la tarjeta que quedo mas cerca del centro de
    // la pantalla, entera a la vista en un 60 %; una sola a la vez
    const vistas = new Set();
    let activa = null;
    const elegir = () => {
      let mejor = null, dist = Infinity;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      vistas.forEach((c) => {
        const b = c.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
        if (d < dist) { dist = d; mejor = c; }
      });
      if (mejor === activa) return;
      if (activa) apagar(activa);
      activa = mejor;
      if (activa) prender(activa);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.intersectionRatio >= 0.6 ? vistas.add(e.target) : vistas.delete(e.target)));
      elegir();
    }, { threshold: [0, 0.6, 1] });
    cards.forEach((c) => io.observe(c));
    let pend = 0;
    const tick = () => { if (!pend) pend = setTimeout(() => { pend = 0; elegir(); }, 160); };
    document.addEventListener("scroll", tick, { passive: true, capture: true });
  }

  // Apps: el celular del medio pasa por las pantallas de los tres, a pedido
  $$(".app-tels").forEach((caja) => {
    const app = caja.closest(".app") || caja;
    const medio = caja.querySelector(".app-tel:not(.lado)");
    const img = medio?.querySelector("img");
    const fuentes = $$("img", caja).map((i) => i.getAttribute("src"));
    if (!img || fuentes.length < 2) return;
    const capa = img.cloneNode(); capa.className = "app-capa"; capa.alt = ""; medio.append(capa);
    let k = fuentes.indexOf(img.getAttribute("src")), timer = 0;
    const paso = () => {
      k = (k + 1) % fuentes.length;
      capa.onload = () => {
        medio.classList.add("cambia");
        setTimeout(() => { img.src = fuentes[k]; medio.classList.remove("cambia"); }, 520);
      };
      capa.src = fuentes[k];
    };
    const correr = () => { if (!timer) { paso(); timer = setInterval(paso, 1800); } };
    const parar = () => { clearInterval(timer); timer = 0; };
    if (conMouse) {
      app.addEventListener("pointerenter", correr);
      app.addEventListener("pointerleave", parar);
    } else {
      new IntersectionObserver((es) => (es[0].isIntersecting ? correr() : parar()), { threshold: 0.6 }).observe(caja);
    }
  });
})();
