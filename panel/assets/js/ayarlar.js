/* KADIOĞLU LOJİSTİK — Muhasebe Paneli · Ayarlar (profil, görünüm, şirket, varsayılanlar, oturum, veri) */
/* sürüm denetimi: index.html ve tüm betikler aynı yayından mı? (eski önbellek karışmasını önler) */
(function (b, n) {
  var B = (window.MP_BUILD = window.MP_BUILD || {}); B[n] = b;
  var m = document.querySelector('meta[name="panel-build"]'), v = m && m.content;
  if (v && v !== b) window.MP_STALE = true;
  if (window.MP_GUARD) return; window.MP_GUARD = true;
  window.MP_isStale = function () { return !!v && ['core', 'pages', 'pages2', 'ayarlar', 'app'].some(function (x) { return B[x] !== v; }); };
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.MP_isStale()) return;
    var k = 'mp-reload-' + v;
    try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); location.reload(); return; } } catch (e) { /* sessionStorage yok */ }
    var d = document.createElement('div'); d.className = 'stale-banner'; d.setAttribute('role', 'alert');
    d.textContent = 'Panel güncellendi ancak tarayıcı eski dosyaları kullanıyor. Lütfen sayfayı Ctrl+F5 ile (telefonda: tarayıcı önbelleğini temizleyip) yenileyin.';
    document.body.prepend(d);
  });
})('cfd8539fbc09', 'ayarlar');
(function () {
  'use strict';
  const MP = window.MP;
  const { $, $$, esc } = MP;
  const sb = () => MP.sb;
  const F = MP.F;

  const sec = (id, title, sub, inner, badge) => `<section class="card card-pad set-sec" id="${id}">
      <div class="set-head"><div><h2>${esc(title)}</h2>${sub ? `<p class="muted small">${esc(sub)}</p>` : ''}</div>${badge || ''}</div>${inner}</section>`;
  const yetkiRozet = (ok, txt) => `<span class="badge ${ok ? 'b-odendi' : 'b-taslak'}">${esc(ok ? 'Düzenleyebilirsiniz' : txt)}</span>`;
  const msgEl = (form) => form.querySelector('.form-msg');
  const setMsg = (form, text, ok) => { const m = msgEl(form); m.textContent = text || ''; m.classList.toggle('ok', !!ok); };
  const busy = (form, on) => { const b = form.querySelector('[type=submit]'); if (b) { b.disabled = on; b.classList.toggle('busy', on); } };
  const strip = (v) => (v == null ? '' : String(v).trim().replace(/\s+/g, ' '));
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const YEDEK_TABLOLAR = [
    ['musteriler', 'Müşteriler'], ['faturalar', 'Faturalar'], ['tahsilatlar', 'Tahsilatlar'], ['giderler', 'Giderler'],
    ['tedarikciler', 'Tedarikçiler'], ['gelen_faturalar', 'Gelen Faturalar'], ['odemeler', 'Ödemeler'], ['araclar', 'Araçlar'],
    ['profiles', 'Kullanıcılar'], ['ayarlar', 'Ayarlar'], ['audit_log', 'Değişiklik Geçmişi']
  ];

  MP.pages.ayarlar = async (el, _p, seq) => {
    await MP.loadAyarlar();
    if (seq !== MP.renderSeq()) return;
    const p = MP.state.profile || {};
    const a = MP.state.ayarlar;
    const admin = MP.can.admin(), yazar = MP.can.write();
    const pr = MP.prefs();
    const email = p.email || (MP.state.session && MP.state.session.user.email) || '';
    const ro = (cond) => (cond ? {} : { readonly: true });
    const noTable = !a ? '<div class="note warn">Ayarlar tablosu henüz kurulmamış (003_ayarlar.sql). Belgelerde varsayılan şirket bilgileri kullanılıyor.</div>' : '';
    const tabs = [['s-profil', 'Profilim'], ['s-gorunum', 'Görünüm'], ['s-sirket', 'Şirket Bilgileri'], ['s-varsayilan', 'Varsayılanlar'], ['s-oturum', 'Oturum'], ['s-veri', 'Veri']];

    el.innerHTML = `<div data-page class="settings">
      <div class="page-head"><div><h1>Ayarlar</h1><p class="muted">Profil, görünüm, şirket bilgileri, varsayılanlar, oturum ve veri yedeği</p></div></div>
      <nav class="tabs set-tabs no-print" aria-label="Ayar bölümleri">${tabs.map(([id, t]) => `<button type="button" data-goto="${id}">${esc(t)}</button>`).join('')}</nav>
      <div class="set-grid">
      ${sec('s-profil', 'Profilim', 'Adınız ve telefonunuz diğer kullanıcılara görünür. Rol ve onay yalnızca yönetici tarafından değiştirilir.', `
        <form data-f="profil" novalidate><div class="form-grid">
          ${F.text('ad_soyad', 'Ad soyad', p.ad_soyad, { required: true, max: 120, extra: ' autocomplete="name"' })}
          ${F.text('telefon', 'Telefon', p.telefon, { type: 'tel', max: 40, placeholder: '0 (5xx) xxx xx xx', extra: ' autocomplete="tel"' })}
          ${F.text('email_ro', 'E-posta', email, { readonly: true })}
          ${F.text('rol_ro', 'Rol', MP.L.rol[p.rol] || p.rol || '', { readonly: true })}
        </div><div class="form-msg" role="alert"></div>
        <div class="set-foot"><button class="btn btn-primary" type="submit">Profili kaydet</button></div></form>
        <hr class="set-hr">
        <h3>Şifre değiştir</h3>
        <form data-f="sifre" novalidate autocomplete="off"><div class="form-grid">
          <input type="text" name="username" value="${esc(email)}" autocomplete="username" hidden>
          ${F.text('mevcut', 'Mevcut şifre', '', { type: 'password', required: true, full: true, extra: ' autocomplete="current-password"' })}
          ${F.text('p1', 'Yeni şifre', '', { type: 'password', required: true, extra: ' minlength="8" autocomplete="new-password"' })}
          ${F.text('p2', 'Yeni şifre (tekrar)', '', { type: 'password', required: true, extra: ' autocomplete="new-password"' })}
          <p class="hint full" style="margin:0">En az 8 karakter; en az bir büyük harf, bir küçük harf ve bir rakam.</p>
        </div><div class="form-msg" role="alert"></div>
        <div class="set-foot"><button class="btn btn-primary" type="submit">Şifreyi güncelle</button></div></form>`)}

      ${sec('s-gorunum', 'Görünüm', 'Bu tercihler hesabınıza özel olarak bu tarayıcıda saklanır ve hemen uygulanır.', `
        <form data-f="gorunum"><div class="form-grid">
          <fieldset class="fld seg"><span>Tema</span><div class="seg-row">
            <label><input type="radio" name="tema" value="acik"${pr.tema === 'acik' ? ' checked' : ''}> Açık</label>
            <label><input type="radio" name="tema" value="koyu"${pr.tema === 'koyu' ? ' checked' : ''}> Koyu</label></div></fieldset>
          ${F.select('yazi', 'Yazı boyutu', [['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük']], pr.yazi)}
          ${F.select('sayfa', 'Sayfa başına kayıt', [['25', '25'], ['50', '50'], ['100', '100'], ['200', '200']], String(pr.sayfa))}
        </div></form>`)}

      ${sec('s-sirket', 'Şirket Bilgileri', 'Cari ekstre ve tahsilat makbuzu gibi yazdırılan belgelerin antetinde kullanılır.', `${noTable}
        <form data-f="sirket" novalidate><div class="form-grid">
          ${F.text('sirket_unvan', 'Ünvan', MP.ayar('sirket_unvan'), Object.assign({ required: true, full: true, max: 200 }, ro(admin && a)))}
          ${F.text('sirket_kisa_ad', 'Kısa ad', MP.ayar('sirket_kisa_ad'), Object.assign({ max: 60 }, ro(admin && a)))}
          ${F.text('sirket_eposta', 'E-posta', MP.ayar('sirket_eposta'), Object.assign({ type: 'email', max: 120 }, ro(admin && a)))}
          ${F.area('sirket_adres', 'Adres', MP.ayar('sirket_adres'), Object.assign({ rows: 2 }, ro(admin && a)))}
          ${F.text('vergi_dairesi', 'Vergi dairesi', MP.ayar('vergi_dairesi'), Object.assign({ max: 80 }, ro(admin && a)))}
          ${F.text('vergi_no', 'Vergi no', MP.vergiNoFmt(MP.ayar('vergi_no')), Object.assign({ extra: ' inputmode="numeric"', max: 14, placeholder: '10 haneli VKN' }, ro(admin && a)))}
          ${F.text('sirket_telefonlar', 'Telefonlar', MP.ayar('sirket_telefonlar'), Object.assign({ full: true, max: 200, placeholder: 'Birden fazlaysa " / " ile ayırın' }, ro(admin && a)))}
          <div class="fld full"><span>Logo</span><div class="logo-prev"><img src="assets/img/logo-belge.png" alt="Belge logosu"><small class="muted">Belgelerde kullanılan logo (değiştirilmedi).</small></div></div>
        </div><div class="form-msg" role="alert"></div>
        ${admin && a ? '<div class="set-foot"><button class="btn btn-primary" type="submit">Şirket bilgilerini kaydet</button></div>' : ''}</form>`,
        yetkiRozet(admin && a, 'Yalnızca yönetici değiştirebilir'))}

      ${sec('s-varsayilan', 'Varsayılanlar', 'Yeni kayıt formlarında ve gösterge panelinde kullanılır. Tüm kullanıcılar için geçerlidir.', `
        <form data-f="varsayilan" novalidate><div class="form-grid">
          ${F.select('varsayilan_kdv', 'Varsayılan KDV oranı', [['0', '%0'], ['1', '%1'], ['10', '%10'], ['20', '%20']].concat([0, 1, 10, 20].includes(MP.ayarNum('varsayilan_kdv')) ? [] : [[String(MP.ayarNum('varsayilan_kdv')), '%' + MP.num(MP.ayarNum('varsayilan_kdv'))]]), String(MP.ayarNum('varsayilan_kdv')), Object.assign({}, yazar && a ? {} : { extra: ' disabled' }))}
          ${F.text('varsayilan_vade_gun', 'Varsayılan vade (gün)', MP.ayarNum('varsayilan_vade_gun'), Object.assign({ type: 'number', extra: ' min="0" max="365" step="1"' + (yazar && a ? '' : ' readonly') }))}
          ${F.select('para_birimi', 'Para birimi', [['TRY', 'TRY — Türk lirası (TL)'], ['USD', 'USD — ABD doları'], ['EUR', 'EUR — Euro']], MP.ayar('para_birimi'), Object.assign({}, yazar && a ? {} : { extra: ' disabled' }))}
          ${F.text('fatura_on_ek', 'Fatura no öneki', MP.ayar('fatura_on_ek') || '', Object.assign({ max: 3, placeholder: 'ör. KLJ (boş = öneri yok)', extra: ' autocapitalize="characters"' + (yazar && a ? '' : ' readonly') }))}
          ${F.text('arac_uyari_gun', 'Araç belge uyarısı (gün)', MP.ayarNum('arac_uyari_gun'), Object.assign({ type: 'number', extra: ' min="1" max="365" step="1"' + (yazar && a ? '' : ' readonly') }))}
          <p class="hint full" style="margin:0">Fatura no önekiyle yeni faturada GİB biçiminde sıradaki numara önerilir (önek + yıl + 9 hane, ör. ${esc((MP.ayar('fatura_on_ek') || 'ABC') + new Date().getFullYear())}000000001). Vade 0 gün = vade tarihi boş bırakılır.</p>
        </div><div class="form-msg" role="alert"></div>
        ${yazar && a ? '<div class="set-foot"><button class="btn btn-primary" type="submit">Varsayılanları kaydet</button></div>' : ''}</form>`,
        yetkiRozet(yazar && a, 'Yönetici ve muhasebe değiştirebilir'))}

      ${sec('s-oturum', 'Oturum', 'Hareketsiz kaldığınızda güvenlik için otomatik çıkış yapılır.', `
        <form data-f="oturum"><div class="form-grid">
          ${F.select('oturum', 'Otomatik çıkış süresi', [['15', '15 dakika'], ['30', '30 dakika'], ['60', '60 dakika']], String(pr.oturum))}
        </div></form>
        <hr class="set-hr">
        <div class="set-row"><div><b>Tüm cihazlardan çıkış yap</b><p class="muted small" style="margin:2px 0 0">Bu hesapla açık olan tüm oturumlar (telefon, diğer bilgisayarlar) kapatılır; bu cihazda da yeniden giriş gerekir.</p></div>
          <button class="btn btn-danger" type="button" data-global-logout>Tüm cihazlardan çıkış yap</button></div>`)}

      ${sec('s-veri', 'Veri', 'Görme yetkiniz olan tüm tablolar, her biri ayrı sayfada olacak şekilde tek Excel dosyasına aktarılır.', `
        <div class="set-row"><div><b>Tüm verileri Excel olarak yedek indir</b><p class="muted small" style="margin:2px 0 0">${esc(YEDEK_TABLOLAR.filter(([t]) => t !== 'audit_log' || MP.can.audit()).map(([, n]) => n).join(' · '))}</p></div>
          <button class="btn btn-primary" type="button" data-yedek><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>Excel yedeği indir</button></div>
        <div class="muted small" data-yedek-durum></div>`)}
      </div></div>`;

    const root = $('[data-page]', el);
    const form = (n) => $(`[data-f="${n}"]`, root);
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) { const t = document.getElementById(g.dataset.goto); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });

    /* Profil */
    form('profil').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; setMsg(f, '');
      const ad = strip(f.elements.ad_soyad.value), tel = strip(f.elements.telefon.value);
      if (ad.length < 3) { f.elements.ad_soyad.classList.add('invalid'); return setMsg(f, 'Ad soyad en az 3 karakter olmalıdır.'); }
      if (tel && !/^[0-9+()\s-]{7,40}$/.test(tel)) { f.elements.telefon.classList.add('invalid'); return setMsg(f, 'Telefon yalnızca rakam, boşluk, + ( ) - içerebilir.'); }
      busy(f, true);
      try {
        const data = await MP.q(sb().from('profiles').update({ ad_soyad: ad, telefon: tel || null }).eq('id', p.id).select().single());
        MP.state.profile = Object.assign({}, MP.state.profile, data);
        MP.renderShell();
        setMsg(f, 'Profiliniz kaydedildi.', true); MP.toast('Profil kaydedildi.', 'ok');
      } catch (er) { setMsg(f, MP.errMsg(er)); } finally { busy(f, false); }
    });

    /* Şifre — mevcut şifre yeniden doğrulanır */
    form('sifre').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; setMsg(f, '');
      const cur = f.elements.mevcut.value, p1 = f.elements.p1.value, p2 = f.elements.p2.value;
      if (!cur) { f.elements.mevcut.classList.add('invalid'); return setMsg(f, 'Mevcut şifrenizi girin.'); }
      const pp = MP.passwordProblem(p1); if (pp) { f.elements.p1.classList.add('invalid'); return setMsg(f, pp); }
      if (p1 !== p2) { f.elements.p2.classList.add('invalid'); return setMsg(f, 'Yeni şifreler eşleşmiyor.'); }
      if (p1 === cur) return setMsg(f, 'Yeni şifre mevcut şifreden farklı olmalıdır.');
      busy(f, true);
      try {
        const chk = await sb().auth.signInWithPassword({ email, password: cur });
        if (chk.error) { f.elements.mevcut.classList.add('invalid'); throw new Error(/Invalid login credentials/i.test(chk.error.message) ? 'Mevcut şifre hatalı.' : MP.errMsg(chk.error)); }
        if (chk.data && chk.data.session) MP.state.session = chk.data.session;
        const { error } = await sb().auth.updateUser({ password: p1 });
        if (error) throw error;
        f.reset(); setMsg(f, 'Şifreniz güncellendi.', true); MP.toast('Şifreniz güncellendi.', 'ok');
      } catch (er) { setMsg(f, MP.errMsg(er)); } finally { busy(f, false); }
    });
    $$('form', root).forEach((f) => f.addEventListener('input', (e) => e.target.classList && e.target.classList.remove('invalid')));

    /* Görünüm — anında uygulanır */
    form('gorunum').addEventListener('change', (e) => {
      const f = e.currentTarget;
      MP.savePrefs({ tema: (f.querySelector('[name=tema]:checked') || {}).value || 'acik', yazi: f.elements.yazi.value, sayfa: +f.elements.sayfa.value });
      MP.toast('Görünüm tercihi kaydedildi.', 'ok');
    });
    form('gorunum').addEventListener('submit', (e) => e.preventDefault());

    /* Şirket bilgileri (yönetici) */
    form('sirket').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; setMsg(f, '');
      if (!admin || !a) return;
      const v = (n) => strip(f.elements[n].value) || null;
      const vn = (f.elements.vergi_no.value || '').replace(/\s/g, '');
      const payload = { sirket_unvan: v('sirket_unvan'), sirket_kisa_ad: v('sirket_kisa_ad'), sirket_adres: v('sirket_adres'), vergi_dairesi: v('vergi_dairesi'),
        vergi_no: vn || null, sirket_eposta: v('sirket_eposta'), sirket_telefonlar: v('sirket_telefonlar') };
      if (!payload.sirket_unvan) { f.elements.sirket_unvan.classList.add('invalid'); return setMsg(f, 'Ünvan zorunludur.'); }
      if (vn && !/^\d{10,11}$/.test(vn)) { f.elements.vergi_no.classList.add('invalid'); return setMsg(f, 'Vergi no 10 (VKN) veya 11 (TCKN) haneli olmalıdır.'); }
      if (payload.sirket_eposta && !validEmail(payload.sirket_eposta)) { f.elements.sirket_eposta.classList.add('invalid'); return setMsg(f, 'Geçerli bir e-posta girin.'); }
      busy(f, true);
      try {
        MP.state.ayarlar = await MP.q(sb().from('ayarlar').update(payload).eq('id', 1).select().single());
        f.elements.vergi_no.value = MP.vergiNoFmt(MP.state.ayarlar.vergi_no);
        MP.renderShell();
        setMsg(f, 'Şirket bilgileri kaydedildi; yeni belgelerde kullanılacak.', true); MP.toast('Şirket bilgileri kaydedildi.', 'ok');
      } catch (er) { setMsg(f, MP.errMsg(er)); } finally { busy(f, false); }
    });

    /* Varsayılanlar (yönetici + muhasebe) */
    form('varsayilan').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; setMsg(f, '');
      if (!yazar || !a) return;
      const int = (n, lo, hi, label) => { const x = Number(f.elements[n].value); if (!Number.isInteger(x) || x < lo || x > hi) { f.elements[n].classList.add('invalid'); throw new Error(label + ' ' + lo + '–' + hi + ' arasında tam sayı olmalıdır.'); } return x; };
      busy(f, true);
      try {
        const onEk = String(f.elements.fatura_on_ek.value || '').trim().toUpperCase();
        if (onEk && !/^[A-Z0-9]{1,3}$/.test(onEk)) { f.elements.fatura_on_ek.classList.add('invalid'); throw new Error('Fatura no öneki en fazla 3 karakter; yalnızca A–Z harf ve rakam (Türkçe karakter olmadan).'); }
        const payload = { varsayilan_kdv: Number(f.elements.varsayilan_kdv.value), varsayilan_vade_gun: int('varsayilan_vade_gun', 0, 365, 'Vade günü'),
          para_birimi: f.elements.para_birimi.value, fatura_on_ek: onEk || null, arac_uyari_gun: int('arac_uyari_gun', 1, 365, 'Araç uyarı günü') };
        MP.state.ayarlar = await MP.q(sb().from('ayarlar').update(payload).eq('id', 1).select().single());
        f.elements.fatura_on_ek.value = MP.state.ayarlar.fatura_on_ek || '';
        setMsg(f, 'Varsayılanlar kaydedildi.', true); MP.toast('Varsayılanlar kaydedildi.', 'ok');
      } catch (er) { setMsg(f, MP.errMsg(er)); } finally { busy(f, false); }
    });

    /* Oturum */
    form('oturum').addEventListener('change', (e) => { MP.savePrefs({ oturum: +e.currentTarget.elements.oturum.value }); MP.lastActivity = Date.now(); MP.toast('Otomatik çıkış süresi: ' + e.currentTarget.elements.oturum.value + ' dakika.', 'ok'); });
    form('oturum').addEventListener('submit', (e) => e.preventDefault());
    $('[data-global-logout]', root).addEventListener('click', async () => {
      if (!(await MP.confirm('Bu hesapla açık olan TÜM cihazlardaki oturumlar kapatılacak. Devam edilsin mi?', { title: 'Tüm cihazlardan çıkış', ok: 'Tüm cihazlardan çıkış yap' }))) return;
      MP.logout('Tüm cihazlardaki oturumlarınız kapatıldı. Yeniden giriş yapın.', 'global');
    });

    /* Veri yedeği */
    $('[data-yedek]', root).addEventListener('click', async (e) => {
      const btn = e.currentTarget, durum = $('[data-yedek-durum]', root);
      btn.disabled = true; btn.classList.add('busy');
      try { const n = await MP.excelYedek((t) => { durum.textContent = t; }); durum.textContent = 'Yedek indirildi: ' + n + ' sayfa.'; }
      catch (er) { durum.textContent = ''; MP.toast(MP.errMsg(er), 'err'); }
      finally { btn.disabled = false; btn.classList.remove('busy'); }
    });
  };

  /** Okuma yetkisi olan tüm tablolar → tek .xlsx (her tablo ayrı sayfa) */
  MP.excelYedek = async (progress) => {
    await MP.loadScript('assets/vendor/xlsx.mini.min.js');
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const ozet = [['Tablo', 'Sayfa', 'Kayıt sayısı']];
    const cell = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
    const kisalt = (v) => (typeof v === 'string' && v.length > 32000 ? v.slice(0, 32000) + '…' : v);
    const sheets = [];
    for (const [t, ad] of YEDEK_TABLOLAR) {
      if (t === 'audit_log' && !MP.can.audit()) continue;
      if (progress) progress(ad + ' okunuyor…');
      let rows;
      try { rows = await MP.fetchAll(() => MP.sb.from(t).select('*').order(t === 'audit_log' ? 'id' : 'id')); }
      catch (e) { console.info(t, MP.errMsg(e)); continue; }   // görme yetkisi yoksa atla
      const data = rows.map((r) => { const o = {}; Object.keys(r).forEach((k) => { o[k] = kisalt(cell(r[k])); }); return o; });
      const ws = data.length ? XLSX.utils.json_to_sheet(data) : XLSX.utils.aoa_to_sheet([['(kayıt yok)']]);
      if (data.length) ws['!cols'] = Object.keys(data[0]).map((k) => ({ wch: Math.min(40, Math.max(10, k.length + 2)) }));
      sheets.push([ad.slice(0, 31), ws]); ozet.push([t, ad, rows.length]);
    }
    const info = [['KADIOĞLU LOJİSTİK — Muhasebe Paneli veri yedeği'], ['Oluşturma', MP.dateTime(new Date().toISOString())],
      ['Kullanıcı', (MP.state.profile && (MP.state.profile.ad_soyad || MP.state.profile.email)) || ''], [], ...ozet];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Özet');
    sheets.forEach(([n, ws]) => XLSX.utils.book_append_sheet(wb, ws, n));
    wb.Props = { Title: 'Veri yedeği', Company: MP.ayar('sirket_unvan') };
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    MP.download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'kadioglu-yedek_' + MP.today() + '.xlsx');
    return sheets.length;
  };
})();
