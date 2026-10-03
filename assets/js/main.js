/* KADIOĞLU LOJİSTİK — site betikleri (vanilla JS, bağımlılık yok) */
(function () {
  "use strict";
  var S = window.SITE || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var PH = S.phones || [];
  function who(p) { return p.name ? esc(p.name) + " (" + esc(p.role) + ")" : esc(p.role); }
  function phoneLinks(sep, last) {
    var a = PH.map(function (p) { return who(p) + ' <a href="tel:' + p.tel + '">' + esc(p.display) + "</a>"; });
    return a.length > 1 ? a.slice(0, -1).join(sep) + (last || sep) + a[a.length - 1] : (a[0] || "");
  }
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Yıl */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Sticky header (kaydırınca küçülür) + yukarı çık */
  var header = $(".site-header"), toTop = $(".to-top");
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (toTop) toTop.classList.toggle("show", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* Mobil menü */
  var nav = $("#site-nav"), toggle = $(".menu-toggle");
  function setHdr() { if (header) document.documentElement.style.setProperty("--hdr", header.getBoundingClientRect().bottom + "px"); }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setHdr();
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.innerHTML = open ? toggle.getAttribute("data-close") : toggle.getAttribute("data-open");
      document.body.style.overflow = open ? "hidden" : "";
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1140 && nav.classList.contains("open")) toggle.click(); });
  }
  $$(".has-dd > button.nav-link").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var li = btn.parentNode, open = !li.classList.contains("open");
      $$(".has-dd.open").forEach(function (o) { if (o !== li) { o.classList.remove("open"); o.firstElementChild.setAttribute("aria-expanded", "false"); } });
      li.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
      e.stopPropagation();
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".has-dd")) $$(".has-dd.open").forEach(function (o) { o.classList.remove("open"); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { $$(".has-dd.open").forEach(function (o) { o.classList.remove("open"); }); if (nav && nav.classList.contains("open")) toggle.click(); }
  });

  /* Çerez bildirimi (bilgilendirme) */
  var KEY = "kl_cookie_consent";
  var consent = null; try { consent = localStorage.getItem(KEY); } catch (e) {}
  var banner = $("#cookie-banner");
  if (banner && !consent) banner.classList.add("show");
  $$("[data-cookie]").forEach(function (b) {
    b.addEventListener("click", function () {
      consent = b.getAttribute("data-cookie");
      try { localStorage.setItem(KEY, consent); } catch (e) {}
      if (banner) banner.classList.remove("show");
    });
  });
  $$("[data-cookie-reset]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); try { localStorage.removeItem(KEY); } catch (er) {} if (banner) banner.classList.add("show"); });
  });

  /* Telefon seçici (rol etiketli 3 numara): masaüstünde açılır menü, mobilde alt panel */
  var sheet = $("#call-sheet"), backdrop = $(".call-backdrop"), lastTrigger = null;
  function closeSheet(noFocus) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; if (backdrop) backdrop.hidden = true;
    sheet.classList.remove("as-pop", "as-sheet"); document.documentElement.classList.remove("cs-open");
    if (lastTrigger) { lastTrigger.setAttribute("aria-expanded", "false"); if (noFocus !== true) { try { lastTrigger.focus({ preventScroll: true }); } catch (e) {} } lastTrigger = null; }
  }
  function openSheet(t) {
    lastTrigger = t; t.setAttribute("aria-expanded", "true");
    var mobile = window.innerWidth <= 640, r = t.getBoundingClientRect();
    sheet.classList.toggle("as-sheet", mobile); sheet.classList.toggle("as-pop", !mobile);
    sheet.style.left = ""; sheet.style.top = "";
    sheet.hidden = false; if (backdrop) backdrop.hidden = !mobile;
    if (mobile) document.documentElement.classList.add("cs-open");
    else {
      var w = sheet.offsetWidth, h = sheet.offsetHeight;
      var left = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12), top = r.bottom + 8;
      if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
      sheet.style.left = left + "px"; sheet.style.top = top + "px";
    }
    var f = $(".cs-main", sheet); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  if (sheet) {
    $$("[data-call-menu]").forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!sheet.hidden && lastTrigger === t) closeSheet(); else { closeSheet(true); openSheet(t); }
      });
    });
    var cl = $(".cs-close", sheet); if (cl) cl.addEventListener("click", function () { closeSheet(); });
    if (backdrop) backdrop.addEventListener("click", function () { closeSheet(); });
    document.addEventListener("click", function (e) { if (!sheet.hidden && !sheet.contains(e.target)) closeSheet(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    window.addEventListener("resize", function () { closeSheet(true); });
    window.addEventListener("scroll", function () { if (!sheet.hidden && sheet.classList.contains("as-pop")) closeSheet(true); }, { passive: true });
  }

  /* Etkileşimli harita (Leaflet + OpenStreetMap) ve yol tarifi */
  var maps = $$("[data-map]");
  if (maps.length) (function () {
    var mainSrc = ($('script[src*="assets/js/main.js"]') || {}).src || "";
    var ASSETS = mainSrc ? mainSrc.replace(/js\/main\.js.*$/, "") : "assets/";
    var LIB = ASSETS + "vendor/leaflet/";
    var DEST = [parseFloat(S.lat), parseFloat(S.lng)];
    var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var libState = 0, libQueue = [];
    function loadLib(cb) {
      if (window.L && L.map) return cb(true);
      libQueue.push(cb);
      if (libState) return; libState = 1;
      var left = 2, failed = false;
      function done(ok) {
        if (!ok) failed = true;
        if (--left > 0) return;
        libState = failed ? 0 : 2;
        libQueue.splice(0).forEach(function (f) { f(!failed && !!window.L); });
      }
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = LIB + "leaflet.css?v=1.9.4";
      css.onload = function () { done(true); }; css.onerror = function () { done(true); }; // CSS gelmese de harita çalışır
      document.head.appendChild(css);
      var js = document.createElement("script"); js.src = LIB + "leaflet.js?v=1.9.4"; js.async = true;
      js.onload = function () { done(true); }; js.onerror = function () { done(false); };
      document.head.appendChild(js);
    }
    var trNum = function (n, d) { return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: 0 }); };
    function fmtDist(m) { return m < 1000 ? trNum(Math.round(m / 10) * 10, 0) + " m" : trNum(m / 1000, m < 100000 ? 1 : 0) + " km"; }
    function fmtDur(s) {
      var min = Math.max(1, Math.round(s / 60));
      if (min < 60) return min + " dk";
      var h = Math.floor(min / 60), r = min % 60;
      return h + " sa" + (r ? " " + r + " dk" : "");
    }
    function haversine(a, b) {
      var R = 6371000, rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
      var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(x));
    }
    function gDir(from) { return "https://www.google.com/maps/dir/?api=1" + (from ? "&origin=" + from[0].toFixed(6) + "," + from[1].toFixed(6) : "") + "&destination=" + DEST[0] + "," + DEST[1] + "&travelmode=driving"; }
    function popupHtml() {
      return '<div class="kl-pop"><strong class="kl-pop-brand">' + esc(S.brand || "") + '</strong>' +
        '<span class="kl-pop-legal">' + esc(S.legalName || "") + '</span>' +
        '<span class="kl-pop-addr">' + esc(S.address || "") + '</span>' +
        '<span class="kl-pop-tels">' + PH.map(function (p) { return '<span><small><b>' + esc(p.name || "") + '</b>' + esc(p.role) + '</small><a href="tel:' + p.tel + '">' + esc(p.display) + "</a></span>"; }).join("") + "</span>" +
        '<span class="kl-pop-btns"><a class="kl-pop-btn primary" href="' + gDir() + '" target="_blank" rel="noopener">Yol Tarifi Al</a>' +
        '<button class="kl-pop-btn" type="button" data-locate>Konumumu kullan</button>' +
        '<a class="kl-pop-btn wa" href="https://wa.me/' + S.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a></span></div>';
    }
    function setStatus(st, type, html) {
      if (!st.route) return;
      st.route.className = "lmap-route show " + type; st.route.innerHTML = html;
    }
    function setBusy(st, on) { if (st.btn) { st.btn.classList.toggle("loading", on); st.btn.disabled = on; } }
    var appsHint = " Dilerseniz aşağıdaki Google Haritalar, Yandex Navigasyon veya Apple Haritalar bağlantılarıyla yol tarifi alabilirsiniz.";

    function init(st) {
      if (st.map || st.loading) return; st.loading = true;
      loadLib(function (ok) {
        st.loading = false;
        if (!ok || !window.L) { st.el.classList.add("failed"); var l = $(".lmap-ph-load", st.el); if (l) l.innerHTML = 'Harita şu anda yüklenemedi. <a href="' + gDir() + '" target="_blank" rel="noopener">Google Haritalar\'da yol tarifi alın</a>.'; return; }
        var el = st.el, z = (parseInt(el.getAttribute("data-zoom"), 10) || 17) - (el.offsetWidth < 600 ? 1 : 0);
        var map = L.map(el, { center: DEST, zoom: z, scrollWheelZoom: false, dragging: !touch, tap: false, zoomControl: true, attributionControl: true });
        st.map = map;
        map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
        // Katmanlar: Uydu (Esri World Imagery + yol/yer adı etiketleri) varsayılan, Harita (OpenStreetMap)
        var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
        var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> katkıda bulunanlar'
        });
        var sat = L.layerGroup([
          L.tileLayer(ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19, maxNativeZoom: 18, className: "kl-sat",
            attribution: 'Uydu ve etiketler &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics, GIS Kullanıcı Topluluğu'
          }),
          L.tileLayer(ESRI + "Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 18, className: "kl-ref" }),
          L.tileLayer(ESRI + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 18, className: "kl-ref" })
        ]);
        var layers = { sat: sat, map: osm }, cur = "sat";
        sat.addTo(map); el.classList.add("is-sat");
        var Switch = L.Control.extend({
          options: { position: "topright" },
          onAdd: function () {
            var box = L.DomUtil.create("div", "kl-layers");
            box.setAttribute("role", "group"); box.setAttribute("aria-label", "Harita görünümü");
            [["sat", "Uydu"], ["map", "Harita"]].forEach(function (o) {
              var b = L.DomUtil.create("button", "kl-layer-btn" + (o[0] === cur ? " on" : ""), box);
              b.type = "button"; b.textContent = o[1]; b.setAttribute("data-layer", o[0]); b.setAttribute("aria-pressed", o[0] === cur ? "true" : "false");
              L.DomEvent.on(b, "click", function (e) {
                L.DomEvent.stop(e);
                if (o[0] === cur) return;
                map.removeLayer(layers[cur]); cur = o[0]; layers[cur].addTo(map);
                el.classList.toggle("is-sat", cur === "sat");
                Array.prototype.forEach.call(box.children, function (x) { var on = x.getAttribute("data-layer") === cur; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
              });
            });
            L.DomEvent.disableClickPropagation(box);
            return box;
          }
        });
        new Switch().addTo(map);
        var icon = L.divIcon({ className: "kl-marker", html: '<span class="kl-pin"><img src="' + ASSETS + 'img/logo-icon.png" alt="" width="30" height="30"></span><span class="kl-pin-dot"></span>', iconSize: [52, 64], iconAnchor: [26, 62], popupAnchor: [0, -58] });
        st.marker = L.marker(DEST, { icon: icon, title: S.brand || "Konum", alt: (S.brand || "") + " konumu", riseOnHover: true }).addTo(map).bindPopup(popupHtml(), { maxWidth: 300, minWidth: 230, autoPanPadding: [24, 24] });
        if (el.hasAttribute("data-open-popup") && el.offsetWidth > 560) st.marker.openPopup();
        // Etkinleştirme ipucu: sayfa kaydırmasını engellememek için kaydırma/sürükleme ilk etkileşimde açılır
        var hint = document.createElement("div"); hint.className = "lmap-activate";
        hint.textContent = touch ? "Haritayı kaydırmak için dokunun" : "Yakınlaştırmak için tıklayın";
        el.appendChild(hint);
        function activate() { if (st.active) return; st.active = true; map.scrollWheelZoom.enable(); map.dragging.enable(); el.classList.add("is-active"); }
        map.on("click focus zoomstart", activate);
        el.addEventListener("mouseleave", function () { if (!touch && st.active) { map.scrollWheelZoom.disable(); st.active = false; el.classList.remove("is-active"); } });
        el.classList.add("ready");
        if (st.pending) { st.pending = false; locate(st); }
      });
    }

    function drawRoute(st, from) {
      var map = st.map;
      if (st.layer) map.removeLayer(st.layer);
      st.layer = L.layerGroup().addTo(map);
      var me = L.marker(from, { icon: L.divIcon({ className: "kl-me", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }), title: "Konumunuz", zIndexOffset: -10 }).bindTooltip("Konumunuz", { direction: "top", offset: [0, -10] });
      me.addTo(st.layer);
      if (st.acc && st.acc < 2000) L.circle(from, { radius: st.acc, color: "#1a6fd1", weight: 1, opacity: .5, fillOpacity: .08, interactive: false }).addTo(st.layer);
      var url = "https://router.project-osrm.org/route/v1/driving/" + from[1].toFixed(6) + "," + from[0].toFixed(6) + ";" + DEST[1] + "," + DEST[0] + "?overview=full&geometries=geojson&alternatives=false&steps=false";
      setStatus(st, "info", "Rota hesaplanıyor…");
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
      var nav = '<a class="lmap-go" href="' + gDir(from) + '" target="_blank" rel="noopener">Navigasyonu Google Haritalar\'da başlat →</a>';
      fetch(url, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) {
          clearTimeout(timer); setBusy(st, false);
          if (!j || j.code !== "Ok" || !j.routes || !j.routes.length) throw new Error("no-route");
          var rt = j.routes[0], pts = rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
          L.polyline(pts, { color: "#071a33", weight: 12, opacity: .35, interactive: false }).addTo(st.layer);
          L.polyline(pts, { color: "#ffffff", weight: 9, opacity: 1, interactive: false }).addTo(st.layer);
          var line = L.polyline(pts, { color: "#1a6fd1", weight: 5, opacity: 1, interactive: false }).addTo(st.layer);
          if (!st.routeAttr) { st.routeAttr = true; map.attributionControl.addAttribution('Rota: <a href="https://project-osrm.org" target="_blank" rel="noopener">OSRM</a> / &copy; OpenStreetMap'); }
          map.fitBounds(line.getBounds().extend(from).extend(DEST), { padding: [40, 40], maxZoom: 16 });
          setStatus(st, "ok", '<span class="lr-row"><span><small>Mesafe</small><strong>' + fmtDist(rt.distance) + '</strong></span><span><small>Tahmini süre</small><strong>~' + fmtDur(rt.duration) + '</strong></span></span><span class="lr-note">Araçla, trafik durumu hariç yaklaşık değerdir.</span>' + nav);
        })
        .catch(function () {
          clearTimeout(timer); setBusy(st, false);
          L.polyline([from, DEST], { color: "#ffffff", weight: 6, opacity: .9, interactive: false }).addTo(st.layer);
          L.polyline([from, DEST], { color: "#1a6fd1", weight: 3, dashArray: "6 8", interactive: false }).addTo(st.layer);
          map.fitBounds(L.latLngBounds([from, DEST]), { padding: [40, 40], maxZoom: 16 });
          setStatus(st, "warn", "Rota şu anda hesaplanamadı. Kuş uçuşu mesafe: <strong>" + fmtDist(haversine(from, DEST)) + "</strong>. " + nav);
        });
    }

    function locate(st) {
      if (!navigator.geolocation) { setStatus(st, "err", "Tarayıcınız konum özelliğini desteklemiyor." + appsHint); return; }
      if (!st.map) { st.pending = true; setBusy(st, true); setStatus(st, "info", "Harita hazırlanıyor…"); init(st); return; }
      setBusy(st, true); setStatus(st, "info", "Konumunuz alınıyor… Tarayıcınız izin isterse “İzin ver”i seçin.");
      if (st.map.closePopup) st.map.closePopup();
      navigator.geolocation.getCurrentPosition(function (pos) {
        st.acc = pos.coords.accuracy;
        drawRoute(st, [pos.coords.latitude, pos.coords.longitude]);
      }, function (err) {
        setBusy(st, false);
        var msg = err && err.code === 1 ? "Konum izni verilmedi." : err && err.code === 3 ? "Konumunuz zamanında alınamadı." : "Konumunuz belirlenemedi.";
        setStatus(st, "err", msg + appsHint);
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    }

    var states = maps.map(function (el) {
      var box = el.closest(".lmap") || el.parentNode;
      return { el: el, box: box, btn: $(".lmap-locate", box), route: $(".lmap-route", box) };
    });
    function stateFor(node) { for (var i = 0; i < states.length; i++) if (states[i].box.contains(node)) return states[i]; return states[0]; }
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-locate]");
      if (b) { e.preventDefault(); locate(stateFor(b)); }
    });
    if ("IntersectionObserver" in window) {
      var mio = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { mio.unobserve(en.target); init(stateFor(en.target)); } }); }, { rootMargin: "600px 0px" });
      states.forEach(function (st) { mio.observe(st.el); });
    } else states.forEach(init);
  })();

  /* Formlar: FormSubmit (e-posta) ile gerçek gönderim + WhatsApp seçeneği */
  function collect(form) {
    var lines = [], data = {}, ok = true, first = null;
    $$(".field", form).forEach(function (f) { f.classList.remove("invalid"); });
    $$(".consent", form).forEach(function (c) { c.classList.remove("invalid"); });
    $$("[name]", form).forEach(function (el) {
      if (el.name.charAt(0) === "_") return;            // gizli/teknik alanlar (honeypot vb.)
      if (el.type === "checkbox") {
        if (el.required && !el.checked) { ok = false; first = first || el; el.closest(".consent") && el.closest(".consent").classList.add("invalid"); }
        if (el.name === "kvkk" && el.checked) data["KVKK onayı"] = "Aydınlatma metni okundu (onaylandı)";
        return;
      }
      var v = (el.value || "").trim();
      var label = el.getAttribute("data-label") || el.name;
      if (el.required && !v) { ok = false; var fl = el.closest(".field"); if (fl) fl.classList.add("invalid"); first = first || el; }
      if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { ok = false; el.closest(".field").classList.add("invalid"); first = first || el; }
      if (v) { lines.push(label + ": " + v); data[label] = v; }
    });
    var ad = form.querySelector('[name="ad"]'), em = form.querySelector('input[type="email"]');
    return { ok: ok, lines: lines, data: data, first: first, ad: ad ? ad.value.trim() : "", email: em ? em.value.trim() : "" };
  }
  var waHref = "https://wa.me/" + S.whatsapp;
  var fallback = function () {
    return ' Lütfen <a href="' + waHref + '" target="_blank" rel="noopener">WhatsApp ile yazın</a> ya da bizi arayın: ' + phoneLinks(", ", " veya ") + '; e-posta: <a href="mailto:' + S.email + '">' + esc(S.email) + "</a>.";
  };
  $$("form[data-send-form]").forEach(function (form) {
    var status = $(".form-status", form), busy = false;
    var apiBtn = $('[data-send="api"]', form);
    function show(type, html) { if (!status) return; status.className = "form-status show " + type; status.innerHTML = html; }
    function setLoading(on) {
      busy = on; form.setAttribute("aria-busy", on ? "true" : "false");
      if (apiBtn) { apiBtn.classList.toggle("loading", on); apiBtn.disabled = on; }
    }
    function invalidMsg(r) { show("err", "Lütfen zorunlu (*) alanları doldurun, e-posta adresinizi kontrol edin ve KVKK aydınlatma metnini onaylayın."); if (r.first) r.first.focus(); }
    function sendApi() {
      if (busy) return;
      var r = collect(form);
      if (!r.ok) return invalidMsg(r);
      var title = form.getAttribute("data-title") || "Web Sitesi Talebi";
      var honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) { show("ok", "Talebiniz alındı. Teşekkür ederiz."); form.reset(); return; } // bot
      var payload = {};
      for (var k in r.data) payload[k] = r.data[k];
      payload["Form"] = title;
      payload["Sayfa"] = location.href.split("#")[0];
      payload._subject = (form.getAttribute("data-subject") || "Yeni Teklif Talebi") + " - " + (r.ad || "Web sitesi");
      payload._template = "table";
      payload._captcha = "false";
      payload._honey = "";
      if (r.email) payload._replyto = r.email;
      if (!S.formEndpoint || !window.fetch) { show("err", "Talebiniz şu anda e-posta ile iletilemedi." + fallback()); return; }
      setLoading(true);
      show("info", "Talebiniz gönderiliyor, lütfen bekleyin…");
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json().catch(function () { return { success: res.ok ? "true" : "false" }; }).then(function (j) { j._status = res.status; return j; }); })
        .then(function (j) {
          clearTimeout(timer); setLoading(false);
          if (String(j.success) === "true") {
            form.reset();
            show("ok", "<strong>Talebiniz alındı.</strong> Teşekkür ederiz" + (r.ad ? ", " + esc(r.ad.split(" ")[0]) : "") + "! Bilgileriniz ekibimize e-posta ile ulaştı; en kısa sürede size dönüş yapacağız. Acil durumlar için " + (PH[0] ? who(PH[0]) + ': <a href="tel:' + PH[0].tel + '">' + esc(PH[0].display) + "</a>" : "") + ".");
          } else {
            show("err", "<strong>Talebiniz şu anda iletilemedi.</strong>" + fallback());
          }
        })
        .catch(function () { clearTimeout(timer); setLoading(false); show("err", "<strong>Bağlantı hatası nedeniyle talebiniz gönderilemedi.</strong>" + fallback()); });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); sendApi(); });
    $$('[data-send="wa"]', form).forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var r = collect(form);
        if (!r.ok) return invalidMsg(r);
        var title = form.getAttribute("data-title") || "Web Sitesi Talebi";
        var text = title + "\n\n" + r.lines.join("\n") + "\n\n(Gönderen: " + location.hostname + " web sitesi formu)";
        window.open(waHref + "?text=" + encodeURIComponent(text), "_blank", "noopener");
        show("ok", "WhatsApp açılıyor… Mesajınız hazır; göndermek için WhatsApp'ta “Gönder”e dokunun. Açılmazsa bizi arayabilirsiniz: " + phoneLinks(", ", " veya ") + ".");
      });
    });
  });

  /* Teklif formunda ?hizmet=slug ile hizmet ön seçimi */
  var hs = $("#f-hizmet");
  if (hs && window.URLSearchParams) {
    var slug = new URLSearchParams(location.search).get("hizmet");
    if (slug) $$("option", hs).forEach(function (o) { if (o.getAttribute("data-slug") === slug) hs.value = o.value; });
  }

  /* Sözlük arama ve filtre */
  var search = $("#term-search");
  if (search) {
    var terms = $$(".term"), chips = $$(".chip"), cat = "all", empty = $(".no-results");
    var norm = function (t) { return t.toLocaleLowerCase("tr-TR"); };
    function apply() {
      var q = norm(search.value.trim()), n = 0;
      terms.forEach(function (t) {
        var show = (cat === "all" || t.getAttribute("data-cat") === cat) && (!q || norm(t.textContent).indexOf(q) > -1);
        t.classList.toggle("hidden", !show); if (show) n++;
      });
      $$(".term-section").forEach(function (sec) { sec.style.display = $$(".term:not(.hidden)", sec).length ? "" : "none"; });
      if (empty) empty.style.display = n ? "none" : "block";
    }
    search.addEventListener("input", apply);
    chips.forEach(function (c) { c.addEventListener("click", function () { chips.forEach(function (x) { x.classList.remove("active"); }); c.classList.add("active"); cat = c.getAttribute("data-filter"); apply(); }); });
  }

  /* Görünür olunca animasyon */
  var rev = $$(".reveal");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) rev.forEach(function (r) {
    var sib = Array.prototype.filter.call(r.parentNode.children, function (c) { return c.classList.contains("reveal"); });
    var i = sib.indexOf(r); if (i > 0) r.style.transitionDelay = (i % 4) * 90 + "ms";
  });
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { var t = en.target; t.classList.add("in"); io.unobserve(t); setTimeout(function () { t.classList.add("done"); t.style.transitionDelay = ""; }, 1300); } }); }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    rev.forEach(function (r) { io.observe(r); });
  } else rev.forEach(function (r) { r.classList.add("in"); });
})();
