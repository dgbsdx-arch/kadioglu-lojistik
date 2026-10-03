/* KADIOĞLU LOJİSTİK — Muhasebe Paneli · çekirdek yardımcılar */
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
})('9579c68a0b7c', 'core');
(function () {
  'use strict';
  const MP = (window.MP = {});
  const cfg = (MP.cfg = window.PANEL_CONFIG || {});

  MP.configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    /^https:\/\//.test(cfg.SUPABASE_URL) &&
    !/BURAYA/i.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY));

  MP.sb = null;
  if (MP.configured && window.supabase && window.supabase.createClient) {
    MP.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  MP.state = { session: null, profile: null, musteriler: [], tedarikciler: [], araclar: [], filters: {} };

  /* ---------- Etiketler ---------- */
  MP.L = {
    rol: { yonetici: 'Yönetici', mudur: 'Müdür', muhasebe: 'Muhasebe' },
    durum: { taslak: 'Taslak', kesildi: 'Kesildi', kismi_odendi: 'Kısmi ödendi', odendi: 'Ödendi', iptal: 'İptal' },
    yontem: { nakit: 'Nakit', havale: 'Havale', eft: 'EFT', cek: 'Çek', senet: 'Senet', kart: 'Kredi kartı' },
    kategori: {
      yakit: 'Yakıt', otoyol_kopru: 'Otoyol / köprü', bakim_onarim: 'Bakım-onarım',
      sofor_maas_harcirah: 'Şoför maaşı / harcırah', sigorta: 'Sigorta', vergi_sgk: 'Vergi / SGK',
      kira: 'Kira', gumruk: 'Gümrük masrafı', tasima_taseron: 'Taşıma taşeron', ofis: 'Ofis', diger: 'Diğer'
    },
    // Gelen (alış) fatura kategorileri
    gkategori: {
      yakit: 'Yakıt', tamir_bakim: 'Tamir-bakım', lastik: 'Lastik', kopru_otoyol: 'Köprü / otoyol', sigorta: 'Sigorta',
      kira: 'Kira', personel: 'Personel', vergi: 'Vergi', diger: 'Diğer'
    },
    gdurum: { odenmedi: 'Ödenmedi', kismi: 'Kısmi ödendi', odendi: 'Ödendi', iptal: 'İptal' },
    belge: { muayene: 'Muayene', sigorta: 'Trafik sigortası', kasko: 'Kasko' },
    pb: { TRY: '₺', USD: '$', EUR: '€' },
    aylar: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    aylarKisa: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  };

  /* ---------- Biçimlendirme (tr-TR) ---------- */
  const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  const nf4 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  MP.n = (v) => Number(v) || 0;
  const z = (v) => { const n = MP.n(v); return Math.abs(n) < 0.005 ? 0 : n; }; // "-0,00" görünmesin
  MP.num = (v) => nf2.format(z(v));
  MP.int = (v) => nf0.format(MP.n(v));
  MP.rate = (v) => nf4.format(MP.n(v));
  MP.money = (v, pb) => nf2.format(z(v)) + ' ' + (MP.L.pb[pb || 'TRY'] || pb);
  MP.pct = (v) => '%' + nf0.format(MP.n(v));
  MP.date = (iso) => {
    if (!iso) return '';
    const s = String(iso).slice(0, 10).split('-');
    return s.length === 3 ? s[2] + '.' + s[1] + '.' + s[0] : String(iso);
  };
  MP.dateTime = (ts) => ts ? new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  MP.iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  MP.today = () => MP.iso(new Date());
  MP.monthStart = (offset) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + (offset || 0)); return MP.iso(d); };
  MP.monthEnd = (offset) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + (offset || 0) + 1); d.setDate(0); return MP.iso(d); };
  MP.monthLabel = (iso, short) => { const [y, m] = String(iso).split('-'); return (short ? MP.L.aylarKisa : MP.L.aylar)[+m - 1] + ' ' + (short ? y.slice(2) : y); };
  MP.daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

  /** Türkçe sayı girişi: "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "1.500" → 1500 */
  MP.parseNum = (s) => {
    if (s === null || s === undefined) return NaN;
    let t = String(s).trim().replace(/\s|₺|TL|\$|€/gi, '');
    if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };

  MP.esc = (v) => String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  MP.trLower = (s) => String(s || '').toLocaleLowerCase('tr-TR');
  MP.cmpTr = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr-TR');
  MP.initials = (name) => (String(name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('') || '?').toLocaleUpperCase('tr-TR');
  MP.$ = (sel, root) => (root || document).querySelector(sel);
  MP.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  MP.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 250); }; };
  MP.sum = (rows, f) => rows.reduce((a, r) => a + MP.n(typeof f === 'function' ? f(r) : r[f]), 0);

  /* ---------- Yetkiler ---------- */
  MP.role = () => (MP.state.profile && MP.state.profile.rol) || null;
  MP.can = {
    write: () => ['yonetici', 'muhasebe'].includes(MP.role()),
    del: () => MP.role() === 'yonetici',
    admin: () => MP.role() === 'yonetici',
    audit: () => ['yonetici', 'mudur'].includes(MP.role())
  };

  /* ---------- Hata mesajları ---------- */
  MP.errMsg = (e) => {
    const m = (e && (e.message || e.error_description)) || String(e || 'Bilinmeyen hata');
    const code = e && e.code;
    if (/Invalid login credentials/i.test(m)) return 'E-posta veya şifre hatalı.';
    if (/Email not confirmed/i.test(m)) return 'E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.';
    if (/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.';
    if (/JWT expired|session.*(missing|expired)/i.test(m)) return 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.';
    if (/should be different from the old/i.test(m)) return 'Yeni şifre eskisinden farklı olmalıdır.';
    if (/Password should (be at least|contain)/i.test(m)) return 'Şifre yeterince güçlü değil: en az 8 karakter, büyük/küçük harf ve rakam kullanın.';
    if (/pwned|leaked|compromised|weak password/i.test(m)) return 'Bu şifre daha önce sızdırılmış şifre listelerinde yer alıyor. Lütfen farklı bir şifre seçin.';
    if (/Signups not allowed/i.test(m)) return 'Yeni kayıt şu anda kapalı. Yöneticinizle iletişime geçin.';
    if (code === '23505') return 'Bu kayıt zaten mevcut (ör. aynı fatura numarası daha önce girilmiş).';
    if (code === '23503') return 'Bu kayda bağlı başka kayıtlar var (ör. faturası veya tahsilatı olan kayıt). Önce bağlı kayıtları silin.';
    if (code === '42501' || /row-level security|permission denied/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    if (code === '23514') return 'Girilen değerlerden biri geçersiz. (' + m + ')';
    if (code === '22P02' || code === '22003') return 'Geçersiz sayı veya tarih girdiniz.';
    return m;
  };

  /* ---------- Veri erişimi ---------- */
  MP.q = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };
  /** 1000 satır sınırını aşmak için sayfalı okuma. build() her çağrıda yeni sorgu döndürmeli. */
  MP.fetchAll = async (build) => {
    const size = 1000;
    let out = [];
    for (let from = 0; ; from += size) {
      const { data, error } = await build().range(from, from + size - 1);
      if (error) throw error;
      out = out.concat(data || []);
      if (!data || data.length < size) break;
    }
    return out;
  };
  MP.loadMusteriler = async () => {
    const rows = await MP.fetchAll(() => MP.sb.from('musteriler').select('*').order('firma'));
    rows.sort((a, b) => MP.cmpTr(a.firma, b.firma));
    MP.state.musteriler = rows;
    return rows;
  };
  MP.musteriAdi = (id) => { const m = MP.state.musteriler.find((x) => x.id === id); return m ? m.firma : '—'; };
  MP.loadTedarikciler = async () => {
    const rows = await MP.fetchAll(() => MP.sb.from('tedarikciler').select('*').order('unvan'));
    rows.sort((a, b) => MP.cmpTr(a.unvan, b.unvan));
    MP.state.tedarikciler = rows;
    return rows;
  };
  MP.loadAraclar = async () => {
    const rows = await MP.fetchAll(() => MP.sb.from('araclar').select('*').order('plaka'));
    rows.sort((a, b) => MP.cmpTr(a.plaka, b.plaka));
    MP.state.araclar = rows;
    return rows;
  };
  /** Giderler + gelen faturaları ortak rapor gruplarında birleştirir */
  MP.grupKategori = (kaynak, k) => (kaynak === 'gider' ? ({ bakim_onarim: 'tamir_bakim', otoyol_kopru: 'kopru_otoyol', sofor_maas_harcirah: 'personel', vergi_sgk: 'vergi' })[k] : null) || k;
  MP.grupAdi = (g) => ({ personel: 'Personel / şoför', vergi: 'Vergi / SGK' })[g] || MP.L.gkategori[g] || MP.L.kategori[g] || g;

  /* ---------- Tarih aralığı ---------- */
  MP.presets = {
    bu_ay: ['Bu ay', () => [MP.monthStart(0), MP.monthEnd(0)]],
    gecen_ay: ['Geçen ay', () => [MP.monthStart(-1), MP.monthEnd(-1)]],
    son_3_ay: ['Son 3 ay', () => [MP.monthStart(-2), MP.monthEnd(0)]],
    bu_yil: ['Bu yıl', () => { const y = new Date().getFullYear(); return [y + '-01-01', y + '-12-31']; }],
    gecen_yil: ['Geçen yıl', () => { const y = new Date().getFullYear() - 1; return [y + '-01-01', y + '-12-31']; }],
    tumu: ['Tüm zamanlar', () => ['', '']],
    ozel: ['Özel aralık', null]
  };
  MP.applyPreset = (f) => {
    const p = MP.presets[f.preset];
    if (p && p[1]) { const [a, b] = p[1](); f.from = a; f.to = b; }
  };
  MP.rangeHtml = (f) => `
    <label class="fld"><span>Dönem</span><select name="preset">
      ${Object.entries(MP.presets).map(([k, v]) => `<option value="${k}"${f.preset === k ? ' selected' : ''}>${v[0]}</option>`).join('')}
    </select></label>
    <label class="fld"><span>Başlangıç</span><input type="date" name="from" value="${MP.esc(f.from || '')}"></label>
    <label class="fld"><span>Bitiş</span><input type="date" name="to" value="${MP.esc(f.to || '')}"></label>`;

  /* ---------- Bildirim ---------- */
  MP.toast = (msg, type) => {
    const box = MP.$('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), type === 'err' ? 6000 : 3200);
  };

  /* ---------- Diyaloglar ---------- */
  MP.confirm = (message, opts) => new Promise((resolve) => {
    opts = opts || {};
    const dlg = MP.$('#dlg-confirm');
    dlg.innerHTML = `<form method="dialog">
      <div class="dlg-head"><h2>${MP.esc(opts.title || 'Emin misiniz?')}</h2></div>
      <div class="dlg-body"><p style="margin:0">${MP.esc(message)}</p></div>
      <div class="dlg-foot"><button class="btn" value="no">Vazgeç</button>
      <button class="btn ${opts.danger === false ? 'btn-primary' : 'btn-danger'}" value="yes">${MP.esc(opts.ok || 'Sil')}</button></div></form>`;
    dlg.onclose = () => resolve(dlg.returnValue === 'yes');
    dlg.returnValue = '';
    dlg.showModal();
  });

  /**
   * Form diyaloğu. body: form alanları HTML'i. onSubmit(fd, form) async → true dönerse kapanır.
   */
  MP.formDialog = (opts) => {
    const dlg = MP.$('#dlg');
    dlg.innerHTML = `<form novalidate>
      <div class="dlg-head"><h2>${MP.esc(opts.title)}</h2><button type="button" class="dlg-x" aria-label="Kapat">×</button></div>
      <div class="dlg-body"><div class="form-grid">${opts.body}</div><div class="form-msg" role="alert" style="margin-top:12px"></div></div>
      <div class="dlg-foot"><button type="button" class="btn" data-cancel>Vazgeç</button>
        <button type="submit" class="btn btn-primary">${MP.esc(opts.submit || 'Kaydet')}</button></div></form>`;
    const form = dlg.querySelector('form');
    const msg = form.querySelector('.form-msg');
    const close = () => dlg.close();
    form.querySelector('.dlg-x').onclick = close;
    form.querySelector('[data-cancel]').onclick = close;
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      msg.textContent = '';
      MP.$$('.invalid', form).forEach((x) => x.classList.remove('invalid'));
      const bad = MP.$$('[required]', form).filter((x) => !String(x.value).trim());
      if (bad.length) { bad.forEach((x) => x.classList.add('invalid')); msg.textContent = 'Lütfen zorunlu alanları doldurun.'; bad[0].focus(); return; }
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true; btn.classList.add('busy');
      try {
        const done = await opts.onSubmit(form);
        if (done !== false) close();
      } catch (e) {
        msg.textContent = MP.errMsg(e);
      } finally { btn.disabled = false; btn.classList.remove('busy'); }
    };
    dlg.showModal();
    if (opts.onOpen) opts.onOpen(form);
    const first = form.querySelector('input:not([type=hidden]):not([readonly]),select,textarea');
    if (first) first.focus();
    return form;
  };

  /* ---------- Form alanı üreticileri ---------- */
  const attrs = (o) => (o.required ? ' required' : '') + (o.placeholder ? ` placeholder="${MP.esc(o.placeholder)}"` : '') + (o.readonly ? ' readonly' : '') + (o.extra || '');
  const lbl = (label, o) => `<span>${MP.esc(label)}${o.required ? ' <i class="req">*</i>' : ''}</span>`;
  MP.F = {
    text: (name, label, val, o = {}) => `<label class="fld${o.full ? ' full' : ''}">${lbl(label, o)}<input type="${o.type || 'text'}" name="${name}" value="${MP.esc(val == null ? '' : val)}"${attrs(o)}${o.max ? ` maxlength="${o.max}"` : ''}></label>`,
    money: (name, label, val, o = {}) => `<label class="fld${o.full ? ' full' : ''}">${lbl(label, o)}<input type="text" inputmode="decimal" name="${name}" value="${MP.esc(val == null || val === '' ? '' : MP.num(val))}"${attrs(o)} data-num></label>`,
    date: (name, label, val, o = {}) => `<label class="fld${o.full ? ' full' : ''}">${lbl(label, o)}<input type="date" name="${name}" value="${MP.esc(val || '')}"${attrs(o)}></label>`,
    select: (name, label, options, val, o = {}) => `<label class="fld${o.full ? ' full' : ''}">${lbl(label, o)}<select name="${name}"${attrs(o)}>${o.empty !== undefined ? `<option value="">${MP.esc(o.empty)}</option>` : ''}${options.map(([v, t]) => `<option value="${MP.esc(v)}"${String(v) === String(val == null ? '' : val) ? ' selected' : ''}>${MP.esc(t)}</option>`).join('')}</select></label>`,
    area: (name, label, val, o = {}) => `<label class="fld full">${lbl(label, o)}<textarea name="${name}" rows="${o.rows || 2}"${attrs(o)}>${MP.esc(val || '')}</textarea></label>`,
    check: (name, label, checked) => `<label class="chk full"><input type="checkbox" name="${name}"${checked ? ' checked' : ''}> ${MP.esc(label)}</label>`
  };
  MP.formVal = (form, name) => { const el = form.elements[name]; if (!el) return undefined; if (el.type === 'checkbox') return el.checked; const v = String(el.value).trim(); return v === '' ? null : v; };
  MP.formNum = (form, name, label, opts = {}) => {
    const raw = MP.formVal(form, name);
    if (raw === null) { if (opts.required) throw new Error(label + ' zorunludur.'); return opts.def !== undefined ? opts.def : null; }
    const n = MP.parseNum(raw);
    if (!Number.isFinite(n)) { form.elements[name].classList.add('invalid'); throw new Error(label + ' geçerli bir sayı olmalıdır (ör. 1.234,56).'); }
    if (opts.min !== undefined && n < opts.min) { form.elements[name].classList.add('invalid'); throw new Error(label + ' en az ' + MP.num(opts.min) + ' olmalıdır.'); }
    return Math.round(n * 10000) / 10000;
  };

  /* ---------- Tablo ---------- */
  /**
   * cols: [{h, v(r), t:'money'|'try'|'num'|'date'|'text'|'int'|'rate', pb(r), html(r), cls, x:false (dışa aktarma), xh}]
   */
  MP.cellText = (c, r) => {
    const v = c.v ? c.v(r) : '';
    switch (c.t) {
      case 'money': return MP.money(v, c.pb ? c.pb(r) : 'TRY');
      case 'try': return MP.money(v, 'TRY');
      case 'num': return MP.num(v);
      case 'int': return MP.int(v);
      case 'rate': return MP.rate(v);
      case 'date': return MP.date(v);
      default: return v == null ? '' : String(v);
    }
  };
  MP.isNumCol = (c) => ['money', 'try', 'num', 'int', 'rate'].includes(c.t);
  MP.tableHtml = (cols, rows, opts = {}) => {
    const vis = cols.filter((c) => c.show !== false);
    if (!rows.length) return `<div class="empty"><b>${MP.esc(opts.emptyTitle || 'Kayıt bulunamadı')}</b>${MP.esc(opts.empty || 'Filtreleri değiştirerek tekrar deneyin.')}</div>`;
    const head = vis.map((c) => `<th class="${MP.isNumCol(c) ? 'num' : ''}">${MP.esc(c.h)}</th>`).join('') + (opts.actions ? '<th class="actions"><span class="sr">İşlem</span></th>' : '');
    const body = rows.map((r, i) => `<tr data-i="${i}"${opts.rowClass ? ` class="${opts.rowClass(r) || ''}"` : ''}>` + vis.map((c) => {
      const cls = [MP.isNumCol(c) ? 'num' : '', c.cls || ''].join(' ').trim();
      const inner = c.html ? c.html(r) : MP.esc(MP.cellText(c, r));
      return `<td data-label="${MP.esc(c.h)}"${cls ? ` class="${cls}"` : ''}>${inner}</td>`;
    }).join('') + (opts.actions ? `<td class="actions">${opts.actions(r)}</td>` : '') + '</tr>').join('');
    const foot = opts.footer ? `<tfoot><tr>${vis.map((c, i) => {
      const f = opts.footer(c, i);
      return `<td data-label="${f ? MP.esc(c.h) : ''}" class="${MP.isNumCol(c) ? 'num' : ''}">${f || ''}</td>`;
    }).join('')}${opts.actions ? '<td></td>' : ''}</tr></tfoot>` : '';
    return `<table class="tbl cards"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
  };

  /* ---------- Dışa aktarma (Excel / CSV) ---------- */
  MP.loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.dataset.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(src + ' yüklenemedi'));
    document.head.appendChild(s);
  });
  const fileStamp = () => MP.today();
  const safeName = (s) => String(s).toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  MP.download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  /** cols: tablo kolonları (x !== false olanlar), rows, extraRows: [[...]] (ör. toplam satırı) */
  MP.exportRows = async (fmt, baseName, cols, rows, opts = {}) => {
    const ex = cols.filter((c) => c.x !== false && (c.v || c.xv));
    const val = (c, r) => (c.xv ? c.xv(r) : c.v(r));
    const name = safeName(baseName) + '_' + fileStamp();
    if (!rows.length) { MP.toast('Dışa aktarılacak kayıt yok.'); return; }
    if (fmt === 'csv') {
      const q = (s) => { s = s == null ? '' : String(s); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const fmtCell = (c, v) => {
        if (v == null || v === '') return '';
        if (MP.isNumCol(c)) return MP.n(v).toFixed(c.t === 'int' ? 0 : (c.t === 'rate' ? 4 : 2)).replace('.', ',');
        if (c.t === 'date') return MP.date(v);
        return v;
      };
      const lines = [ex.map((c) => q(c.xh || c.h)).join(';')];
      rows.forEach((r) => lines.push(ex.map((c) => q(fmtCell(c, val(c, r)))).join(';')));
      (opts.extra || []).forEach((arr) => lines.push(arr.map((v) => q(typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v)).join(';')));
      MP.download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), name + '.csv');
      return;
    }
    await MP.loadScript('assets/vendor/xlsx.mini.min.js');
    const XLSX = window.XLSX;
    const serial = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000; };
    const aoa = [ex.map((c) => c.xh || c.h)];
    rows.forEach((r) => aoa.push(ex.map((c) => {
      const v = val(c, r);
      if (v == null || v === '') return null;
      if (MP.isNumCol(c)) return { t: 'n', v: MP.n(v), z: c.t === 'int' ? '#,##0' : (c.t === 'rate' ? '#,##0.0000' : '#,##0.00') };
      if (c.t === 'date') return { t: 'n', v: serial(v), z: 'dd.mm.yyyy' };
      return { t: 's', v: String(v) };
    })));
    (opts.extra || []).forEach((arr) => aoa.push(arr.map((v) => (typeof v === 'number' ? { t: 'n', v, z: '#,##0.00' } : v))));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = ex.map((c) => ({ wch: Math.min(48, Math.max(10, String(c.xh || c.h).length + 2, ...rows.slice(0, 200).map((r) => String(MP.cellText(c, r) || '').length + 1))) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: ex.length - 1 } }) };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, String(opts.sheet || baseName).slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    wb.Props = { Title: baseName, Company: cfg.FIRMA_ADI || 'Kadıoğlu Lojistik' };
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    MP.download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name + '.xlsx');
  };
  MP.exportButtons = () => `<div class="exports no-print">
    <button class="btn btn-sm" type="button" data-exp="xlsx" title="Excel (.xlsx) olarak indir"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>Excel</button>
    <button class="btn btn-sm" type="button" data-exp="csv" title="CSV (UTF-8, noktalı virgül) olarak indir"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>CSV</button></div>`;

  /* ---------- Tutarı yazıyla (makbuz için) ---------- */
  MP.yaziyla = (n, pb) => {
    const bir = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
    const on = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
    const big = ['', 'bin', 'milyon', 'milyar', 'trilyon'];
    const uc = (x) => { const y = Math.floor(x / 100), o = Math.floor((x % 100) / 10), b = x % 10; return [y ? (y > 1 ? bir[y] + ' ' : '') + 'yüz' : '', on[o], bir[b]].filter(Boolean).join(' '); };
    const tam = (x) => {
      if (!x) return 'sıfır';
      const parts = [];
      for (let i = 0; x > 0; i++, x = Math.floor(x / 1000)) {
        const g = x % 1000;
        if (g) parts.unshift(((i === 1 && g === 1) ? '' : uc(g) + ' ') + big[i]);
      }
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };
    const v = Math.round(Math.abs(MP.n(n)) * 100), ana = Math.floor(v / 100), kr = v % 100;
    const u = ({ TRY: ['Türk lirası', 'kuruş'], USD: ['ABD doları', 'sent'], EUR: ['avro', 'sent'] })[pb || 'TRY'] || [pb, ''];
    return 'Yalnız ' + tam(ana) + ' ' + u[0] + (kr ? ' ' + tam(kr) + ' ' + u[1] : '');
  };

  /* ---------- Yazdırma (A4, antetli) ---------- */
  MP.firma = () => ({
    ad: cfg.FIRMA_ADI || 'KADIOĞLU LOJİSTİK DANIŞ. ORGANİZASYON SAN. VE TİC. LTD. ŞTİ.',
    adres: cfg.FIRMA_ADRES || '5. Organize Sanayi Bölgesi Göksuncuk Mevkii 83528 Cadde No. 17 Şehitkamil/GAZİANTEP',
    vd: cfg.FIRMA_VERGI || 'Şehitkamil V.D. 486 113 1029',
    eposta: cfg.FIRMA_EPOSTA || 'info@kadioglulojistik.com'
  });
  MP.letterhead = (title, meta) => {
    const f = MP.firma();
    return `<header class="doc-head">
      <img class="doc-logo" src="assets/img/logo-belge.png" alt="Kadıoğlu Lojistik">
      <div class="doc-firma"><b>${MP.esc(f.ad)}</b><span>${MP.esc(f.adres)}</span><span>${MP.esc(f.vd)} · ${MP.esc(f.eposta)}</span></div>
      <div class="doc-title"><h1>${MP.esc(title)}</h1>${meta || ''}</div>
    </header>`;
  };
  /** html: belge gövdesi. Yazdırma penceresi açılır; kullanıcı "PDF olarak kaydet" seçebilir. */
  MP.printDoc = (title, html) => {
    const root = document.getElementById('print-root');
    root.innerHTML = html;
    const prev = document.title;
    document.title = title;                       // PDF dosya adı önerisi
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; document.title = prev; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    const imgs = Array.from(root.querySelectorAll('img')).filter((i) => !i.complete);
    Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 60));
  };

  /* ---------- Grafik varsayılanları ---------- */
  MP.charts = {};
  MP.chart = (id, config) => {
    if (MP.charts[id]) { MP.charts[id].destroy(); delete MP.charts[id]; }
    const el = document.getElementById(id);
    if (!el || !window.Chart) return null;
    const C = window.Chart;
    C.defaults.font.family = getComputedStyle(document.body).fontFamily;
    C.defaults.color = '#667085';
    C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.tooltip.callbacks = C.defaults.plugins.tooltip.callbacks || {};
    MP.charts[id] = new C(el, config);
    return MP.charts[id];
  };
  MP.destroyCharts = () => { Object.keys(MP.charts).forEach((k) => { MP.charts[k].destroy(); delete MP.charts[k]; }); };
  MP.colors = { blue: '#1a6fd1', navy: '#0b2545', gray: '#8a94a6', ok: '#16a34a', bad: '#dc2626',
    palette: ['#1a6fd1', '#0b2545', '#7cc0ff', '#555555', '#16a34a', '#d97706', '#0f3460', '#98a2b3', '#dc2626', '#104a8e', '#c4cdd8'] };
  MP.shortMoney = (v) => { const a = Math.abs(v); if (a >= 1e6) return (v / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Mn ₺'; if (a >= 1e3) return (v / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' B ₺'; return MP.int(v) + ' ₺'; };
})();
