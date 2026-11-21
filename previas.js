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
  // 21/11: hay celulares que dicen tener mouse (hover: hover); un telefono con
  // pantalla chica va siempre por el modo tactil
  const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches && !(navigator.maxTouchPoints > 0 && chico());
  if (!conMouse) document.documentElement.classList.add("tactil");

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
        // en el celular mas despacio (90 px/s): a 240 la pagina pasaba en 3 s y no se leia
        const vel = chico() ? 90 : 240;
        shot.style.setProperty("--dur", Math.min(chico() ? 16 : 12, Math.max(chico() ? 5 : 2.5, viaje / vel)).toFixed(1) + "s");
        shot.classList.add("lista");
      };
      im.src = shot.dataset.full;
      shot.append(im);
    }
    return null;
  };
  // sin mouse la pagina baja con una animacion propia (Web Animations): arranca
  // siempre desde arriba y se cancela al soltar la tarjeta, sin estados a medias
  // de CSS (21/11: en el celular la imagen quedaba quieta y despues saltaba)
  const recorrer = (card) => {
    const shot = card.querySelector(".demo-shot"), im = shot?.querySelector(".full");
    if (conMouse || !im || !shot.classList.contains("lista") || card._anim) return;
    const viaje = im.offsetHeight - shot.offsetHeight;
    if (viaje < 40) return;
    card._anim = im.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-viaje}px)` }], {
      duration: Math.min(16000, Math.max(5000, (viaje / 90) * 1000)), delay: 400,
      direction: "alternate", iterations: Infinity, easing: "cubic-bezier(0.45, 0, 0.55, 1)",
    });
  };
  const prender = (card) => {
    const shot = card.querySelector(".demo-shot");
    if (!shot) return;
    const v = preparar(shot);
    card.classList.add("viendo");
    if (v) v.play().catch(() => {});
    if (!conMouse) {
      const im = shot.querySelector(".full");
      if (im && !shot.classList.contains("lista")) im.addEventListener("load", () => card.classList.contains("viendo") && recorrer(card), { once: true });
      else recorrer(card);
    }
  };
  const apagar = (card) => {
    card.classList.remove("viendo");
    if (card._anim) { card._anim.cancel(); card._anim = null; }
    const v = card.querySelector(".demo-shot video.vid");
    if (v) { v.pause(); card.querySelector(".demo-shot").classList.remove("sonando"); }
  };

  const cards = $$(".demo").filter((c) => c.querySelector(".demo-shot[data-full], .demo-shot[data-video]"));
  if (conMouse) {
    cards.forEach((c) => {
      c.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && prender(c));
      c.addEventListener("pointerleave", (e) => e.pointerType !== "touch" && apagar(c));
    });
  } else {
    // sin mouse: anda sola la tarjeta mas cerca del centro de la pantalla, con al
    // menos el 60 % a la vista (recortada por la tira que la contiene); una sola a la
    // vez. 21/11: se mide en el momento con getBoundingClientRect, no con lo que
    // informo un IntersectionObserver, que en el celular llegaba tarde al deslizar.
    let activa = null;
    const visible = (c) => {
      const b = c.getBoundingClientRect();
      if (!b.width || !b.height) return 0;
      let l = Math.max(b.left, 0), r = Math.min(b.right, innerWidth), t = Math.max(b.top, 0), d = Math.min(b.bottom, innerHeight);
      const tira = c.parentElement.getBoundingClientRect();
      l = Math.max(l, tira.left); r = Math.min(r, tira.right);
      return Math.max(0, r - l) * Math.max(0, d - t) / (b.width * b.height);
    };
    const elegir = () => {
      let mejor = null, dist = Infinity;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cards.forEach((c) => {
        if (visible(c) < 0.6) return;
        const b = c.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
        if (d < dist) { dist = d; mejor = c; }
      });
      if (mejor === activa) return;
      if (activa) apagar(activa);
      activa = mejor;
      if (activa) prender(activa);
    };
    let pend = 0;
    const tick = () => { if (!pend) pend = setTimeout(() => { pend = 0; elegir(); }, 120); };
    document.addEventListener("scroll", tick, { passive: true, capture: true });
    document.addEventListener("scrollend", () => elegir(), { passive: true, capture: true });
    addEventListener("resize", tick);
    document.addEventListener("click", (e) => { if (e.target.closest(".af-chip, .tab, [role=tab]")) setTimeout(elegir, 200); });
    new IntersectionObserver(() => tick(), { threshold: [0, 0.6] }).observe(document.body);
    cards.forEach((c) => new IntersectionObserver(tick, { threshold: [0, 0.6, 1] }).observe(c));
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
