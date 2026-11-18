/* ============================================================
   DT SYSTEM · previas.js — las tarjetas de proyectos como mini vistas
   previas que andan solas mientras estan a la vista (ronda 18/11):
   - web con su pagina entera (data-full): baja hasta el final, espera y sube;
   - sistema con su grabacion (data-video): el video corre en loop;
   - apps (Apunto, Sencillo): el celular del medio va pasando sus pantallas.
   Corre en la portada y en las paginas de servicio. Fuera de pantalla se
   frena; con movimiento reducido o ahorro de datos no hace nada. En el
   celular, las tiras de la portada las maneja main.js (una sola a la vez).
   ============================================================ */
(() => {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData) return;
  const chico = matchMedia("(max-width: 720px)").matches;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const enTira = (el) => chico && el.closest("#csGrid, #wipGrid, #sysGrid");

  const preparar = (shot) => {
    if (shot.dataset.video) {
      let v = shot.querySelector("video.vid");
      if (!v) {
        v = document.createElement("video");
        v.className = "vid"; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute("aria-hidden", "true");
        v.addEventListener("playing", () => shot.classList.add("sonando"));
        v.src = (chico && shot.dataset.videoCel) || shot.dataset.video;
        shot.append(v);
      }
      return;
    }
    if (shot.querySelector(".full")) { shot.classList.add("navega"); return; }
    const im = new Image();
    im.className = "full"; im.alt = ""; im.decoding = "async";
    im.onload = () => {
      const viaje = Math.max(0, im.offsetHeight - shot.offsetHeight);
      const baja = Math.min(14, Math.max(3, viaje / 200));
      shot.style.setProperty("--ciclo", (baja * 2.6).toFixed(1) + "s");
      shot.classList.add("lista", "navega");
    };
    im.src = shot.dataset.full;
    shot.append(im);
  };
  const prender = (shot) => {
    preparar(shot);
    shot.classList.remove("quieta");
    const v = shot.querySelector("video.vid");
    if (v) v.play().catch(() => {});
  };
  const apagar = (shot) => {
    shot.classList.add("quieta");
    const v = shot.querySelector("video.vid");
    if (v && !v.paused) v.pause();
  };

  const shots = $$(".demo-shot[data-full], .demo-shot[data-video]").filter((s) => !enTira(s));
  if (shots.length && "IntersectionObserver" in window) {
    const vistos = new WeakSet();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { vistos.add(e.target); prender(e.target); }
      else { vistos.delete(e.target); apagar(e.target); }
    }), { threshold: 0.35 });
    shots.forEach((s) => {
      io.observe(s);
      // main.js pausa el video al sacar el mouse: si sigue a la vista, vuelve a andar
      s.closest(".demo")?.addEventListener("pointerleave", () => { if (vistos.has(s)) setTimeout(() => prender(s), 30); });
    });
  }

  // Apps: el celular del medio pasa por las pantallas de los tres
  $$(".app-tels").forEach((caja) => {
    const medio = caja.querySelector(".app-tel:not(.lado)");
    const img = medio?.querySelector("img");
    const fuentes = $$("img", caja).map((i) => i.getAttribute("src"));
    if (!img || fuentes.length < 2) return;
    const capa = img.cloneNode(); capa.className = "app-capa"; capa.alt = ""; medio.append(capa);
    let k = fuentes.indexOf(img.getAttribute("src")), timer = 0;
    const paso = () => {
      k = (k + 1) % fuentes.length;
      capa.src = fuentes[k];
      capa.onload = () => {
        medio.classList.add("cambia");
        setTimeout(() => { img.src = fuentes[k]; medio.classList.remove("cambia"); }, 520);
      };
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        clearInterval(timer);
        if (es[0].isIntersecting) timer = setInterval(paso, 2600);
      }, { threshold: 0.4 }).observe(caja);
    }
  });
})();
