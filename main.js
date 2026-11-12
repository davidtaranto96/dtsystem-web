/* ============================================================
   DT SYSTEM · WEB PERSONAL v2 — main.js
   Sin dependencias. Comentado en español.
   ============================================================ */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // localStorage tira error si el navegador bloquea el almacenamiento: nunca debe tumbar el script
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  let lang = store.get("dt-lang") || "es";   // idioma actual (ES default)
  const MAIL = "contacto@dtsystem.com.ar";

  /* ---------- 1. TEMA (light/dark) ----------
     El default ya se aplicó con el script inline del <head> (evita flash).
     Al togglear: View Transitions API con reveal circular desde el botón;
     fallback: cross-fade de 0.55s agregando .theme-fade a <html>. */
  const root = document.documentElement;
  function applyTheme(next) { root.dataset.theme = next; store.set("dt-theme", next); }

  $("#themeToggle")?.addEventListener("click", (e) => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const btn = e.currentTarget.getBoundingClientRect();
    const x = btn.left + btn.width / 2;
    const y = btn.top + btn.height / 2;

    if (document.startViewTransition && !reduced) {
      // Guardamos el origen del reveal en variables (--theme-toggle-x/y)
      root.style.setProperty("--theme-toggle-x", x + "px");
      root.style.setProperty("--theme-toggle-y", y + "px");
      const vt = document.startViewTransition(() => applyTheme(next));
      // .catch: si se toglea dos veces rápido, la transición anterior se
      // aborta y su promesa rechaza — lo ignoramos sin ruido en consola.
      vt.ready.then(() => {
        // Radio: distancia del botón a la esquina más lejana del viewport
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        try {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 550, easing: "cubic-bezier(0.4,0,0.2,1)", pseudoElement: "::view-transition-new(root)" }
          );
        } catch { vt.skipTransition(); }
      }).catch(() => {});
      // Red de seguridad: como el CSS anula la animación default de la VT,
      // si animate() del pseudo-elemento falla o el navegador congela la
      // transición (pasa en algunos mobiles), la captura VIEJA quedaría
      // pegada en pantalla. Pasados 900ms la salteamos sí o sí.
      setTimeout(() => { try { vt.skipTransition(); } catch { /* ya terminó */ } }, 900);
    } else if (!reduced) {
      // Fallback: cross-fade de colores
      root.classList.add("theme-fade");
      applyTheme(next);
      setTimeout(() => root.classList.remove("theme-fade"), 600);
    } else {
      // Con reduced-motion, .theme-fade (0,1,1) le gana por especificidad
      // a la regla universal del @media y dispara un cross-fade de 550ms
      // sobre todo el DOM: justo lo que el usuario pidio no tener.
      applyTheme(next);
    }
  });

  /* ---------- 2. BEAM sincronizado al reloj ----------
     El loop dura 4000ms. Con delay negativo -(Date.now()%4000) el beam
     arranca "donde le toca" según la hora: nunca se resetea entre cargas. */
  const beam = $(".bar-beam");
  if (beam) beam.style.animationDelay = `-${(Date.now() % 4000) / 1000}s`;

  /* ---------- 3. Announcement bar dismissible ---------- */
  const bar = $("#bar");
  if (bar) {
    if (store.get("dt-bar-dismissed") === "1") bar.hidden = true;
    $(".bar-x", bar)?.addEventListener("click", () => {
      bar.hidden = true;
      store.set("dt-bar-dismissed", "1");
    });
  }

  /* ---------- 4. TYPEWRITER del hero ----------
     Tipea (85ms/letra), pausa 2.4s, borra (45ms/letra), siguiente palabra. */
  const tw = $("#tw");
  // Lista de palabras según idioma (data-words / data-words-en)
  const getWords = () => (((lang === "en" ? tw.dataset.wordsEn : tw.dataset.words) || tw.dataset.words) || "").split("|");
  if (tw) {
    if (reduced) {
      tw.textContent = getWords()[0]; // estático si el usuario pide menos movimiento
    } else {
      let wi = 0, ci = 0, deleting = false, medidas = "";
      // reserva el ancho de la palabra mas larga (cambia con el idioma)
      const linea = tw.parentNode;
      const reservar = (words) => {
        const prueba = tw.cloneNode();
        prueba.removeAttribute("id");
        prueba.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
        linea.append(prueba);
        let max = 0;
        for (const w of words) { prueba.textContent = w; max = Math.max(max, prueba.getBoundingClientRect().width); }
        prueba.remove();
        const caret = linea.querySelector(".caret");
        linea.style.minWidth = Math.ceil(max + (caret ? caret.getBoundingClientRect().width + 4 : 0)) + "px";
      };
      addEventListener("resize", () => { medidas = ""; }, { passive: true });
      // fuera de pantalla o con la pestaña oculta, la palabra espera
      let enVista = true;
      if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { enVista = e.isIntersecting; }).observe(linea);
      if (document.fonts) document.fonts.ready.then(() => { medidas = ""; });
      (function tick() {
        if (!enVista || document.hidden) { setTimeout(tick, 600); return; }
        const words = getWords();
        if (medidas !== words.join("|") + innerWidth) { reservar(words); medidas = words.join("|") + innerWidth; }
        const word = words[wi % words.length];
        ci = Math.min(ci, word.length) + (deleting ? -1 : 1);
        tw.textContent = word.slice(0, ci);
        let wait = deleting ? 45 : 85;
        if (!deleting && ci >= word.length) { wait = 2400; deleting = true; }
        else if (deleting && ci <= 0) { ci = 0; deleting = false; wi = (wi + 1) % words.length; wait = 350; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- 4b. Portada de autor ----------
     Hora de Salta en vivo, letras del nombre que se levantan cerca del
     puntero, foto que se inclina y vista previa de los trabajos. */
  (() => {
    const hora = $("#haHora");
    if (hora) {
      const fmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Salta" });
      const tic = () => { hora.textContent = fmt.format(new Date()); };
      tic();
      setInterval(tic, 20000);
    }
    const nombre = $("#haNombre");
    if (nombre) {
      let i = 0;
      nombre.innerHTML = nombre.textContent.split(" ").map((p) =>
        "<span style=\"white-space:nowrap\">" + [...p].map((c) => `<span class="l" style="--i:${i++}">${c}</span>`).join("") + "</span>"
      ).join(" ");
    }
    /* Vitrina de la portada: un mazo de ventanas. La de adelante escribe
       su direccion, la pagina aparece, baja a dos o tres secciones con
       pausas y despues la ventana cae y pasa al fondo del mazo. Pasar el
       mouse por un trabajo de la lista lo trae adelante y frena la vuelta.
       Fuera de pantalla, quieta. */
    const show = $("#haFoto");
    if (show && getComputedStyle(show).display !== "none") {
      const SITIOS = [["airesdesanlorenzo.com", "aires"], ["melou.com.ar", "melou"], ["edificiolatorre.com", "latorre"],
        ["lopezpropiedades.com", "lpz"], ["baza.com.ar", "baza"]];
      const molde = $(".ha-win", show);
      const wins = SITIOS.map(([d, n], i) => {
        const w = i ? molde.cloneNode(true) : molde;
        const im = $("img", w);
        if (i) { im.removeAttribute("fetchpriority"); im.removeAttribute("src"); im.dataset.src = `assets/casos/case-${n}.jpg`; show.append(w); }
        $(".ha-url", w).textContent = d;
        w.dataset.p = Math.min(i, 3);
        // todas arrancan en blanco: la pagina aparece recien cuando su ventana
        // pasa adelante y termina de escribir la direccion
        if (!reduced) { w.classList.add("carga"); $(".ha-url", w).textContent = ""; }
        return { w, im, url: $(".ha-url", w), dom: d, full: `assets/casos/full-${n}.webp` };
      });
      let orden = wins.map((_, i) => i), timers = [], visible = true, fijo = false, corriendo = false;
      const espera = (ms) => new Promise((ok) => timers.push(setTimeout(ok, ms)));
      const cortar = () => { timers.forEach(clearTimeout); timers = []; corriendo = false; };
      // una sola descarga por ventana, aunque la pidan la precarga y la visita
      const entera = (v) => v.descarga || (v.descarga = new Promise((ok) => {
        const f = new Image();
        f.onload = () => { delete v.im.dataset.src; v.im.src = f.src; ok(); };
        f.onerror = ok;
        f.src = v.full;
      }));
      // la visita no espera mas de 2,5 s: si la pagina entera no llego, arranca con la captura
      const poner = (v) => { if (v.im.dataset.src) { v.im.src = v.im.dataset.src; delete v.im.dataset.src; } };
      const lista = (v) => { poner(v); return Promise.race([entera(v), espera(2500)]); };
      const ubicar = () => orden.forEach((i, pos) => { wins[i].w.dataset.p = Math.min(pos, 3); });
      // sin transicion: para volver una ventana a cero mientras nadie la ve
      const aCero = (v) => {
        v.w.classList.add("quieta");
        v.im.style.transform = "";
        v.w.getBoundingClientRect();
        v.w.classList.remove("quieta");
      };
      const visita = async (v, mia) => {
        // si ya esta cargada (la trajo el mouse), no la vuelve a escribir
        if (v.w.classList.contains("carga")) {
          v.url.textContent = ""; v.url.classList.add("escribe");
          await espera(200);
          for (const ch of v.dom) { if (mia !== corriendo) return; v.url.textContent += ch; await espera(30); }
          v.url.classList.remove("escribe");
          await lista(v);
          if (mia !== corriendo) return;
          v.w.classList.remove("carga");
          await espera(1100);
        }
        const viaje = v.im.offsetHeight - v.im.parentNode.offsetHeight;
        for (const f of [0.16, 0.36, 0.58]) {
          if (mia !== corriendo || viaje <= 0) break;
          v.im.style.transform = `translateY(${-Math.min(viaje, v.im.offsetHeight * f).toFixed(0)}px)`;
          await espera(1900);
        }
      };
      const vuelta = async () => {
        if (corriendo || fijo || !visible) return;
        const mia = corriendo = {};
        while (mia === corriendo) {
          const v = wins[orden[0]];
          await visita(v, mia);
          if (mia !== corriendo) return;
          // la de adelante cae; las de atras avanzan un lugar
          v.w.classList.add("sale");
          orden.push(orden.shift()); ubicar();
          v.w.dataset.p = 0;
          await espera(700);
          v.w.classList.add("quieta"); v.w.classList.remove("sale");
          v.w.dataset.p = 3; aCero(v);
          v.w.classList.add("carga"); v.url.textContent = "";
          v.w.classList.remove("quieta");
          ubicar();
          await espera(500);
        }
      };
      if (!reduced) {
        // las paginas enteras se bajan de a una, en orden:
        // cuando a cada ventana le toca pasar adelante ya esta lista
        // (despues del load, para no competir con lo critico; la primera visita la pide igual)
        const precargar = () => wins.reduce((p, v) => p.then(() => entera(v)), Promise.resolve());
        if (matchMedia("(min-width: 981px)").matches) {
          if (document.readyState === "complete") precargar(); else addEventListener("load", precargar, { once: true });
        }
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) vuelta(); else cortar(); }).observe(show);
        $$(".ha-casos a").forEach((a) => {
          const i = SITIOS.findIndex(([d]) => a.href.includes(d));
          if (i < 0) return;
          // el mouse tiene que quedarse un momento sobre el trabajo: pasar de largo no cambia la ventana
          let pide = 0;
          a.addEventListener("pointerenter", () => { clearTimeout(pide); pide = setTimeout(traer, 450); });
          const traer = () => {
            fijo = true; cortar();
            wins.forEach((v) => { v.w.classList.remove("sale"); v.url.classList.remove("escribe"); });
            poner(wins[i]);
            wins.forEach((v, k) => {
              v.w.classList.toggle("carga", k !== i);
              v.url.textContent = k === i ? v.dom : "";
            });
            const pos = orden.indexOf(i);
            orden = [...orden.slice(pos), ...orden.slice(0, pos)];
            wins.forEach(aCero); ubicar();
          };
          a.addEventListener("pointerleave", () => { clearTimeout(pide); if (fijo) { fijo = false; vuelta(); } });
        });
      }
    }

    const hero = $(".ha");
    if (!hero || reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const letras = $$(".l", nombre);
    const foto = $("#haFoto");
    let px = 0, py = 0, raf = 0;
    const pintar = () => {
      raf = 0;
      for (const l of letras) {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        l.style.setProperty("--k", Math.max(0, 1 - d / 170).toFixed(3));
      }
      if (foto && foto.offsetWidth) {
        const r = hero.getBoundingClientRect();
        const x = (px - r.left) / r.width - 0.5, y = (py - r.top) / r.height - 0.5;
        foto.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
        foto.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
      }
    };
    hero.addEventListener("pointermove", (e) => {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(pintar);
    });
    hero.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf); raf = 0;
      letras.forEach((l) => l.style.setProperty("--k", 0));
      if (foto) ["--rx", "--ry"].forEach((v) => foto.style.removeProperty(v));
    });
  })();

  /* Cards de proyectos: con mouse, la primera vez que el puntero entra se
     carga la pagina entera y se monta encima de la captura. La duracion
     del recorrido sale de lo larga que es, para que baje a ritmo parejo. */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".demo-shot[data-full]").forEach((shot) => {
      shot.closest(".demo").addEventListener("pointerenter", () => {
        if (shot.querySelector(".full")) return;
        const im = new Image();
        im.className = "full"; im.alt = ""; im.decoding = "async";
        im.onload = () => {
          const viaje = im.offsetHeight - shot.offsetHeight;
          shot.style.setProperty("--dur", Math.min(12, Math.max(2.5, viaje / 260)).toFixed(1) + "s");
          shot.classList.add("lista");
        };
        im.src = shot.dataset.full;
        shot.append(im);
      });
    });
  }

  /* Cards de sistemas: un recorrido grabado del CRM. Con mouse arranca al
     entrar y se pausa al salir; en el celular, mientras la card está a la
     vista. El video se pide recién la primera vez, nunca al cargar. */
  const vidShots = reduced ? [] : $$(".demo-shot[data-video]");
  const montarVideo = (shot) => {
    let v = shot.querySelector("video");
    if (!v) {
      v = document.createElement("video");
      v.className = "vid"; v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute("aria-hidden", "true");
      v.addEventListener("playing", () => shot.classList.add("sonando"));
      v.src = (matchMedia("(max-width: 720px)").matches && shot.dataset.videoCel) || shot.dataset.video;
      shot.append(v);
    }
    return v;
  };
  const sonar = (shot) => { montarVideo(shot).play().catch(() => {}); };
  const callar = (shot) => {
    const v = shot.querySelector("video");
    shot.classList.remove("sonando");
    if (v) v.pause();
  };
  if (vidShots.length && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    vidShots.forEach((shot) => {
      const card = shot.closest(".demo");
      card.addEventListener("pointerenter", () => sonar(shot));
      card.addEventListener("pointerleave", () => callar(shot));
    });
  } else if (vidShots.length && "IntersectionObserver" in window && !navigator.connection?.saveData) {
    // suena uno solo: de los que se ven en más de un 60 %, el más cerca del
    // centro de la pantalla (las dos cards caben enteras en un celular alto)
    const vistos = new Map();
    const elegir = () => {
      let mejor = null, dist = Infinity;
      vistos.forEach((r, shot) => {
        if (r < 0.6) return;
        const b = shot.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - innerHeight / 2);
        if (d < dist) { mejor = shot; dist = d; }
      });
      vidShots.forEach((shot) => (shot === mejor ? sonar(shot) : callar(shot)));
    };
    const vio = new IntersectionObserver((ents) => {
      ents.forEach((en) => vistos.set(en.target, en.intersectionRatio));
      elegir();
    }, { threshold: [0, 0.6, 0.8, 1] });
    let pend = 0;
    addEventListener("scroll", () => {
      if (pend || ![...vistos.values()].some((r) => r >= 0.6)) return;
      pend = setTimeout(() => { pend = 0; elegir(); }, 150);
    }, { passive: true });
    vidShots.forEach((shot) => vio.observe(shot));
  }

  /* ---------- 5. PARALLAX de los screenshots flotantes ----------
     data-depth 2..4 → desplazamiento máx ~18px. Batched con rAF. */
  const floats = $$(".float");
  if (floats.length && !reduced && matchMedia("(hover: hover)").matches) {
    let mx = 0, my = 0, raf = null;
    addEventListener("mousemove", (e) => {
      mx = e.clientX / innerWidth - 0.5;   // -0.5 .. 0.5
      my = e.clientY / innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = null;
        for (const f of floats) {
          const d = +f.dataset.depth || 2;          // 2..4
          f.style.setProperty("--px", (-mx * d * 9).toFixed(1) + "px"); // 4*9*0.5 = 18px máx
          f.style.setProperty("--py", (-my * d * 9).toFixed(1) + "px");
        }
      });
    }, { passive: true });
  }

  /* ---------- 6. SPOTLIGHT de cursor (rAF) ---------- */
  const spot = $(".fx-spot");
  if (spot && !reduced && matchMedia("(hover: hover)").matches) {
    let sx = 0, sy = 0, sraf = null;
    addEventListener("mousemove", (e) => {
      sx = e.clientX; sy = e.clientY;
      if (!sraf) sraf = requestAnimationFrame(() => {
        sraf = null;
        spot.style.setProperty("--mx", sx + "px");
        spot.style.setProperty("--my", sy + "px");
      });
    }, { passive: true });
  }

  /* ---------- 7. Video del laptop: se baja y arranca al acercarse, pausa fuera del viewport.
     Con movimiento reducido queda el poster. ---------- */
  const vid = $("#lapVideo");
  if (vid && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting && !reduced) vid.play().catch(() => {}); else vid.pause();
      }
    }, { rootMargin: "200px 0px" }).observe(vid);
  }

  /* ---------- 8. Chips de password copiables ---------- */
  $$(".pw").forEach((chip) => {
    chip.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      try {
        await navigator.clipboard.writeText(chip.dataset.pw || "");
        const prev = chip.textContent;
        chip.classList.add("copied");
        chip.textContent = "Copied ✓";
        setTimeout(() => { chip.classList.remove("copied"); chip.textContent = prev; }, 1500);
      } catch { /* clipboard bloqueado: no hacemos nada */ }
    });
  });

  /* ---------- 9. FORMULARIO IA → WhatsApp con briefing prellenado ----------
     Sin backend: arma el mensaje con los campos y abre wa.me?text=.
     Validación nativa (required) + estado loading en el botón. */
  const aiForm = $("#aiForm");
  if (aiForm) {
    // Chips de tipo de proyecto (selección única, solo entre data-val)
    $$(".af-chip[data-val]", aiForm).forEach((ch) =>
      ch.addEventListener("click", () => {
        $$(".af-chip[data-val]", aiForm).forEach((c) => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
        ch.classList.add("on"); ch.setAttribute("aria-pressed", "true");
      })
    );
    // Canal de envío (WhatsApp/Email) + hint acorde
    const afHint = $("#afHint");
    $$(".af-chip[data-via]", aiForm).forEach((ch) =>
      ch.addEventListener("click", () => {
        $$(".af-chip[data-via]", aiForm).forEach((c) => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
        ch.classList.add("on"); ch.setAttribute("aria-pressed", "true");
        const mail = ch.dataset.via === "mail";
        if (afHint) afHint.textContent = lang === "en"
          ? (mail ? "Opens your email app with the briefing ready to send." : "Opens WhatsApp with your briefing ready to send.")
          : (mail ? "Se abre tu correo con el briefing listo para enviar." : "Se abre en WhatsApp con tu briefing listo para enviar.");
      })
    );
    // Enter en un campo pasa al siguiente (el teclado del celular dice
    // "Siguiente"); en el textarea hace un renglón nuevo y el envío es el botón
    const campos = $$("input, textarea", aiForm);
    campos.forEach((c, i) => c.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || c.tagName === "TEXTAREA") return;
      e.preventDefault();
      campos[i + 1]?.focus();
    }));
    // Auto-grow del textarea (fallback donde no hay field-sizing)
    const ta = $("textarea", aiForm);
    ta?.addEventListener("input", () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    });
    aiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      aiForm.classList.add("tried");
      if (!aiForm.checkValidity()) { aiForm.reportValidity(); return; }
      const btn = $(".af-send", aiForm);
      if (btn.classList.contains("is-loading")) return;
      const nombre = aiForm.nombre.value.trim();
      const tipo = $(".af-chip.on[data-val]", aiForm)?.dataset.val || "";
      const idea = aiForm.idea.value.trim();
      const via = $(".af-chip.on[data-via]", aiForm)?.dataset.via || "wa";
      // Briefing multilínea (para email); en wa.me también respeta los saltos
      const L = lang === "en"
        ? { hi: `Hi! I'm ${nombre}`, need: "I need", idea: "My idea", subj: `Project inquiry \u2014 ${nombre}` }
        : { hi: `\u00a1Hola! Soy ${nombre}`, need: "Necesito", idea: "Mi idea", subj: `Consulta de proyecto \u2014 ${nombre}` };
      const msg = [
        L.hi,
        `${L.need}: ${tipo}`,
        `${L.idea}: ${idea}`
      ].filter(Boolean).join("\n");
      // Sin espera artificial: no hay backend que esperar, el spinner
      // simulaba trabajo inexistente y le costaba 600ms a la conversion.
      // La clase sigue puesta un rato porque es el guard anti doble-submit
      // (se chequea arriba), pero ya no bloquea el envio.
      btn.classList.add("is-loading");
      setTimeout(() => btn.classList.remove("is-loading"), 1200);
      if (via === "mail") {
        location.href = `mailto:${MAIL}?subject=${encodeURIComponent(L.subj)}&body=${encodeURIComponent(msg)}`;
      } else {
        open(`https://wa.me/5493875454070?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      }
    });
  }

  /* ---------- 10. Acordeón del footer (solo mobile) ----------
     Una columna abierta a la vez; max-height animado por CSS.
     Con teclado: en el celular cada título es un botón (Enter o espacio). */
  const fMq = matchMedia("(max-width: 720px)");
  const fHeads = $$(".f-col h4");
  function fToggle(h) {
    if (!fMq.matches) return;
    const col = h.parentElement;
    const wasOpen = col.classList.contains("open");
    $$(".f-col.open").forEach((c) => { c.classList.remove("open"); $("h4", c)?.setAttribute("aria-expanded", "false"); });
    if (!wasOpen) { col.classList.add("open"); h.setAttribute("aria-expanded", "true"); }
  }
  function fModo() {
    fHeads.forEach((h) => {
      if (fMq.matches) {
        h.setAttribute("role", "button"); h.tabIndex = 0;
        h.setAttribute("aria-expanded", String(h.parentElement.classList.contains("open")));
      } else {
        h.removeAttribute("role"); h.removeAttribute("tabindex"); h.removeAttribute("aria-expanded");
      }
    });
  }
  fHeads.forEach((h) => {
    h.addEventListener("click", () => fToggle(h));
    h.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fToggle(h); }
    });
  });
  fModo();
  fMq.addEventListener("change", fModo);

  /* ---------- 11. Menú mobile: hoja a pantalla completa ----------
     Abierto, tapa la página, que queda inert y sin scroll (CSS). Idioma y
     tema se cambian sin cerrarlo; cierra al navegar, con Escape o si la
     ventana pasa a escritorio. --menu-top es donde termina el header. */
  const menu = $("#menu");
  const fondo = [$("#bar"), $("#main"), $(".footer")].filter(Boolean);
  $("summary", menu || document)?.addEventListener("click", () => {
    menu.style.setProperty("--menu-top", `${Math.round($(".hdr-pill").getBoundingClientRect().bottom)}px`);
  });
  menu?.addEventListener("toggle", () => fondo.forEach((el) => { el.inert = menu.open; }));
  $$(".menu-pop a", menu || document).forEach((a) =>
    a.addEventListener("click", () => menu?.removeAttribute("open"))
  );
  addEventListener("click", (e) => {
    if (menu?.open && !menu.contains(e.target) && !e.target.closest(".tgl")) menu.removeAttribute("open");
  });
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menu?.open) return;
    menu.removeAttribute("open");
    $("summary", menu).focus();
  });
  matchMedia("(min-width: 841px)").addEventListener("change", (e) => { if (e.matches) menu?.removeAttribute("open"); });

  /* ---------- 12. Count-up de stats del bento ----------
     Cuentan de 0 al valor (~1s, easeOutCubic) al entrar al viewport.
     Con reduced-motion muestran el valor final directo. */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target, target = +el.dataset.count, suf = el.dataset.suffix || "";
        if (reduced) { el.textContent = target + suf; return; }
        const t0 = performance.now();
        (function step(t) {
          const p = Math.min((t - t0) / 1000, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => {
      if (!reduced) c.textContent = "0" + (c.dataset.suffix || "");
      cio.observe(c);
    });
  }

  /* ---------- 13. Títulos palabra por palabra (Stökt) ----------
     Partimos cada .h2 en <span class="w">; al entrar al viewport (una
     sola vez) se agrega .in → fade + subida con stagger de 40ms (CSS). */
  const splitH2 = (hEl) => {
    hEl.innerHTML = hEl.textContent.trim().split(/\s+/)
      .map((w, i) => `<span class="w" style="--w:${i}">${w}</span>`).join(" ");
  };
  if (!reduced) {
    const heads = $$(".h2");
    heads.forEach(splitH2);
    const hio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); hio.unobserve(en.target); }
      });
    }, { threshold: 0.25 });
    heads.forEach((h) => hio.observe(h));
  }

  /* ---------- 14. Border beams sincronizados al reloj ----------
     Mismo truco que el announcement bar: delay negativo según Date.now()
     para que el destello nunca se resetee entre cargas. */
  $$(".beam-card").forEach((el) =>
    el.style.setProperty("--bb-delay", `-${(Date.now() % 4500) / 1000}s`)
  );

  /* ---------- 15. GLOBO PUNTEADO (canvas, estilo Stökt) ----------
     Sin librerías: mapa del mundo como bitmask ASCII (48×24 celdas de
     7.5°), cada celda de tierra genera 4 subpuntos → se proyectan con
     proyección ortográfica (rotación Y continua + tilt X fijo) y se
     dibujan solo los del hemisferio visible, con alpha según profundidad.
     Marker celeste pulsante en Salta (-24.8, -65.4). */
  const globeC = $("#globeCanvas");
  if (globeC) {
    const gctx = globeC.getContext("2d");
    const D2R = Math.PI / 180;
    const ll = (lat, lon) => ({
      x: Math.cos(lat * D2R) * Math.sin(lon * D2R),
      y: Math.sin(lat * D2R),
      z: Math.cos(lat * D2R) * Math.cos(lon * D2R)
    });
    // Costas REALES (Natural Earth 110m) horneadas en assets/land-data.js:
    // anillos de costa como polilíneas + puntos interiores pre-calculados.
    const coastLines = [], land = [];
    if (window.LAND_DATA) {
      for (const ring of window.LAND_DATA.coast) {
        const line = [];
        for (let i = 0; i < ring.length; i += 2) line.push(ll(ring[i + 1], ring[i]));
        coastLines.push(line);
      }
      const d = window.LAND_DATA.dots;
      for (let i = 0; i < d.length; i += 2) land.push(ll(d[i + 1], d[i]));
    }
    // Graticule como POLILÍNEAS (cada 10°, muestreadas cada 3°) — mucho más
    // parecido a Stökt que los puntitos: paralelos y meridianos continuos.
    const parallels = [], meridians = [];
    for (let lat = -80; lat <= 80; lat += 8) {
      const line = [];
      for (let lon = -180; lon <= 180; lon += 3) line.push(ll(lat, lon));
      parallels.push(line);
    }
    for (let lon = -180; lon < 180; lon += 8) {
      const line = [];
      for (let lat = -90; lat <= 90; lat += 3) line.push(ll(lat, lon));
      meridians.push(line);
    }
    const salta = ll(-24.7859, -65.4117);   // Salta Capital, exacto
    // Inclinación de reposo. En escritorio el globo asoma recortado como
    // un domo: Salta va al tercio de arriba, no pegada al borde. Si se ve
    // entero (celular), Salta va al centro.
    const recortado = () => globeC.parentElement.clientHeight < globeC.clientWidth * 0.9;
    let TILT0 = recortado() ? -0.78 : -0.43;
    addEventListener("resize", () => { TILT0 = recortado() ? -0.78 : -0.43; }, { passive: true });
    const ROT0 = 65.4 * D2R;            // arranca con Salta de frente
    const SPEED = 0.0028;               // velocidad de crucero
    const TAU = Math.PI * 2;
    let rot = ROT0, tilt = TILT0, vRot = 0, vTilt = 0;
    let modo = "auto";                  // auto | arrastre | inercia
    let quietoDesde = 0;
    let visible = true, dpr = Math.min(devicePixelRatio || 1, 2);

    // Arrastrar para girar: horizontal con mouse y con el dedo; vertical
    // solo con mouse, porque en el celular el gesto vertical es el scroll
    // (touch-action: pan-y en el CSS).
    let px = 0, py = 0, pt = 0, puntero = null;
    globeC.addEventListener("pointerdown", (e) => {
      puntero = e.pointerType;
      globeC.setPointerCapture(e.pointerId);
      px = e.clientX; py = e.clientY; pt = performance.now();
      vRot = vTilt = 0; modo = "arrastre";
      globeC.classList.add("agarrado");
    });
    globeC.addEventListener("pointermove", (e) => {
      if (modo !== "arrastre") return;
      const R = (globeC.clientWidth || 400) / 2;
      const now = performance.now(), dt = Math.max(now - pt, 1);
      const dr = (e.clientX - px) / R;
      const dtl = puntero === "mouse" ? (e.clientY - py) / R : 0;
      rot += dr; tilt = Math.max(-1.25, Math.min(0.9, tilt + dtl));
      // velocidad suavizada, en radianes por cuadro de 16 ms
      vRot = vRot * 0.5 + (dr / dt) * 16 * 0.5;
      vTilt = vTilt * 0.5 + (dtl / dt) * 16 * 0.5;
      px = e.clientX; py = e.clientY; pt = now;
      if (reduced) drawGlobe(now);
    });
    const soltar = () => {
      if (modo !== "arrastre") return;
      globeC.classList.remove("agarrado");
      // Si el dedo se quedó quieto antes de soltar, no hay tiro
      if (performance.now() - pt > 90) vRot = vTilt = 0;
      modo = reduced ? "auto" : "inercia";
      quietoDesde = 0;
    };
    globeC.addEventListener("pointerup", soltar);
    globeC.addEventListener("pointercancel", () => { vRot = vTilt = 0; soltar(); });

    // Distancia angular de Salta al frente: el giro automático frena al
    // pasar por ahí, así en cada vuelta se ve dónde está.
    const aSalta = () => { const d = ((rot - ROT0) % TAU + TAU) % TAU; return Math.min(d, TAU - d); };
    function paso(now) {
      if (modo === "inercia") {
        rot += vRot; tilt = Math.max(-1.25, Math.min(0.9, tilt + vTilt));
        vRot *= 0.95; vTilt *= 0.9;
        if (Math.abs(vRot) < 0.0004 && Math.abs(vTilt) < 0.0004) {
          if (!quietoDesde) quietoDesde = now;
          if (now - quietoDesde > 1400) { modo = "auto"; vRot = 0; }
        }
      } else if (modo === "auto") {
        const d = aSalta();
        const x = Math.min(d / 0.7, 1);
        const meta = SPEED * (0.12 + 0.88 * x * x * (3 - 2 * x));
        vRot += (meta - vRot) * 0.03;            // arranca y frena sin saltos
        rot += vRot;
        tilt += (TILT0 - tilt) * 0.02;           // vuelve solo a la inclinación de reposo
      }
    }

    // Proyecta un punto: rotación Y + tilt X. Devuelve [sx, sy, prof]
    function proj(p, cx, cy, R, cosR, sinR, cosT, sinT) {
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      const y2 = p.y * cosT - z1 * sinT;
      const z2 = p.y * sinT + z1 * cosT;
      return [cx + x1 * R, cy - y2 * R, z2];
    }

    function drawGlobe(now) {
      const w = globeC.clientWidth || 400;
      if (globeC.width !== Math.round(w * dpr)) { globeC.width = Math.round(w * dpr); globeC.height = Math.round(w * dpr); }
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.clearRect(0, 0, w, w);
      // La sección bento está invertida: en página clara el card es oscuro
      const darkCard = root.dataset.theme !== "dark";
      const ink = darkCard ? "242,242,242" : "23,24,27";
      const cx = w / 2, cy = w / 2, R = w / 2 - 6;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      // Contorno
      gctx.strokeStyle = `rgba(${ink},0.28)`;
      gctx.lineWidth = 1;
      gctx.beginPath(); gctx.arc(cx, cy, R, 0, 7); gctx.stroke();
      // Graticule: líneas continuas del hemisferio visible (se corta el
      // trazo cuando el punto pasa al hemisferio oculto)
      gctx.strokeStyle = `rgba(${ink},0.10)`;
      gctx.lineWidth = 0.7;
      for (const line of [...parallels, ...meridians]) {
        gctx.beginPath();
        let pen = false;
        for (const p of line) {
          const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
          if (z > -0.02) { pen ? gctx.lineTo(sx, sy) : gctx.moveTo(sx, sy); pen = true; }
          else pen = false;
        }
        gctx.stroke();
      }
      // Tierra: textura punteada tenue (el mar queda liso, como Stökt)
      gctx.fillStyle = `rgba(${ink},0.38)`;
      for (const p of land) {
        const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
        if (z <= 0) continue;
        const s = 1 + z * 0.7;
        gctx.fillRect(sx, sy, s, s);
      }
      // COSTAS: polilíneas reales nítidas — el contorno de países/continentes
      gctx.strokeStyle = `rgba(${ink},0.95)`;
      gctx.lineWidth = 1.1;
      gctx.lineJoin = "round";
      for (const line of coastLines) {
        gctx.beginPath();
        let pen = false;
        for (const p of line) {
          const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
          if (z > -0.02) { pen ? gctx.lineTo(sx, sy) : gctx.moveTo(sx, sy); pen = true; }
          else pen = false;
        }
        gctx.stroke();
      }
      // Marker de Salta: celeste con halo pulsante
      const [mx2, my2, mz] = proj(salta, cx, cy, R, cosR, sinR, cosT, sinT);
      if (mz > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 350);
        gctx.strokeStyle = `rgba(82,191,254,${(0.5 * (1 - pulse)).toFixed(2)})`;
        gctx.lineWidth = 1.5;
        gctx.beginPath(); gctx.arc(mx2, my2, 7 + 9 * pulse, 0, 7); gctx.stroke();
        gctx.fillStyle = `rgba(82,191,254,${(0.3 * pulse).toFixed(2)})`;
        gctx.beginPath(); gctx.arc(mx2, my2, 11, 0, 7); gctx.fill();
        gctx.fillStyle = "#52BFFE";
        gctx.beginPath(); gctx.arc(mx2, my2, 4.2, 0, 7); gctx.fill();
        // Etiqueta "SALTA" junto al marker, para ubicarla sin dudas
        gctx.font = "600 10px 'Geist Mono', monospace";
        gctx.fillStyle = `rgba(${ink},0.9)`;
        gctx.fillText("SALTA", mx2 + 12, my2 + 3);
      }
    }

    if (reduced) {
      // Sin giro solo ni inercia: se redibuja únicamente al arrastrar
      requestAnimationFrame((t) => drawGlobe(t));
    } else {
      (function loop(t) {
        if (visible || modo !== "auto") {
          paso(t || 0);
          drawGlobe(t || 0);
        }
        requestAnimationFrame(loop);
      })(0);
      if ("IntersectionObserver" in window)
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.05 })
          .observe(globeC);
    }
  }

  /* ---------- 16. i18n: ES (default, inline en el HTML) / EN ----------
     Cada elemento traducible lleva data-i18n="clave". Al cambiar a EN se
     guarda el HTML original en data-es y se pisa con el diccionario; al
     volver a ES se restaura. Persistido en localStorage (dt-lang). */
  const EN = {
    skip: "Skip to content",
    bar_t: "Available for <span class=\"bar-largo\">new </span>projects<span class=\"bar-largo\"> \u2014</span>",
    bar_l: "Chat on WhatsApp",
    nav_inicio: "Home", nav_prod: "Services", nav_proy: "Projects", nav_sobre: "About me", nav_contacto: "Contact",
    chat: "Get in touch",
    hero_t: "Building your", hero_sr: "idea, website, store, system or app",
    acc_casos: "See projects",
    hero_foto: "Founder of DT System",
    hero_casos: "Recent projects",
    hero_sub: "I design websites, online stores and management systems for companies and ventures. I take care of the whole project, from the first sketch to ongoing support.",
    cta_hero: "Chat on WhatsApp \u2192",
    cta_work: "See projects",
    cta_cot: "Get a quote",
    cta_cont: "Contact",
    bajar: "Scroll for more",
    dest_sub: "Some of the sites I built, live and in use.",
    af_ph_n: "Jane Smith",
    af_ph_i: "A website for my real-estate agency, with listings and WhatsApp inquiries",
    mob_h: "Most of your customers arrive on their phone. Every project is designed for that screen first.",
    srv_h: "Choose where to start.",
    srv_it: "<b>I also handle the technical side:</b> your own domain and email, Microsoft 365 or Google Workspace, backups and access.",
    faq_h: "Frequently asked questions.",
    lk_web: "Web design", lk_tienda: "Online stores", lk_sys: "About this service", lk_auto: "About this service", f_serv: "Services",
    faq_q1: "How much does a website or a system cost?",
    faq_a1: "It depends on the scope. Before starting I send you a quote split into stages, with what it includes and what it doesn't, paid in three installments.",
    faq_q2: "How long does it take?",
    faq_a2: "That also depends on the scope. Each stage of the quote has its own deadline, so from day one you know when you'll see each part working.",
    faq_q3: "Do you only work with clients in Salta?",
    faq_a3: "No. I'm based in Salta and work with clients across Argentina and abroad, over video calls and WhatsApp.",
    faq_q4: "Can I change the texts and photos myself?",
    faq_a4: "Yes. Websites come with a simple panel to change texts, prices, photos and dates without touching code.",
    faq_q5: "Do you build Shopify stores?",
    faq_a5: "Yes. I build the store with a custom design, payments, shipping and the catalog loaded, and it stays in your name.",
    faq_q6: "What is a custom management system?",
    faq_a6: "A CRM or panel built for your business: clients, quotes, payments, stock or bookings, with the permissions each person needs. It works on computer and phone.",
    faq_q7: "What happens after delivery?",
    faq_a7: "I stay available for support and changes. If you want, a monthly plan covers maintenance, the domain and adjustments.",
    srv_sub: "Five services, all built for your business. Start with one and add another when you need it.",
    ribbon: "Most requested",
    s1_h: "Webs & Stores",
    s1_tag: "Your business well presented, and a short path from visit to inquiry.",
    s1_l1: "Custom corporate website or landing page design",
    s1_l2: "Shopify online store with payments and shipping",
    s1_l3: "Ready to show up on Google and receive inquiries on WhatsApp",
    see_more: "Get in touch →",
    acc_pill: "See details \u2192",
    acc_reset: "\u2715 Close details",
    s2_h: "Management systems",
    s2_tag: "Your own CRM or management system to keep clients, sales and payments in one place.",
    s2_l1: "Client and opportunity management",
    s2_l2: "Quotes, invoicing and reports",
    s2_l3: "Access portal for your clients",
    s3_h: "Mobile apps",
    s3_tag: "Android and iPhone apps, from prototype to launch.",
    s3_l1: "Design and clickable prototype",
    s3_l2: "One app for Android and iPhone",
    s3_l3: "Publishing on Google Play and the App Store",
    s4_h: "Automation",
    s4_tag: "The tasks repeated by hand every day, handled without anyone touching them.",
    s4_l2: "Automated tasks in Outlook, Excel and Teams",
    s4_l3: "Connecting the tools you already use",
    s5_h: "3D projects",
    s5_tag: "3D models of buildings, land lots and houses, to show the project before it's finished.",
    s5_l1: "A model you explore in the browser, built from the plans",
    s5_l2: "Every unit or lot with its status: available, reserved or sold",
    s5_l3: "For developers, engineers and real-estate agents",
    lk_3d: "About this service",
    td_h: "3D projects",
    td_sub: "Models you explore in the browser, built from the plans.",
    lap_h: "This is how a custom system works.",
    lap_sub: "A walkthrough of a system in use, with sample data.",
    about_h: "The person behind the system.",
    f_p1: "Identity & Access Engineer at DXC Technology, a global IT services company, and Computer Engineering student. Over five years of experience with Microsoft 365, Azure and automation.",
    f_p2: "Besides websites and stores, I build custom management systems: CRMs that keep a team's inquiries, tasks and payments in order.",
    f_p3: "I handle every project from the first meeting to launch: one person in charge, by name. When the scope calls for it, I bring in specialists.",
    f_cta: "Start a project",
    f_in: "See my LinkedIn profile",
    f_h: "Who’s behind it",
    st1: "Years in systems", st3: "Sites in Argentina and Mexico",
    globe_h: "Based in Salta, Argentina",
    avail: "AVAILABLE \u00b7 REMOTE WORK",
    tools_h: "Tools I work with",
    test_h: "Results, not promises.",
    mk_h: "Some of my clients",
    f_role: "Founder · DT System",
    cs_h: "Projects.",
    cs_sub: "Websites and stores that are live, plus demos of what I'm building.",
    cs_f0: "All", cs_f1: "Sites & stores", cs_f2: "Management systems",
    cs_f3: "Mobile apps", cs_f4: "Automation",
    // CASOS:INICIO
    c13s: "Real-estate development · Salta",
    c14s: "Real-estate portal · Salta",
    c19s: "Real-estate portal linked to the system · Salta",
    c28s: "Real-estate agency · Salta",
    c1s: "Site + bookings · Salta retreats",
    c2s: "Custom store · leather atelier",
    c29s: "Accounting firm · Salta",
    c16s: "Yucatán chukum · bilingual",
    c4s: "Trilingual corporate site · agri",
    c5s: "Gated community · real estate",
    c22s: "Digital wedding invitations",
    c20s: "Countryside lodge · Misiones",
    c21s: "Insurance advisors · Salta",
    c12s: "Real-estate brokerage · Salta",
    c31s: "Apartments and bookings · La Paz",
    c32s: "Journalist and host · podcast",
    c17s: "Original artwork shop · Barcelona",
    c18s: "Bags made from textile waste · Salta",
    c3d1: "3D model with every unit's status",
    c30s: "Print shop · Orán",
    or_c: "Client", or_p: "Own", st_wip: "In progress", st_live: "Live", st_demo: "Demo", st_uso: "In use",
    // CASOS:FIN
    cta_h: "Let’s talk.",
    cta_sub: "Tell me what you need. Fill in the form and WhatsApp or your email opens with the message ready to send.",
    af_head: "Tell me about your project",
    af_name: "Your name",
    af_via: "Send via",
    af_type: "What do you need?",
    af_t1: "Web / Store", af_t2: "Management system", af_t3: "Mobile app", af_t4: "Automation", af_t6: "3D project", af_t5: "Other",
    af_idea: "Your idea, in a few words",
    cs_mas: "See all projects",
    cs_todos: "All projects.",
    wip_h: "Next to launch",
    wip_sub: "Client work I'm building right now.",
    sys_h: "Management systems",
    sys_sub: "Custom CRMs that keep a team's inquiries, tasks and payments in order. Shown with made-up data.",
    app_h: "Mobile apps",
    app_sub: "My own apps, published on the store.",
    af_hint: "Opens WhatsApp with your message ready to send.",
    af_send: "Send inquiry",
    f_tag: "Custom websites, stores and systems, made in Salta.",
    nl_h: "News & new work",
    nl_p: "What I’m launching, first on Instagram.",
    nl_btn: "Follow on Instagram \u2197",
    f_cont: "Contact",
    f_wa: "WhatsApp", f_status: "Available for projects",
    made: "Made in Salta, Argentina"
  };
  const langLbl = $("#langLabel");
  // la frase de cada servicio también se lee con el panel cerrado
  $$(".acc-p").forEach((p) => {
    const tag = $(".srv-tag", p), h = $(".acc-cover h3", p);
    if (!tag || !h) return;
    const f = tag.cloneNode(true);
    f.className = "acc-frase";
    h.after(f);
  });
  let titleEs, descEs;
  function setLang(l, animate) {
    lang = l;
    store.set("dt-lang", l);
    document.documentElement.lang = l === "en" ? "en" : "es";
    if (langLbl) langLbl.textContent = l.toUpperCase();
    // la pestaña y la descripción también cambian de idioma
    const desc = $('meta[name="description"]');
    if (titleEs === undefined) { titleEs = document.title; descEs = desc?.content; }
    document.title = l === "en" ? "David Taranto — Custom websites and systems | DT System, Salta" : titleEs;
    if (desc) desc.content = l === "en" ? "Custom websites, online stores and management systems for companies and ventures. I take care of the whole project, from the first sketch to support. Made in Salta, Argentina." : descEs;
    $$("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      if (el.dataset.es === undefined) el.dataset.es = el.innerHTML; // snapshot ES
      const v = l === "en" ? EN[k] : el.dataset.es;
      if (v !== undefined) el.innerHTML = v;
    });
    // Ejemplos de los campos del formulario (data-i18n-ph = clave)
    $$("[data-i18n-ph]").forEach((el) => {
      if (el.dataset.esPh === undefined) el.dataset.esPh = el.placeholder;
      el.placeholder = l === "en" ? (EN[el.dataset.i18nPh] ?? el.dataset.esPh) : el.dataset.esPh;
    });
    // Etiquetas para lectores de pantalla (data-i18n-aria = clave)
    const ARIA_EN = { nav: "Main", bar_x: "Close announcement", theme: "Toggle light/dark theme", menu: "Open menu", af_via: "Send via", af_tipo: "Project type", cs_filtro: "Filter projects by type" };
    $$("[data-i18n-aria]").forEach((el) => {
      if (el.dataset.esAria === undefined) el.dataset.esAria = el.getAttribute("aria-label") || "";
      el.setAttribute("aria-label", l === "en" ? (ARIA_EN[el.dataset.i18nAria] ?? el.dataset.esAria) : el.dataset.esAria);
    });
    // Los H2 se re-parten palabra por palabra en el idioma nuevo
    if (!reduced) $$(".h2[data-i18n]").forEach((hEl) => { splitH2(hEl); hEl.classList.add("in"); });
    // Efecto de cambio: cada texto traducido entra con blur+fade (suave,
    // menos abrupto que el reveal del tema pero visible)
    if (animate && !reduced) {
      root.classList.add("lang-swap");
      setTimeout(() => root.classList.remove("lang-swap"), 650);
    }
  }
  $("#langToggle")?.addEventListener("click", () => setLang(lang === "en" ? "es" : "en", true));

  /* ---------- 19. Testimonios arrastrables ----------
     El drag NO pelea con la animación del marquee: el keyframe anima
     transform, y el offset del drag va por la propiedad 'translate'
     (independiente). Al soltar, el offset decae suavemente a 0. */
  const tmq = $(".t-marquee");
  if (tmq) {
    let dragging = false, sx = 0, base = 0, off = 0;
    tmq.addEventListener("pointerdown", (e) => {
      dragging = true; sx = e.clientX; base = off;
      tmq.setPointerCapture(e.pointerId);
      tmq.classList.add("dragging");
      $$(".mtrack", tmq).forEach((t) => { t.style.animationPlayState = "paused"; });
    });
    tmq.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      off = Math.max(-380, Math.min(380, base + e.clientX - sx));
      tmq.style.setProperty("--drag", off + "px");
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      tmq.classList.remove("dragging");
      $$(".mtrack", tmq).forEach((t) => { t.style.animationPlayState = ""; });
      (function decay() {
        off *= 0.94;
        tmq.style.setProperty("--drag", off.toFixed(1) + "px");
        if (Math.abs(off) > 0.5 && !dragging) requestAnimationFrame(decay);
      })();
    };
    tmq.addEventListener("pointerup", endDrag);
    tmq.addEventListener("pointercancel", endDrag);
  }
  if (lang === "en") setLang("en");   // aplicar idioma guardado al cargar

  /* ---------- 17. Acordeón de servicios (Stökt) ----------
     Un panel abierto a la vez; los cerrados quedan como franjas con el
     título vertical. La animación es CSS (transition de flex). */
  const acc = $("#acc");
  const accReset = $("#accReset");
  if (acc) {
    // El detalle cerrado queda invisible: inert lo saca del Tab y del lector
    const cerrarDetalle = (p) => { const b = $(".acc-body", p); if (b) b.inert = true; };
    $$(".acc-p", acc).forEach(cerrarDetalle);
    const closeAll = () => {
      $$(".acc-p", acc).forEach((p) => {
        p.classList.remove("open");
        $(".acc-tab", p)?.setAttribute("aria-expanded", "false");
        cerrarDetalle(p);
      });
    };
    $$(".acc-tab", acc).forEach((tab) =>
      tab.addEventListener("click", () => {
        closeAll();
        const p = tab.closest(".acc-p");
        p.classList.add("open");
        const b = $(".acc-body", p); if (b) b.inert = false;
        tab.setAttribute("aria-expanded", "true");
        acc.classList.add("has-open");         // modo detalle
        accReset?.removeAttribute("hidden");
      })
    );
    // Mini botón de reset: cierra todo y vuelve a la grilla inicial
    accReset?.addEventListener("click", () => {
      const abierto = $(".acc-p.open .acc-tab", acc);
      closeAll();
      acc.classList.remove("has-open");
      accReset.setAttribute("hidden", "");
      abierto?.focus({ preventScroll: true });   // el foco no se pierde en el body
    });
  }

  /* ---------- 18. Cursor inteligente (Stökt) ----------
     Cuadradito blanco con mix-blend-mode: difference → invierte lo que
     tiene debajo, así SIEMPRE contrasta (fondo claro → se ve oscuro y
     viceversa), sin medir píxeles. Sigue al mouse con lerp (rAF) y crece
     sobre elementos interactivos. Solo mouse fino; nunca touch/reduced. */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const cur = document.createElement("div");
    cur.className = "cursor";
    cur.setAttribute("aria-hidden", "true");
    const curTxt = document.createElement("span");   // texto del cursor-pill
    cur.appendChild(curTxt);
    document.body.appendChild(cur);
    root.classList.add("cursor-on");     // oculta el cursor nativo vía CSS
    let tx = innerWidth / 2, ty = -40, x = tx, y = ty;
    addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      const it = e.target.closest && e.target.closest("a, button, summary, .pw, .acc-tab");
      cur.classList.toggle("on", !!it);
      // ¿El elemento (o un ancestro) declara una acción? → el cursor se
      // transforma en una pill con texto (estilo Stökt "LEARN MORE")
      const lb = e.target.closest && e.target.closest("[data-cursor]");
      if (lb) curTxt.textContent = (lang === "en" && lb.dataset.cursorEn) || lb.dataset.cursor;
      cur.classList.toggle("label", !!lb);
    }, { passive: true });
    addEventListener("mousedown", () => cur.classList.add("down"));
    addEventListener("mouseup", () => cur.classList.remove("down"));
    document.documentElement.addEventListener("mouseleave", () => { cur.style.opacity = "0"; });
    document.documentElement.addEventListener("mouseenter", () => { cur.style.opacity = "1"; });
    // El loop se corta cuando el cursor alcanzo al mouse y lo relanza el
    // proximo mousemove. Antes corria un rAF por frame para siempre, aunque
    // el mouse estuviera quieto o la pestaña sin uso.
    let siguiendo = false;
    const follow = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      cur.style.left = x + "px"; cur.style.top = y + "px";
      if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) { siguiendo = false; return; }
      requestAnimationFrame(follow);
    };
    const arrancar = () => { if (!siguiendo) { siguiendo = true; requestAnimationFrame(follow); } };
    addEventListener("mousemove", arrancar, { passive: true });
    arrancar();
  }

  /* ---------- 20. Filtro de casos ----------
     Los chips filtran por data-cat sin tocar el DOM: solo [hidden]. El
     contador de resultados se lee por lector de pantalla (aria-live). */
  const csFilter = $("#csFilter"), csGrid = $("#csGrid");
  if (csFilter && csGrid) {
    const cards = $$(".demo", csGrid);
    const chips = $$(".af-chip", csFilter);
    const status = document.createElement("p");
    status.className = "sr-only";
    status.setAttribute("aria-live", "polite");
    csGrid.parentNode.insertBefore(status, csGrid);

    // la grilla va en medias columnas: 6 = tres casos por fila, 4 = dos, 1 = uno
    const centrarUltimaFila = () => {
      const visibles = cards.filter((c) => !c.hidden);
      visibles.forEach((c) => c.style.removeProperty("--ini"));
      const porFila = Math.floor(getComputedStyle(csGrid).gridTemplateColumns.split(" ").length / 2);
      const sobran = porFila > 1 ? visibles.length % porFila : 0;
      if (sobran) visibles[visibles.length - sobran].style.setProperty("--ini", 1 + porFila - sobran);
    };

    const apply = (f) => {
      let n = 0;
      cards.forEach((c) => {
        const show = f === "all" || c.dataset.cat === f;
        c.hidden = !show;
        if (show) n++;
      });
      status.textContent = n + (lang === "en" ? " projects shown" : " proyectos visibles");
      centrarUltimaFila();
      // las que quedan visibles se reacomodan: entran con un fundido corto y
      // escalonado en vez de saltar a su lugar nuevo
      if (!reduced) {
        cards.filter((c) => !c.hidden).forEach((c, i) => {
          c.classList.remove("cs-entra");
          void c.offsetWidth;   // reinicia la animacion si se cambia de filtro rapido
          c.style.setProperty("--cs-d", Math.min(i, 7) * 40 + "ms");
          c.classList.add("cs-entra");
          c.addEventListener("animationend", () => c.classList.remove("cs-entra"), { once: true });
        });
      }
    };
    centrarUltimaFila();
    // en el celular se ven cuatro y el resto queda detrás de un botón;
    // elegir un filtro también despliega
    const mas = $("#csMas");
    if (mas && cards.length > 4) {
      csGrid.classList.add("plegada");
      mas.hidden = false;
      const desplegar = () => { csGrid.classList.remove("plegada"); mas.hidden = true; };
      mas.addEventListener("click", () => {
        desplegar();
        revelarVisibles();
        (cards[4].matches("a") ? cards[4] : $("a", cards[4]))?.focus();
      });
      chips.forEach((c) => c.addEventListener("click", desplegar));
    }
    matchMedia("(max-width: 980px)").addEventListener("change", centrarUltimaFila);
    matchMedia("(max-width: 720px)").addEventListener("change", centrarUltimaFila);

    // un chip cuya categoria no tiene casos hoy se esconde: si mañana
    // se agrega un caso de esa categoria, reaparece solo
    chips.forEach((chip) => {
      const f = chip.dataset.f;
      if (f !== "all" && !cards.some((c) => c.dataset.cat === f)) chip.hidden = true;
    });
    // con una sola categoria el filtro no filtra nada: se esconde hasta que haya dos
    if (chips.filter((c) => !c.hidden).length <= 2) csFilter.hidden = true;
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => { c.classList.toggle("on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
        apply(chip.dataset.f);
        revelarVisibles();   // el filtro puede mostrar cards aún sin revelar
      });
    });
  }

  /* ---------- 21. Reveal escalonado de las cards de casos ----------
     Las 12 cards entraban de golpe. El escalonado se corta a las 8 primeras
     de cada tanda: más que eso y la última tarda casi medio segundo de más.
     Dos redes de seguridad, porque el modo de falla de este efecto es dejar
     contenido invisible para siempre:
       a) el gate .fx-on (en el <head>): si el JS no corre, todo se ve;
       b) el barrido de abajo, para el que scrollea rápido o entra por
          #proyectos — ahí el observer nunca cruza un umbral y no dispara. */
  let revelarVisibles = () => {};
  const csCards = $$(".cs-grid .demo");
  if (csCards.length) {
    if (reduced) {
      csCards.forEach((c) => c.classList.add("fx-visto"));
    } else if ("IntersectionObserver" in window) {
      let pendientes = csCards.slice();
      const marcar = (el, i) => {
        el.style.setProperty("--fx-d", Math.min(i, 7) * 55 + "ms");
        el.classList.add("fx-visto");
        rio.unobserve(el);
      };
      const rio = new IntersectionObserver((ents) => {
        let i = 0;
        ents.forEach((en) => { if (en.isIntersecting) marcar(en.target, i++); });
        pendientes = pendientes.filter((el) => !el.classList.contains("fx-visto"));
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      csCards.forEach((el) => rio.observe(el));

      // Rescate: lo que quedó POR ENCIMA de la pantalla se muestra sin
      // transición. Si el usuario saltó con #proyectos o scrolleó de golpe,
      // el observer nunca cruza un umbral y esas cards no se enterarían.
      // Sólo mira r.bottom < 0: las que están a la vista las maneja el
      // observer, con su escalonado — rescatarlas acá lo anularía.
      const rescatarArriba = () => {
        for (let i = pendientes.length - 1; i >= 0; i--) {
          const el = pendientes[i];
          if (el.getBoundingClientRect().bottom < 0) {
            el.style.setProperty("--fx-d", "0ms");
            el.classList.add("fx-visto");
            rio.unobserve(el);
            pendientes.splice(i, 1);
          }
        }
      };
      addEventListener("scroll", rescatarArriba, { passive: true });
      addEventListener("resize", rescatarArriba, { passive: true });
      rescatarArriba();

      // El filtro puede sacar de [hidden] una card que nunca se reveló: si
      // ya está en pantalla, el observer no vuelve a dispararse por ella.
      revelarVisibles = () => {
        for (let i = pendientes.length - 1; i >= 0; i--) {
          const el = pendientes[i];
          if (el.hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) {
            el.style.setProperty("--fx-d", "0ms");
            el.classList.add("fx-visto");
            rio.unobserve(el);
            pendientes.splice(i, 1);
          }
        }
      };
    } else {
      csCards.forEach((c) => c.classList.add("fx-visto"));
    }
  }

  /* ---------- 8b. Trabajos destacados que se apilan ----------
     Cada tarjeta queda pegada arriba (sticky); mientras la siguiente sube a
     taparla, esta se achica y se oscurece. --p va de 0 a 1 segun cuanto de
     la siguiente ya llego. Un solo listener de scroll con rAF. */
  const dest = $$(".dest-card");
  if (dest.length > 1 && !reduced) {
    let pend = false;
    const medir = () => {
      pend = false;
      for (let i = 0; i < dest.length - 1; i++) {
        const a = dest[i].getBoundingClientRect(), b = dest[i + 1].getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / a.height));
        dest[i].style.setProperty("--p", p.toFixed(3));
      }
    };
    addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(medir); } }, { passive: true });
    addEventListener("resize", medir);
    medir();
  }

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
      const n = Math.round(Math.min(chico ? 22 : 44, (W * foso * 0.45) / (lado * lado * 1.3)));
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
        im.src = "assets/teclas/" + t + ".png";
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
      const THREE = await import(new URL("assets/vendor/three-0.160.0.module.min.js", document.baseURI).href);
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
    let ancho = innerWidth;
    addEventListener("resize", () => {
      if (!listo || Math.abs(innerWidth - ancho) < 40) return;   // la barra del celular no rearma
      ancho = innerWidth; armarFisica(); redimensionar(); if (soltadas) despertar();
    });
  })();

  /* ---------- 22d. Saltos dentro de la pagina ----------
     Con la portada fija (sticky), Safari a veces no salta al ancla: "Ver
     proyectos" dejaba la pagina arriba. Se calcula la posicion real y se
     baja a mano, descontando el menu. */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2 || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const destino = document.getElementById(a.getAttribute("href").slice(1));
    if (!destino) return;
    e.preventDefault();
    const y = destino.getBoundingClientRect().top + scrollY - 96;
    scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
    history.pushState(null, "", a.getAttribute("href"));
  });

  /* ---------- 22c. Escultura "dt/" de la portada ----------
     Imagen con fondo transparente. Con mouse se inclina hacia el puntero con un
     resorte sin rebote (arranca desde donde esta, se puede cortar y revertir). */
  const dt3d = $(".dt3d");
  if (dt3d && !reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const hero = dt3d.closest(".hero");
    const v = { rx: 0, ry: 0 }, o = { rx: 0, ry: 0 }, vel = { rx: 0, ry: 0 };
    let raf = 0, t0 = 0;
    const paso = (t) => {
      const dt = Math.min(0.032, (t - (t0 || t)) / 1000) || 0.016; t0 = t;
      const w = 2 * Math.PI / 0.5; let quieto = true;
      for (const k of ["rx", "ry"]) {
        vel[k] += (w * w * (o[k] - v[k]) - 2 * w * vel[k]) * dt; v[k] += vel[k] * dt;
        if (Math.abs(o[k] - v[k]) > 0.01 || Math.abs(vel[k]) > 0.01) quieto = false;
      }
      dt3d.style.setProperty("--rx", v.rx.toFixed(2) + "deg");
      dt3d.style.setProperty("--ry", v.ry.toFixed(2) + "deg");
      raf = quieto ? 0 : requestAnimationFrame(paso);
    };
    const mover = () => { if (!raf) { t0 = 0; raf = requestAnimationFrame(paso); } };
    hero.addEventListener("pointermove", (e) => {
      const r = dt3d.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width)));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height)));
      o.ry = x * 16; o.rx = -y * 10; mover();
    });
    hero.addEventListener("pointerleave", () => { o.rx = o.ry = 0; mover(); });
  }

  /* ---------- 22. Objetos animados del acordeon ----------
     Desde el 2026-11-12 son videos generados con Higgsfield (imagen con GPT
     Image, movimiento con Kling) en la linea de wearestokt.com. No hay video
     con alfa que ande en Safari, asi que cada objeto viene en dos versiones con
     el fondo ya pintado del color exacto de la tarjeta: claro y oscuro. Al
     cambiar el tema se cambia el archivo. En el celular baja uno mas chico.
     Corren en loop mientras el panel esta en pantalla; afuera, en pausa. Con
     movimiento reducido o ahorro de datos queda el poster quieto. */
  const vids = $$(".acc-p video.srv-obj");
  if (vids.length) {
    const chico = matchMedia("(max-width: 980px)");
    const quieto = reduced || navigator.connection?.saveData;
    const tema = () => (root.dataset.theme === "dark" ? "oscuro" : "claro");
    const archivo = (v) => "assets/srv/" + v.dataset.obj + "-" + tema() + (chico.matches ? "-cel" : "") + ".mp4";
    const poster = (v) => "assets/srv/" + v.dataset.obj + "-" + tema() + ".jpg";
    const enPantalla = new WeakSet();
    // el de la tarjeta corre si el panel esta cerrado; el del detalle, si esta abierto
    const toca = (v) => {
      const panel = v.closest(".acc-p");
      const abierto = panel.classList.contains("open");
      return enPantalla.has(panel) && (v.closest(".acc-img") ? abierto : !abierto);
    };
    const actualizar = (v) => {
      if (v.getAttribute("poster") !== poster(v)) v.setAttribute("poster", poster(v));
      if (quieto) return;
      if (toca(v)) {
        if (v.dataset.src !== archivo(v)) { v.dataset.src = archivo(v); v.src = v.dataset.src; }
        v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    };
    const todos = () => vids.forEach(actualizar);
    todos();
    new MutationObserver(todos).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    chico.addEventListener("change", todos);
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver((es) => es.forEach((e) => {
          if (e.isIntersecting) enPantalla.add(e.target); else enPantalla.delete(e.target);
          $$("video.srv-obj", e.target).forEach(actualizar);
        }), { rootMargin: "120px 0px" })
      : null;
    $$(".acc-p").forEach((panel) => {
      if (io) io.observe(panel); else enPantalla.add(panel);
      new MutationObserver(() => $$("video.srv-obj", panel).forEach(actualizar))
        .observe(panel, { attributes: true, attributeFilter: ["class"] });
    });
    todos();
  }

  /* ---------- 22a. El objeto responde al puntero ----------
     Con mouse, el objeto del panel se inclina hacia el puntero, se corre un
     poco en sentido contrario (paralaje) y se acerca; al apretar se hunde.
     Cada valor persigue su objetivo con un resorte criticamente amortiguado,
     sin rebote: arranca desde donde esta, asi se puede cortar y revertir en
     cualquier momento sin salto. Solo transform, por el compositor. */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".acc-p").forEach((panel) => {
      const objeto = () => $(panel.classList.contains("open") ? ".acc-img video.srv-obj" : ".acc-cover video.srv-obj", panel);
      const K = ["rx", "ry", "tx", "ty", "s"];
      const val = { rx: 0, ry: 0, tx: 0, ty: 0, s: 1 }, vel = { rx: 0, ry: 0, tx: 0, ty: 0, s: 0 };
      const obj = { ...val };
      let raf = 0, ult = 0, actual = null, apretado = false;
      const pintar = (el) => {
        el.style.setProperty("--rx", val.rx.toFixed(2) + "deg");
        el.style.setProperty("--ry", val.ry.toFixed(2) + "deg");
        el.style.setProperty("--tx", val.tx.toFixed(1) + "px");
        el.style.setProperty("--ty", val.ty.toFixed(1) + "px");
        el.style.setProperty("--s", val.s.toFixed(4));
      };
      const paso = (t) => {
        const dt = Math.min(0.032, (t - (ult || t)) / 1000) || 0.016;
        ult = t;
        // resorte con amortiguacion critica: respuesta ~0,35 s
        const w = 2 * Math.PI / 0.35;
        let quieto = true;
        for (const k of K) {
          const a = w * w * (obj[k] - val[k]) - 2 * w * vel[k];
          vel[k] += a * dt; val[k] += vel[k] * dt;
          if (Math.abs(obj[k] - val[k]) > 0.002 || Math.abs(vel[k]) > 0.002) quieto = false;
        }
        const el = objeto();
        if (actual && actual !== el) { K.forEach((k) => actual.style.removeProperty("--" + k)); }
        actual = el;
        if (el) pintar(el);
        raf = quieto ? 0 : requestAnimationFrame(paso);
      };
      const mover = () => { if (!raf) { ult = 0; raf = requestAnimationFrame(paso); } };
      const escala = () => (apretado ? 0.97 : panel.classList.contains("open") ? 1.02 : 1.07);
      panel.addEventListener("pointermove", (e) => {
        const el = objeto();
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        obj.ry = x * 14; obj.rx = -y * 10;
        obj.tx = -x * 10; obj.ty = -y * 8;
        obj.s = escala();
        mover();
      });
      panel.addEventListener("pointerleave", () => {
        apretado = false;
        Object.assign(obj, { rx: 0, ry: 0, tx: 0, ty: 0, s: 1 });
        mover();
      });
      panel.addEventListener("pointerdown", () => { apretado = true; obj.s = escala(); mover(); });
      addEventListener("pointerup", () => { if (apretado) { apretado = false; obj.s = escala(); mover(); } });
    });
  }

  /* ---------- 22b. Filas de celulares sin huecos ----------
     Cada track tiene que medir más que la pantalla más ancha: si no, al final
     del loop asoma el vacío y parece que la fila se frenó. Se repite el
     contenido hasta cubrirla y se estira la duración para no acelerar. */
  $$(".mobile-sec .marquee").forEach((mq) => {
    const tracks = $$(".mtrack", mq);
    const base = [...tracks[0].children];
    const ancho = Math.max(innerWidth, screen.width) + 200;
    let vueltas = 1;
    while (tracks[0].scrollWidth < ancho && vueltas < 6) {
      tracks.forEach((tr, i) => base.forEach((n) => {
        const copia = n.cloneNode(true);
        if (i === 0) copia.setAttribute("aria-hidden", "true");
        tr.append(copia);
      }));
      vueltas++;
    }
    if (vueltas > 1) mq.style.setProperty("--speed", parseFloat(mq.style.getPropertyValue("--speed")) * vueltas + "s");
  });

  /* ---------- 23. Pausar animaciones fuera del viewport ----------
     Las animaciones CSS siguen corriendo aunque el elemento no se vea: sin
     esto quedan ~33 loops activos, 24 de ellos invisibles, gastando batería.
     Se observan las <section> (8 observers en vez de 30) y el CSS pausa todo
     lo que cuelgue de la sección, pseudo-elementos incluidos.
     El rootMargin de 250px hace que la sección ya venga animando cuando
     asoma, así nunca se ve el arranque de un loop. La barra sticky queda
     afuera a propósito: siempre está a la vista. */
  if ("IntersectionObserver" in window && !reduced) {
    const pio = new IntersectionObserver((ents) => {
      ents.forEach((en) => en.target.classList.toggle("fx-quieto", !en.isIntersecting));
    }, { rootMargin: "250px 0px" });
    $$("section").forEach((sec) => pio.observe(sec));
  }

  /* ---------- 23b. Revelado generalizado + nav reactivo + parallax ----------
     Mismo contrato que el reveal de los casos: estado oculto solo bajo
     html.fx-on, observer que marca .fx-visto, y rescate POR GEOMETRIA
     (nunca por reloj — ver el error del timer ciego en la wiki): lo que
     quedo con el borde inferior por encima del viewport se muestra sin
     transicion. */
  const rvEls = $$("[data-rv]");
  if (rvEls.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      rvEls.forEach((el) => el.classList.add("fx-visto"));
    } else {
      let pend = rvEls.slice();
      const rvo = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("fx-visto");
          rvo.unobserve(e.target);
        });
        pend = pend.filter((el) => !el.classList.contains("fx-visto"));
      }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
      rvEls.forEach((el) => rvo.observe(el));
      const rescate = () => {
        for (let i = pend.length - 1; i >= 0; i--) {
          const el = pend[i];
          if (el.getBoundingClientRect().bottom < 0) {
            el.style.transition = "none";
            el.classList.add("fx-visto");
            rvo.unobserve(el);
            pend.splice(i, 1);
          }
        }
      };
      addEventListener("scroll", rescate, { passive: true });
      rescate();
    }
  }

  /* Nav reactivo: la pill gana cuerpo al despegarse del tope. Un solo
     listener con bandera para no tocar clases en cada frame. */
  {
    let lejos = false;
    const medir = () => {
      const ahora = scrollY > 24;
      if (ahora !== lejos) { lejos = ahora; root.classList.toggle("nav-lejos", ahora); }
    };
    addEventListener("scroll", medir, { passive: true });
    medir();
  }

  /* Parallax corto del poster de la laptop: recorrido de 40px, batcheado
     con rAF, apagado en tactil y reduced. */
  const lapPx = $(".lap-px");
  if (lapPx && !reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let pedido = false;
    const mover = () => {
      pedido = false;
      const r = lapPx.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;  // -0.5..0.5
      lapPx.style.translate = "0 " + (-p * 40).toFixed(1) + "px";
    };
    addEventListener("scroll", () => {
      if (!pedido) { pedido = true; requestAnimationFrame(mover); }
    }, { passive: true });
    mover();
  }

  /* ---------- 24. Tarjeta holografica del founder ----------
     Portado del ProfileCard de React Bits. El puntero define cuatro
     variables CSS y el CSS hace todo el trabajo visual; aca solo se
     calculan numeros.
     El seguimiento es con lerp (no salto directo): el valor corre hacia
     el objetivo un 14% por frame, que es lo que le da la sensacion de
     peso. Al salir vuelve al centro y el rAF se corta solo, asi no queda
     un bucle girando de fondo. */
  const pfCard = $(".pf-card");
  if (pfCard && !reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const TAU = 0.14;
    let px = 50, py = 50, tx = 50, ty = 50;     // actual y objetivo, en %
    let raf = null, activo = false;

    const pintar = () => {
      const dx = tx - px, dy = ty - py;
      px += dx * TAU; py += dy * TAU;
      const alCentro = Math.min(1, Math.hypot(py - 50, px - 50) / 50);
      const st = pfCard.style;
      st.setProperty("--pointer-x", px.toFixed(2) + "%");
      st.setProperty("--pointer-y", py.toFixed(2) + "%");
      st.setProperty("--pointer-from-center", alCentro.toFixed(3));
      st.setProperty("--rotate-x", (-(py - 50) / 6).toFixed(2) + "deg");
      st.setProperty("--rotate-y", ((px - 50) / 5).toFixed(2) + "deg");
      // se corta cuando alcanzo al puntero y ya no hay nadie encima
      if (!activo && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { raf = null; return; }
      raf = requestAnimationFrame(pintar);
    };
    const arrancar = () => { if (raf === null) raf = requestAnimationFrame(pintar); };

    pfCard.addEventListener("pointermove", (e) => {
      const r = pfCard.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      arrancar();
    }, { passive: true });
    pfCard.addEventListener("pointerenter", () => {
      activo = true;
      pfCard.style.setProperty("--pf-op", "1");
      pfCard.style.transition = "none";          // el tilt lo maneja el rAF
      arrancar();
    });
    pfCard.addEventListener("pointerleave", () => {
      activo = false;
      tx = 50; ty = 50;                          // vuelve al centro
      pfCard.style.setProperty("--pf-op", "0");
      pfCard.style.transition = "";              // y el CSS suaviza la vuelta
      arrancar();
    });
  }
  /* Scrollspy: marca en la nav la sección que se está leyendo */
  (() => {
    const nav = $(".nav");
    if (!nav) return;
    const links = $$("a[href^='#']", nav);
    const ink = document.createElement("span");
    ink.className = "nav-ink";
    ink.setAttribute("aria-hidden", "true");
    nav.appendChild(ink);
    // Marcas va debajo de Servicios desde el 2026-11-12 (orden de Stökt: trabajos primero)
    const alias = { marcas: "top", todos: "proyectos", preguntas: "contacto" };
    const ids = ["top", "marcas", "proyectos", "servicios", "sobre-mi", "todos", "preguntas", "contacto"];
    const secs = ids.map((id) => document.getElementById(id)).filter(Boolean);
    let actual = "";
    const pintar = (id) => {
      if (id === actual) return;
      actual = id;
      $$("a[href^='#']", document.querySelector(".hdr") || document).forEach((a) => {
        if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      mover();
    };
    const mover = () => {
      const a = links.find((l) => l.getAttribute("href") === "#" + actual);
      if (!a || !a.offsetWidth) { ink.classList.remove("on"); return; }
      const t = a.querySelector(".nl") || a;
      const r = t.getBoundingClientRect(), n = nav.getBoundingClientRect();
      ink.style.setProperty("--ink-x", (r.left - n.left) + "px");
      ink.style.setProperty("--ink-w", r.width);
      ink.classList.add("on");
    };
    const calcular = () => {
      const linea = innerHeight * 0.4;
      let id = "top";
      for (const s of secs) {
        if (s.offsetParent === null && s.id !== "top") continue;
        if (s.getBoundingClientRect().top <= linea) id = s.id;
      }
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = "contacto";
      pintar(alias[id] || id);
    };
    let pend = false;
    addEventListener("scroll", () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => { pend = false; calcular(); });
    }, { passive: true });
    addEventListener("resize", mover);
    // El cambio de idioma cambia el ancho de las palabras
    new MutationObserver(mover).observe(nav, { subtree: true, characterData: true, childList: true });
    if (document.fonts) document.fonts.ready.then(mover);
    calcular();
  })();
  /* ---------- La barra de arriba se esconde al bajar (celular) ---------- */
  (() => {
    const top = $(".top");
    if (!top) return;
    const chico = matchMedia("(max-width: 840px)");
    let ultimo = scrollY, pend = false;
    addEventListener("scroll", () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        const y = scrollY, d = y - ultimo;
        if (Math.abs(d) < 8) return;
        ultimo = y;
        top.classList.toggle("oculta", chico.matches && d > 0 && y > 160 && !$(".menu[open]", top));
      });
    }, { passive: true });
  })();
})();
