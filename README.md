# Loopster

Guitar Pro dosyaları (`.gp5`, `.gp4`, `.gp3`, `.gpx`, `.gp`) için tab çalar ve pratik aracı.
Zor bölümü loop'a al, yavaşlat, metronomla çal, hızı kademeli olarak artır.

> Proje geliştirme aşamasında.

## Kullanım

1. **Guitar Pro dosyası aç** kutusuna tıkla ya da dosyayı sayfanın herhangi bir yerine sürükle.
2. Dosyada birden fazla enstrüman varsa üst çubuktaki **Parça** menüsünden seç.
3. **Çal** ile başlat. Çalınan nota vurgulanır, sayfa kendiliğinden kayar.
4. Başka bir dosyaya geçmek için **Dosya aç** düğmesini kullan.

İlk çalmada ses dosyası (SoundFont, ~1,3 MB) yüklenir. Alt çubukta ilerlemesi görünür.

### Pratik araçları

Ekran düzeni: solda **Notlar**, sağda **Pomodoro** ve **Kayıt** düğmeleri; tıklayınca o kenardan panel açılır.
Tempo, metronom, kademeli hızlanma, loop, parçalar ve transpoze alt çubuktaki **Ayarlar** (P) ile açılan rafta.

- **Tempo:** %25–%150 arası hız. Gerçek BPM hesaplanıp gösterilir; %50 / %75 / %100 hızlı düğmeleri.
- **Görsel metronom:** alt çubukta her vuruşta yanıp sönen ışıklar (ölçünün ilk vuruşu daha parlak). Metronom sesi
  kapalıyken de çalışır; Ayarlar'daki "Görsel vuruş" ile açılıp kapanır.
- **Metronom** ve ses seviyesi. İki ses: **Tok** (güçlü, tahta blok benzeri; varsayılan) ve **Klasik** (alphaTab'ın kendi tıkı). **Giriş sayımı** açıksa Çal'a basınca bir ölçü sayar.
  Tok sesinde bir de **Kayma** ayarı var (±30 ms): tık sana notadan önce ya da sonra geliyorsa buradan hizalarsın,
  çift tıklayınca sıfırlanır. Normalde gerekmez; ses kartına göre değişen küçük farklar içindir.
- **Loop zarfı:** Guitar Pro'daki gibi notanın üzerinde bir kutu, tam ölçü sınırlarında döner. Fareyle ölçülerin
  üzerinden sürükleyerek oluştur, kenarlarındaki tutamaçları çekerek genişlet ya da daralt (tablette parmakla da).
  Bir ölçüye tıklamak imleci oraya götürür.
- **Hazırlık ölçüsü:** loop baştan başlarken bir önceki ölçüden girersin; tur dönüşleri yine loop başına döner.
- **Zorlandım (Z):** hızı bir adım düşürür ve tur sayacını sıfırlar; kademeli hızlanma yeni hızdan tekrar sayar.
- **Kademeli hızlanma:** "Her N turda hızı %X artır, %Y'ye ulaşınca bu hızda devam et." Tur ve anlık hız ekranda görünür.
- **Parçalar:** her enstrümanı susturma, solo ve ses seviyesi (%0–%150, dosyadaki karışıma göre; çift tık %100).
- **Görünüm:** "Sadece tab" nota satırını gizler (davul gibi tabı olmayan partiler notayla kalır); nota büyüklüğü
  %60–%200 arası ayarlanır. İkisi de hatırlanır.
- **Transpoze:** yarım ses adımlarla, sadece ses kayar (tab aynı kalır). Kapo ya da düşük akort için.
- **Çift tıkla açma (sadece masaüstü):** kurulumdan sonra Guitar Pro dosyalarına çift tıklayınca Loopster'da açılır.
  Uygulama zaten açıksa dosya yeni pencere açmadan mevcut pencerede açılır.
- **Egzersiz klasörü (sadece masaüstü):** bir klasör seçersin, içindeki tüm Guitar Pro dosyaları sol raftaki
  **Kütüphane** panelinde alt klasörlerine göre gruplanmış olarak listelenir; tek tıkla açılır, arama kutusu vardır.
  Seçtiğin klasör hatırlanır, uygulamayı kapatıp açınca yine oradadır.
- **Parça hafızası:** her parça kendi temposunu ve loop'unu hatırlar. Dosyayı tekrar açtığında kaldığın hızda ve
  aynı loop'la gelir; hiç çalışılmamış bir parça %100 ve loop'suz başlar. Notlar gibi dosya içeriğine göre saklanır,
  dosyanın adı değişse de kaybolmaz.
- **Notlar:** her parça için genel bir not ve loop aralıklarına bağlı notlar (ör. "33–40: 3. parmak kayıyor").
  Bir loop notuna tıklayınca o loop açılır. Notlar tarayıcıda, dosya içeriğine göre saklanır; dosyanın adı değişse de kaybolmaz.
- **Ses kaydı:** mikrofonla kendi çalışını kaydet (kırmızı düğme ya da R). Kayıtlar parça bazında tarih, tempo ve loop
  bilgisiyle listelenir; dinle, indir ya da sil. İstersen kayıt başlayınca tab da çalar.
  Masaüstü sürümünde kayıtlar `Belgeler/Loopster Kayıtları` klasörüne normal ses dosyası olarak yazılır (yanında tempo,
  loop ve zamanlama bilgisini tutan bir `.json` ile); "Klasörde göster" ile dosyaya gidersin, silinenler geri dönüşüm
  kutusuna gider. Tarayıcı sürümünde kayıtlar tarayıcıda (IndexedDB) tutulur.
- **Tab ile birlikte dinleme:** tab çalarken yaptığın kayıtlar, kayıttaki tempo, loop ve hız değişimleriyle tab'ın sesiyle
  aynı anda çalınır; "Kayıt ↔ Tab" dengesiyle hangisini daha çok duyacağını, "Kaydır" ile mikrofon gecikmesini ayarlarsın.
- **Pomodoro:** odak / mola sayacı (varsayılan 25 / 5 dk). Odak bitince çalma durur, zil çalar ve mola başlar.
  Alt çubuktaki sayaca tıklayarak başlat / duraklat; süreler Ayarlar panelinde.

### Klavye kısayolları

| Tuş | İşlev |
| --- | --- |
| Boşluk | Çal / duraklat |
| Esc | Durdur |
| ← / → | Bir ölçü geri / ileri |
| L | Loop aç / kapa |
| Z | Zorlandım: hızı bir adım düşür, tur sayacını sıfırla |
| M | Metronom aç / kapa |
| − / + | Hızı %5 azalt / artır |
| R | Kayda başla / durdur |
| P | Alttaki ayarları aç / kapa |
| ? | Kısayol listesi |

## Geliştirme

Gereksinim: Node.js 20.19 veya üzeri.

```bash
npm install
npm run dev
```

Production build'i denemek için:

```bash
npm run build
npm run preview
```

## Masaüstü uygulaması

Aynı koddan hem tarayıcı sürümü hem de Electron tabanlı bir masaüstü uygulaması çıkar. Masaüstü sürümünde
egzersiz klasörü kütüphanesi vardır, mikrofon izni her açılışta tekrar sorulmaz ve pencere kendi başınadır.

```bash
npm run desktop
```

Geliştirirken, ayrı bir terminalde `npm run dev` çalışırken:

```bash
npm run desktop:dev
```

Windows kurulum dosyası üretmek için (çıktı `release/` klasörüne yazılır):

```bash
npm run desktop:build
```

## Teknolojiler

- [alphaTab](https://alphatab.net): Guitar Pro dosyalarını okuma, nota/tab gösterimi ve MIDI çalma
- React, TypeScript, Vite, Tailwind CSS
- Electron (masaüstü sürümü)

## Lisans

MIT. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
alphaTab, MPL-2.0 lisansıyla dağıtılmaktadır.
