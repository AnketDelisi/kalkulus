# KALKÜLÜS — Türkiye Seçim Projeksiyon & Milletvekili Hesaplayıcı (8-Bit Edition)

**Kalkülüs**, Türkiye Genel Milletvekili Seçimleri (TBMM — 600 Milletvekili, 81 İl, 87 Seçim Çevresi ve 973 İlçe) için tasarlanmış çok katmanlı, etkileşimli bir seçim simülatörü ve D'Hondt milletvekili dağılım hesaplayıcısıdır.

## Öne Çıkan Özellikler

- **Çok Katmanlı (Multi-Layer) Hesaplama Motoru**:
  - **Türkiye Geneli**, **Yurt Dışı & Gümrük**, **81 İl**, **87 Seçim Çevresi** ve **973 İlçe** bazında oy oranı (%), katılım oranı (%) ve seçmen sayısı girişleri.
  - **Oransal Swing (Proportional Swing)** ve **Tekdüze Swing (Uniform Swing / UNS)** modları arasında anlık geçiş.
  - **Hiyerarşik Kilitleme (Lock & Bubble-up)**: Bir ilçeyi veya ili düzenlediğinizde otomatik olarak kilitlenir (`🔒`) ve ulusal dalgalanmalardan (swing) korunurken üst toplamları günceller.
- **Tam YSK Seçim Matematiği & D'Hondt Simülasyonu**:
  - Ayarlanabilir **Ulusal Seçim Barajı** (Varsayılan `%7.0`).
  - **2022 Seçim Kanunu** (İttifak içi müstakil parti D'Hondt) ve **2018 Seçim Kanunu** (İttifak havuzlu D'Hondt) modları.
  - **Yurt Dışı ve Gümrük Oyları**: YSK 2839 sayılı kanun uyarınca 87 seçim çevresine geçerli oy ağırlığına göre oransal dağıtım.
  - **Ortak Aday Listesi / Taktik Oy Simülatörü**: Seçili bölgelerde veya küçük seçim çevrelerinde bir partinin başka bir parti listesi altında seçime girmesini ve kontenjan vekil transferini simüle eder.
- **Kritik Sandalyeler (Son MV Analizi)**:
  - 87 seçim çevresinin tamamında son milletvekilini kazanan partiyi, en yakın rakibini ve son sandalyenin el değiştirmesi için gereken tam oy sayısını (`+Δ Oy` ve `%`) hesaplar.
- **İnteraktif Harita & 600 Sandalyeli TBMM Hemicycle**:
  - **81 İl**, **87 Seçim Çevresi** (İstanbul 1-2-3, Ankara 1-2-3, İzmir 1-2, Bursa 1-2 ayrımlı) ve **973 İlçe** harita katmanları + il bazında ilçelere yakınlaşma (Drill-down).
  - **Renk Modları**: 1. Parti, 1. İttifak, Oy Farkı (Marj), Katılım Oranı ve Değişim (Swing).
  - **301 Salt Çoğunluk**, **360 Referandum** ve **400 Anayasa Değişikliği** çoğunluk takipçisi.

---

## Yerel Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Seçim motoru birim testlerini çalıştırın
npm test

# Production (GitHub Pages) paketini derleyin
npm run build
```

---

## GitHub Pages ile Yayınlama (Deployment)

Projede [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) dosyası hazır olarak yapılandırılmıştır:
1. Projeyi GitHub deponuza (`main` veya `master` dalına) yükleyin.
2. GitHub deponuzda **Settings → Pages → Build and deployment → Source** kısmından **GitHub Actions** seçeneğini işaretleyin.
3. Her `git push` işleminde testler otomatik çalışacak ve uygulama GitHub Pages adresinizde yayınlanacaktır.
