![Kalkülüs](docs/banner.png)

# Kalkülüs

**Kalkülüs**, Türkiye Genel Milletvekili Seçimleri (TBMM — 600 Milletvekili, 81 İl, 87 Seçim Çevresi ve 973 İlçe) için tasarlanmış çok katmanlı, etkileşimli bir seçim projeksiyon ve D'Hondt milletvekili hesaplama aracıdır.

---

## Özellikler

- **Çok Katmanlı Projeksiyon Motoru**
  - **Türkiye Geneli**, **Yurt Dışı & Gümrük**, **81 İl**, **87 Seçim Çevresi** ve **973 İlçe** düzeyinde oy oranı (%), katılım oranı (%) ve seçmen sayısı düzenleme.
  - **Oransal Salınım (PS)** ve **Tekdüze Salınım (UNS)** modelleri.
  - **Hiyerarşik Kilitleme**: Özel olarak düzenlenen ilçe, seçim çevresi veya iller kilitlenir ve ulusal salınımdan etkilenmeden üst toplamları günceller.
- **Kalibre Edilmiş Baz Veri & Coğrafi Vekil (Proxy) Modellemesi**
  - Varsayılan **%90 2023 + %10 2024** karma bazı ile **Sadece 2023** bazı arasında geçiş (mevcut oy girişlerini koruyarak).
  - 2023'te ortak liste nedeniyle boş kalan illerde (örn. Yozgat, Rize) 2024 yerel oranlarıyla otomatik ayrıştırma.
  - Yeni veya 2023'te ayrı listeyle girmeyen partiler (`YENİ`, `A`, `SAADET`) için coğrafi vekil ağırlıklı (non-uniform proxy) dağılım.
  - Ulusal sonuç tablosunda **±2023** milletvekili değişim karşılaştırması.
- **YSK Seçim Matematiği & D'Hondt**
  - Ayarlanabilir **Ulusal Seçim Barajı** (varsayılan `%7,0`).
  - **2022 Sistemi** (parti bazlı D'Hondt) ve **2018 Sistemi** (ittifak havuzlu D'Hondt) modları.
  - Yurt Dışı & Gümrük oylarının 87 seçim çevresine geçerli oy ağırlığına göre dağıtımı.
  - **Ortak Liste / Taktik Oy Simülatörü** ve **Kritik Sandalyeler** (son milletvekilinin el değiştirmesi için gereken oy ve % farkı).
- **Harita, TBMM Diyagramı & Dışa Aktarma**
  - `87 seçim çevresi`, `81 il` ve `973 ilçe` vektör harita katmanları, il bazlı ilçe haritasına yakınlaşma ve harita üzerinde **MV daireleri** görünümü.
  - 5 renklendirme modu: `1. parti`, `1. ittifak`, `Oy farkı`, `Katılım oranı` ve `Değişim`.
  - Tek tıkla **PNG harita** indirme, **JSON senaryo** kaydetme/yükleme ve **87 bölge CSV** çıktısı alma.
  - 600 sandalyeli TBMM oturma düzeni diyagramı (`TİP → BBP` yelpaze sıralaması).

---

## Teknoloji Yığını

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Durum Yönetimi**: Zustand
- **Harita & Geometri**: `d3-geo`, `topojson-client`
- **Test**: Vitest

---

## Yerel Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Testleri çalıştırın
npm test

# Production paketini derleyin
npm run build
```

---

## Yayınlama (GitHub Pages)

Depoda [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) iş akışı hazırdır. **Settings → Pages → Build and deployment → Source** altından **GitHub Actions** seçildiğinde `main` dalına yapılan her `push` sonrasında testler çalışır ve uygulama otomatik olarak yayınlanır.
