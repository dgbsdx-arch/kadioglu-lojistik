/* =========================================================================
   Muhasebe Paneli — YAPILANDIRMA (tek dosya)
   Supabase panelinde: Project Settings → API (veya "API Keys") bölümünden
   Project URL ve anon / publishable (public) anahtarı buraya yapıştırın.
   Bu anahtar herkese açık olacak şekilde tasarlanmıştır; veriler veritabanındaki
   Row Level Security kurallarıyla korunur. service_role / secret anahtarı
   ASLA buraya yazmayın.
   ========================================================================= */
window.PANEL_CONFIG = {
  SUPABASE_URL: 'https://xxzclphdvdrmpvwofmcu.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_0lBUiUfauYPZuRAYtdNldA_h3RX3fbw',

  FIRMA_ADI: 'KADIOĞLU LOJİSTİK DANIŞ. ORGANİZASYON SAN. VE TİC. LTD. ŞTİ.',
  FIRMA_KISA: 'Kadıoğlu Lojistik',
  // Yazdırılan belgelerin (cari ekstre, tahsilat makbuzu) antet bilgileri
  FIRMA_ADRES: '5. Organize Sanayi Bölgesi Göksuncuk Mevkii 83528 Cadde No. 17 Şehitkamil/GAZİANTEP',
  FIRMA_VERGI: 'Şehitkamil V.D. 486 113 1029',
  FIRMA_EPOSTA: 'info@kadioglulojistik.com',

  // Bu kadar dakika işlem yapılmazsa oturum otomatik kapanır (0 = kapalı)
  OTURUM_ZAMAN_ASIMI_DK: 30
};
