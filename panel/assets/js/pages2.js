/* KADIOĞLU LOJİSTİK — Muhasebe Paneli · alış tarafı (tedarikçiler, gelen faturalar, ödemeler, borçlar),
   araçlar ve yazdırılabilir belgeler (cari hesap ekstresi, tahsilat makbuzu).
   Not: Panel resmi e-Fatura / e-Arşiv düzenlemez; yalnızca kayıt ve takip içindir. */
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
})('9579c68a0b7c', 'pages2');
(function () {
  'use strict';
  const MP = window.MP;
  const { $, $$, esc, L } = MP;
  const sb = () => MP.sb;
  const pages = MP.pages;
  const ICON = MP.ICON;
  const stale = (seq) => seq !== MP.renderSeq();
  const { listPage, saveRow, deleteRow, rowBtns, wireKur, kurVal } = MP;
  ICON.truck = '<svg viewBox="0 0 24 24"><path d="M1 6h13v10H1zM14 10h4l3 3v3h-7M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>';
  ICON.out = '<svg viewBox="0 0 24 24"><path d="M2 7h20v12H2zM12 16V10M9 13l3 3 3-3"/></svg>';

  const today = () => MP.today();
  const kalanGun = (d) => (d ? MP.daysBetween(MP.today(), String(d).slice(0, 10)) : null);
  const tedOpts = (inc) => MP.state.tedarikciler.filter((t) => t.aktif || t.id === inc).map((t) => [t.id, t.unvan]);
  const aracAd = (a) => a.plaka + ((a.marka || a.model) ? ' · ' + [a.marka, a.model].filter(Boolean).join(' ') : '');
  const aracOpts = (inc) => MP.state.araclar.filter((a) => a.aktif || a.id === inc).map((a) => [a.id, aracAd(a)]);
  MP.aracOpts = aracOpts;
  const gBadge = (d) => `<span class="badge b-g-${esc(d)}">${esc(L.gdurum[d] || d)}</span>`;
  const gunBadge = (gun) => gun == null ? '' : gun < 0 ? `<span class="badge b-gecikme">${MP.int(-gun)} gün geçti</span>`
    : gun === 0 ? '<span class="badge b-bugun">Bugün</span>' : gun <= 7 ? `<span class="badge b-yakin">${gun} gün kaldı</span>` : `<span class="badge">${gun} gün kaldı</span>`;
  MP.gunBadge = gunBadge;
  const belgeCell = (d) => { if (!d) return '<span class="muted">—</span>'; const g = kalanGun(d); return MP.date(d) + (g <= 30 ? '<br>' + gunBadge(g) : ''); };
  const vnCheck = (f) => {
    const vn = (MP.formVal(f, 'vergi_no') || '').replace(/\s/g, '');
    if (vn && !/^\d{10,11}$/.test(vn)) { f.elements.vergi_no.classList.add('invalid'); throw new Error('Vergi no 10 haneli (VKN) veya TCKN 11 haneli olmalıdır.'); }
    const em = MP.formVal(f, 'eposta');
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('E-posta adresi geçersiz.');
    return { vn: vn || null, em };
  };
  const later = (fn) => setTimeout(fn, 0);   // aynı diyalog kapanırken yenisini açmak için

  /* =====================================================================
     TEDARİKÇİLER
     ===================================================================== */
  function tedarikciForm(t, done) {
    t = t || { aktif: true };
    MP.formDialog({
      title: t.id ? 'Tedarikçiyi düzenle' : 'Yeni tedarikçi',
      body: MP.F.text('unvan', 'Ünvan', t.unvan, { required: true, full: true, max: 200, placeholder: 'ör. … Akaryakıt Ltd. Şti.' }) +
        MP.F.text('vergi_dairesi', 'Vergi dairesi', t.vergi_dairesi, { placeholder: 'ör. Şehitkamil' }) +
        MP.F.text('vergi_no', 'Vergi no / TCKN', t.vergi_no, { placeholder: '10 veya 11 hane', extra: ' inputmode="numeric" maxlength="11"' }) +
        MP.F.text('telefon', 'Telefon', t.telefon, { type: 'tel', placeholder: '0 (5xx) xxx xx xx' }) +
        MP.F.text('eposta', 'E-posta', t.eposta, { type: 'email' }) +
        MP.F.check('aktif', 'Aktif tedarikçi', t.aktif !== false) +
        MP.F.area('adres', 'Adres', t.adres) +
        MP.F.area('notlar', 'Not', t.notlar),
      onSubmit: async (f) => {
        const { vn, em } = vnCheck(f);
        const row = await saveRow('tedarikciler', t.id, {
          unvan: MP.formVal(f, 'unvan'), vergi_dairesi: MP.formVal(f, 'vergi_dairesi'), vergi_no: vn, telefon: MP.formVal(f, 'telefon'),
          eposta: em, adres: MP.formVal(f, 'adres'), notlar: MP.formVal(f, 'notlar'), aktif: MP.formVal(f, 'aktif')
        });
        await MP.loadTedarikciler();
        MP.toast(t.id ? 'Tedarikçi güncellendi.' : 'Tedarikçi eklendi.', 'ok');
        if (done) later(() => done(row));
      }
    });
  }
  MP.tedarikciForm = tedarikciForm;

  pages.tedarikciler = (el, _p, seq) => listPage(el, seq, {
    key: 'tedarikciler', title: 'Tedarikçiler', sub: 'Akaryakıt, servis, lastik, sigorta, kira ve diğer tedarikçiler · borç bakiyeleri (TL)', newText: 'Yeni tedarikçi',
    searchHint: 'Ünvan, telefon, vergi no…', defaults: { gorunum: 'aktif' }, clientOnly: ['gorunum'],
    filtersHtml: (f) => MP.F.select('gorunum', 'Görünüm', [['aktif', 'Aktif tedarikçiler'], ['borclu', 'Borcumuz olanlar'], ['gecmis', 'Vadesi geçen borcu olanlar'], ['pasif', 'Pasif tedarikçiler'], ['tumu', 'Tümü']], f.gorunum),
    load: async () => {
      const [ts, bs] = await Promise.all([MP.loadTedarikciler(), MP.fetchAll(() => sb().from('v_tedarikci_bakiye').select('*'))]);
      const bm = Object.fromEntries(bs.map((b) => [b.tedarikci_id, b]));
      return ts.map((t) => Object.assign({}, t, bm[t.id] || {}, { id: t.id }));
    },
    clientFilter: (r, f) => ({ aktif: r.aktif, pasif: !r.aktif, borclu: MP.n(r.bakiye_try) > 0.005, gecmis: MP.n(r.vadesi_gecmis_try) > 0.005, tumu: true })[f.gorunum || 'tumu'],
    searchText: (r) => [r.unvan, r.telefon, r.eposta, r.vergi_no, r.vergi_dairesi, r.notlar].join(' '),
    columns: () => [
      { h: 'Ünvan', v: (r) => r.unvan, html: (r) => `<a class="strong" href="#/tedarikciler/${r.id}">${esc(r.unvan)}</a>${r.aktif ? '' : ' <span class="badge">Pasif</span>'}` },
      { h: 'Telefon', v: (r) => r.telefon, html: (r) => r.telefon ? `<a href="tel:${esc(String(r.telefon).replace(/[^\d+]/g, ''))}">${esc(r.telefon)}</a>` : '' },
      { h: 'E-posta', v: (r) => r.eposta, show: false },
      { h: 'Vergi dairesi', v: (r) => r.vergi_dairesi, show: false },
      { h: 'Vergi no', v: (r) => r.vergi_no },
      { h: 'Adres', v: (r) => r.adres, show: false },
      { h: 'Toplam fatura', v: (r) => r.toplam_fatura_try, t: 'try' },
      { h: 'Ödenen', v: (r) => r.toplam_odeme_try, t: 'try' },
      { h: 'Bakiye (borcumuz)', v: (r) => r.bakiye_try, t: 'try', html: (r) => `<b class="${MP.n(r.bakiye_try) > 0.005 ? '' : 'muted'}">${MP.money(r.bakiye_try)}</b>` },
      { h: 'Vadesi geçmiş', v: (r) => r.vadesi_gecmis_try, t: 'try', html: (r) => MP.n(r.vadesi_gecmis_try) > 0 ? `<span class="neg">${MP.money(r.vadesi_gecmis_try)}</span>` : '<span class="muted">—</span>' }
    ],
    summary: (rows) => `<span class="chip">Toplam borcumuz <b>${MP.money(MP.sum(rows, 'bakiye_try'))}</b></span><span class="chip red">Vadesi geçmiş <b>${MP.money(MP.sum(rows, 'vadesi_gecmis_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : (['Toplam fatura', 'Ödenen', 'Bakiye (borcumuz)', 'Vadesi geçmiş'].includes(c.h) ? MP.money(MP.sum(rows, c.v)) : ''),
    actions: (r) => rowBtns(r, { extra: `<a class="btn btn-sm" href="#/tedarikciler/${r.id}" title="Cari ekstre">Ekstre</a>` }),
    onNew: (reload) => tedarikciForm(null, reload),
    onEdit: (r, reload) => tedarikciForm(MP.state.tedarikciler.find((t) => t.id === r.id), reload),
    onDelete: (r, reload) => deleteRow('tedarikciler', r.id, '“' + r.unvan + '” tedarikçisi', reload)
  });

  /* ---------- Ekstre satırları (devir + yürüyen bakiye) ---------- */
  // sign = +1: bakiye = borç − alacak (müşteri) · sign = −1: bakiye = alacak − borç (tedarikçi = borcumuz)
  MP.ekstreRows = (har, from, to, sign) => {
    to = to || '9999-12-31';
    const once = har.filter((h) => from && h.tarih < from);
    const devir = sign * (MP.sum(once, 'borc_try') - MP.sum(once, 'alacak_try'));
    let bakiye = devir;
    const rows = [];
    if (from) {
      const b = sign * devir;   // borç − alacak
      rows.push({ tur: 'devir', tarih: from, belge_no: '', aciklama: 'Önceki dönemden devir', borc_try: b > 0 ? b : 0, alacak_try: b < 0 ? -b : 0, bakiye: devir });
    }
    har.filter((h) => (!from || h.tarih >= from) && h.tarih <= to).forEach((h) => {
      bakiye += sign * (MP.n(h.borc_try) - MP.n(h.alacak_try));
      rows.push(Object.assign({}, h, { bakiye }));
    });
    return { rows, bakiye };
  };

  /* =====================================================================
     YAZDIRILABİLİR BELGELER (fatura DEĞİLDİR)
     ===================================================================== */
  const BA = (v, sup) => Math.abs(v) < 0.005 ? '' : (sup ? (v > 0 ? ' (A)' : ' (B)') : (v > 0 ? ' (B)' : ' (A)'));
  const islemAdi = (r, sup) => r.tur === 'devir' ? 'Devir' : r.tur === 'fatura' ? (sup ? 'Alış faturası' : 'Satış faturası') : r.tur === 'tahsilat' ? 'Tahsilat' : 'Ödeme';
  MP.ekstreAciklama = (r) => {
    let s = '';
    if (r.tur === 'tahsilat') s = L.yontem[r.aciklama] || r.aciklama || '';
    else if (r.tur === 'odeme') s = [L.yontem[r.yontem] || r.yontem, r.aciklama].filter(Boolean).join(' · ');
    else if (r.tur === 'fatura' && r.kategori) s = [L.gkategori[r.kategori], r.aciklama].filter(Boolean).join(' · ');
    else s = r.aciklama || '';
    if (r.para_birimi && r.para_birimi !== 'TRY' && r.tur !== 'devir') s += (s ? ' ' : '') + '(' + MP.money(r.tutar, r.para_birimi) + ')';
    return s;
  };
  /** o: { tur: 'musteri'|'tedarikci', cari, from, to, rows, bakiye } */
  MP.printEkstre = (o) => {
    const sup = o.tur === 'tedarikci', c = o.cari || {};
    const ad = sup ? c.unvan : c.firma;
    const real = o.rows.filter((r) => r.tur !== 'devir');
    const tb = MP.sum(o.rows, 'borc_try'), ta = MP.sum(o.rows, 'alacak_try');
    const donem = (o.from ? MP.date(o.from) : 'İlk kayıt') + ' – ' + MP.date(o.to && o.to < '9999' ? o.to : today());
    const son = o.bakiye;
    const metin = Math.abs(son) < 0.005
      ? `${MP.date(o.to || today())} tarihi itibarıyla cari hesabınız <b>kapalıdır</b> (bakiye 0,00 ₺).`
      : sup
        ? (son > 0 ? `Kayıtlarımıza göre ${MP.date(o.to || today())} tarihi itibarıyla firmanız lehine <b>${MP.money(son)} alacak</b> bakiyesi bulunmaktadır.`
                   : `Kayıtlarımıza göre ${MP.date(o.to || today())} tarihi itibarıyla firmanızın <b>${MP.money(-son)} borç</b> bakiyesi bulunmaktadır.`)
        : (son > 0 ? `Kayıtlarımıza göre ${MP.date(o.to || today())} tarihi itibarıyla firmanızın <b>${MP.money(son)} borç</b> bakiyesi bulunmaktadır.`
                   : `Kayıtlarımıza göre ${MP.date(o.to || today())} tarihi itibarıyla firmanız lehine <b>${MP.money(-son)} alacak</b> bakiyesi bulunmaktadır.`);
    const html = `<div class="doc">
      ${MP.letterhead('CARİ HESAP EKSTRESİ', `<div class="doc-meta"><span>Ekstre tarihi: <b>${MP.date(today())}</b></span><span>Dönem: <b>${esc(donem)}</b></span></div>`)}
      <section class="doc-parties">
        <div class="doc-box"><small>${sup ? 'Tedarikçi' : 'Müşteri'}</small><b>${esc(ad)}</b>
          ${c.vergi_dairesi || c.vergi_no ? `<span>${esc([c.vergi_dairesi ? c.vergi_dairesi + ' V.D.' : '', c.vergi_no ? 'VKN/TCKN ' + c.vergi_no : ''].filter(Boolean).join(' · '))}</span>` : ''}
          ${c.adres ? `<span>${esc(c.adres)}</span>` : ''}
          ${c.telefon || c.eposta ? `<span>${esc([c.telefon, c.eposta].filter(Boolean).join(' · '))}</span>` : ''}</div>
        <div class="doc-box doc-sum">
          <div><small>Toplam borç</small><b>${MP.money(tb)}</b></div>
          <div><small>Toplam alacak</small><b>${MP.money(ta)}</b></div>
          <div><small>Dönem sonu bakiye</small><b>${MP.money(Math.abs(son))}${BA(son, sup)}</b></div>
        </div>
      </section>
      <table class="doc-tbl"><thead><tr><th>Tarih</th><th>İşlem</th><th>Belge no</th><th>Açıklama</th><th>Vade</th><th class="num">Borç</th><th class="num">Alacak</th><th class="num">Bakiye</th></tr></thead>
        <tbody>${o.rows.length ? o.rows.map((r) => `<tr class="${r.tur === 'devir' ? 'devir' : ''}"><td>${MP.date(r.tarih)}</td><td>${esc(islemAdi(r, sup))}</td><td>${esc(r.belge_no || '')}</td>
          <td>${esc(MP.ekstreAciklama(r))}</td><td>${r.vade_tarihi ? MP.date(r.vade_tarihi) : ''}</td>
          <td class="num">${MP.n(r.borc_try) ? MP.num(r.borc_try) : ''}</td><td class="num">${MP.n(r.alacak_try) ? MP.num(r.alacak_try) : ''}</td>
          <td class="num">${MP.num(Math.abs(r.bakiye))}${BA(r.bakiye, sup)}</td></tr>`).join('') : '<tr><td colspan="8" class="c">Bu dönemde hareket yok.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">Toplam (${MP.int(real.length)} hareket) · tutarlar TL</td><td class="num">${MP.num(tb)}</td><td class="num">${MP.num(ta)}</td><td class="num">${MP.num(Math.abs(son))}${BA(son, sup)}</td></tr></tfoot></table>
      <p class="doc-text">Sayın <b>${esc(ad)}</b>, ${metin} Bakiyenin kayıtlarınızla uyumlu olup olmadığını aşağıya işaretleyerek
        kaşeli/imzalı olarak tarafımıza iletmenizi rica ederiz. Mutabakat sağlanamaması halinde lütfen hesap ekstrenizi gönderiniz.</p>
      <section class="doc-sign">
        <div><small>${esc(MP.firma().ad)}</small><span>Kaşe / imza</span></div>
        <div><small>${esc(ad)}</small><span class="mt">☐ Mutabıkız &nbsp;&nbsp; ☐ Mutabık değiliz</span><span>Kaşe / imza · Tarih</span></div>
      </section>
      <footer class="doc-foot">Bu belge cari hesap ekstresidir; <b>fatura veya e-Fatura yerine geçmez</b>, bilgi ve mutabakat amaçlıdır.
        (B) = borç bakiyesi, (A) = alacak bakiyesi. Döviz cinsi işlemler kayıttaki kurla TL'ye çevrilmiştir.</footer>
    </div>`;
    MP.printDoc('Cari hesap ekstresi - ' + ad, html);
  };

  /** t: v_tahsilat_ozet satırı */
  MP.printMakbuz = (t) => {
    const m = MP.state.musteriler.find((x) => x.id === t.musteri_id) || { firma: t.firma };
    const no = 'TM-' + String(t.tarih).slice(0, 4) + '-' + String(t.id).padStart(6, '0');
    const dv = t.para_birimi !== 'TRY';
    const one = (nusha) => `<div class="makbuz">
      ${MP.letterhead('TAHSİLAT MAKBUZU', `<div class="doc-meta"><span>Makbuz no: <b>${esc(no)}</b></span><span>Tarih: <b>${MP.date(t.tarih)}</b></span><span class="nusha">${esc(nusha)}</span></div>`)}
      <table class="mk-kv">
        <tr><th>Ödemeyi yapan</th><td><b>${esc(m.firma)}</b>${m.vergi_no || m.vergi_dairesi ? `<br><small>${esc([m.vergi_dairesi ? m.vergi_dairesi + ' V.D.' : '', m.vergi_no ? 'VKN/TCKN ' + m.vergi_no : ''].filter(Boolean).join(' · '))}</small>` : ''}${m.adres ? `<br><small>${esc(m.adres)}</small>` : ''}</td></tr>
        <tr><th>Tahsil edilen tutar</th><td class="mk-tutar">${MP.money(t.tutar, t.para_birimi)}${dv ? ` <small>(kur ${MP.rate(t.kur)} · TL karşılığı ${MP.money(t.tutar_try)})</small>` : ''}</td></tr>
        <tr><th>Yazıyla</th><td>${esc(MP.yaziyla(t.tutar, t.para_birimi))}</td></tr>
        <tr><th>Ödeme şekli</th><td>${esc(L.yontem[t.yontem] || t.yontem)}${t.belge_no ? ' · Belge / dekont no: ' + esc(t.belge_no) : ''}</td></tr>
        <tr><th>Açıklama</th><td>${t.fatura_no ? esc(t.fatura_no) + ' numaralı fatura karşılığı' : 'Cari hesaba mahsuben'}${t.notlar ? ' · ' + esc(t.notlar) : ''}</td></tr>
      </table>
      <p class="doc-text">Yukarıda yazılı tutar ${MP.date(t.tarih)} tarihinde <b>${esc(m.firma)}</b> tarafından ödenmiş ve
        ${esc(MP.firma().ad)} tarafından tahsil edilmiştir.</p>
      <section class="doc-sign"><div><small>Ödeyen</small><span>Ad soyad / imza</span></div><div><small>Tahsil eden · Kadıoğlu Lojistik</small><span>Kaşe / imza</span></div></section>
      <footer class="doc-foot">Bu makbuz ödemenin alındığını gösterir; <b>fatura veya e-Fatura yerine geçmez.</b></footer>
    </div>`;
    MP.printDoc('Tahsilat makbuzu ' + no, `<div class="doc doc-makbuz">${one('Müşteri nüshası')}<div class="mk-cut" aria-hidden="true">✂ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·</div>${one('Firma nüshası')}</div>`);
  };

  /* =====================================================================
     TEDARİKÇİ EKSTRESİ
     ===================================================================== */
  pages.tedarikci_ekstre = async (el, idParam, seq) => {
    const id = Number(idParam);
    const f = MP.state.filters.tekstre || (MP.state.filters.tekstre = { preset: 'bu_yil' });
    if (f.preset !== 'ozel') MP.applyPreset(f);
    const [t, bak, har, acik] = await Promise.all([
      MP.q(sb().from('tedarikciler').select('*').eq('id', id).maybeSingle()),
      MP.q(sb().from('v_tedarikci_bakiye').select('*').eq('tedarikci_id', id).maybeSingle()),
      MP.fetchAll(() => sb().from('v_tedarikci_hareketler').select('*').eq('tedarikci_id', id).order('tarih').order('created_at')),
      MP.q(sb().from('v_acik_borclar').select('*').eq('tedarikci_id', id).order('vade_tarihi'))
    ]);
    if (stale(seq)) return;
    if (!t) { el.innerHTML = `<a class="back" href="#/tedarikciler">${ICON.back}Tedarikçiler</a><div class="card card-pad"><h2>Tedarikçi bulunamadı</h2></div>`; return; }
    const b = bak || {};
    $('#top-title').textContent = 'Tedarikçi Ekstresi · ' + t.unvan;
    el.innerHTML = `
      <a class="back" href="#/tedarikciler">${ICON.back}Tedarikçiler</a>
      <div class="page-head"><div><h1>${esc(t.unvan)}</h1><p class="muted">Tedarikçi cari hesap ekstresi · bakiye = borcumuz${t.aktif ? '' : ' · <b>Pasif</b>'}</p></div>
        <div class="actions no-print">
          <button class="btn" type="button" data-print>${ICON.print}Ekstre yazdır (A4)</button>
          ${MP.can.write() ? `<button class="btn" type="button" data-edit-t>${ICON.edit}Düzenle</button><button class="btn" type="button" data-newo>${ICON.out}Ödeme</button><button class="btn btn-primary" type="button" data-newg>${ICON.plus}Gelen fatura</button>` : ''}
        </div></div>
      <section class="kpis">
        <div class="card kpi k-gider"><div class="kpi-label">Toplam fatura</div><div class="kpi-value">${MP.money(b.toplam_fatura_try)}</div><div class="kpi-sub">${MP.int(b.fatura_sayisi)} fatura</div></div>
        <div class="card kpi k-kar"><div class="kpi-label">Toplam ödeme</div><div class="kpi-value">${MP.money(b.toplam_odeme_try)}</div><div class="kpi-sub">Son: ${b.son_odeme_tarihi ? MP.date(b.son_odeme_tarihi) : '—'}</div></div>
        <div class="card kpi k-borc"><div class="kpi-label">Bakiye (borcumuz)</div><div class="kpi-value">${MP.money(b.bakiye_try)}</div><div class="kpi-sub">${MP.n(b.bakiye_try) > 0 ? 'Tedarikçiye borçluyuz' : MP.n(b.bakiye_try) < 0 ? 'Tedarikçiden alacaklıyız (avans)' : 'Kapalı'}</div></div>
        <div class="card kpi k-gecmis"><div class="kpi-label">Vadesi geçmiş</div><div class="kpi-value ${MP.n(b.vadesi_gecmis_try) > 0 ? 'neg' : ''}">${MP.money(b.vadesi_gecmis_try)}</div><div class="kpi-sub">${acik.filter((x) => x.gecikme_gun > 0).length} fatura</div></div>
        <div class="card kpi"><div class="kpi-label">İletişim</div><div class="kpi-sub" style="margin-top:8px">${esc(t.telefon || '—')}${t.eposta ? '<br>' + esc(t.eposta) : ''}</div></div>
      </section>
      <div class="grid grid-3 mb">
        <div class="card">
          <form class="filters" data-f style="margin:0;border-bottom:1px solid var(--gray-200)">
            <div class="filter-grid">${MP.rangeHtml(f)}</div>
            <div class="filter-bar"><div class="chips" data-sum></div>${MP.exportButtons()}</div>
          </form>
          <div class="tbl-wrap" data-t></div>
        </div>
        <div class="card"><div class="card-head"><h2>Açık faturalar</h2></div>
          ${acik.length ? `<ul class="list-mini">${acik.map((x) => `<li><div class="grow"><div class="t">${esc(x.fatura_no)}</div><div class="s">${MP.date(x.tarih)} · vade ${x.vade_tarihi ? MP.date(x.vade_tarihi) : '—'} · ${esc(L.gkategori[x.kategori] || '')}</div></div>
            ${gunBadge(x.vadeye_kalan_gun)}<b class="num">${MP.money(x.kalan, x.para_birimi)}</b></li>`).join('')}</ul>` : '<div class="empty">Açık fatura yok.</div>'}
          <div class="card-pad" style="border-top:1px solid var(--gray-100)"><dl class="kv">
            <dt>Vergi dairesi</dt><dd>${esc(t.vergi_dairesi || '—')}</dd><dt>Vergi no</dt><dd>${esc(t.vergi_no || '—')}</dd>
            <dt>Adres</dt><dd>${esc(t.adres || '—')}</dd>${t.notlar ? `<dt>Not</dt><dd>${esc(t.notlar)}</dd>` : ''}</dl></div>
        </div>
      </div>`;
    const cols = [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'İşlem', v: (r) => islemAdi(r, true), html: (r) => r.tur === 'devir' ? 'Devir' : `<span class="badge ${r.tur === 'fatura' ? 'b-kesildi' : 'b-odendi'}">${r.tur === 'fatura' ? 'Fatura' : 'Ödeme'}</span>` },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Açıklama', v: (r) => MP.ekstreAciklama(r), cls: 'wrap' },
      { h: 'Vade', v: (r) => r.vade_tarihi, t: 'date' },
      { h: 'Borç (ödeme)', v: (r) => r.borc_try, t: 'try', html: (r) => MP.n(r.borc_try) ? MP.money(r.borc_try) : '' },
      { h: 'Alacak (fatura)', v: (r) => r.alacak_try, t: 'try', html: (r) => MP.n(r.alacak_try) ? MP.money(r.alacak_try) : '' },
      { h: 'Bakiye (borcumuz)', v: (r) => r.bakiye, t: 'try', html: (r) => `<b>${MP.money(r.bakiye)}</b>` }
    ];
    let cur = { rows: [], bakiye: 0 };
    const render = () => {
      cur = MP.ekstreRows(har, f.from || '', f.to || '', -1);
      const real = cur.rows.filter((r) => r.tur !== 'devir');
      $('[data-sum]', el).innerHTML = `<span class="chip">Dönem fatura <b>${MP.money(MP.sum(real, 'alacak_try'))}</b></span><span class="chip">Dönem ödeme <b>${MP.money(MP.sum(real, 'borc_try'))}</b></span><span class="chip">Dönem sonu borcumuz <b>${MP.money(cur.bakiye)}</b></span>`;
      $('[data-t]', el).innerHTML = MP.tableHtml(cols, cur.rows, {
        emptyTitle: 'Bu dönemde hareket yok', empty: 'Dönemi değiştirin.', rowClass: (r) => (r.tur === 'devir' ? 'devir' : ''),
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Borç (ödeme)' ? MP.money(MP.sum(cur.rows, 'borc_try')) : c.h === 'Alacak (fatura)' ? MP.money(MP.sum(cur.rows, 'alacak_try')) : c.h === 'Bakiye (borcumuz)' ? MP.money(cur.bakiye) : ''
      });
    };
    render();
    const fm = $('[data-f]', el);
    fm.addEventListener('submit', (e) => e.preventDefault());
    fm.addEventListener('change', (e) => {
      if (e.target.name === 'preset') { f.preset = e.target.value; MP.applyPreset(f); fm.elements.from.value = f.from; fm.elements.to.value = f.to; }
      else { f[e.target.name] = e.target.value; f.preset = 'ozel'; fm.elements.preset.value = 'ozel'; }
      render();
    });
    fm.addEventListener('click', (e) => {
      const bt = e.target.closest('[data-exp]');
      if (bt) MP.exportRows(bt.dataset.exp, 'tedarikci-ekstre-' + t.unvan, cols, cur.rows, { sheet: 'Tedarikçi ekstresi' }).catch((er) => MP.toast(MP.errMsg(er), 'err'));
    });
    const reload = () => MP.route();
    const q = (s) => el.querySelector(s);
    q('[data-print]').onclick = () => MP.printEkstre({ tur: 'tedarikci', cari: t, from: f.from, to: f.to, rows: cur.rows, bakiye: cur.bakiye });
    if (q('[data-edit-t]')) q('[data-edit-t]').onclick = () => tedarikciForm(t, reload);
    if (q('[data-newg]')) q('[data-newg]').onclick = () => gelenFaturaForm({ tedarikci_id: t.id }, reload);
    if (q('[data-newo]')) q('[data-newo]').onclick = () => odemeForm({ tedarikci_id: t.id }, reload);
  };

  /* =====================================================================
     GELEN FATURALAR
     ===================================================================== */
  function gelenFaturaForm(g, done) {
    g = g || {};
    const yeni = !g.id;
    if (!MP.state.tedarikciler.length) {
      MP.toast('Önce bir tedarikçi ekleyin.', 'err');
      return tedarikciForm(null, (row) => gelenFaturaForm(Object.assign({}, g, { tedarikci_id: row && row.id }), done));
    }
    const d = Object.assign({ tarih: today(), kdv_orani: 20, para_birimi: 'TRY', kur: 1, kategori: 'yakit' }, g);
    if (yeni && !d.vade_tarihi) { const x = new Date(); x.setDate(x.getDate() + 30); d.vade_tarihi = MP.iso(x); }
    const kdvOpts = MP.kdvOpts.concat(MP.kdvOpts.some((k) => +k[0] === +d.kdv_orani) ? [] : [[String(+d.kdv_orani), '%' + MP.num(d.kdv_orani)]]);
    MP.formDialog({
      title: yeni ? 'Yeni gelen fatura' : 'Gelen faturayı düzenle · ' + g.fatura_no,
      body: MP.F.select('tedarikci_id', 'Tedarikçi', tedOpts(d.tedarikci_id), d.tedarikci_id, { required: true, full: true, empty: 'Tedarikçi seçin…' }) +
        MP.F.text('fatura_no', 'Fatura no', d.fatura_no, { required: true, placeholder: 'Tedarikçinin fatura numarası', max: 40 }) +
        MP.F.select('kategori', 'Kategori', Object.entries(L.gkategori), d.kategori, { required: true }) +
        MP.F.date('tarih', 'Fatura tarihi', d.tarih, { required: true }) +
        MP.F.date('vade_tarihi', 'Vade (son ödeme) tarihi', d.vade_tarihi) +
        MP.F.money('tutar', 'Matrah (KDV hariç)', d.tutar, { required: true, placeholder: '0,00' }) +
        MP.F.select('kdv_orani', 'KDV oranı', kdvOpts, String(+d.kdv_orani), { required: true }) +
        MP.F.select('para_birimi', 'Para birimi', MP.pbOpts, d.para_birimi, { required: true }) +
        MP.F.money('kur', 'Kur (1 birim = ? TL)', d.para_birimi === 'TRY' ? 1 : d.kur, { placeholder: 'ör. 34,5000' }) +
        '<div class="calc" data-calc></div>' +
        MP.F.select('arac_id', 'Araç (isteğe bağlı)', aracOpts(d.arac_id), d.arac_id || '', { empty: 'Araçla ilişkili değil' }) +
        `<label class="chk" style="align-self:end">${'<input type="checkbox" name="iptal"' + (d.durum === 'iptal' ? ' checked' : '') + '>'} İptal edildi (borca dahil edilmez)</label>` +
        MP.F.area('aciklama', 'Açıklama', d.aciklama) +
        '<p class="hint full" style="margin:0">Ödeme durumu (Ödenmedi / Kısmi / Ödendi) girilen ödemelere göre otomatik hesaplanır. Bu faturayı ayrıca “Giderler”e girmeyin.</p>',
      onOpen: (f) => {
        const calc = () => {
          const t = MP.parseNum(f.elements.tutar.value) || 0, k = +f.elements.kdv_orani.value || 0, pb = f.elements.para_birimi.value;
          const kdv = Math.round(t * k) / 100, top = t + kdv, kur = pb === 'TRY' ? 1 : (MP.parseNum(f.elements.kur.value) || 0);
          $('[data-calc]', f).innerHTML = `<span>KDV: <b>${MP.money(kdv, pb)}</b></span><span>Fatura toplamı: <b>${MP.money(top, pb)}</b></span>${pb !== 'TRY' ? `<span>TL karşılığı: <b>${MP.money(top * kur)}</b></span>` : ''}`;
        };
        wireKur(f, calc);
        ['tutar', 'kur'].forEach((n) => f.elements[n].addEventListener('input', calc));
        f.elements.kdv_orani.addEventListener('change', calc);
        calc();
      },
      onSubmit: async (f) => {
        const tarih = MP.formVal(f, 'tarih'), vade = MP.formVal(f, 'vade_tarihi');
        if (vade && vade < tarih) throw new Error('Vade tarihi fatura tarihinden önce olamaz.');
        const arac = MP.formVal(f, 'arac_id');
        await saveRow('gelen_faturalar', g.id, {
          tedarikci_id: Number(MP.formVal(f, 'tedarikci_id')), fatura_no: MP.formVal(f, 'fatura_no'), kategori: MP.formVal(f, 'kategori'),
          tarih, vade_tarihi: vade, tutar: MP.formNum(f, 'tutar', 'Matrah', { required: true, min: 0 }),
          kdv_orani: Number(MP.formVal(f, 'kdv_orani')), para_birimi: MP.formVal(f, 'para_birimi'), kur: kurVal(f),
          arac_id: arac ? Number(arac) : null, aciklama: MP.formVal(f, 'aciklama'),
          durum: MP.formVal(f, 'iptal') ? 'iptal' : 'odenmedi'   // iptal değilse veritabanı ödemelere göre yeniden hesaplar
        });
        MP.toast(yeni ? 'Gelen fatura kaydedildi.' : 'Gelen fatura güncellendi.', 'ok');
        if (done) later(done);
      }
    });
  }
  MP.gelenFaturaForm = gelenFaturaForm;

  pages['gelen-faturalar'] = (el, _p, seq) => listPage(el, seq, {
    key: 'gelen', title: 'Gelen Faturalar', sub: 'Tedarikçilerden gelen alış faturaları · ödeme durumu otomatik · resmi e-Fatura işlemi yapılmaz, yalnızca takip edilir',
    newText: 'Yeni gelen fatura', dateRange: true, searchHint: 'Fatura no, tedarikçi, plaka, açıklama…',
    defaults: { durum: '', tedarikci: '', kategori: '', arac: '', gecikmis: false }, clientOnly: ['gecikmis'],
    filtersHtml: (f) => MP.F.select('durum', 'Durum', [['acik', 'Açık (ödenmedi + kısmi)']].concat(Object.entries(L.gdurum)), f.durum, { empty: 'Tümü' }) +
      MP.F.select('tedarikci', 'Tedarikçi', tedOpts(Number(f.tedarikci)), f.tedarikci, { empty: 'Tüm tedarikçiler' }) +
      MP.F.select('kategori', 'Kategori', Object.entries(L.gkategori), f.kategori, { empty: 'Tüm kategoriler' }) +
      MP.F.select('arac', 'Araç', aracOpts(Number(f.arac)), f.arac, { empty: 'Tüm araçlar' }) +
      `<label class="chk" style="align-self:center"><input type="checkbox" name="gecikmis"${f.gecikmis ? ' checked' : ''}> Sadece vadesi geçenler</label>`,
    load: (f) => MP.fetchAll(() => {
      let q = sb().from('v_gelen_fatura_ozet').select('*');
      if (f.from) q = q.gte('tarih', f.from);
      if (f.to) q = q.lte('tarih', f.to);
      if (f.durum === 'acik') q = q.in('durum', ['odenmedi', 'kismi']); else if (f.durum) q = q.eq('durum', f.durum);
      if (f.tedarikci) q = q.eq('tedarikci_id', Number(f.tedarikci));
      if (f.kategori) q = q.eq('kategori', f.kategori);
      if (f.arac) q = q.eq('arac_id', Number(f.arac));
      return q.order('tarih', { ascending: false }).order('id', { ascending: false });
    }),
    clientFilter: (r, f) => !f.gecikmis || r.gecikme_gun > 0,
    searchText: (r) => [r.fatura_no, r.unvan, r.plaka, r.aciklama, L.gkategori[r.kategori]].join(' '),
    columns: () => [
      { h: 'Fatura no', v: (r) => r.fatura_no, cls: 'strong' },
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Vade', v: (r) => r.vade_tarihi, t: 'date', html: (r) => r.vade_tarihi ? MP.date(r.vade_tarihi) + (r.vadeye_kalan_gun != null && r.vadeye_kalan_gun <= 7 ? '<br>' + gunBadge(r.vadeye_kalan_gun) : '') : '—' },
      { h: 'Tedarikçi', v: (r) => r.unvan, cls: 'firm', html: (r) => `<a href="#/tedarikciler/${r.tedarikci_id}">${esc(r.unvan)}</a>${r.aciklama ? `<div class="sub">${esc(r.aciklama)}</div>` : ''}` },
      { h: 'Kategori', v: (r) => L.gkategori[r.kategori], html: (r) => `<span class="badge">${esc(L.gkategori[r.kategori] || r.kategori)}</span>` },
      { h: 'Araç', v: (r) => r.plaka, cls: 'nowrap', html: (r) => r.plaka ? `<a class="plaka" href="#/araclar/${r.arac_id}">${esc(r.plaka)}</a>` : '<span class="muted">—</span>' },
      { h: 'Matrah', v: (r) => r.tutar, t: 'money', pb: (r) => r.para_birimi },
      { h: 'KDV %', v: (r) => r.kdv_orani, t: 'num', show: false },
      { h: 'KDV', v: (r) => r.kdv_tutari, t: 'money', pb: (r) => r.para_birimi, show: false },
      { h: 'Toplam', v: (r) => r.toplam, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.toplam, r.para_birimi)}</b>` },
      { h: 'Para birimi', v: (r) => r.para_birimi, show: false },
      { h: 'Kur', v: (r) => r.kur, t: 'rate', show: false },
      { h: 'Matrah (TL)', v: (r) => r.tutar_try, t: 'try', show: false },
      { h: 'Toplam (TL)', v: (r) => r.toplam_try, t: 'try', show: false },
      { h: 'Kalan', v: (r) => r.kalan, t: 'money', pb: (r) => r.para_birimi, html: (r) => r.durum === 'iptal' ? '<span class="muted">—</span>' : (MP.n(r.kalan) > 0.005 ? MP.money(r.kalan, r.para_birimi) : '<span class="pos">0,00</span>') },
      { h: 'Kalan (TL)', v: (r) => r.kalan_try, t: 'try', show: false },
      { h: 'Durum', v: (r) => L.gdurum[r.durum], html: (r) => gBadge(r.durum) },
      { h: 'Açıklama', v: (r) => r.aciklama, show: false }
    ],
    summary: (rows) => { const g = rows.filter((r) => r.durum !== 'iptal'); return `<span class="chip">Matrah (TL) <b>${MP.money(MP.sum(g, 'tutar_try'))}</b></span><span class="chip">Toplam (TL) <b>${MP.money(MP.sum(g, 'toplam_try'))}</b></span><span class="chip">Kalan borç (TL) <b>${MP.money(MP.sum(g, 'kalan_try'))}</b></span><span class="chip red">Vadesi geçmiş <b>${MP.money(MP.sum(g.filter((r) => r.gecikme_gun > 0), 'kalan_try'))}</b></span>`; },
    actions: (r) => rowBtns(r, { extra: MP.can.write() && ['odenmedi', 'kismi'].includes(r.durum) ? `<button class="btn btn-sm" type="button" data-act="ode" data-id="${r.id}" title="Ödeme ekle">${ICON.out}Öde</button>` : '' }),
    onAction: (act, r, reload) => { if (act === 'ode') odemeForm({ tedarikci_id: r.tedarikci_id, gelen_fatura_id: r.id, tutar: r.kalan, para_birimi: r.para_birimi, kur: r.kur }, reload); },
    onNew: (reload) => gelenFaturaForm(null, reload),
    onEdit: async (r, reload) => { try { gelenFaturaForm(await MP.q(sb().from('gelen_faturalar').select('*').eq('id', r.id).single()), reload); } catch (e) { MP.toast(MP.errMsg(e), 'err'); } },
    onDelete: (r, reload) => deleteRow('gelen_faturalar', r.id, r.unvan + ' · ' + r.fatura_no + ' numaralı gelen fatura', reload)
  });

  /* =====================================================================
     ÖDEMELER (tedarikçilere)
     ===================================================================== */
  function odemeForm(o, done) {
    o = o || {};
    const yeni = !o.id;
    if (!MP.state.tedarikciler.length) { MP.toast('Önce bir tedarikçi ekleyin.', 'err'); return; }
    const d = Object.assign({ tarih: today(), para_birimi: 'TRY', kur: 1, yontem: 'havale' }, o);
    let acik = [];
    MP.formDialog({
      title: yeni ? 'Yeni ödeme (tedarikçiye)' : 'Ödemeyi düzenle',
      body: MP.F.select('tedarikci_id', 'Tedarikçi', tedOpts(d.tedarikci_id), d.tedarikci_id, { required: true, full: true, empty: 'Tedarikçi seçin…' }) +
        MP.F.select('gelen_fatura_id', 'Gelen fatura', [], '', { full: true, empty: 'Faturasız (cari hesaba / avans)' }) +
        MP.F.date('tarih', 'Ödeme tarihi', d.tarih, { required: true }) +
        MP.F.select('yontem', 'Yöntem', Object.entries(L.yontem), d.yontem, { required: true }) +
        MP.F.money('tutar', 'Tutar', d.tutar, { required: true, placeholder: '0,00' }) +
        MP.F.select('para_birimi', 'Para birimi', MP.pbOpts, d.para_birimi, { required: true }) +
        MP.F.money('kur', 'Kur (1 birim = ? TL)', d.para_birimi === 'TRY' ? 1 : d.kur) +
        MP.F.text('belge_no', 'Belge no', d.belge_no, { placeholder: 'Dekont / çek / senet no' }) +
        MP.F.area('notlar', 'Not', d.notlar),
      onOpen: (f) => {
        wireKur(f);
        const fsel = f.elements.gelen_fatura_id;
        const loadAcik = async (keep) => {
          const tid = Number(f.elements.tedarikci_id.value);
          fsel.innerHTML = '<option value="">Faturasız (cari hesaba / avans)</option>';
          if (!tid) return;
          try {
            acik = await MP.q(sb().from('v_gelen_fatura_ozet').select('*').eq('tedarikci_id', tid).in('durum', ['odenmedi', 'kismi', 'odendi']).order('tarih', { ascending: false }).limit(200));
            acik = acik.filter((x) => x.durum !== 'odendi' || x.id === d.gelen_fatura_id);
            fsel.innerHTML += acik.map((x) => `<option value="${x.id}">${esc(x.fatura_no)} · ${MP.date(x.tarih)} · kalan ${esc(MP.money(x.kalan, x.para_birimi))}</option>`).join('');
            if (keep && d.gelen_fatura_id) fsel.value = String(d.gelen_fatura_id);
          } catch (e) { MP.toast(MP.errMsg(e), 'err'); }
        };
        f.elements.tedarikci_id.addEventListener('change', () => loadAcik(false));
        fsel.addEventListener('change', () => {
          const x = acik.find((a) => String(a.id) === fsel.value);
          if (!x) return;
          f.elements.tutar.value = MP.num(x.kalan);
          f.elements.para_birimi.value = x.para_birimi;
          f.elements.para_birimi.dispatchEvent(new Event('change'));
          if (x.para_birimi !== 'TRY') f.elements.kur.value = MP.rate(x.kur);
        });
        loadAcik(true);
      },
      onSubmit: async (f) => {
        const gid = MP.formVal(f, 'gelen_fatura_id');
        await saveRow('odemeler', o.id, {
          tedarikci_id: Number(MP.formVal(f, 'tedarikci_id')), gelen_fatura_id: gid ? Number(gid) : null, tarih: MP.formVal(f, 'tarih'),
          yontem: MP.formVal(f, 'yontem'), tutar: MP.formNum(f, 'tutar', 'Tutar', { required: true, min: 0.01 }),
          para_birimi: MP.formVal(f, 'para_birimi'), kur: kurVal(f), belge_no: MP.formVal(f, 'belge_no'), notlar: MP.formVal(f, 'notlar')
        });
        MP.toast(yeni ? 'Ödeme kaydedildi.' : 'Ödeme güncellendi.', 'ok');
        if (done) later(done);
      }
    });
  }
  MP.odemeForm = odemeForm;

  pages.odemeler = (el, _p, seq) => listPage(el, seq, {
    key: 'odemeler', title: 'Ödemeler', sub: 'Tedarikçilere yapılan ödemeler', newText: 'Yeni ödeme', dateRange: true,
    searchHint: 'Tedarikçi, fatura no, belge no, not…', defaults: { yontem: '', tedarikci: '' },
    filtersHtml: (f) => MP.F.select('yontem', 'Yöntem', Object.entries(L.yontem), f.yontem, { empty: 'Tümü' }) +
      MP.F.select('tedarikci', 'Tedarikçi', tedOpts(Number(f.tedarikci)), f.tedarikci, { empty: 'Tüm tedarikçiler' }),
    load: (f) => MP.fetchAll(() => {
      let q = sb().from('v_odeme_ozet').select('*');
      if (f.from) q = q.gte('tarih', f.from);
      if (f.to) q = q.lte('tarih', f.to);
      if (f.yontem) q = q.eq('yontem', f.yontem);
      if (f.tedarikci) q = q.eq('tedarikci_id', Number(f.tedarikci));
      return q.order('tarih', { ascending: false }).order('id', { ascending: false });
    }),
    searchText: (r) => [r.unvan, r.fatura_no, r.belge_no, r.notlar, L.yontem[r.yontem]].join(' '),
    columns: () => [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Tedarikçi', v: (r) => r.unvan, cls: 'firm', html: (r) => `<a class="strong" href="#/tedarikciler/${r.tedarikci_id}">${esc(r.unvan)}</a>` },
      { h: 'Fatura no', v: (r) => r.fatura_no || '', html: (r) => r.fatura_no ? esc(r.fatura_no) : '<span class="muted">Cari / avans</span>' },
      { h: 'Yöntem', v: (r) => L.yontem[r.yontem], html: (r) => `<span class="badge">${esc(L.yontem[r.yontem] || r.yontem)}</span>` },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Tutar', v: (r) => r.tutar, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.tutar, r.para_birimi)}</b>` },
      { h: 'Para birimi', v: (r) => r.para_birimi, show: false },
      { h: 'Kur', v: (r) => r.kur, t: 'rate', show: false },
      { h: 'TL karşılığı', v: (r) => r.tutar_try, t: 'try' },
      { h: 'Not', v: (r) => r.notlar, cls: 'wrap' }
    ],
    summary: (rows) => `<span class="chip">Toplam ödeme (TL) <b>${MP.money(MP.sum(rows, 'tutar_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : c.h === 'TL karşılığı' ? MP.money(MP.sum(rows, 'tutar_try')) : '',
    actions: (r) => rowBtns(r),
    onNew: (reload) => odemeForm(null, reload),
    onEdit: async (r, reload) => { try { odemeForm(await MP.q(sb().from('odemeler').select('*').eq('id', r.id).single()), reload); } catch (e) { MP.toast(MP.errMsg(e), 'err'); } },
    onDelete: (r, reload) => deleteRow('odemeler', r.id, MP.date(r.tarih) + ' tarihli ' + MP.money(r.tutar, r.para_birimi) + ' ödeme', reload)
  });

  /* =====================================================================
     BORÇLARIM (vadesi gelen / geçen)
     ===================================================================== */
  pages.borclar = (el, _p, seq) => listPage(el, seq, {
    key: 'borclar', title: 'Vadesi Gelen / Geçen Borçlarım', sub: 'Ödenmemiş ve kısmi ödenmiş gelen faturalar, vadeye göre', searchHint: 'Tedarikçi, fatura no, plaka…',
    defaults: { gorunum: 'yakin' }, clientOnly: ['gorunum'],
    filtersHtml: (f) => MP.F.select('gorunum', 'Görünüm', [['yakin', 'Vadesi geçen + 30 gün içinde'], ['gecmis', 'Yalnızca vadesi geçenler'], ['hafta', 'Önümüzdeki 7 gün'], ['vadesiz', 'Vadesi girilmemiş'], ['tumu', 'Tüm açık borçlar']], f.gorunum),
    load: async () => {
      const rows = await MP.fetchAll(() => sb().from('v_acik_borclar').select('*').order('vade_tarihi', { ascending: true }));
      return rows.map((r) => Object.assign({ id: r.gelen_fatura_id }, r));
    },
    clientFilter: (r, f) => {
      const g = r.vadeye_kalan_gun;
      return ({ yakin: g != null && g <= 30, gecmis: g != null && g < 0, hafta: g != null && g >= 0 && g <= 7, vadesiz: g == null, tumu: true })[f.gorunum || 'tumu'];
    },
    searchText: (r) => [r.unvan, r.fatura_no, r.plaka, L.gkategori[r.kategori]].join(' '),
    columns: () => [
      { h: 'Vade', v: (r) => r.vade_tarihi, t: 'date', html: (r) => r.vade_tarihi ? `<b>${MP.date(r.vade_tarihi)}</b><br>${gunBadge(r.vadeye_kalan_gun)}` : '<span class="muted">Vade yok</span>' },
      { h: 'Tedarikçi', v: (r) => r.unvan, cls: 'firm', html: (r) => `<a class="strong" href="#/tedarikciler/${r.tedarikci_id}">${esc(r.unvan)}</a>` },
      { h: 'Fatura no', v: (r) => r.fatura_no },
      { h: 'Fatura tarihi', v: (r) => r.tarih, t: 'date' },
      { h: 'Kategori', v: (r) => L.gkategori[r.kategori], html: (r) => `<span class="badge">${esc(L.gkategori[r.kategori] || r.kategori)}</span>` },
      { h: 'Araç', v: (r) => r.plaka, cls: 'nowrap', html: (r) => r.plaka ? `<a class="plaka" href="#/araclar/${r.arac_id}">${esc(r.plaka)}</a>` : '<span class="muted">—</span>' },
      { h: 'Toplam', v: (r) => r.toplam, t: 'money', pb: (r) => r.para_birimi },
      { h: 'Ödenen', v: (r) => r.odenen, t: 'money', pb: (r) => r.para_birimi },
      { h: 'Kalan', v: (r) => r.kalan, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.kalan, r.para_birimi)}</b>` },
      { h: 'Kalan (TL)', v: (r) => r.kalan_try, t: 'try' },
      { h: 'Durum', v: (r) => L.gdurum[r.durum], html: (r) => gBadge(r.durum) }
    ],
    rowClass: (r) => (r.vadeye_kalan_gun != null && r.vadeye_kalan_gun < 0 ? 'late' : ''),
    summary: (rows) => `<span class="chip">Kalan (TL) <b>${MP.money(MP.sum(rows, 'kalan_try'))}</b></span><span class="chip red">Vadesi geçmiş <b>${MP.money(MP.sum(rows.filter((r) => r.vadeye_kalan_gun < 0), 'kalan_try'))}</b></span><span class="chip">7 gün içinde <b>${MP.money(MP.sum(rows.filter((r) => r.vadeye_kalan_gun >= 0 && r.vadeye_kalan_gun <= 7), 'kalan_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : c.h === 'Kalan (TL)' ? MP.money(MP.sum(rows, 'kalan_try')) : '',
    actions: (r) => MP.can.write() ? `<button class="btn btn-sm" type="button" data-act="ode" data-id="${r.id}">${ICON.out}Öde</button>` : '',
    onAction: (act, r, reload) => { if (act === 'ode') odemeForm({ tedarikci_id: r.tedarikci_id, gelen_fatura_id: r.gelen_fatura_id, tutar: r.kalan, para_birimi: r.para_birimi }, reload); }
  });

  /* =====================================================================
     ARAÇLAR
     ===================================================================== */
  function aracForm(a, done) {
    a = a || { aktif: true };
    MP.formDialog({
      title: a.id ? 'Aracı düzenle · ' + a.plaka : 'Yeni araç',
      body: MP.F.text('plaka', 'Plaka', a.plaka, { required: true, placeholder: 'ör. 27 ABC 123', max: 15 }) +
        MP.F.text('yil', 'Model yılı', a.yil, { placeholder: 'ör. 2021', extra: ' inputmode="numeric" maxlength="4"' }) +
        MP.F.text('marka', 'Marka', a.marka) + MP.F.text('model', 'Model / tip', a.model, { placeholder: 'ör. Çekici, kamyon, kamyonet' }) +
        MP.F.date('muayene_bitis', 'Muayene bitiş', a.muayene_bitis) +
        MP.F.date('sigorta_bitis', 'Trafik sigortası bitiş', a.sigorta_bitis) +
        MP.F.date('kasko_bitis', 'Kasko bitiş', a.kasko_bitis) +
        MP.F.check('aktif', 'Aktif (filoda)', a.aktif !== false) +
        MP.F.area('notlar', 'Not', a.notlar) +
        '<p class="hint full" style="margin:0">Bitişine 30 gün veya daha az kalan belgeler Gösterge Paneli\'nde uyarı olarak görünür.</p>',
      onSubmit: async (f) => {
        const yil = MP.formVal(f, 'yil');
        if (yil && !/^\d{4}$/.test(yil)) { f.elements.yil.classList.add('invalid'); throw new Error('Model yılı 4 haneli olmalıdır.'); }
        await saveRow('araclar', a.id, {
          plaka: MP.formVal(f, 'plaka'), yil: yil ? Number(yil) : null, marka: MP.formVal(f, 'marka'), model: MP.formVal(f, 'model'),
          muayene_bitis: MP.formVal(f, 'muayene_bitis'), sigorta_bitis: MP.formVal(f, 'sigorta_bitis'), kasko_bitis: MP.formVal(f, 'kasko_bitis'),
          aktif: MP.formVal(f, 'aktif'), notlar: MP.formVal(f, 'notlar')
        });
        await MP.loadAraclar();
        MP.toast(a.id ? 'Araç güncellendi.' : 'Araç eklendi.', 'ok');
        if (done) later(done);
      }
    });
  }
  MP.aracForm = aracForm;
  const minGun = (a) => Math.min(...['muayene_bitis', 'sigorta_bitis', 'kasko_bitis'].map((k) => (a[k] ? kalanGun(a[k]) : Infinity)));

  pages.araclar = (el, _p, seq) => listPage(el, seq, {
    key: 'araclar', title: 'Araçlar', sub: 'Filo · muayene, trafik sigortası ve kasko bitiş takibi · bu yılki masraflar (KDV hariç, TL)', newText: 'Yeni araç',
    searchHint: 'Plaka, marka, model…', defaults: { gorunum: 'aktif' }, clientOnly: ['gorunum'],
    filtersHtml: (f) => MP.F.select('gorunum', 'Görünüm', [['aktif', 'Aktif araçlar'], ['uyari', 'Belgesi 30 gün içinde bitenler'], ['pasif', 'Pasif araçlar'], ['tumu', 'Tümü']], f.gorunum),
    load: async () => {
      const y = new Date().getFullYear();
      const [as, ms] = await Promise.all([MP.loadAraclar(), MP.fetchAll(() => sb().from('v_arac_masraflari').select('arac_id,tutar_try').eq('yil', y))]);
      const top = {}; ms.forEach((m) => { top[m.arac_id] = (top[m.arac_id] || 0) + MP.n(m.tutar_try); });
      return as.map((a) => Object.assign({}, a, { masraf: top[a.id] || 0, min_gun: minGun(a) }));
    },
    clientFilter: (r, f) => ({ aktif: r.aktif, pasif: !r.aktif, uyari: r.aktif && r.min_gun <= 30, tumu: true })[f.gorunum || 'tumu'],
    searchText: (r) => [r.plaka, r.marka, r.model, r.yil, r.notlar].join(' '),
    columns: () => [
      { h: 'Plaka', v: (r) => r.plaka, html: (r) => `<a class="strong plaka" href="#/araclar/${r.id}">${esc(r.plaka)}</a>${r.aktif ? '' : ' <span class="badge">Pasif</span>'}` },
      { h: 'Marka / model', v: (r) => [r.marka, r.model].filter(Boolean).join(' ') },
      { h: 'Yıl', v: (r) => r.yil, t: 'text' },
      { h: 'Muayene', v: (r) => r.muayene_bitis, t: 'date', html: (r) => belgeCell(r.muayene_bitis) },
      { h: 'Trafik sigortası', v: (r) => r.sigorta_bitis, t: 'date', html: (r) => belgeCell(r.sigorta_bitis) },
      { h: 'Kasko', v: (r) => r.kasko_bitis, t: 'date', html: (r) => belgeCell(r.kasko_bitis) },
      { h: 'Bu yıl masraf', v: (r) => r.masraf, t: 'try' },
      { h: 'Not', v: (r) => r.notlar, show: false }
    ],
    summary: (rows) => `<span class="chip">Bu yıl masraf <b>${MP.money(MP.sum(rows, 'masraf'))}</b></span><span class="chip red">Uyarılı araç <b>${MP.int(rows.filter((r) => r.aktif && r.min_gun <= 30).length)}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : c.h === 'Bu yıl masraf' ? MP.money(MP.sum(rows, 'masraf')) : '',
    actions: (r) => rowBtns(r, { extra: `<a class="btn btn-sm" href="#/araclar/${r.id}" title="Araç masraf raporu">Masraflar</a>` }),
    onNew: (reload) => aracForm(null, reload),
    onEdit: (r, reload) => aracForm(MP.state.araclar.find((a) => a.id === r.id), reload),
    onDelete: (r, reload) => deleteRow('araclar', r.id, '“' + r.plaka + '” aracı', reload)
  });

  /* ---------- Araç detay: belge durumu + masraf raporu ---------- */
  pages.arac_detay = async (el, idParam, seq) => {
    const id = Number(idParam);
    const st = MP.state.filters.arac || (MP.state.filters.arac = { yil: new Date().getFullYear() });
    const [a, ms] = await Promise.all([
      MP.q(sb().from('araclar').select('*').eq('id', id).maybeSingle()),
      MP.fetchAll(() => sb().from('v_arac_masraflari').select('*').eq('arac_id', id).order('tarih', { ascending: false }))
    ]);
    if (stale(seq)) return;
    if (!a) { el.innerHTML = `<a class="back" href="#/araclar">${ICON.back}Araçlar</a><div class="card card-pad"><h2>Araç bulunamadı</h2></div>`; return; }
    $('#top-title').textContent = 'Araç · ' + a.plaka;
    const years = Array.from(new Set(ms.map((m) => m.yil).concat([new Date().getFullYear()]))).sort((x, y) => y - x);
    const belgeKpi = (k, label) => { const d = a[k], g = kalanGun(d); return `<div class="card kpi ${g != null && g < 0 ? 'k-gecmis' : g != null && g <= 30 ? 'k-uyari' : 'k-kar'}"><div class="kpi-label">${label}</div><div class="kpi-value">${d ? MP.date(d) : '—'}</div><div class="kpi-sub">${d ? gunBadge(g) : 'Tarih girilmemiş'}</div></div>`; };
    el.innerHTML = `
      <a class="back" href="#/araclar">${ICON.back}Araçlar</a>
      <div class="page-head"><div><h1><span class="plaka">${esc(a.plaka)}</span></h1><p class="muted">${esc([a.marka, a.model, a.yil].filter(Boolean).join(' · ') || 'Araç')}${a.aktif ? '' : ' · <b>Pasif</b>'}</p></div>
        <div class="actions"><label class="fld" style="min-width:110px"><span>Yıl</span><select data-yil>${years.map((y) => `<option${y === +st.yil ? ' selected' : ''}>${y}</option>`).join('')}</select></label>
          ${MP.can.write() ? `<button class="btn" type="button" data-edit-a>${ICON.edit}Düzenle</button><button class="btn" type="button" data-newgd>${ICON.receipt}Gider</button><button class="btn btn-primary" type="button" data-newgf>${ICON.plus}Gelen fatura</button>` : ''}</div></div>
      <section class="kpis">
        ${belgeKpi('muayene_bitis', 'Muayene')}${belgeKpi('sigorta_bitis', 'Trafik sigortası')}${belgeKpi('kasko_bitis', 'Kasko')}
        <div class="card kpi k-gider"><div class="kpi-label" data-ylbl></div><div class="kpi-value" data-ytop></div><div class="kpi-sub" data-yadet></div></div>
        <div class="card kpi"><div class="kpi-label">Yakıt payı</div><div class="kpi-value" data-yakit></div><div class="kpi-sub" data-yakitp></div></div>
      </section>
      <div class="grid grid-2 mb">
        <div class="card"><div class="card-head"><h2 data-t1></h2><div class="actions" data-x1>${MP.exportButtons()}</div></div><div class="tbl-wrap" data-kat></div></div>
        <div class="card"><div class="card-head"><h2>Aylık masraf (KDV hariç)</h2></div><div class="chart-box sm"><canvas id="ch-arac"></canvas></div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Masraf kayıtları</h2><div class="actions" data-x2>${MP.exportButtons()}</div></div><div class="tbl-wrap" data-list></div></div>`;
    const katCols = [
      { h: 'Kategori', v: (r) => MP.grupAdi(r.grup), cls: 'strong nowrap' }, { h: 'Adet', v: (r) => r.adet, t: 'int' },
      { h: 'Tutar (KDV hariç)', v: (r) => r.tutar, t: 'try' }, { h: 'KDV', v: (r) => r.kdv, t: 'try' }, { h: 'Toplam', v: (r) => r.toplam, t: 'try' },
      { h: 'Pay %', v: (r) => r.pay, t: 'num', html: (r) => `${MP.pct(r.pay)}<div class="bar"><i style="width:${r.pay.toFixed(1)}%"></i></div>` }
    ];
    const listCols = [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Kaynak', v: (r) => r.kaynak === 'gider' ? 'Gider' : 'Gelen fatura', html: (r) => `<span class="badge ${r.kaynak === 'gider' ? '' : 'b-kesildi'}">${r.kaynak === 'gider' ? 'Gider' : 'Gelen fatura'}</span>` },
      { h: 'Kategori', v: (r) => MP.grupAdi(MP.grupKategori(r.kaynak, r.kategori)) },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Tedarikçi', v: (r) => r.cari },
      { h: 'Tutar (KDV hariç)', v: (r) => r.tutar_try, t: 'try' }, { h: 'KDV', v: (r) => r.kdv_try, t: 'try' }, { h: 'Toplam', v: (r) => r.toplam_try, t: 'try' }
    ];
    let kat = [], list = [];
    const render = () => {
      MP.destroyCharts();
      const y = +st.yil;
      list = ms.filter((m) => m.yil === y);
      const agg = {};
      list.forEach((m) => { const g = MP.grupKategori(m.kaynak, m.kategori); const r = agg[g] || (agg[g] = { grup: g, adet: 0, tutar: 0, kdv: 0, toplam: 0 }); r.adet++; r.tutar += MP.n(m.tutar_try); r.kdv += MP.n(m.kdv_try); r.toplam += MP.n(m.toplam_try); });
      kat = Object.values(agg).sort((x, z) => z.tutar - x.tutar);
      const total = MP.sum(kat, 'tutar');
      kat.forEach((r) => { r.pay = total ? (r.tutar / total) * 100 : 0; });
      const yak = (agg.yakit || {}).tutar || 0;
      $('[data-ylbl]', el).textContent = y + ' toplam masraf';
      $('[data-ytop]', el).textContent = MP.money(total);
      $('[data-yadet]', el).textContent = MP.int(list.length) + ' kayıt · KDV hariç';
      $('[data-yakit]', el).textContent = MP.money(yak);
      $('[data-yakitp]', el).textContent = total ? MP.pct((yak / total) * 100) + ' toplam masrafın' : '—';
      $('[data-t1]', el).textContent = 'Kategori bazlı masraf · ' + y;
      $('[data-kat]', el).innerHTML = MP.tableHtml(katCols, kat, { emptyTitle: 'Bu yıl masraf kaydı yok', empty: 'Gider veya gelen faturada bu aracı seçin.',
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Adet' ? MP.int(MP.sum(kat, 'adet')) : c.h === 'Tutar (KDV hariç)' ? MP.money(total) : c.h === 'KDV' ? MP.money(MP.sum(kat, 'kdv')) : c.h === 'Toplam' ? MP.money(MP.sum(kat, 'toplam')) : (kat.length ? '%100' : '') });
      $('[data-list]', el).innerHTML = MP.tableHtml(listCols, list, { emptyTitle: 'Bu yıl masraf kaydı yok', empty: '',
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Tutar (KDV hariç)' ? MP.money(MP.sum(list, 'tutar_try')) : c.h === 'KDV' ? MP.money(MP.sum(list, 'kdv_try')) : c.h === 'Toplam' ? MP.money(MP.sum(list, 'toplam_try')) : '' });
      const months = L.aylarKisa.map((_, i) => MP.sum(list.filter((m) => +String(m.tarih).slice(5, 7) === i + 1), 'tutar_try'));
      MP.chart('ch-arac', { type: 'bar', data: { labels: L.aylarKisa, datasets: [{ label: 'Masraf', data: months, backgroundColor: MP.colors.navy, borderRadius: 5, maxBarThickness: 26 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + MP.money(c.parsed.y) } } },
          scales: { y: { ticks: { callback: (v) => MP.shortMoney(v) }, grid: { color: '#eef1f5' } }, x: { grid: { display: false } } } } });
    };
    render();
    $('[data-yil]', el).onchange = (e) => { st.yil = +e.target.value; render(); };
    $$('[data-x1] [data-exp]', el).forEach((b) => { b.onclick = () => MP.exportRows(b.dataset.exp, 'arac-' + a.plaka + '-kategori-' + st.yil, katCols, kat, { sheet: 'Kategori' }).catch((e) => MP.toast(MP.errMsg(e), 'err')); });
    $$('[data-x2] [data-exp]', el).forEach((b) => { b.onclick = () => MP.exportRows(b.dataset.exp, 'arac-' + a.plaka + '-masraflar-' + st.yil, listCols, list, { sheet: 'Masraflar' }).catch((e) => MP.toast(MP.errMsg(e), 'err')); });
    const reload = () => MP.route();
    const q = (s) => el.querySelector(s);
    if (q('[data-edit-a]')) q('[data-edit-a]').onclick = () => aracForm(a, reload);
    if (q('[data-newgf]')) q('[data-newgf]').onclick = () => gelenFaturaForm({ arac_id: a.id, kategori: 'yakit' }, reload);
    if (q('[data-newgd]')) q('[data-newgd]').onclick = () => MP.giderForm({ arac_id: a.id, plaka: a.plaka }, reload);
  };
})();
