/* KADIOĞLU LOJİSTİK — Muhasebe Paneli · oturum, yönlendirme, kabuk */
/* sürüm denetimi: index.html ve tüm betikler aynı yayından mı? (eski önbellek karışmasını önler) */
(function (b, n) {
  var B = (window.MP_BUILD = window.MP_BUILD || {}); B[n] = b;
  var m = document.querySelector('meta[name="panel-build"]'), v = m && m.content;
  if (v && v !== b) window.MP_STALE = true;
  if (window.MP_GUARD) return; window.MP_GUARD = true;
  window.MP_isStale = function () { return !!v && ['core', 'pages', 'pages2', 'app'].some(function (x) { return B[x] !== v; }); };
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.MP_isStale()) return;
    var k = 'mp-reload-' + v;
    try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); location.reload(); return; } } catch (e) { /* sessionStorage yok */ }
    var d = document.createElement('div'); d.className = 'stale-banner'; d.setAttribute('role', 'alert');
    d.textContent = 'Panel güncellendi ancak tarayıcı eski dosyaları kullanıyor. Lütfen sayfayı Ctrl+F5 ile (telefonda: tarayıcı önbelleğini temizleyip) yenileyin.';
    document.body.prepend(d);
  });
})('9579c68a0b7c', 'app');
(function () {
  'use strict';
  const MP = window.MP;
  const { $, $$ } = MP;
  if (window.top !== window.self) { try { window.top.location = window.self.location; } catch (e) { document.body.innerHTML = ''; } }

  const screens = ['scr-config', 'scr-auth', 'scr-pending', 'scr-app'];
  const show = (id) => { $('#boot').hidden = true; screens.forEach((s) => { $('#' + s).hidden = s !== id; }); };

  $$('[data-firma]').forEach((e) => { e.textContent = MP.cfg.FIRMA_ADI || ''; });
  $$('[data-firma-kisa]').forEach((e) => { e.textContent = MP.cfg.FIRMA_KISA || 'Kadıoğlu Lojistik'; });

  /* ---------------- Giriş ekranı ---------------- */
  const authForms = { login: '#f-login', signup: '#f-signup', forgot: '#f-forgot', recover: '#f-recover' };
  function showAuth(which, message, ok) {
    show('scr-auth');
    Object.entries(authForms).forEach(([k, sel]) => { $(sel).hidden = k !== which; });
    const f = $(authForms[which]);
    const msg = f.querySelector('.form-msg');
    msg.textContent = message || ''; msg.classList.toggle('ok', !!ok);
    const inp = f.querySelector('input'); if (inp) setTimeout(() => inp.focus(), 30);
  }
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    const email = $('#f-login').elements.email.value;
    showAuth(b.dataset.go);
    if ((b.dataset.go === 'forgot' || b.dataset.go === 'signup') && email) $(authForms[b.dataset.go]).elements.email.value = email;
  }));
  $('.pw-toggle').addEventListener('click', (e) => {
    const inp = e.target.previousElementSibling;
    const vis = inp.type === 'password';
    inp.type = vis ? 'text' : 'password';
    e.target.textContent = vis ? 'Gizle' : 'Göster';
    e.target.setAttribute('aria-label', vis ? 'Şifreyi gizle' : 'Şifreyi göster');
  });
  const busy = (form, on) => { const b = form.querySelector('[type=submit]'); b.disabled = on; b.classList.toggle('busy', on); };
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  MP.passwordProblem = (p) => {
    if (!p || p.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
    if (!/[a-zçğıöşü]/.test(p) || !/[A-ZÇĞİÖŞÜ]/.test(p) || !/[0-9]/.test(p)) return 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.';
    return null;
  };

  $('#f-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = f.querySelector('.form-msg');
    const ad = f.elements.ad_soyad.value.trim().replace(/\s+/g, ' ');
    const email = f.elements.email.value.trim();
    const p1 = f.elements.password.value, p2 = f.elements.password2.value;
    msg.classList.remove('ok');
    if (ad.length < 3) { msg.textContent = 'Ad soyad girin.'; return; }
    if (!validEmail(email)) { msg.textContent = 'Geçerli bir e-posta adresi girin.'; return; }
    const pp = MP.passwordProblem(p1); if (pp) { msg.textContent = pp; return; }
    if (p1 !== p2) { msg.textContent = 'Şifreler eşleşmiyor.'; return; }
    msg.textContent = ''; busy(f, true);
    try {
      // Rol/onay burada GÖNDERİLMEZ; veritabanı her yeni kaydı "beklemede" açar (ilk kayıt hariç).
      const { data, error } = await MP.sb.auth.signUp({
        email, password: p1,
        options: { data: { ad_soyad: ad }, emailRedirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
      f.reset();
      if (data.session) return enterApp(data.session);
      // E-posta doğrulaması açıksa oturum gelmez
      showAuth('login', 'Kaydınız alındı. E-postanıza gelen bağlantı ile adresinizi doğrulayın, ardından giriş yapın.', true);
    } catch (err) {
      msg.textContent = /already registered|already exists/i.test(err && err.message) ? 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapın veya şifrenizi sıfırlayın.' : MP.errMsg(err);
    } finally { busy(f, false); }
  });

  $('#f-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = f.querySelector('.form-msg');
    const email = f.elements.email.value.trim(), password = f.elements.password.value;
    msg.classList.remove('ok');
    if (!validEmail(email)) { msg.textContent = 'Geçerli bir e-posta adresi girin.'; return; }
    if (!password) { msg.textContent = 'Şifrenizi girin.'; return; }
    msg.textContent = ''; busy(f, true);
    try {
      const { data, error } = await MP.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      f.elements.password.value = '';
      await enterApp(data.session);
    } catch (err) { msg.textContent = MP.errMsg(err); } finally { busy(f, false); }
  });

  $('#f-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = f.querySelector('.form-msg');
    const email = f.elements.email.value.trim();
    msg.classList.remove('ok');
    if (!validEmail(email)) { msg.textContent = 'Geçerli bir e-posta adresi girin.'; return; }
    busy(f, true);
    try {
      const redirectTo = location.origin + location.pathname;
      const { error } = await MP.sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      msg.classList.add('ok');
      msg.textContent = 'Bu adres sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi. E-postanızı kontrol edin.';
    } catch (err) { msg.textContent = MP.errMsg(err); } finally { busy(f, false); }
  });

  $('#f-recover').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, msg = f.querySelector('.form-msg');
    const p1 = f.elements.password.value, p2 = f.elements.password2.value;
    msg.classList.remove('ok');
    const pp = MP.passwordProblem(p1); if (pp) { msg.textContent = pp; return; }
    if (p1 !== p2) { msg.textContent = 'Şifreler eşleşmiyor.'; return; }
    busy(f, true);
    try {
      const { error } = await MP.sb.auth.updateUser({ password: p1 });
      if (error) throw error;
      f.reset();
      recovering = false;
      history.replaceState(null, '', location.pathname + '#/');
      MP.toast('Şifreniz kaydedildi.', 'ok');
      const { data } = await MP.sb.auth.getSession();
      if (data.session) await enterApp(data.session); else showAuth('login', 'Şifreniz güncellendi. Yeni şifrenizle giriş yapın.', true);
    } catch (err) { msg.textContent = MP.errMsg(err); } finally { busy(f, false); }
  });

  /* ---------------- Oturum ---------------- */
  let inApp = false, recovering = false;

  async function enterApp(session) {
    MP.state.session = session;
    if (!session) { inApp = false; return showAuth('login'); }
    if (recovering) return showAuth('recover');
    let profile = null;
    try {
      profile = await MP.q(MP.sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
    } catch (e) {
      console.warn(e);
      return showAuth('login', 'Profil okunamadı: ' + MP.errMsg(e));
    }
    MP.state.profile = profile;
    if (!profile || !profile.onayli || !profile.rol) {
      inApp = false;
      $('#pending-email').textContent = session.user.email || '';
      return show('scr-pending');
    }
    try { await Promise.all([MP.loadMusteriler(), MP.loadTedarikciler(), MP.loadAraclar()]); } catch (e) { console.warn(e); MP.toast(MP.errMsg(e), 'err'); }
    renderShell();
    inApp = true;
    show('scr-app');
    startIdleTimer();
    route();
  }

  async function logout(reason) {
    try { await MP.sb.auth.signOut(); } catch (e) { console.warn(e); }
    MP.state.session = null; MP.state.profile = null; MP.state.musteriler = []; MP.state.tedarikciler = []; MP.state.araclar = []; MP.state.filters = {};
    MP.destroyCharts();
    inApp = false;
    $('#view').innerHTML = '';
    showAuth('login', reason || '', !!reason);
  }
  MP.logout = logout;

  $('#btn-pending-logout').addEventListener('click', () => logout());
  $('#btn-pending-refresh').addEventListener('click', async () => {
    const { data } = await MP.sb.auth.getSession();
    enterApp(data.session);
  });

  /* Hareketsizlik zaman aşımı */
  let idleTimer = null;
  function startIdleTimer() {
    const dk = Number(MP.cfg.OTURUM_ZAMAN_ASIMI_DK) || 0;
    if (!dk || idleTimer !== null) return;
    let last = Date.now();
    ['click', 'keydown', 'pointermove', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { last = Date.now(); }, { passive: true }));
    idleTimer = setInterval(() => {
      if (inApp && Date.now() - last > dk * 60000) logout('Uzun süre işlem yapılmadığı için oturum güvenlik amacıyla kapatıldı.');
    }, 30000);
  }

  /* ---------------- Kabuk ---------------- */
  function renderShell() {
    const p = MP.state.profile;
    $('#u-name').textContent = p.ad_soyad || p.email || '';
    $('#u-role').textContent = MP.L.rol[p.rol] || p.rol;
    $('#u-avatar').textContent = MP.initials(p.ad_soyad || p.email);
    $$('#nav [data-only]').forEach((a) => { a.hidden = a.dataset.only !== p.rol; });
  }
  const app = $('#scr-app');
  const closeMenu = () => { app.classList.remove('menu-open'); $('#btn-menu').setAttribute('aria-expanded', 'false'); };
  $('#btn-menu').addEventListener('click', () => { const o = app.classList.toggle('menu-open'); $('#btn-menu').setAttribute('aria-expanded', String(o)); });
  $('#backdrop').addEventListener('click', closeMenu);
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  const userMenu = $('#user-menu');
  $('#btn-user').addEventListener('click', (e) => { e.stopPropagation(); userMenu.hidden = !userMenu.hidden; $('#btn-user').setAttribute('aria-expanded', String(!userMenu.hidden)); });
  document.addEventListener('click', (e) => { if (!userMenu.hidden && !userMenu.contains(e.target)) userMenu.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { userMenu.hidden = true; closeMenu(); } });
  userMenu.addEventListener('click', (e) => {
    const act = e.target.closest('button') && e.target.closest('button').dataset.act;
    userMenu.hidden = true;
    if (act === 'logout') logout();
    if (act === 'password') changePassword();
  });

  function changePassword() {
    MP.formDialog({
      title: 'Şifre değiştir', submit: 'Şifreyi güncelle',
      body: MP.F.text('p1', 'Yeni şifre', '', { type: 'password', required: true, full: true, extra: ' minlength="8" autocomplete="new-password"' }) +
            MP.F.text('p2', 'Yeni şifre (tekrar)', '', { type: 'password', required: true, full: true, extra: ' autocomplete="new-password"' }),
      onSubmit: async (f) => {
        const p1 = f.elements.p1.value, p2 = f.elements.p2.value;
        const pp = MP.passwordProblem(p1); if (pp) throw new Error(pp);
        if (p1 !== p2) throw new Error('Şifreler eşleşmiyor.');
        const { error } = await MP.sb.auth.updateUser({ password: p1 });
        if (error) throw error;
        MP.toast('Şifreniz güncellendi.', 'ok');
      }
    });
  }

  /* ---------------- Yönlendirme ---------------- */
  const titles = { dashboard: 'Gösterge Paneli', musteriler: 'Müşteriler', ekstre: 'Cari Ekstre', faturalar: 'Faturalar',
    tahsilatlar: 'Tahsilatlar', giderler: 'Giderler', raporlar: 'Raporlar', kullanicilar: 'Kullanıcılar',
    tedarikciler: 'Tedarikçiler', tedarikci_ekstre: 'Tedarikçi Ekstresi', 'gelen-faturalar': 'Gelen Faturalar', odemeler: 'Ödemeler',
    borclar: 'Borçlarım', araclar: 'Araçlar', arac_detay: 'Araç' };
  const navOf = { ekstre: 'musteriler', tedarikci_ekstre: 'tedarikciler', arac_detay: 'araclar' };
  let renderSeq = 0;
  MP.renderSeq = () => renderSeq;
  async function route() {
    if (!inApp) return;
    const h = location.hash.replace(/^#\/?/, '');
    if (/access_token|error_description|type=/.test(h)) return;
    const parts = h.split('/').filter(Boolean);
    let name = parts[0] || 'dashboard';
    let param = parts[1];
    if (name === 'musteriler' && param) name = 'ekstre';
    if (name === 'tedarikciler' && param) name = 'tedarikci_ekstre';
    if (name === 'araclar' && param) name = 'arac_detay';
    if (!MP.pages[name]) name = 'dashboard';
    if (name === 'kullanicilar' && !MP.can.admin()) { location.hash = '#/'; return; }
    $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (navOf[name] || name)));
    $('#top-title').textContent = titles[name];
    document.title = titles[name] + ' · Muhasebe Paneli · Kadıoğlu Lojistik';
    MP.destroyCharts();
    const view = $('#view');
    const seq = ++renderSeq;
    view.innerHTML = '<div class="skeleton"></div>';
    try {
      await MP.pages[name](view, param, seq);
    } catch (e) {
      console.warn(e);
      if (seq === renderSeq) view.innerHTML = `<div class="card card-pad"><h2>Veriler yüklenemedi</h2><p class="muted">${MP.esc(MP.errMsg(e))}</p><button class="btn" type="button" id="btn-retry">Tekrar dene</button></div>`;
      const r = $('#btn-retry'); if (r) r.onclick = route;
    }
    if (seq === renderSeq) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  MP.route = route;
  window.addEventListener('hashchange', route);

  /* ---------------- Başlangıç ---------------- */
  async function init() {
    // Tüm betikler aynı yayından gelmeli; değilse (eski önbellek) API'ye dokunmadan dur —
    // yeniden yükleme / uyarı yukarıdaki sürüm denetimi tarafından yapılır.
    if (window.MP_STALE || (window.MP_isStale && window.MP_isStale())) {
      $('#boot').textContent = 'Panel güncelleniyor…';
      return;
    }
    if (!MP.configured || !MP.sb) return show('scr-config');
    const hash = location.hash;
    recovering = /type=(recovery|invite)/.test(hash); // davet bağlantısı da şifre belirlemeye gider
    const hashErr = /error_description=([^&]+)/.exec(hash);

    MP.sb.auth.onAuthStateChange((event, session) => {
      // Supabase çağrılarını geri çağırma dışında yap (kilitlenmeyi önler)
      setTimeout(() => {
        if (event === 'PASSWORD_RECOVERY') { recovering = true; showAuth('recover'); }
        else if (event === 'SIGNED_OUT' && inApp) { inApp = false; showAuth('login'); }
        else if (event === 'TOKEN_REFRESHED') MP.state.session = session;
      }, 0);
    });

    const { data, error } = await MP.sb.auth.getSession();
    if (hashErr) {
      history.replaceState(null, '', location.pathname);
      return showAuth('login', 'Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.');
    }
    if (error) console.warn(error);
    if (/access_token|type=/.test(hash)) history.replaceState(null, '', location.pathname + '#/');
    if (recovering && data.session) return showAuth('recover');
    if (data.session) return enterApp(data.session);
    showAuth('login');
  }
  init().catch((e) => { console.error(e); showAuth('login', MP.errMsg(e)); });
})();
