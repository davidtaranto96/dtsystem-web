/* Medición de visitas de dtsystem.com.ar. La misma receta que Aires:
   - Cloudflare Web Analytics carga siempre: no usa cookies ni identifica a nadie.
   - Google Analytics usa cookies: carga recién cuando la persona toca "Entendido",
     y la decisión queda guardada 180 días. Sin GA4_ID no se muestra ningún aviso. */
(function () {
  var CF_TOKEN = 'a6d136a211a044008a1ca1cdd63266f7';
  var GA4_ID = 'G-7H4HER19FW';
  var CLAVE = 'dt-cookies';
  var DIAS = 180;

  // En local no se mide: ensuciaría los números con las pruebas.
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';

  if (CF_TOKEN && !local) {
    var cf = document.createElement('script');
    cf.defer = true;
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_TOKEN }));
    document.head.appendChild(cf);
  }

  if (!GA4_ID) return;

  function leer() {
    try {
      var v = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      return v && v.hasta > Date.now() ? v.ok : null;
    } catch (e) { return null; }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify({ ok: true, hasta: Date.now() + DIAS * 864e5 })); } catch (e) {}
  }

  function cargarGA() {
    if (cargarGA.hecho || local) return;
    cargarGA.hecho = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  if (leer()) { cargarGA(); return; }

  var TXT = {
    es: { t: 'Al navegar por este sitio <b>aceptás el uso de cookies</b> para mejorar tu experiencia.', b: 'Entendido' },
    en: { t: 'By browsing this site <b>you accept the use of cookies</b> to improve your experience.', b: 'Got it' }
  };

  function montar() {
    var en = (document.documentElement.lang || '').indexOf('en') === 0;
    var x = en ? TXT.en : TXT.es;
    var ck = document.createElement('div');
    ck.className = 'ck';
    ck.setAttribute('role', 'region');
    ck.setAttribute('aria-label', en ? 'Cookies' : 'Aviso de cookies');
    ck.innerHTML = '<p class="ck-t">' + x.t + '</p><button type="button" class="ck-ok">' + x.b + '</button>';
    document.body.appendChild(ck);
    setTimeout(function () { ck.classList.add('is-on'); }, 600);
    ck.querySelector('.ck-ok').addEventListener('click', function () {
      guardar();
      cargarGA();
      ck.classList.remove('is-on');
      setTimeout(function () { ck.remove(); }, 400);
    });
  }

  if (document.body) montar();
  else document.addEventListener('DOMContentLoaded', montar);
})();
