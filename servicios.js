/* ============================================================
   DT SYSTEM · servicios.js — lo que se mueve en las paginas de servicio.
   1. El objeto 3D del hero (los mismos videos de la portada): claro u
      oscuro segun el tema, el chico en el celular, corre solo en pantalla.
   2. Videos diferidos (data-src y data-src-cel): bajan recien al acercarse.
   Con movimiento reducido o ahorro de datos queda la imagen quieta.
   ============================================================ */
(() => {
  "use strict";
  const root = document.documentElement;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData;
  const chico = matchMedia("(max-width: 720px)");
  const tema = () => (root.dataset.theme === "dark" ? "oscuro" : "claro");
  const visibles = new WeakSet();

  const objetos = [...document.querySelectorAll("video.svc-obj")];
  const archivo = (v) => `/assets/srv/${v.dataset.obj}-${tema()}${chico.matches ? "-cel" : ""}.mp4`;
  const poster = (v) => `/assets/srv/${v.dataset.obj}-${tema()}.jpg`;
  const objeto = (v) => {
    if (v.getAttribute("poster") !== poster(v)) v.setAttribute("poster", poster(v));
    if (quieto) return;
    if (visibles.has(v)) {
      if (v.dataset.actual !== archivo(v)) { v.dataset.actual = archivo(v); v.src = v.dataset.actual; }
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  };

  const diferidos = [...document.querySelectorAll("video[data-src]")];
  const diferido = (v) => {
    if (quieto) return;
    if (visibles.has(v)) {
      const src = chico.matches && v.dataset.srcCel ? v.dataset.srcCel : v.dataset.src;
      if (v.dataset.actual !== src) { v.dataset.actual = src; v.src = src; }
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  };

  const todo = () => { objetos.forEach(objeto); diferidos.forEach(diferido); };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) visibles.add(e.target); else visibles.delete(e.target);
      (e.target.classList.contains("svc-obj") ? objeto : diferido)(e.target);
    }), { rootMargin: "200px 0px" });
    [...objetos, ...diferidos].forEach((v) => io.observe(v));
  } else {
    [...objetos, ...diferidos].forEach((v) => visibles.add(v));
  }
  todo();
  new MutationObserver(todo).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  chico.addEventListener("change", todo);
})();
