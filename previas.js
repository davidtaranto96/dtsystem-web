/* ============================================================
   DT SYSTEM · previas.js — las tarjetas de proyectos como mini vistas
   previas, solo cuando la persona las pide (ronda 18/11):
   - con mouse: al pasar por encima (la pagina entera baja; el video corre);
   - con el dedo: el primer toque la prende (y en una tarjeta con enlace,
     el segundo toque abre el sitio); tocar otra la cambia, tocar afuera la apaga.
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
    let activa = null;
    cards.forEach((c) => c.addEventListener("click", (e) => {
      if (activa === c) return;               // segundo toque: sigue el enlace si lo hay
      e.preventDefault();
      if (activa) apagar(activa);
      activa = c; prender(c);
    }));
    document.addEventListener("click", (e) => {
      if (activa && !activa.contains(e.target)) { apagar(activa); activa = null; }
    });
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
      app.addEventListener("click", () => (timer ? parar() : correr()));
    }
  });
})();
