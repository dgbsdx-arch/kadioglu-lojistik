/* KADIOĞLU LOJİSTİK — Muhasebe Paneli · sayfalar */
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
})('9579c68a0b7c', 'pages');
(function () {
  'use strict';
  const MP = window.MP;
  const { $, $$, esc, L } = MP;
  const sb = () => MP.sb;
  const pages = (MP.pages = {});
  const stale = (seq) => seq !== MP.renderSeq();

  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/></svg>',
    cash: '<svg viewBox="0 0 24 24"><path d="M2 7h20v12H2zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>',
    receipt: '<svg viewBox="0 0 24 24"><path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>'
  };
  MP.ICON = ICON;
  const pbOpts = [['TRY', 'TRY — Türk lirası'], ['USD', 'USD — ABD doları'], ['EUR', 'EUR — Euro']];
  const kdvOpts = [['0', '%0'], ['1', '%1'], ['10', '%10'], ['20', '%20']];
  const musteriOpts = (includeId) => MP.state.musteriler.filter((m) => m.aktif || m.id === includeId).map((m) => [m.id, m.firma]);
  const durumBadge = (d) => `<span class="badge b-${esc(d)}">${esc(L.durum[d] || d)}</span>`;
  const rowBtns = (r, o = {}) => [
    o.extra || '',
    MP.can.write() ? `<button class="btn btn-sm" type="button" data-edit="${r.id}" title="Düzenle" aria-label="Düzenle">${ICON.edit}</button>` : '',
    MP.can.del() ? `<button class="btn btn-sm" type="button" data-del="${r.id}" title="Sil" aria-label="Sil">${ICON.del}</button>` : ''
  ].join('');

  /* =====================================================================
     Genel liste sayfası
     ===================================================================== */
  async function listPage(el, seq, o) {
    const f = MP.state.filters[o.key] || (MP.state.filters[o.key] = Object.assign({ preset: o.preset || 'bu_yil', q: '' }, o.defaults || {}));
    if (o.dateRange && f.preset !== 'ozel') MP.applyPreset(f);
    el.innerHTML = `<div data-page>
      <div class="page-head"><div><h1>${esc(o.title)}</h1><p class="muted">${esc(o.sub || '')}</p></div>
        <div class="actions">${o.headActions || ''}${MP.can.write() && o.onNew ? `<button class="btn btn-primary" type="button" data-new>${ICON.plus}${esc(o.newText || 'Yeni kayıt')}</button>` : ''}</div></div>
      <form class="card filters" data-filters>
        <div class="filter-grid">
          <label class="fld fld-search"><span>Ara</span><input type="search" name="q" value="${esc(f.q)}" placeholder="${esc(o.searchHint || 'Ara…')}"></label>
          ${o.dateRange ? MP.rangeHtml(f) : ''}
          ${o.filtersHtml ? o.filtersHtml(f) : ''}
        </div>
        <div class="filter-bar"><div class="chips" data-summary></div>${MP.exportButtons()}</div>
      </form>
      <div class="card"><div class="tbl-wrap" data-table><div class="empty">Yükleniyor…</div></div></div></div>`;
    // Dinleyiciler her render'da yeniden oluşturulan kök öğeye bağlanır (#view'e değil → birikmez)
    const root = $('[data-page]', el);
    const form = $('[data-filters]', el);
    form.addEventListener('submit', (e) => e.preventDefault());
    let rows = [], shown = [], limit = 50;
    const STEP = 50;

    const render = (keepLimit) => {
      if (!keepLimit) limit = STEP;
      const q = MP.trLower(f.q).trim();
      shown = q ? rows.filter((r) => MP.trLower(o.searchText(r)).includes(q)) : rows.slice();
      if (o.clientFilter) shown = shown.filter((r) => o.clientFilter(r, f));
      $('[data-summary]', el).innerHTML = `<span class="chip">Kayıt <b>${MP.int(shown.length)}</b></span>` + (o.summary ? o.summary(shown) : '');
      const page = shown.slice(0, limit);
      $('[data-table]', el).innerHTML = MP.tableHtml(o.columns(), page, {
        actions: o.actions, footer: o.footer ? (c, i) => o.footer(c, i, shown) : null, rowClass: o.rowClass,
        emptyTitle: rows.length ? 'Eşleşen kayıt yok' : 'Henüz kayıt yok',
        empty: rows.length ? 'Arama veya filtreleri değiştirin.' : (MP.can.write() && o.onNew ? '“' + (o.newText || 'Yeni kayıt') + '” ile ilk kaydı ekleyin.' : '')
      }) + (shown.length > limit ? `<div class="more no-print"><span class="muted small">${MP.int(limit)} / ${MP.int(shown.length)} kayıt gösteriliyor · toplamlar ve dışa aktarım tüm kayıtları kapsar</span><button class="btn btn-sm" type="button" data-more>Daha fazla göster</button><button class="btn btn-sm btn-ghost" type="button" data-all>Tümünü göster</button></div>` : '');
    };
    const load = async () => {
      $('[data-table]', el).innerHTML = '<div class="empty">Yükleniyor…</div>';
      const data = await o.load(f);
      if (stale(seq)) return;
      rows = data;
      render();
    };
    const reload = async () => { try { await load(); } catch (e) { console.warn(e); MP.toast(MP.errMsg(e), 'err'); $('[data-table]', el).innerHTML = `<div class="empty"><b>Veriler yüklenemedi</b>${esc(MP.errMsg(e))}</div>`; } };

    form.addEventListener('input', MP.debounce((e) => { if (e.target.name === 'q') { f.q = e.target.value; render(); } }, 200));
    form.addEventListener('change', (e) => {
      const n = e.target.name;
      if (n === 'q') return;
      if (n === 'preset') {
        f.preset = e.target.value;
        MP.applyPreset(f);
        form.elements.from.value = f.from || ''; form.elements.to.value = f.to || '';
      } else if (n === 'from' || n === 'to') {
        f[n] = e.target.value; f.preset = 'ozel'; form.elements.preset.value = 'ozel';
      } else {
        f[n] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      }
      if (o.clientOnly && o.clientOnly.includes(n)) render(); else reload();
    });
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-exp]');
      if (b) MP.exportRows(b.dataset.exp, o.exportName || o.title, o.columns(), shown, { sheet: o.title, extra: o.exportExtra ? o.exportExtra(shown) : [] }).catch((er) => MP.toast(MP.errMsg(er), 'err'));
    });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-more]')) { limit += STEP * 2; return render(true); }
      if (e.target.closest('[data-all]')) { limit = Infinity; return render(true); }
      const nb = e.target.closest('[data-new]');
      if (nb) return o.onNew(reload);
      const ed = e.target.closest('[data-edit]');
      if (ed) { const r = shown.find((x) => String(x.id) === ed.dataset.edit); if (r) o.onEdit(r, reload); return; }
      const dl = e.target.closest('[data-del]');
      if (dl) { const r = shown.find((x) => String(x.id) === dl.dataset.del); if (r) o.onDelete(r, reload); return; }
      if (o.onAction) { const ab = e.target.closest('[data-act]'); if (ab) { const r = shown.find((x) => String(x.id) === ab.dataset.id); if (r) o.onAction(ab.dataset.act, r, reload); } }
    });
    await load();
  }
  MP.listPage = listPage;

  async function deleteRow(table, id, label, reload) {
    if (!(await MP.confirm(label + ' kalıcı olarak silinecek. Bu işlem geri alınamaz.', { title: 'Kaydı sil' }))) return;
    try {
      const { error, count } = await sb().from(table).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('Kayıt silinemedi (yetkiniz olmayabilir).');
      MP.toast('Kayıt silindi.', 'ok');
      if (table === 'musteriler') await MP.loadMusteriler();
      if (table === 'tedarikciler') await MP.loadTedarikciler();
      if (table === 'araclar') await MP.loadAraclar();
      reload();
    } catch (e) { MP.toast(MP.errMsg(e), 'err'); }
  }
  async function saveRow(table, id, payload) {
    const q = id ? sb().from(table).update(payload).eq('id', id) : sb().from(table).insert(payload);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  }

  /* =====================================================================
     GÖSTERGE PANELİ
     ===================================================================== */
  pages.dashboard = async (el, _p, seq) => {
    const ay = MP.monthStart(0), start12 = MP.monthStart(-11);
    const [aylik, bakiyeler, gecmis, sonF, sonT, sonG, tBak, vadeler, uyarilar, sonGF, sonO] = await Promise.all([
      MP.q(sb().from('v_aylik_genel_ozet').select('*').gte('ay', start12).order('ay')),
      MP.fetchAll(() => sb().from('v_cari_bakiye').select('*').order('bakiye_try', { ascending: false })),
      MP.fetchAll(() => sb().from('v_vadesi_gecmis_alacaklar').select('*').order('gecikme_gun', { ascending: false })),
      MP.q(sb().from('v_fatura_ozet').select('*').order('created_at', { ascending: false }).limit(8)),
      MP.q(sb().from('v_tahsilat_ozet').select('*').order('created_at', { ascending: false }).limit(8)),
      MP.q(sb().from('giderler').select('*').order('created_at', { ascending: false }).limit(8)),
      MP.fetchAll(() => sb().from('v_tedarikci_bakiye').select('*')),
      MP.fetchAll(() => sb().from('v_yaklasan_vadeler').select('*').order('vade_tarihi')),
      MP.q(sb().from('v_arac_uyarilar').select('*').order('bitis')),
      MP.q(sb().from('v_gelen_fatura_ozet').select('*').order('created_at', { ascending: false }).limit(8)),
      MP.q(sb().from('v_odeme_ozet').select('*').order('created_at', { ascending: false }).limit(8))
    ]);
    if (stale(seq)) return;
    const byAy = Object.fromEntries(aylik.map((a) => [String(a.ay).slice(0, 10), a]));
    const cur = byAy[ay] || {}, prev = byAy[MP.monthStart(-1)] || {};
    const gelir = MP.n(cur.gelir_try), gider = MP.n(cur.toplam_gider_try), kar = gelir - gider;
    const alacak = MP.sum(bakiyeler.filter((b) => MP.n(b.bakiye_try) > 0), 'bakiye_try');
    const gecmisTop = MP.sum(gecmis, 'kalan_try');
    const borc = MP.sum(tBak.filter((b) => MP.n(b.bakiye_try) > 0), 'bakiye_try');
    const net = MP.sum(bakiyeler, 'bakiye_try') - MP.sum(tBak, 'bakiye_try');
    const borcV = vadeler.filter((v) => v.yon === 'borc'), alacakV = vadeler.filter((v) => v.yon === 'alacak');
    const borcGecmis = borcV.filter((v) => v.gun_farki < 0);
    const hafta = vadeler.filter((v) => v.gun_farki >= 0 && v.gun_farki <= 7);
    const haftaA = hafta.filter((v) => v.yon === 'alacak'), haftaB = hafta.filter((v) => v.yon === 'borc');
    const borclarim = borcV.filter((v) => v.gun_farki <= 30).sort((x, y) => x.gun_farki - y.gun_farki);
    const delta = (a, b) => { if (!MP.n(b)) return ''; const d = ((MP.n(a) - MP.n(b)) / Math.abs(MP.n(b))) * 100; return `<span class="${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '▲' : '▼'} ${MP.pct(Math.abs(d))}</span> geçen aya göre`; };
    const ayAdi = L.aylar[new Date().getMonth()];

    const months = []; for (let i = -11; i <= 0; i++) months.push(MP.monthStart(i));
    const topBorclu = bakiyeler.filter((b) => MP.n(b.bakiye_try) > 0).slice(0, 6);
    const maxB = topBorclu.length ? MP.n(topBorclu[0].bakiye_try) : 1;
    const hareket = [
      ...sonF.filter((f) => f.durum !== 'taslak').map((f) => ({ tur: 'fatura', ts: f.created_at, tarih: f.tarih, t: f.firma, s: 'Fatura ' + f.fatura_no + (f.durum === 'iptal' ? ' (iptal)' : ''), tutar: f.toplam, pb: f.para_birimi, sign: '' })),
      ...sonT.map((t) => ({ tur: 'tahsilat', ts: t.created_at, tarih: t.tarih, t: t.firma, s: 'Tahsilat · ' + (L.yontem[t.yontem] || t.yontem), tutar: t.tutar, pb: t.para_birimi, sign: '+' })),
      ...sonG.map((g) => ({ tur: 'gider', ts: g.created_at, tarih: g.tarih, t: g.tedarikci || L.kategori[g.kategori], s: 'Gider · ' + L.kategori[g.kategori], tutar: g.toplam, pb: g.para_birimi, sign: '−' })),
      ...sonGF.filter((g) => g.durum !== 'iptal').map((g) => ({ tur: 'gelen', ts: g.created_at, tarih: g.tarih, t: g.unvan, s: 'Gelen fatura ' + g.fatura_no + ' · ' + (L.gkategori[g.kategori] || ''), tutar: g.toplam, pb: g.para_birimi, sign: '' })),
      ...sonO.map((o) => ({ tur: 'odeme', ts: o.created_at, tarih: o.tarih, t: o.unvan, s: 'Ödeme · ' + (L.yontem[o.yontem] || o.yontem), tutar: o.tutar, pb: o.para_birimi, sign: '−' }))
    ].sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 10);
    const ico = { fatura: ICON.doc, tahsilat: ICON.cash, gider: ICON.receipt, gelen: ICON.doc, odeme: ICON.cash };
    const vadeLi = (v) => `<li><span class="ico ${v.yon === 'alacak' ? 'tahsilat' : 'odeme'}">${v.yon === 'alacak' ? ICON.cash : ICON.receipt}</span>
      <div class="grow"><a class="t" href="${v.yon === 'alacak' ? '#/musteriler/' : '#/tedarikciler/'}${v.cari_id}">${esc(v.cari_adi)}</a>
      <div class="s">${v.yon === 'alacak' ? 'Tahsil edilecek' : 'Ödenecek'} · ${esc(v.belge_no)} · vade ${MP.date(v.vade_tarihi)}</div></div>
      ${MP.gunBadge(v.gun_farki)}<b class="num ${v.yon === 'alacak' ? 'pos' : 'neg'}">${v.yon === 'alacak' ? '+' : '−'}${MP.money(v.kalan, v.para_birimi)}</b></li>`;

    el.innerHTML = `
      <div class="page-head"><div><h1>Gösterge Paneli</h1><p class="muted">${esc(ayAdi)} ${new Date().getFullYear()} özeti · tutarlar TL karşılığıdır, gelir/gider KDV hariç (gider = giderler + gelen faturalar)</p></div>
        <div class="actions">${MP.can.write() ? `<a class="btn" href="#/gelen-faturalar">${ICON.doc}Gelen fatura</a><a class="btn" href="#/giderler">${ICON.receipt}Gider</a><a class="btn" href="#/tahsilatlar">${ICON.cash}Tahsilat</a><a class="btn btn-primary" href="#/faturalar">${ICON.plus}Fatura</a>` : ''}</div></div>
      <section class="kpis">
        <div class="card kpi k-gelir"><div class="kpi-label">Bu ay gelir</div><div class="kpi-value">${MP.money(gelir)}</div><div class="kpi-sub">${delta(gelir, prev.gelir_try) || MP.int(cur.fatura_sayisi || 0) + ' fatura'}</div></div>
        <div class="card kpi k-gider"><div class="kpi-label">Bu ay gider</div><div class="kpi-value">${MP.money(gider)}</div><div class="kpi-sub">${delta(gider, prev.toplam_gider_try) || MP.int((cur.gider_sayisi || 0) + (cur.gelen_fatura_sayisi || 0)) + ' kayıt'}</div></div>
        <div class="card kpi k-kar"><div class="kpi-label">Bu ay kâr</div><div class="kpi-value ${kar < 0 ? 'neg' : ''}">${MP.money(kar)}</div><div class="kpi-sub">${gelir ? 'Kâr marjı ' + MP.pct((kar / gelir) * 100) : '—'}</div></div>
        <div class="card kpi k-alacak"><div class="kpi-label">Toplam alacak</div><div class="kpi-value">${MP.money(alacak)}</div><div class="kpi-sub">${MP.int(bakiyeler.filter((b) => MP.n(b.bakiye_try) > 0).length)} borçlu müşteri</div></div>
        <div class="card kpi k-gecmis"><div class="kpi-label">Vadesi geçmiş alacak</div><div class="kpi-value ${gecmisTop > 0 ? 'neg' : ''}">${MP.money(gecmisTop)}</div><div class="kpi-sub">${MP.int(gecmis.length)} fatura</div></div>
      </section>
      <section class="kpis">
        <div class="card kpi k-net"><div class="kpi-label">Net cari durum</div><div class="kpi-value ${net < 0 ? 'neg' : ''}" data-net>${MP.money(net)}</div><div class="kpi-sub">Alacaklar − borçlar</div></div>
        <div class="card kpi k-borc"><div class="kpi-label">Toplam borcumuz</div><div class="kpi-value">${MP.money(borc)}</div><div class="kpi-sub">${MP.int(tBak.filter((b) => MP.n(b.bakiye_try) > 0).length)} tedarikçiye</div></div>
        <div class="card kpi k-gecmis"><div class="kpi-label">Vadesi geçmiş borç</div><div class="kpi-value ${borcGecmis.length ? 'neg' : ''}">${MP.money(MP.sum(borcGecmis, 'kalan_try'))}</div><div class="kpi-sub"><a href="#/borclar">${MP.int(borcGecmis.length)} fatura →</a></div></div>
        <div class="card kpi k-kar"><div class="kpi-label">Bu hafta tahsil edilecek</div><div class="kpi-value">${MP.money(MP.sum(haftaA, 'kalan_try'))}</div><div class="kpi-sub">${MP.int(haftaA.length)} fatura · 7 gün</div></div>
        <div class="card kpi k-uyari"><div class="kpi-label">Bu hafta ödenecek</div><div class="kpi-value">${MP.money(MP.sum(haftaB, 'kalan_try'))}</div><div class="kpi-sub">${MP.int(haftaB.length)} fatura · 7 gün</div></div>
      </section>
      <div class="grid grid-3 mb">
        <div class="card"><div class="card-head"><h2>Son 12 ay gelir / gider</h2><a class="small" href="#/raporlar">Raporlar →</a></div><div class="chart-box"><canvas id="ch-12" aria-label="Son 12 ay gelir gider grafiği" role="img"></canvas></div></div>
        <div class="card"><div class="card-head"><h2>En çok borçlu müşteriler</h2><a class="small" href="#/musteriler">Tümü →</a></div>
          ${topBorclu.length ? `<ul class="list-mini">${topBorclu.map((b) => `<li><div class="grow"><a class="t" href="#/musteriler/${b.musteri_id}">${esc(b.firma)}</a>
            <div class="s">${MP.n(b.vadesi_gecmis_try) > 0 ? `<span class="neg">Vadesi geçmiş ${MP.money(b.vadesi_gecmis_try)}</span>` : 'Vadesi gelmemiş'}</div>
            <div class="bar"><i style="width:${Math.max(4, (MP.n(b.bakiye_try) / maxB) * 100).toFixed(1)}%"></i></div></div>
            <b class="num">${MP.money(b.bakiye_try)}</b></li>`).join('')}</ul>` : '<div class="empty">Açık alacak yok.</div>'}
        </div>
      </div>
      <div class="grid grid-2 mb">
        <div class="card" data-hafta><div class="card-head"><h2>Bu hafta vadesi gelenler</h2><span class="small muted">${MP.date(MP.today())} + 7 gün</span></div>
          ${hafta.length ? `<ul class="list-mini">${hafta.slice(0, 8).map(vadeLi).join('')}</ul>` : '<div class="empty">Önümüzdeki 7 gün içinde vadesi gelen alacak veya borç yok.</div>'}
        </div>
        <div class="card" data-uyari><div class="card-head"><h2>Araç belge uyarıları</h2><a class="small" href="#/araclar">Araçlar →</a></div>
          ${uyarilar.length ? `<ul class="list-mini">${uyarilar.map((u) => `<li><span class="ico ${u.kalan_gun < 0 ? 'odeme' : 'uyari'}">${ICON.truck}</span><div class="grow"><a class="t" href="#/araclar/${u.arac_id}">${esc(u.plaka)} · ${esc(L.belge[u.belge] || u.belge)}</a>
            <div class="s">${esc([u.marka, u.model].filter(Boolean).join(' '))} · bitiş ${MP.date(u.bitis)}</div></div>${MP.gunBadge(u.kalan_gun)}</li>`).join('')}</ul>` : '<div class="empty">30 gün içinde biten muayene / sigorta / kasko yok.</div>'}
        </div>
      </div>
      <div class="grid grid-2 mb">
        <div class="card"><div class="card-head"><h2>Vadesi geçmiş alacaklar</h2><a class="small" href="#/faturalar">Faturalar →</a></div>
          ${gecmis.length ? `<ul class="list-mini">${gecmis.slice(0, 6).map((g) => `<li><div class="grow"><div class="t">${esc(g.firma)}</div><div class="s">${esc(g.fatura_no)} · vade ${MP.date(g.vade_tarihi)}</div></div>
            <span class="badge b-gecikme">${MP.int(g.gecikme_gun)} gün</span><b class="num">${MP.money(g.kalan, g.para_birimi)}</b></li>`).join('')}</ul>` : '<div class="empty">Vadesi geçmiş alacak yok. 👍</div>'}
        </div>
        <div class="card" data-borclarim><div class="card-head"><h2>Vadesi gelen / geçen borçlarım</h2><a class="small" href="#/borclar">Tümü →</a></div>
          ${borclarim.length ? `<ul class="list-mini">${borclarim.slice(0, 6).map(vadeLi).join('')}</ul>` : '<div class="empty">30 gün içinde vadesi gelen borç yok.</div>'}
        </div>
      </div>
      <div class="card"><div class="card-head"><h2>Son hareketler</h2></div>
        ${hareket.length ? `<ul class="list-mini">${hareket.map((h) => `<li><span class="ico ${h.tur}">${ico[h.tur]}</span><div class="grow"><div class="t">${esc(h.t)}</div><div class="s">${esc(h.s)} · ${MP.date(h.tarih)}</div></div>
          <b class="num ${h.tur === 'tahsilat' ? 'pos' : ['gider', 'odeme'].includes(h.tur) ? 'neg' : ''}">${h.sign}${MP.money(h.tutar, h.pb)}</b></li>`).join('')}</ul>` : '<div class="empty">Henüz hareket yok.</div>'}
      </div>`;

    MP.chart('ch-12', {
      data: {
        labels: months.map((m) => MP.monthLabel(m, true)),
        datasets: [
          { type: 'bar', label: 'Gelir', data: months.map((m) => MP.n((byAy[m] || {}).gelir_try)), backgroundColor: MP.colors.blue, borderRadius: 5, maxBarThickness: 26, order: 2 },
          { type: 'bar', label: 'Gider', data: months.map((m) => MP.n((byAy[m] || {}).toplam_gider_try)), backgroundColor: '#9aa4b2', borderRadius: 5, maxBarThickness: 26, order: 3 },
          { type: 'line', label: 'Kâr', data: months.map((m) => MP.n((byAy[m] || {}).kar_try)), borderColor: MP.colors.navy, backgroundColor: MP.colors.navy, tension: 0.3, pointRadius: 3, order: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + MP.money(c.parsed.y) } } },
        scales: { y: { ticks: { callback: (v) => MP.shortMoney(v) }, grid: { color: '#eef1f5' } }, x: { grid: { display: false } } }
      }
    });
  };

  /* =====================================================================
     MÜŞTERİLER
     ===================================================================== */
  function musteriForm(m, done) {
    m = m || { aktif: true };
    MP.formDialog({
      title: m.id ? 'Müşteriyi düzenle' : 'Yeni müşteri',
      body: MP.F.text('firma', 'Firma ünvanı', m.firma, { required: true, full: true, max: 200 }) +
        MP.F.text('yetkili', 'Yetkili kişi', m.yetkili) +
        MP.F.text('telefon', 'Telefon', m.telefon, { type: 'tel', placeholder: '0 (5xx) xxx xx xx' }) +
        MP.F.text('eposta', 'E-posta', m.eposta, { type: 'email' }) +
        MP.F.text('vergi_dairesi', 'Vergi dairesi', m.vergi_dairesi, { placeholder: 'ör. Şehitkamil' }) +
        MP.F.text('vergi_no', 'Vergi no / TCKN', m.vergi_no, { placeholder: '10 veya 11 hane', extra: ' inputmode="numeric" maxlength="11"' }) +
        MP.F.check('aktif', 'Aktif müşteri', m.aktif !== false) +
        MP.F.area('adres', 'Adres', m.adres) +
        MP.F.area('notlar', 'Not', m.notlar),
      onSubmit: async (f) => {
        const vn = (MP.formVal(f, 'vergi_no') || '').replace(/\s/g, '');
        if (vn && !/^\d{10,11}$/.test(vn)) { f.elements.vergi_no.classList.add('invalid'); throw new Error('Vergi no 10 haneli (VKN) veya TCKN 11 haneli olmalıdır.'); }
        const em = MP.formVal(f, 'eposta');
        if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('E-posta adresi geçersiz.');
        await saveRow('musteriler', m.id, {
          firma: MP.formVal(f, 'firma'), yetkili: MP.formVal(f, 'yetkili'), telefon: MP.formVal(f, 'telefon'),
          eposta: em, vergi_dairesi: MP.formVal(f, 'vergi_dairesi'), vergi_no: vn || null,
          adres: MP.formVal(f, 'adres'), notlar: MP.formVal(f, 'notlar'), aktif: MP.formVal(f, 'aktif')
        });
        await MP.loadMusteriler();
        MP.toast(m.id ? 'Müşteri güncellendi.' : 'Müşteri eklendi.', 'ok');
        done && done();
      }
    });
  }
  MP.musteriForm = musteriForm;

  pages.musteriler = (el, _p, seq) => listPage(el, seq, {
    key: 'musteriler', title: 'Müşteriler', sub: 'Cari hesaplar ve bakiyeler (TL karşılığı)', newText: 'Yeni müşteri',
    searchHint: 'Firma, yetkili, telefon, vergi no…', defaults: { gorunum: 'aktif' }, clientOnly: ['gorunum'],
    filtersHtml: (f) => MP.F.select('gorunum', 'Görünüm', [['aktif', 'Aktif müşteriler'], ['borclu', 'Borçlu olanlar'], ['gecmis', 'Vadesi geçmişi olanlar'], ['pasif', 'Pasif müşteriler'], ['tumu', 'Tümü']], f.gorunum),
    load: async () => {
      const [ms, bs] = await Promise.all([MP.loadMusteriler(), MP.fetchAll(() => sb().from('v_cari_bakiye').select('*'))]);
      const bm = Object.fromEntries(bs.map((b) => [b.musteri_id, b]));
      return ms.map((m) => Object.assign({}, m, bm[m.id] || {}, { id: m.id }));
    },
    clientFilter: (r, f) => ({ aktif: r.aktif, pasif: !r.aktif, borclu: MP.n(r.bakiye_try) > 0.005, gecmis: MP.n(r.vadesi_gecmis_try) > 0.005, tumu: true })[f.gorunum || 'tumu'],
    searchText: (r) => [r.firma, r.yetkili, r.telefon, r.eposta, r.vergi_no, r.vergi_dairesi].join(' '),
    columns: () => [
      { h: 'Firma', v: (r) => r.firma, html: (r) => `<a class="strong" href="#/musteriler/${r.id}">${esc(r.firma)}</a>${r.aktif ? '' : ' <span class="badge">Pasif</span>'}` },
      { h: 'Yetkili', v: (r) => r.yetkili },
      { h: 'Telefon', v: (r) => r.telefon, html: (r) => r.telefon ? `<a href="tel:${esc(String(r.telefon).replace(/[^\d+]/g, ''))}">${esc(r.telefon)}</a>` : '' },
      { h: 'E-posta', v: (r) => r.eposta, show: false },
      { h: 'Vergi dairesi', v: (r) => r.vergi_dairesi, show: false },
      { h: 'Vergi no', v: (r) => r.vergi_no },
      { h: 'Adres', v: (r) => r.adres, show: false },
      { h: 'Toplam fatura', v: (r) => r.toplam_fatura_try, t: 'try' },
      { h: 'Tahsilat', v: (r) => r.toplam_tahsilat_try, t: 'try' },
      { h: 'Bakiye', v: (r) => r.bakiye_try, t: 'try', html: (r) => `<b class="${MP.n(r.bakiye_try) > 0.005 ? '' : 'muted'}">${MP.money(r.bakiye_try)}</b>` },
      { h: 'Vadesi geçmiş', v: (r) => r.vadesi_gecmis_try, t: 'try', html: (r) => MP.n(r.vadesi_gecmis_try) > 0 ? `<span class="neg">${MP.money(r.vadesi_gecmis_try)}</span>` : '<span class="muted">—</span>' }
    ],
    summary: (rows) => `<span class="chip">Toplam bakiye <b>${MP.money(MP.sum(rows, 'bakiye_try'))}</b></span><span class="chip red">Vadesi geçmiş <b>${MP.money(MP.sum(rows, 'vadesi_gecmis_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : (['Toplam fatura', 'Tahsilat', 'Bakiye', 'Vadesi geçmiş'].includes(c.h) ? MP.money(MP.sum(rows, c.v)) : ''),
    actions: (r) => rowBtns(r, { extra: `<a class="btn btn-sm" href="#/musteriler/${r.id}" title="Cari ekstre">Ekstre</a>` }),
    onNew: (reload) => musteriForm(null, reload),
    onEdit: (r, reload) => musteriForm(MP.state.musteriler.find((m) => m.id === r.id), reload),
    onDelete: (r, reload) => deleteRow('musteriler', r.id, '“' + r.firma + '” müşterisi', reload)
  });

  /* =====================================================================
     CARİ EKSTRE
     ===================================================================== */
  pages.ekstre = async (el, idParam, seq) => {
    const id = Number(idParam);
    const f = MP.state.filters['ekstre'] || (MP.state.filters['ekstre'] = { preset: 'bu_yil' });
    if (f.preset !== 'ozel') MP.applyPreset(f);
    const [m, bak, har, acik] = await Promise.all([
      MP.q(sb().from('musteriler').select('*').eq('id', id).maybeSingle()),
      MP.q(sb().from('v_cari_bakiye').select('*').eq('musteri_id', id).maybeSingle()),
      MP.fetchAll(() => sb().from('v_cari_hareketler').select('*').eq('musteri_id', id).order('tarih').order('created_at')),
      MP.q(sb().from('v_fatura_ozet').select('*').eq('musteri_id', id).in('durum', ['kesildi', 'kismi_odendi']).order('vade_tarihi'))
    ]);
    if (stale(seq)) return;
    if (!m) { el.innerHTML = `<a class="back" href="#/musteriler">${ICON.back}Müşteriler</a><div class="card card-pad"><h2>Müşteri bulunamadı</h2></div>`; return; }
    const b = bak || {};
    $('#top-title').textContent = 'Cari Ekstre · ' + m.firma;

    el.innerHTML = `
      <a class="back" href="#/musteriler">${ICON.back}Müşteriler</a>
      <div class="page-head"><div><h1>${esc(m.firma)}</h1><p class="muted">Cari hesap ekstresi${m.aktif ? '' : ' · <b>Pasif müşteri</b>'}</p></div>
        <div class="actions no-print">
          <button class="btn" type="button" data-print>${ICON.print}Ekstre yazdır (A4)</button>
          ${MP.can.write() ? `<button class="btn" type="button" data-editm>${ICON.edit}Düzenle</button><button class="btn" type="button" data-newt>${ICON.cash}Tahsilat</button><button class="btn btn-primary" type="button" data-newf>${ICON.plus}Fatura</button>` : ''}
        </div></div>
      <section class="kpis">
        <div class="card kpi k-gelir"><div class="kpi-label">Toplam fatura</div><div class="kpi-value">${MP.money(b.toplam_fatura_try)}</div><div class="kpi-sub">${MP.int(b.fatura_sayisi)} fatura</div></div>
        <div class="card kpi k-kar"><div class="kpi-label">Toplam tahsilat</div><div class="kpi-value">${MP.money(b.toplam_tahsilat_try)}</div><div class="kpi-sub">Son: ${b.son_tahsilat_tarihi ? MP.date(b.son_tahsilat_tarihi) : '—'}</div></div>
        <div class="card kpi k-alacak"><div class="kpi-label">Bakiye</div><div class="kpi-value">${MP.money(b.bakiye_try)}</div><div class="kpi-sub">${MP.n(b.bakiye_try) > 0 ? 'Müşteri borçlu' : MP.n(b.bakiye_try) < 0 ? 'Müşteri alacaklı' : 'Kapalı'}</div></div>
        <div class="card kpi k-gecmis"><div class="kpi-label">Vadesi geçmiş</div><div class="kpi-value ${MP.n(b.vadesi_gecmis_try) > 0 ? 'neg' : ''}">${MP.money(b.vadesi_gecmis_try)}</div><div class="kpi-sub">${acik.filter((x) => x.gecikme_gun > 0).length} fatura</div></div>
        <div class="card kpi"><div class="kpi-label">İletişim</div><div class="kpi-sub" style="margin-top:8px">${esc(m.yetkili || '—')}<br>${esc(m.telefon || '')}${m.eposta ? '<br>' + esc(m.eposta) : ''}</div></div>
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
          ${acik.length ? `<ul class="list-mini">${acik.map((x) => `<li><div class="grow"><div class="t">${esc(x.fatura_no)}</div><div class="s">${MP.date(x.tarih)} · vade ${x.vade_tarihi ? MP.date(x.vade_tarihi) : '—'}</div></div>
            ${x.gecikme_gun > 0 ? `<span class="badge b-gecikme">${x.gecikme_gun} gün</span>` : durumBadge(x.durum)}<b class="num">${MP.money(x.kalan, x.para_birimi)}</b></li>`).join('')}</ul>` : '<div class="empty">Açık fatura yok.</div>'}
          <div class="card-pad" style="border-top:1px solid var(--gray-100)"><dl class="kv">
            <dt>Vergi dairesi</dt><dd>${esc(m.vergi_dairesi || '—')}</dd><dt>Vergi no</dt><dd>${esc(m.vergi_no || '—')}</dd>
            <dt>Adres</dt><dd>${esc(m.adres || '—')}</dd>${m.notlar ? `<dt>Not</dt><dd>${esc(m.notlar)}</dd>` : ''}</dl></div>
        </div>
      </div>`;

    const cols = [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'İşlem', v: (r) => r.tur === 'devir' ? 'Devir' : r.tur === 'fatura' ? 'Fatura' : 'Tahsilat', html: (r) => r.tur === 'devir' ? 'Devir' : `<span class="badge ${r.tur === 'fatura' ? 'b-kesildi' : 'b-odendi'}">${r.tur === 'fatura' ? 'Fatura' : 'Tahsilat'}</span>` },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Açıklama', v: (r) => r.tur === 'tahsilat' ? (L.yontem[r.aciklama] || r.aciklama) : r.aciklama, cls: 'wrap' },
      { h: 'Vade', v: (r) => r.vade_tarihi, t: 'date' },
      { h: 'Döviz tutarı', v: (r) => r.para_birimi && r.para_birimi !== 'TRY' ? r.tutar : null, html: (r) => r.para_birimi && r.para_birimi !== 'TRY' ? MP.money(r.tutar, r.para_birimi) : '', t: 'num', xh: 'Döviz tutarı' },
      { h: 'Döviz', v: (r) => r.para_birimi && r.para_birimi !== 'TRY' ? r.para_birimi : '', show: false },
      { h: 'Borç', v: (r) => r.borc_try, t: 'try', html: (r) => MP.n(r.borc_try) ? MP.money(r.borc_try) : '' },
      { h: 'Alacak', v: (r) => r.alacak_try, t: 'try', html: (r) => MP.n(r.alacak_try) ? MP.money(r.alacak_try) : '' },
      { h: 'Bakiye', v: (r) => r.bakiye, t: 'try', html: (r) => `<b>${MP.money(r.bakiye)}</b>` }
    ];
    let rows = [], sonBakiye = 0;
    const render = () => {
      const from = f.from || '', to = f.to || '9999-12-31';
      const once = har.filter((h) => from && h.tarih < from);
      const devir = MP.sum(once, 'borc_try') - MP.sum(once, 'alacak_try');
      let bakiye = devir;
      rows = [];
      if (from) rows.push({ tur: 'devir', tarih: from, belge_no: '', aciklama: 'Önceki dönemden devir', borc_try: devir > 0 ? devir : 0, alacak_try: devir < 0 ? -devir : 0, bakiye: devir });
      har.filter((h) => (!from || h.tarih >= from) && h.tarih <= to).forEach((h) => {
        bakiye += MP.n(h.borc_try) - MP.n(h.alacak_try);
        rows.push(Object.assign({}, h, { bakiye }));
      });
      sonBakiye = bakiye;
      const real = rows.filter((r) => r.tur !== 'devir');
      $('[data-sum]', el).innerHTML = `<span class="chip">Dönem borç <b>${MP.money(MP.sum(real, 'borc_try'))}</b></span><span class="chip">Dönem alacak <b>${MP.money(MP.sum(real, 'alacak_try'))}</b></span><span class="chip">Dönem sonu bakiye <b>${MP.money(bakiye)}</b></span>`;
      $('[data-t]', el).innerHTML = MP.tableHtml(cols, rows, {
        emptyTitle: 'Bu dönemde hareket yok', empty: 'Dönemi değiştirin.', rowClass: (r) => (r.tur === 'devir' ? 'devir' : ''),
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Borç' ? MP.money(MP.sum(rows, 'borc_try')) : c.h === 'Alacak' ? MP.money(MP.sum(rows, 'alacak_try')) : c.h === 'Bakiye' ? MP.money(bakiye) : ''
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
      if (bt) MP.exportRows(bt.dataset.exp, 'cari-ekstre-' + m.firma, cols, rows, { sheet: 'Cari ekstre' }).catch((er) => MP.toast(MP.errMsg(er), 'err'));
    });
    const reload = () => MP.route();
    el.querySelector('[data-print]').onclick = () => MP.printEkstre({ tur: 'musteri', cari: m, from: f.from, to: f.to, rows, bakiye: sonBakiye });
    const q = (s) => el.querySelector(s);
    if (q('[data-editm]')) q('[data-editm]').onclick = () => musteriForm(m, reload);
    if (q('[data-newf]')) q('[data-newf]').onclick = () => MP.faturaForm({ musteri_id: m.id }, reload);
    if (q('[data-newt]')) q('[data-newt]').onclick = () => MP.tahsilatForm({ musteri_id: m.id }, reload);
  };

  /* ---------- Para birimi / kur alanı davranışı ---------- */
  function wireKur(f, onChange) {
    const pb = f.elements.para_birimi, kurFld = f.elements.kur.closest('.fld');
    const sync = () => {
      const isTry = pb.value === 'TRY';
      kurFld.hidden = isTry;
      f.elements.kur.required = !isTry;
      if (isTry) f.elements.kur.value = '1,00';
      else if (MP.parseNum(f.elements.kur.value) === 1) f.elements.kur.value = '';
      onChange && onChange();
    };
    pb.addEventListener('change', sync);
    kurFld.hidden = pb.value === 'TRY';
    f.elements.kur.required = pb.value !== 'TRY';
  }
  const kurVal = (f) => f.elements.para_birimi.value === 'TRY' ? 1 : MP.formNum(f, 'kur', 'Kur', { required: true, min: 0.0001 });

  /* =====================================================================
     FATURALAR
     ===================================================================== */
  function faturaForm(fa, done) {
    fa = fa || {};
    const yeni = !fa.id;
    const d = Object.assign({ tarih: MP.today(), kdv_orani: 20, para_birimi: 'TRY', kur: 1, durum: 'kesildi' }, fa);
    if (yeni && !d.vade_tarihi) { const t = new Date(); t.setDate(t.getDate() + 30); d.vade_tarihi = MP.iso(t); }
    MP.formDialog({
      title: yeni ? 'Yeni fatura' : 'Faturayı düzenle · ' + fa.fatura_no,
      body: MP.F.select('musteri_id', 'Müşteri', musteriOpts(d.musteri_id), d.musteri_id, { required: true, full: true, empty: 'Müşteri seçin…' }) +
        MP.F.text('fatura_no', 'Fatura no', d.fatura_no, { required: true, placeholder: 'ör. KLJ2026000000123', max: 40 }) +
        MP.F.select('durum', 'Durum', Object.entries(L.durum), d.durum, { required: true }) +
        MP.F.date('tarih', 'Fatura tarihi', d.tarih, { required: true }) +
        MP.F.date('vade_tarihi', 'Vade tarihi', d.vade_tarihi) +
        MP.F.money('tutar', 'Tutar (KDV hariç)', d.tutar, { required: true, placeholder: '0,00' }) +
        MP.F.select('kdv_orani', 'KDV oranı', kdvOpts.concat(kdvOpts.some((k) => +k[0] === +d.kdv_orani) ? [] : [[String(+d.kdv_orani), '%' + MP.num(d.kdv_orani)]]), String(+d.kdv_orani), { required: true }) +
        MP.F.select('para_birimi', 'Para birimi', pbOpts, d.para_birimi, { required: true }) +
        MP.F.money('kur', 'Kur (1 birim = ? TL)', d.para_birimi === 'TRY' ? 1 : d.kur, { placeholder: 'ör. 34,5000' }) +
        '<div class="calc" data-calc></div>' +
        MP.F.text('sefer_notu', 'Sefer / güzergâh notu', d.sefer_notu, { full: true, placeholder: 'ör. Gaziantep → Mersin Limanı, 27 ABC 123, 2 sefer' }) +
        MP.F.area('aciklama', 'Açıklama', d.aciklama),
      onOpen: (f) => {
        const calc = () => {
          const t = MP.parseNum(f.elements.tutar.value) || 0, k = +f.elements.kdv_orani.value || 0, pb = f.elements.para_birimi.value;
          const kdv = Math.round(t * k) / 100, top = t + kdv, kur = pb === 'TRY' ? 1 : (MP.parseNum(f.elements.kur.value) || 0);
          $('[data-calc]', f).innerHTML = `<span>KDV: <b>${MP.money(kdv, pb)}</b></span><span>Genel toplam: <b>${MP.money(top, pb)}</b></span>${pb !== 'TRY' ? `<span>TL karşılığı: <b>${MP.money(top * kur)}</b></span>` : ''}`;
        };
        wireKur(f, calc);
        ['tutar', 'kdv_orani', 'kur'].forEach((n) => f.elements[n].addEventListener('input', calc));
        f.elements.kdv_orani.addEventListener('change', calc);
        calc();
      },
      onSubmit: async (f) => {
        const tarih = MP.formVal(f, 'tarih'), vade = MP.formVal(f, 'vade_tarihi');
        if (vade && vade < tarih) throw new Error('Vade tarihi fatura tarihinden önce olamaz.');
        await saveRow('faturalar', fa.id, {
          musteri_id: Number(MP.formVal(f, 'musteri_id')), fatura_no: MP.formVal(f, 'fatura_no'), durum: MP.formVal(f, 'durum'),
          tarih, vade_tarihi: vade, tutar: MP.formNum(f, 'tutar', 'Tutar', { required: true, min: 0 }),
          kdv_orani: Number(MP.formVal(f, 'kdv_orani')), para_birimi: MP.formVal(f, 'para_birimi'), kur: kurVal(f),
          sefer_notu: MP.formVal(f, 'sefer_notu'), aciklama: MP.formVal(f, 'aciklama')
        });
        MP.toast(yeni ? 'Fatura kaydedildi.' : 'Fatura güncellendi.', 'ok');
        done && done();
      }
    });
  }
  MP.faturaForm = faturaForm;

  pages.faturalar = (el, _p, seq) => listPage(el, seq, {
    key: 'faturalar', title: 'Faturalar', sub: 'Satış faturaları, vade ve tahsilat durumu', newText: 'Yeni fatura', dateRange: true,
    searchHint: 'Fatura no, müşteri, sefer, açıklama…', defaults: { durum: '', musteri: '', gecikmis: false }, clientOnly: ['gecikmis'],
    filtersHtml: (f) => MP.F.select('durum', 'Durum', [['acik', 'Açık (kesildi + kısmi)']].concat(Object.entries(L.durum)), f.durum, { empty: 'Tümü' }) +
      MP.F.select('musteri', 'Müşteri', musteriOpts(Number(f.musteri)), f.musteri, { empty: 'Tüm müşteriler' }) +
      `<label class="chk" style="align-self:center"><input type="checkbox" name="gecikmis"${f.gecikmis ? ' checked' : ''}> Sadece vadesi geçenler</label>`,
    load: (f) => MP.fetchAll(() => {
      let q = sb().from('v_fatura_ozet').select('*');
      if (f.from) q = q.gte('tarih', f.from);
      if (f.to) q = q.lte('tarih', f.to);
      if (f.durum === 'acik') q = q.in('durum', ['kesildi', 'kismi_odendi']); else if (f.durum) q = q.eq('durum', f.durum);
      if (f.musteri) q = q.eq('musteri_id', Number(f.musteri));
      return q.order('tarih', { ascending: false }).order('id', { ascending: false });
    }),
    clientFilter: (r, f) => !f.gecikmis || r.gecikme_gun > 0,
    searchText: (r) => [r.fatura_no, r.firma, r.sefer_notu, r.aciklama].join(' '),
    columns: () => [
      { h: 'Fatura no', v: (r) => r.fatura_no, cls: 'strong' },
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Vade', v: (r) => r.vade_tarihi, t: 'date', html: (r) => r.vade_tarihi ? (r.gecikme_gun > 0 ? `<span class="neg">${MP.date(r.vade_tarihi)}</span><br><span class="badge b-gecikme">${r.gecikme_gun} gün geçti</span>` : MP.date(r.vade_tarihi)) : '—' },
      { h: 'Müşteri', v: (r) => r.firma, cls: 'firm', html: (r) => `<a href="#/musteriler/${r.musteri_id}">${esc(r.firma)}</a>${r.sefer_notu ? `<div class="sub">${esc(r.sefer_notu)}</div>` : ''}` },
      { h: 'Tutar (KDV hariç)', v: (r) => r.tutar, t: 'money', pb: (r) => r.para_birimi },
      { h: 'KDV %', v: (r) => r.kdv_orani, t: 'num', show: false },
      { h: 'KDV', v: (r) => r.kdv_tutari, t: 'money', pb: (r) => r.para_birimi, show: false },
      { h: 'Toplam', v: (r) => r.toplam, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.toplam, r.para_birimi)}</b>` },
      { h: 'Para birimi', v: (r) => r.para_birimi, show: false },
      { h: 'Kur', v: (r) => r.kur, t: 'rate', show: false },
      { h: 'Toplam (TL)', v: (r) => r.toplam_try, t: 'try', show: false },
      { h: 'Kalan', v: (r) => ['taslak', 'iptal'].includes(r.durum) ? 0 : r.kalan, t: 'money', pb: (r) => r.para_birimi, html: (r) => ['taslak', 'iptal'].includes(r.durum) ? '<span class="muted">—</span>' : (MP.n(r.kalan) > 0.005 ? MP.money(r.kalan, r.para_birimi) : '<span class="pos">0,00</span>') },
      { h: 'Kalan (TL)', v: (r) => ['taslak', 'iptal'].includes(r.durum) ? 0 : r.kalan_try, t: 'try', show: false },
      { h: 'Durum', v: (r) => L.durum[r.durum], html: (r) => durumBadge(r.durum) },
      { h: 'Sefer / güzergâh', v: (r) => r.sefer_notu, show: false },
      { h: 'Açıklama', v: (r) => r.aciklama, show: false }
    ],
    summary: (rows) => { const g = rows.filter((r) => !['taslak', 'iptal'].includes(r.durum)); return `<span class="chip">Toplam (TL) <b>${MP.money(MP.sum(g, 'toplam_try'))}</b></span><span class="chip">Kalan (TL) <b>${MP.money(MP.sum(g, 'kalan_try'))}</b></span><span class="chip red">Vadesi geçmiş <b>${MP.money(MP.sum(g.filter((r) => r.gecikme_gun > 0), 'kalan_try'))}</b></span>`; },
    actions: (r) => rowBtns(r, { extra: MP.can.write() && ['kesildi', 'kismi_odendi'].includes(r.durum) ? `<button class="btn btn-sm" type="button" data-act="tahsil" data-id="${r.id}" title="Tahsilat ekle">${ICON.cash}Tahsil et</button>` : '' }),
    onAction: (act, r, reload) => { if (act === 'tahsil') MP.tahsilatForm({ musteri_id: r.musteri_id, fatura_id: r.id, tutar: r.kalan, para_birimi: r.para_birimi, kur: r.kur }, reload); },
    onNew: (reload) => faturaForm(null, reload),
    onEdit: async (r, reload) => { try { faturaForm(await MP.q(sb().from('faturalar').select('*').eq('id', r.id).single()), reload); } catch (e) { MP.toast(MP.errMsg(e), 'err'); } },
    onDelete: (r, reload) => deleteRow('faturalar', r.id, r.fatura_no + ' numaralı fatura', reload)
  });

  /* =====================================================================
     TAHSİLATLAR
     ===================================================================== */
  function tahsilatForm(t, done) {
    t = t || {};
    const yeni = !t.id;
    const d = Object.assign({ tarih: MP.today(), para_birimi: 'TRY', kur: 1, yontem: 'havale' }, t);
    let acik = [];
    MP.formDialog({
      title: yeni ? 'Yeni tahsilat' : 'Tahsilatı düzenle',
      body: MP.F.select('musteri_id', 'Müşteri', musteriOpts(d.musteri_id), d.musteri_id, { required: true, full: true, empty: 'Müşteri seçin…' }) +
        MP.F.select('fatura_id', 'Fatura', [], '', { full: true, empty: 'Faturasız (cari hesaba)' }) +
        MP.F.date('tarih', 'Tahsilat tarihi', d.tarih, { required: true }) +
        MP.F.select('yontem', 'Yöntem', Object.entries(L.yontem), d.yontem, { required: true }) +
        MP.F.money('tutar', 'Tutar', d.tutar, { required: true, placeholder: '0,00' }) +
        MP.F.select('para_birimi', 'Para birimi', pbOpts, d.para_birimi, { required: true }) +
        MP.F.money('kur', 'Kur (1 birim = ? TL)', d.para_birimi === 'TRY' ? 1 : d.kur) +
        MP.F.text('belge_no', 'Belge no', d.belge_no, { placeholder: 'Dekont / çek / senet no' }) +
        MP.F.area('notlar', 'Not', d.notlar),
      onOpen: (f) => {
        wireKur(f);
        const fsel = f.elements.fatura_id;
        const loadAcik = async (keep) => {
          const mid = Number(f.elements.musteri_id.value);
          fsel.innerHTML = '<option value="">Faturasız (cari hesaba)</option>';
          if (!mid) return;
          try {
            acik = await MP.q(sb().from('v_fatura_ozet').select('*').eq('musteri_id', mid).in('durum', ['kesildi', 'kismi_odendi', 'odendi']).order('tarih', { ascending: false }).limit(200));
            acik = acik.filter((x) => x.durum !== 'odendi' || x.id === d.fatura_id);
            fsel.innerHTML += acik.map((x) => `<option value="${x.id}">${esc(x.fatura_no)} · ${MP.date(x.tarih)} · kalan ${esc(MP.money(x.kalan, x.para_birimi))}</option>`).join('');
            if (keep && d.fatura_id) fsel.value = String(d.fatura_id);
          } catch (e) { MP.toast(MP.errMsg(e), 'err'); }
        };
        f.elements.musteri_id.addEventListener('change', () => loadAcik(false));
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
        const fid = MP.formVal(f, 'fatura_id');
        await saveRow('tahsilatlar', t.id, {
          musteri_id: Number(MP.formVal(f, 'musteri_id')), fatura_id: fid ? Number(fid) : null, tarih: MP.formVal(f, 'tarih'),
          yontem: MP.formVal(f, 'yontem'), tutar: MP.formNum(f, 'tutar', 'Tutar', { required: true, min: 0.01 }),
          para_birimi: MP.formVal(f, 'para_birimi'), kur: kurVal(f), belge_no: MP.formVal(f, 'belge_no'), notlar: MP.formVal(f, 'notlar')
        });
        MP.toast(yeni ? 'Tahsilat kaydedildi.' : 'Tahsilat güncellendi.', 'ok');
        done && done();
      }
    });
  }
  MP.tahsilatForm = tahsilatForm;

  pages.tahsilatlar = (el, _p, seq) => listPage(el, seq, {
    key: 'tahsilatlar', title: 'Tahsilatlar', sub: 'Müşterilerden alınan ödemeler', newText: 'Yeni tahsilat', dateRange: true,
    searchHint: 'Müşteri, fatura no, belge no, not…', defaults: { yontem: '', musteri: '' },
    filtersHtml: (f) => MP.F.select('yontem', 'Yöntem', Object.entries(L.yontem), f.yontem, { empty: 'Tümü' }) +
      MP.F.select('musteri', 'Müşteri', musteriOpts(Number(f.musteri)), f.musteri, { empty: 'Tüm müşteriler' }),
    load: (f) => MP.fetchAll(() => {
      let q = sb().from('v_tahsilat_ozet').select('*');
      if (f.from) q = q.gte('tarih', f.from);
      if (f.to) q = q.lte('tarih', f.to);
      if (f.yontem) q = q.eq('yontem', f.yontem);
      if (f.musteri) q = q.eq('musteri_id', Number(f.musteri));
      return q.order('tarih', { ascending: false }).order('id', { ascending: false });
    }),
    searchText: (r) => [r.firma, r.fatura_no, r.belge_no, r.notlar, L.yontem[r.yontem]].join(' '),
    columns: () => [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Müşteri', v: (r) => r.firma, cls: 'firm', html: (r) => `<a class="strong" href="#/musteriler/${r.musteri_id}">${esc(r.firma)}</a>` },
      { h: 'Fatura no', v: (r) => r.fatura_no || '', html: (r) => r.fatura_no ? esc(r.fatura_no) : '<span class="muted">Cari</span>' },
      { h: 'Yöntem', v: (r) => L.yontem[r.yontem], html: (r) => `<span class="badge">${esc(L.yontem[r.yontem] || r.yontem)}</span>` },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Tutar', v: (r) => r.tutar, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.tutar, r.para_birimi)}</b>` },
      { h: 'Para birimi', v: (r) => r.para_birimi, show: false },
      { h: 'Kur', v: (r) => r.kur, t: 'rate', show: false },
      { h: 'TL karşılığı', v: (r) => r.tutar_try, t: 'try' },
      { h: 'Not', v: (r) => r.notlar, cls: 'wrap' }
    ],
    summary: (rows) => `<span class="chip">Toplam (TL) <b>${MP.money(MP.sum(rows, 'tutar_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam' : c.h === 'TL karşılığı' ? MP.money(MP.sum(rows, 'tutar_try')) : '',
    actions: (r) => rowBtns(r, { extra: `<button class="btn btn-sm" type="button" data-act="makbuz" data-id="${r.id}" title="Tahsilat makbuzu yazdır (A4)">${ICON.print}Makbuz</button>` }),
    onAction: (act, r) => { if (act === 'makbuz') MP.printMakbuz(r); },
    onNew: (reload) => tahsilatForm(null, reload),
    onEdit: async (r, reload) => { try { tahsilatForm(await MP.q(sb().from('tahsilatlar').select('*').eq('id', r.id).single()), reload); } catch (e) { MP.toast(MP.errMsg(e), 'err'); } },
    onDelete: (r, reload) => deleteRow('tahsilatlar', r.id, MP.date(r.tarih) + ' tarihli ' + MP.money(r.tutar, r.para_birimi) + ' tahsilat', reload)
  });

  /* =====================================================================
     GİDERLER
     ===================================================================== */
  function giderForm(g, done) {
    g = g || {};
    const yeni = !g.id;
    const d = Object.assign({ tarih: MP.today(), para_birimi: 'TRY', kur: 1, kdv_tutari: 0, kategori: 'yakit' }, g);
    MP.formDialog({
      title: yeni ? 'Yeni gider' : 'Gideri düzenle',
      body: MP.F.date('tarih', 'Tarih', d.tarih, { required: true }) +
        MP.F.select('kategori', 'Kategori', Object.entries(L.kategori), d.kategori, { required: true }) +
        MP.F.money('tutar', 'Tutar (KDV hariç)', d.tutar, { required: true, placeholder: '0,00' }) +
        MP.F.select('kdv_hesap', 'KDV oranı (hesapla)', [['', 'Elle gir']].concat(kdvOpts), '', {}) +
        MP.F.money('kdv_tutari', 'KDV tutarı', d.kdv_tutari, { placeholder: '0,00' }) +
        MP.F.select('para_birimi', 'Para birimi', pbOpts, d.para_birimi, { required: true }) +
        MP.F.money('kur', 'Kur (1 birim = ? TL)', d.para_birimi === 'TRY' ? 1 : d.kur) +
        '<div class="calc" data-calc></div>' +
        MP.F.text('tedarikci', 'Tedarikçi', d.tedarikci, { placeholder: 'ör. Akaryakıt istasyonu, servis…' }) +
        MP.F.text('belge_no', 'Belge no', d.belge_no, { placeholder: 'Fatura / fiş no' }) +
        MP.F.select('arac_id', 'Araç', MP.aracOpts(d.arac_id), d.arac_id || '', { empty: 'Araç seçilmedi' }) +
        MP.F.text('plaka', 'Plaka (kayıtlı araç değilse)', d.arac_id ? '' : d.plaka, { placeholder: 'ör. 27 ABC 123', max: 15 }) +
        MP.F.area('notlar', 'Not', d.notlar),
      onOpen: (f) => {
        const calc = () => {
          const t = MP.parseNum(f.elements.tutar.value) || 0, k = MP.parseNum(f.elements.kdv_tutari.value) || 0, pb = f.elements.para_birimi.value;
          const kur = pb === 'TRY' ? 1 : (MP.parseNum(f.elements.kur.value) || 0);
          $('[data-calc]', f).innerHTML = `<span>Genel toplam: <b>${MP.money(t + k, pb)}</b></span>${pb !== 'TRY' ? `<span>TL karşılığı: <b>${MP.money((t + k) * kur)}</b></span>` : ''}`;
        };
        const kdvCalc = () => {
          const r = f.elements.kdv_hesap.value;
          if (r === '') return calc();
          const t = MP.parseNum(f.elements.tutar.value) || 0;
          f.elements.kdv_tutari.value = MP.num(Math.round(t * Number(r)) / 100);
          calc();
        };
        wireKur(f, calc);
        const plakaSync = () => { const on = !!f.elements.arac_id.value; f.elements.plaka.closest('.fld').hidden = on; if (on) f.elements.plaka.value = ''; };
        f.elements.arac_id.addEventListener('change', plakaSync); plakaSync();
        f.elements.kdv_hesap.addEventListener('change', kdvCalc);
        f.elements.tutar.addEventListener('input', kdvCalc);
        f.elements.kdv_tutari.addEventListener('input', () => { f.elements.kdv_hesap.value = ''; calc(); });
        f.elements.kur.addEventListener('input', calc);
        calc();
      },
      onSubmit: async (f) => {
        await saveRow('giderler', g.id, {
          tarih: MP.formVal(f, 'tarih'), kategori: MP.formVal(f, 'kategori'),
          tutar: MP.formNum(f, 'tutar', 'Tutar', { required: true, min: 0 }), kdv_tutari: MP.formNum(f, 'kdv_tutari', 'KDV tutarı', { min: 0, def: 0 }),
          para_birimi: MP.formVal(f, 'para_birimi'), kur: kurVal(f), tedarikci: MP.formVal(f, 'tedarikci'),
          belge_no: MP.formVal(f, 'belge_no'), notlar: MP.formVal(f, 'notlar'),
          arac_id: MP.formVal(f, 'arac_id') ? Number(MP.formVal(f, 'arac_id')) : null,
          plaka: MP.formVal(f, 'arac_id') ? (MP.state.araclar.find((a) => String(a.id) === MP.formVal(f, 'arac_id')) || {}).plaka || null : ((MP.formVal(f, 'plaka') || '').toLocaleUpperCase('tr-TR') || null)
        });
        MP.toast(yeni ? 'Gider kaydedildi.' : 'Gider güncellendi.', 'ok');
        done && done();
      }
    });
  }
  MP.giderForm = giderForm;

  pages.giderler = (el, _p, seq) => listPage(el, seq, {
    key: 'giderler', title: 'Giderler', sub: 'Fiş / makbuzla ödenen doğrudan giderler (maaş, harcırah, HGS, ofis…). Tedarikçiden faturası gelen masrafları “Gelen Faturalar”a girin — iki kez girmeyin.', newText: 'Yeni gider', dateRange: true,
    preset: 'bu_ay', searchHint: 'Tedarikçi, belge no, plaka, not…', defaults: { kategori: '' },
    filtersHtml: (f) => MP.F.select('kategori', 'Kategori', Object.entries(L.kategori), f.kategori, { empty: 'Tüm kategoriler' }),
    load: (f) => MP.fetchAll(() => {
      let q = sb().from('giderler').select('*');
      if (f.from) q = q.gte('tarih', f.from);
      if (f.to) q = q.lte('tarih', f.to);
      if (f.kategori) q = q.eq('kategori', f.kategori);
      return q.order('tarih', { ascending: false }).order('id', { ascending: false });
    }),
    searchText: (r) => [r.tedarikci, r.belge_no, r.plaka, r.notlar, L.kategori[r.kategori]].join(' '),
    columns: () => [
      { h: 'Tarih', v: (r) => r.tarih, t: 'date' },
      { h: 'Kategori', v: (r) => L.kategori[r.kategori], html: (r) => `<span class="badge">${esc(L.kategori[r.kategori] || r.kategori)}</span>` },
      { h: 'Tedarikçi', v: (r) => r.tedarikci, cls: 'strong' },
      { h: 'Belge no', v: (r) => r.belge_no },
      { h: 'Plaka', v: (r) => r.plaka, cls: 'nowrap', html: (r) => r.arac_id ? `<a class="plaka" href="#/araclar/${r.arac_id}">${esc(r.plaka || '')}</a>` : `<span class="plaka">${esc(r.plaka || '')}</span>` },
      { h: 'Tutar', v: (r) => r.tutar, t: 'money', pb: (r) => r.para_birimi },
      { h: 'KDV', v: (r) => r.kdv_tutari, t: 'money', pb: (r) => r.para_birimi },
      { h: 'Toplam', v: (r) => r.toplam, t: 'money', pb: (r) => r.para_birimi, html: (r) => `<b>${MP.money(r.toplam, r.para_birimi)}</b>` },
      { h: 'Para birimi', v: (r) => r.para_birimi, show: false },
      { h: 'Kur', v: (r) => r.kur, t: 'rate', show: false },
      { h: 'Tutar (TL)', v: (r) => r.tutar_try, t: 'try', show: false },
      { h: 'Toplam (TL)', v: (r) => r.toplam_try, t: 'try', show: false },
      { h: 'Not', v: (r) => r.notlar, cls: 'wrap' }
    ],
    summary: (rows) => `<span class="chip">KDV hariç (TL) <b>${MP.money(MP.sum(rows, 'tutar_try'))}</b></span><span class="chip">KDV (TL) <b>${MP.money(MP.sum(rows, 'kdv_try'))}</b></span><span class="chip">Toplam (TL) <b>${MP.money(MP.sum(rows, 'toplam_try'))}</b></span>`,
    footer: (c, i, rows) => i === 0 ? 'Toplam (TL)' : c.h === 'Tutar' ? MP.money(MP.sum(rows, 'tutar_try')) : c.h === 'KDV' ? MP.money(MP.sum(rows, 'kdv_try')) : c.h === 'Toplam' ? MP.money(MP.sum(rows, 'toplam_try')) : '',
    actions: (r) => rowBtns(r),
    onNew: (reload) => giderForm(null, reload),
    onEdit: (r, reload) => giderForm(r, reload),
    onDelete: (r, reload) => deleteRow('giderler', r.id, MP.date(r.tarih) + ' tarihli ' + (L.kategori[r.kategori] || '') + ' gideri', reload)
  });

  /* =====================================================================
     RAPORLAR
     ===================================================================== */
  pages.raporlar = async (el, _p, seq) => {
    const st = MP.state.filters.rapor || (MP.state.filters.rapor = { yil: new Date().getFullYear(), tab: 'aylik', ay: '' });
    const aylik = await MP.fetchAll(() => sb().from('v_aylik_genel_ozet').select('*').order('ay'));
    if (stale(seq)) return;
    const years = Array.from(new Set(aylik.map((a) => a.yil).concat([new Date().getFullYear()]))).sort((a, b) => b - a);
    const tabs = [['aylik', 'Aylık özet'], ['yillik', 'Yıllık karşılaştırma'], ['kategori', 'Kategori bazlı gider'], ['musteri', 'Müşteri bazlı ciro'], ['tedarikci', 'Tedarikçi bazlı alım'], ['arac', 'Araç maliyeti']];
    el.innerHTML = `
      <div class="page-head"><div><h1>Raporlar</h1><p class="muted">Tutarlar TL karşılığıdır; gelir ve gider KDV hariçtir. Gider = giderler + gelen (alış) faturaları. Taslak ve iptal faturalar dahil edilmez.</p></div>
        <div class="actions"><label class="fld" style="min-width:120px"><span>Yıl</span><select data-yil>${years.map((y) => `<option${y === +st.yil ? ' selected' : ''}>${y}</option>`).join('')}</select></label></div></div>
      <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" class="${st.tab === k ? 'active' : ''}" aria-selected="${st.tab === k}">${t}</button>`).join('')}</div>
      <div data-body></div>`;
    const body = $('[data-body]', el);
    const card = (title, inner, extra) => `<div class="card mb"><div class="card-head"><h2>${esc(title)}</h2><div class="actions">${extra || ''}${MP.exportButtons()}</div></div>${inner}</div>`;
    let current = { cols: [], rows: [], name: '' };
    const bindExport = () => $$('[data-exp]', body).forEach((b) => { b.onclick = () => MP.exportRows(b.dataset.exp, current.name, current.cols, current.rows, { sheet: current.name, extra: current.extra || [] }).catch((e) => MP.toast(MP.errMsg(e), 'err')); });

    const renderAylik = () => {
      const y = +st.yil;
      const rows = L.aylar.map((ad, i) => {
        const a = aylik.find((x) => x.yil === y && x.ay_no === i + 1) || {};
        return { ay: ad, gelir: MP.n(a.gelir_try), dgider: MP.n(a.gider_try), gelen: MP.n(a.gelen_fatura_try), gider: MP.n(a.toplam_gider_try), kar: MP.n(a.kar_try), hkdv: MP.n(a.hesaplanan_kdv_try), ikdv: MP.n(a.indirilecek_kdv_try), tahsilat: MP.n(a.tahsilat_try), odeme: MP.n(a.odeme_try), fs: MP.n(a.fatura_sayisi) };
      });
      const keyOf = { Gelir: 'gelir', 'Giderler': 'dgider', 'Gelen faturalar': 'gelen', 'Toplam gider': 'gider', 'Kâr': 'kar', 'Hesaplanan KDV': 'hkdv', 'İndirilecek KDV': 'ikdv', Tahsilat: 'tahsilat', 'Ödeme': 'odeme' };
      const cols = [
        { h: 'Ay', v: (r) => r.ay, cls: 'strong' }, { h: 'Fatura adedi', v: (r) => r.fs, t: 'int' },
        { h: 'Gelir', v: (r) => r.gelir, t: 'try' }, { h: 'Giderler', v: (r) => r.dgider, t: 'try' }, { h: 'Gelen faturalar', v: (r) => r.gelen, t: 'try' },
        { h: 'Toplam gider', v: (r) => r.gider, t: 'try' },
        { h: 'Kâr', v: (r) => r.kar, t: 'try', html: (r) => `<b class="${r.kar < 0 ? 'neg' : ''}">${MP.money(r.kar)}</b>` },
        { h: 'Hesaplanan KDV', v: (r) => r.hkdv, t: 'try' }, { h: 'İndirilecek KDV', v: (r) => r.ikdv, t: 'try' },
        { h: 'Tahsilat', v: (r) => r.tahsilat, t: 'try' }, { h: 'Ödeme', v: (r) => r.odeme, t: 'try' }
      ];
      const tot = (k) => MP.sum(rows, k);
      current = { cols, rows, name: 'aylik-ozet-' + y, extra: [['Toplam', tot('fs'), tot('gelir'), tot('dgider'), tot('gelen'), tot('gider'), tot('kar'), tot('hkdv'), tot('ikdv'), tot('tahsilat'), tot('odeme')]] };
      body.innerHTML = card(y + ' aylık gelir / gider / kâr', `<div class="chart-box"><canvas id="ch-ay"></canvas></div><div class="tbl-wrap">${MP.tableHtml(cols, rows, {
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Fatura adedi' ? MP.int(tot('fs')) : MP.money(tot(keyOf[c.h]))
      })}</div>`);
      MP.chart('ch-ay', {
        data: { labels: L.aylarKisa, datasets: [
          { type: 'bar', label: 'Gelir', data: rows.map((r) => r.gelir), backgroundColor: MP.colors.blue, borderRadius: 5, maxBarThickness: 28, order: 2 },
          { type: 'bar', label: 'Gider', data: rows.map((r) => r.gider), backgroundColor: '#9aa4b2', borderRadius: 5, maxBarThickness: 28, order: 3 },
          { type: 'line', label: 'Kâr', data: rows.map((r) => r.kar), borderColor: MP.colors.navy, backgroundColor: MP.colors.navy, tension: 0.3, order: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + MP.money(c.parsed.y) } } },
          scales: { y: { ticks: { callback: (v) => MP.shortMoney(v) }, grid: { color: '#eef1f5' } }, x: { grid: { display: false } } } }
      });
    };
    const renderYillik = () => {
      const by = {};
      aylik.forEach((a) => { const r = by[a.yil] || (by[a.yil] = { yil: a.yil, gelir: 0, gider: 0, kar: 0, hkdv: 0, ikdv: 0, tahsilat: 0, fs: 0 });
        r.gelir += MP.n(a.gelir_try); r.gider += MP.n(a.toplam_gider_try); r.kar += MP.n(a.kar_try); r.hkdv += MP.n(a.hesaplanan_kdv_try); r.ikdv += MP.n(a.indirilecek_kdv_try); r.tahsilat += MP.n(a.tahsilat_try); r.fs += MP.n(a.fatura_sayisi); });
      const rows = Object.values(by).sort((a, b) => b.yil - a.yil);
      rows.forEach((r) => { r.marj = r.gelir ? (r.kar / r.gelir) * 100 : 0; });
      const cols = [
        { h: 'Yıl', v: (r) => String(r.yil), cls: 'strong' }, { h: 'Fatura adedi', v: (r) => r.fs, t: 'int' },
        { h: 'Gelir', v: (r) => r.gelir, t: 'try' }, { h: 'Gider (toplam)', v: (r) => r.gider, t: 'try' },
        { h: 'Kâr', v: (r) => r.kar, t: 'try', html: (r) => `<b class="${r.kar < 0 ? 'neg' : ''}">${MP.money(r.kar)}</b>` },
        { h: 'Kâr marjı %', v: (r) => r.marj, t: 'num', html: (r) => MP.pct(r.marj) },
        { h: 'Hesaplanan KDV', v: (r) => r.hkdv, t: 'try' }, { h: 'İndirilecek KDV', v: (r) => r.ikdv, t: 'try' }, { h: 'Tahsilat', v: (r) => r.tahsilat, t: 'try' }
      ];
      current = { cols, rows, name: 'yillik-ozet' };
      const asc = rows.slice().reverse();
      body.innerHTML = card('Yıllık karşılaştırma', `<div class="chart-box sm"><canvas id="ch-yil"></canvas></div><div class="tbl-wrap">${MP.tableHtml(cols, rows)}</div>`);
      MP.chart('ch-yil', { type: 'bar', data: { labels: asc.map((r) => String(r.yil)), datasets: [
        { label: 'Gelir', data: asc.map((r) => r.gelir), backgroundColor: MP.colors.blue, borderRadius: 5, maxBarThickness: 48 },
        { label: 'Gider', data: asc.map((r) => r.gider), backgroundColor: '#9aa4b2', borderRadius: 5, maxBarThickness: 48 },
        { label: 'Kâr', data: asc.map((r) => r.kar), backgroundColor: MP.colors.navy, borderRadius: 5, maxBarThickness: 48 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + MP.money(c.parsed.y) } } },
          scales: { y: { ticks: { callback: (v) => MP.shortMoney(v) } }, x: { grid: { display: false } } } } });
    };
    const renderKategori = async () => {
      body.innerHTML = '<div class="skeleton"></div>';
      const y = +st.yil;
      const data = await MP.fetchAll(() => sb().from('v_gider_kategori_genel').select('*').eq('yil', y));
      if (stale(seq)) return;
      const sel = st.ay ? data.filter((d) => +String(d.ay).slice(5, 7) === +st.ay) : data;
      const agg = {};
      sel.forEach((d) => { const g = MP.grupKategori(d.kaynak, d.kategori); const r = agg[g] || (agg[g] = { kategori: g, adet: 0, tutar: 0, kdv: 0, toplam: 0 }); r.adet += MP.n(d.adet); r.tutar += MP.n(d.tutar_try); r.kdv += MP.n(d.kdv_try); r.toplam += MP.n(d.toplam_try); });
      const rows = Object.values(agg).sort((a, b) => b.tutar - a.tutar);
      const total = MP.sum(rows, 'tutar');
      rows.forEach((r) => { r.pay = total ? (r.tutar / total) * 100 : 0; });
      const cols = [
        { h: 'Kategori', v: (r) => MP.grupAdi(r.kategori), cls: 'strong nowrap' }, { h: 'Adet', v: (r) => r.adet, t: 'int' },
        { h: 'Tutar (KDV hariç)', v: (r) => r.tutar, t: 'try' }, { h: 'KDV', v: (r) => r.kdv, t: 'try' }, { h: 'Toplam', v: (r) => r.toplam, t: 'try' },
        { h: 'Pay %', v: (r) => r.pay, t: 'num', html: (r) => `${MP.pct(r.pay)}<div class="bar"><i style="width:${r.pay.toFixed(1)}%"></i></div>` }
      ];
      const donem = st.ay ? L.aylar[st.ay - 1] + ' ' + y : y + ' (tüm yıl)';
      current = { cols, rows, name: 'gider-kategori-' + (st.ay ? y + '-' + String(st.ay).padStart(2, '0') : y), extra: [['Toplam', MP.sum(rows, 'adet'), total, MP.sum(rows, 'kdv'), MP.sum(rows, 'toplam'), 100]] };
      const aySel = `<select data-ay class="btn-sm" aria-label="Ay" style="width:auto;padding:6px 8px"><option value="">Tüm yıl</option>${L.aylar.map((a, i) => `<option value="${i + 1}"${+st.ay === i + 1 ? ' selected' : ''}>${a}</option>`).join('')}</select>`;
      body.innerHTML = card('Kategori bazlı gider (giderler + gelen faturalar) · ' + donem, rows.length ? `<div class="grid grid-2" style="align-items:center"><div class="chart-box"><canvas id="ch-kat"></canvas></div><div class="tbl-wrap">${MP.tableHtml(cols, rows, {
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Adet' ? MP.int(MP.sum(rows, 'adet')) : c.h === 'Tutar (KDV hariç)' ? MP.money(total) : c.h === 'KDV' ? MP.money(MP.sum(rows, 'kdv')) : c.h === 'Toplam' ? MP.money(MP.sum(rows, 'toplam')) : '%100'
      })}</div></div>` : '<div class="empty">Bu dönemde gider kaydı yok.</div>', aySel);
      $('[data-ay]', body).onchange = (e) => { st.ay = e.target.value; renderKategori(); };
      if (rows.length) MP.chart('ch-kat', { type: 'doughnut', data: { labels: rows.map((r) => MP.grupAdi(r.kategori)), datasets: [{ data: rows.map((r) => r.tutar), backgroundColor: MP.colors.palette, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + MP.money(c.parsed) + ' (' + MP.pct(total ? c.parsed / total * 100 : 0) + ')' } } } } });
      bindExport();
    };
    const renderMusteri = async () => {
      body.innerHTML = '<div class="skeleton"></div>';
      const y = +st.yil;
      const fs = await MP.fetchAll(() => sb().from('v_fatura_ozet').select('musteri_id,firma,tutar_try,toplam_try,kalan_try,durum').gte('tarih', y + '-01-01').lte('tarih', y + '-12-31').not('durum', 'in', '(taslak,iptal)'));
      if (stale(seq)) return;
      const agg = {};
      fs.forEach((f) => { const r = agg[f.musteri_id] || (agg[f.musteri_id] = { id: f.musteri_id, firma: f.firma, adet: 0, ciro: 0, toplam: 0, kalan: 0 }); r.adet++; r.ciro += MP.n(f.tutar_try); r.toplam += MP.n(f.toplam_try); r.kalan += MP.n(f.kalan_try); });
      const rows = Object.values(agg).sort((a, b) => b.ciro - a.ciro);
      const total = MP.sum(rows, 'ciro');
      rows.forEach((r) => { r.pay = total ? (r.ciro / total) * 100 : 0; });
      const cols = [
        { h: 'Müşteri', v: (r) => r.firma, html: (r) => `<a class="strong" href="#/musteriler/${r.id}">${esc(r.firma)}</a>` }, { h: 'Fatura adedi', v: (r) => r.adet, t: 'int' },
        { h: 'Ciro (KDV hariç)', v: (r) => r.ciro, t: 'try' }, { h: 'KDV dahil', v: (r) => r.toplam, t: 'try' }, { h: 'Açık bakiye', v: (r) => r.kalan, t: 'try' },
        { h: 'Pay %', v: (r) => r.pay, t: 'num', html: (r) => `${MP.pct(r.pay)}<div class="bar"><i style="width:${r.pay.toFixed(1)}%"></i></div>` }
      ];
      current = { cols, rows, name: 'musteri-ciro-' + y };
      body.innerHTML = card('Müşteri bazlı ciro · ' + y, `<div class="tbl-wrap">${MP.tableHtml(cols, rows, { emptyTitle: 'Bu yıl fatura yok', empty: '',
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Fatura adedi' ? MP.int(MP.sum(rows, 'adet')) : c.h === 'Ciro (KDV hariç)' ? MP.money(total) : c.h === 'KDV dahil' ? MP.money(MP.sum(rows, 'toplam')) : c.h === 'Açık bakiye' ? MP.money(MP.sum(rows, 'kalan')) : '' })}</div>`);
      bindExport();
    };
    const renderTedarikci = async () => {
      body.innerHTML = '<div class="skeleton"></div>';
      const y = +st.yil;
      const fs = await MP.fetchAll(() => sb().from('v_gelen_fatura_ozet').select('tedarikci_id,unvan,tutar_try,kdv_try,toplam_try,kalan_try,durum').gte('tarih', y + '-01-01').lte('tarih', y + '-12-31').neq('durum', 'iptal'));
      if (stale(seq)) return;
      const agg = {};
      fs.forEach((f) => { const r = agg[f.tedarikci_id] || (agg[f.tedarikci_id] = { id: f.tedarikci_id, unvan: f.unvan, adet: 0, alim: 0, kdv: 0, toplam: 0, kalan: 0 }); r.adet++; r.alim += MP.n(f.tutar_try); r.kdv += MP.n(f.kdv_try); r.toplam += MP.n(f.toplam_try); r.kalan += MP.n(f.kalan_try); });
      const rows = Object.values(agg).sort((a, b) => b.alim - a.alim);
      const total = MP.sum(rows, 'alim');
      rows.forEach((r) => { r.pay = total ? (r.alim / total) * 100 : 0; });
      const cols = [
        { h: 'Tedarikçi', v: (r) => r.unvan, html: (r) => `<a class="strong" href="#/tedarikciler/${r.id}">${esc(r.unvan)}</a>` }, { h: 'Fatura adedi', v: (r) => r.adet, t: 'int' },
        { h: 'Alım (KDV hariç)', v: (r) => r.alim, t: 'try' }, { h: 'KDV', v: (r) => r.kdv, t: 'try' }, { h: 'KDV dahil', v: (r) => r.toplam, t: 'try' }, { h: 'Açık borç', v: (r) => r.kalan, t: 'try' },
        { h: 'Pay %', v: (r) => r.pay, t: 'num', html: (r) => `${MP.pct(r.pay)}<div class="bar"><i style="width:${r.pay.toFixed(1)}%"></i></div>` }
      ];
      current = { cols, rows, name: 'tedarikci-alim-' + y };
      body.innerHTML = card('Tedarikçi bazlı alım · ' + y, `<div class="tbl-wrap">${MP.tableHtml(cols, rows, { emptyTitle: 'Bu yıl gelen fatura yok', empty: '',
        footer: (c, i) => i === 0 ? 'Toplam' : c.h === 'Fatura adedi' ? MP.int(MP.sum(rows, 'adet')) : c.h === 'Alım (KDV hariç)' ? MP.money(total) : c.h === 'KDV' ? MP.money(MP.sum(rows, 'kdv')) : c.h === 'KDV dahil' ? MP.money(MP.sum(rows, 'toplam')) : c.h === 'Açık borç' ? MP.money(MP.sum(rows, 'kalan')) : '' })}</div>`);
      bindExport();
    };
    const renderArac = async () => {
      body.innerHTML = '<div class="skeleton"></div>';
      const y = +st.yil;
      const [ms, as] = await Promise.all([MP.fetchAll(() => sb().from('v_arac_masraflari').select('*').eq('yil', y)), MP.loadAraclar()]);
      if (stale(seq)) return;
      const G = ['yakit', 'tamir_bakim', 'lastik', 'kopru_otoyol', 'sigorta'];
      const agg = {};
      as.forEach((a) => { agg[a.id] = { id: a.id, plaka: a.plaka, ad: [a.marka, a.model].filter(Boolean).join(' '), aktif: a.aktif, adet: 0, diger: 0, toplam: 0, kdvli: 0 }; G.forEach((g) => { agg[a.id][g] = 0; }); });
      ms.forEach((m) => { const r = agg[m.arac_id]; if (!r) return; const g = MP.grupKategori(m.kaynak, m.kategori); r[G.includes(g) ? g : 'diger'] += MP.n(m.tutar_try); r.toplam += MP.n(m.tutar_try); r.kdvli += MP.n(m.toplam_try); r.adet++; });
      const rows = Object.values(agg).filter((r) => r.aktif || r.adet).sort((a, b) => b.toplam - a.toplam);
      const cols = [
        { h: 'Plaka', v: (r) => r.plaka, html: (r) => `<a class="strong plaka" href="#/araclar/${r.id}">${esc(r.plaka)}</a>` }, { h: 'Araç', v: (r) => r.ad },
        ...G.map((g) => ({ h: MP.grupAdi(g), v: (r) => r[g], t: 'try' })), { h: 'Diğer', v: (r) => r.diger, t: 'try' },
        { h: 'Toplam (KDV hariç)', v: (r) => r.toplam, t: 'try', html: (r) => `<b>${MP.money(r.toplam)}</b>` }, { h: 'KDV dahil', v: (r) => r.kdvli, t: 'try', show: false }, { h: 'Kayıt', v: (r) => r.adet, t: 'int' }
      ];
      current = { cols, rows, name: 'arac-maliyet-' + y };
      const keys = Object.fromEntries(cols.map((c) => [c.h, c.v]));
      body.innerHTML = card('Araç bazlı maliyet · ' + y + ' (giderler + gelen faturalar, KDV hariç)', rows.length ? `<div class="chart-box sm"><canvas id="ch-arac-r"></canvas></div><div class="tbl-wrap">${MP.tableHtml(cols, rows, {
        footer: (c, i) => i === 0 ? 'Toplam' : MP.isNumCol(c) ? (c.t === 'int' ? MP.int(MP.sum(rows, keys[c.h])) : MP.money(MP.sum(rows, keys[c.h]))) : '' })}</div>` : '<div class="empty"><b>Kayıtlı araç yok</b>Araçlar sayfasından araç ekleyin.</div>');
      if (rows.length) MP.chart('ch-arac-r', { type: 'bar', data: { labels: rows.map((r) => r.plaka), datasets: G.concat(['diger']).map((g, i) => ({ label: g === 'diger' ? 'Diğer' : MP.grupAdi(g), data: rows.map((r) => r[g]), backgroundColor: MP.colors.palette[i], borderRadius: 3, maxBarThickness: 40 })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + MP.money(c.parsed.y) } } },
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (v) => MP.shortMoney(v) } } } } });
      bindExport();
    };
    const render = async () => {
      MP.destroyCharts();
      $$('[data-tab]', el).forEach((b) => { b.classList.toggle('active', b.dataset.tab === st.tab); b.setAttribute('aria-selected', String(b.dataset.tab === st.tab)); });
      try {
        if (st.tab === 'aylik') renderAylik();
        else if (st.tab === 'yillik') renderYillik();
        else if (st.tab === 'kategori') await renderKategori();
        else if (st.tab === 'tedarikci') await renderTedarikci();
        else if (st.tab === 'arac') await renderArac();
        else await renderMusteri();
        bindExport();
      } catch (e) { console.warn(e); body.innerHTML = `<div class="card card-pad"><b>Rapor yüklenemedi</b><p class="muted">${esc(MP.errMsg(e))}</p></div>`; }
    };
    $('[data-yil]', el).onchange = (e) => { st.yil = +e.target.value; render(); };
    $$('[data-tab]', el).forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; render(); }; });
    await render();
  };

  Object.assign(MP, { saveRow, deleteRow, rowBtns, wireKur, kurVal, pbOpts, kdvOpts, durumBadge });

  /* =====================================================================
     KULLANICILAR (yalnızca yönetici)
     ===================================================================== */
  pages.kullanicilar = async (el, _p, seq) => {
    if (!MP.can.admin()) { location.hash = '#/'; return; }
    const [users, logs] = await Promise.all([
      MP.q(sb().from('profiles').select('*').order('created_at', { ascending: true })),
      MP.q(sb().from('audit_log').select('*').order('zaman', { ascending: false }).limit(60)).catch(() => [])
    ]);
    if (stale(seq)) return;
    const me = MP.state.profile.id;
    users.sort((a, b) => (a.onayli === b.onayli ? 0 : a.onayli ? 1 : -1));
    const bekleyen = users.filter((u) => !u.onayli || !u.rol);
    const ad = (id) => { const u = users.find((x) => x.id === id); return u ? (u.ad_soyad || u.email) : (id ? 'Bilinmeyen' : 'Sistem'); };
    const rolOpts = Object.entries(L.rol);
    const tabloAd = { musteriler: 'Müşteri', faturalar: 'Fatura', tahsilatlar: 'Tahsilat', giderler: 'Gider', profiles: 'Kullanıcı',
      tedarikciler: 'Tedarikçi', gelen_faturalar: 'Gelen fatura', odemeler: 'Ödeme', araclar: 'Araç' };
    const islemAd = { INSERT: 'Ekleme', UPDATE: 'Güncelleme', DELETE: 'Silme' };
    const ozet = (l) => { const r = l.yeni || l.eski || {}; return r.fatura_no || r.firma || r.unvan || r.plaka || r.ad_soyad || r.email || (r.kategori ? L.kategori[r.kategori] : '') || (r.tutar ? MP.num(r.tutar) : '') || ''; };

    el.innerHTML = `
      <div class="page-head"><div><h1>Kullanıcılar</h1><p class="muted">Kayıt onayı, rol atama ve erişim yönetimi</p></div></div>
      ${bekleyen.length ? `<div class="info mb" style="background:var(--warn-50);border-color:#f5d9a8"><h3>${bekleyen.length} kullanıcı onay bekliyor</h3>Rol seçip <b>Onayla</b>'ya basın. Tanımadığınız kayıtları onaylamayın.</div>` : ''}
      <div class="card mb"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Ad soyad</th><th>E-posta</th><th>Durum</th><th>Rol</th><th>Kayıt</th><th class="actions"></th></tr></thead><tbody>
        ${users.map((u) => `<tr data-uid="${esc(u.id)}">
          <td data-label="Ad soyad"><input type="text" name="ad_soyad" value="${esc(u.ad_soyad || '')}" aria-label="Ad soyad" style="min-width:160px"></td>
          <td data-label="E-posta">${esc(u.email || '')}${u.id === me ? ' <span class="badge">Siz</span>' : ''}</td>
          <td data-label="Durum">${u.onayli && u.rol ? '<span class="badge b-odendi">Onaylı</span>' : '<span class="badge b-bekliyor">Beklemede</span>'}</td>
          <td data-label="Rol"><select name="rol" aria-label="Rol"><option value="">— Rol seçin —</option>${rolOpts.map(([k, t]) => `<option value="${k}"${u.rol === k ? ' selected' : ''}>${t}</option>`).join('')}</select></td>
          <td data-label="Kayıt">${MP.dateTime(u.created_at)}</td>
          <td class="actions">
            ${u.onayli && u.rol ? `<button class="btn btn-sm" type="button" data-save>Kaydet</button>${u.id !== me ? '<button class="btn btn-sm" type="button" data-revoke>Erişimi kaldır</button>' : ''}`
              : '<button class="btn btn-sm btn-primary" type="button" data-approve>Onayla</button>'}
          </td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="grid grid-2 mb">
        <div class="info"><h3>Roller</h3><ul>
          <li><b>Yönetici</b>: tüm verileri görür, ekler, düzenler, <b>siler</b>; kullanıcıları onaylar.</li>
          <li><b>Muhasebe</b>: görür, ekler ve düzenler; silemez.</li>
          <li><b>Müdür</b>: yalnızca görüntüler ve rapor/dışa aktarım alır.</li>
          <li><b>Beklemede</b>: rol atanmamış; hiçbir veriyi göremez.</li></ul></div>
        <div class="info"><h3>Yeni kullanıcı</h3>Kişi giriş ekranındaki <b>Kayıt ol</b> bağlantısıyla kendi hesabını açar
          (ad soyad, e-posta, şifre). Kayıt burada <b>Beklemede</b> olarak görünür; rol seçip onaylayana kadar hiçbir veriye erişemez.
          Bir hesabı tamamen silmek için Supabase panelinde Authentication → Users bölümünü kullanın.</div>
      </div>
      <div class="card"><div class="card-head"><h2>Son değişiklikler (denetim kaydı)</h2></div><div class="tbl-wrap">
        ${MP.tableHtml([
          { h: 'Zaman', v: (l) => MP.dateTime(l.zaman) }, { h: 'Kullanıcı', v: (l) => ad(l.kullanici) },
          { h: 'Kayıt türü', v: (l) => tabloAd[l.tablo] || l.tablo }, { h: 'İşlem', v: (l) => islemAd[l.islem] || l.islem, html: (l) => `<span class="badge ${l.islem === 'DELETE' ? 'b-iptal' : l.islem === 'INSERT' ? 'b-odendi' : 'b-kesildi'}" style="text-decoration:none">${islemAd[l.islem]}</span>` },
          { h: 'Kayıt', v: (l) => ozet(l) + (l.kayit_id && l.tablo !== 'profiles' ? ' (#' + l.kayit_id + ')' : '') }
        ], logs, { emptyTitle: 'Henüz kayıt yok', empty: '' })}</div></div>`;

    const update = async (tr, payload, okMsg) => {
      const id = tr.dataset.uid;
      const { data, error } = await sb().from('profiles').update(payload).eq('id', id).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error('Güncellenemedi (yetki yok).');
      if (id === me) { MP.state.profile = data[0]; }
      MP.toast(okMsg, 'ok');
      MP.route();
    };
    el.querySelector('tbody').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const tr = b.closest('tr');
      const rol = tr.querySelector('[name=rol]').value || null;
      const adv = tr.querySelector('[name=ad_soyad]').value.trim() || null;
      b.disabled = true; b.classList.add('busy');
      try {
        if (b.hasAttribute('data-approve')) {
          if (!rol) { tr.querySelector('[name=rol]').classList.add('invalid'); throw new Error('Onaylamadan önce bir rol seçin.'); }
          await update(tr, { rol, onayli: true, ad_soyad: adv }, 'Kullanıcı onaylandı.');
        } else if (b.hasAttribute('data-save')) {
          if (!rol) throw new Error('Onaylı kullanıcının rolü boş olamaz. Erişimi kaldırmak için “Erişimi kaldır”ı kullanın.');
          await update(tr, { rol, ad_soyad: adv }, 'Kullanıcı güncellendi.');
        } else if (b.hasAttribute('data-revoke')) {
          if (!(await MP.confirm('Bu kullanıcının erişimi kaldırılacak; tekrar onaylanana kadar hiçbir veriyi göremez.', { title: 'Erişimi kaldır', ok: 'Erişimi kaldır' }))) return;
          await update(tr, { onayli: false, rol: null }, 'Erişim kaldırıldı.');
        }
      } catch (er) { MP.toast(MP.errMsg(er), 'err'); } finally { b.disabled = false; b.classList.remove('busy'); }
    });
  };
})();
