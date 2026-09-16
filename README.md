<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="">
</p>

<h1 align="center">Loopster</h1>

<p align="center">
  Guitar Pro dosyaları (<code>.gp5</code>, <code>.gp4</code>, <code>.gp3</code>, <code>.gpx</code>, <code>.gp</code>) için tab çalar ve pratik aracı.<br>
  Zor bölümü loop'a al, yavaşlat, metronomla çal, hızı kademeli olarak artır.
</p>

<p align="center">
  <a href="https://github.com/ErdemTortop/Loopster/releases/latest/download/Loopster-Setup.exe"><b>Windows için indir</b></a>
  &nbsp;·&nbsp;
  <a href="https://erdemtortop.github.io/Loopster/"><b>Tarayıcıda dene</b></a>
</p>

![Loopster: 3–6. ölçüler loop'ta, %75 tempoda çalışılan bir egzersiz](docs/screenshot.png)

## Kurulum

1. [Loopster-Setup.exe](https://github.com/ErdemTortop/Loopster/releases/latest/download/Loopster-Setup.exe) dosyasını
   indir ve çalıştır. Bağlantı her zaman en son sürümü indirir; önceki sürümler ve değişiklikler
   [Sürümler](https://github.com/ErdemTortop/Loopster/releases) sayfasında.
2. Kurulum dosyası imzalı olmadığı için Windows SmartScreen uyarı gösterebilir: **Daha fazla bilgi → Yine de çalıştır**.
3. Kurulum `.gp`, `.gp3`, `.gp4`, `.gp5` ve `.gpx` dosyalarını Loopster'a bağlar; dosyaya çift tıklamak yeterli.

**Tarayıcı sürümü** kurulum gerektirmez ve denemek içindir. Egzersiz klasörü, çift tıkla açma ve kayıtların diske
yazılması yalnızca masaüstü uygulamasında var.

## Kullanım

1. **Guitar Pro dosyası aç** kutusuna tıkla ya da dosyayı pencerenin herhangi bir yerine sürükle.
2. Dosyada birden fazla enstrüman varsa üst çubuktaki **Parça** menüsünden seç.
3. **Çal** ile başlat. Çalınan nota vurgulanır, sayfa kendiliğinden kayar.
4. Zor bölümün ölçülerinin üzerinden fareyle sürükle: loop zarfı oluşur, çalma o aralıkta döner.

İlk çalmada ses dosyası (SoundFont, ~1,3 MB) yüklenir; alt çubukta ilerlemesi görünür.

Ekran düzeni: solda **Kütüphane** (masaüstü) ve **Notlar**, sağda **Pomodoro** ve **Kayıt**; tıklayınca o kenardan
panel açılır. Tempo, metronom, kademeli hızlanma, parçalar ve transpoze alt çubuktaki **Ayarlar** (P) rafında.

### Pratik araçları

- **Loop zarfı:** Guitar Pro'daki gibi notanın üzerinde bir kutu, tam ölçü sınırlarında döner. Fareyle ölçülerin
  üzerinden sürükleyerek oluştur, kenarlarındaki tutamaçlarla genişlet ya da daralt (tablette parmakla da).
  Bir ölçüye tıklamak imleci oraya götürür.
- **Tempo:** %25–%150 arası hız. Gerçek BPM hesaplanıp gösterilir; %50 / %75 / %100 hızlı düğmeleri.
- **Kademeli hızlanma:** "Her N turda hızı %X artır, %Y'ye ulaşınca bu hızda devam et." Tur ve anlık hız ekranda görünür.
- **Hazırlık ölçüsü:** loop baştan başlarken bir önceki ölçüden girersin; tur dönüşleri yine loop başına döner.
- **Zorlandım (Z):** hızı bir adım düşürür ve tur sayacını sıfırlar; kademeli hızlanma yeni hızdan tekrar sayar.
- **Metronom** ve ses seviyesi. İki ses: **Tok** (güçlü, tahta blok benzeri; varsayılan) ve **Klasik** (alphaTab'ın
  kendi tıkı). **Giriş sayımı** açıksa Çal'a basınca bir ölçü sayar. Tok sesinde bir de **Kayma** ayarı var (±30 ms):
  tık sana notadan önce ya da sonra geliyorsa buradan hizalarsın, çift tıklayınca sıfırlanır.
- **Görsel metronom:** alt çubukta her vuruşta yanıp sönen ışıklar (ölçünün ilk vuruşu daha parlak). Metronom sesi
  kapalıyken de çalışır; Ayarlar'daki "Görsel vuruş" ile açılıp kapanır.
- **Parçalar:** her enstrümanı susturma, solo ve ses seviyesi (%0–%150, dosyadaki karışıma göre; çift tık %100).
- **Görünüm:** "Sadece tab" nota satırını gizler (davul gibi tabı olmayan partiler notayla kalır); nota büyüklüğü
  %60–%200 arası ayarlanır. İkisi de hatırlanır.
- **Transpoze:** yarım ses adımlarla, sadece ses kayar (tab aynı kalır). Kapo ya da düşük akort için.
- **Parça hafızası:** her parça kendi temposunu ve loop'unu hatırlar; dosyayı tekrar açtığında kaldığın yerden gelir.
  Hiç çalışılmamış bir parça %100 ve loop'suz başlar.
- **Notlar:** her parça için genel bir not ve loop aralıklarına bağlı notlar (ör. "33–40: 3. parmak kayıyor").
  Bir loop notuna tıklayınca o loop açılır.
- **Ses kaydı:** mikrofonla kendi çalışını kaydet (kırmızı düğme ya da R). Kayıtlar parça bazında tarih, tempo ve loop
  bilgisiyle listelenir. İstersen kayıt başlayınca tab da çalar.
- **Tab ile birlikte dinleme:** tab çalarken yaptığın kayıtlar, kayıttaki tempo, loop ve hız değişimleriyle tab'ın
  sesiyle aynı anda çalınır; "Kayıt ↔ Tab" dengesiyle hangisini daha çok duyacağını, "Kaydır" ile mikrofon
  gecikmesini ayarlarsın.
- **Pomodoro:** odak / mola sayacı (varsayılan 25 / 5 dk). Odak bitince çalma durur, zil çalar ve mola başlar.
  Sağdaki Pomodoro panelinden başlatılır; süreler de orada.

Parça hafızası ve notlar dosyanın içeriğine göre saklanır; dosyanın adını değiştirsen de kaybolmaz.

### Sadece masaüstünde

- **Egzersiz klasörü:** bir klasör seçersin, içindeki tüm Guitar Pro dosyaları sol raftaki **Kütüphane** panelinde alt
  klasörlerine göre gruplanmış olarak listelenir; tek tıkla açılır, arama kutusu vardır. Klasör hatırlanır.
- **Çift tıkla açma:** Guitar Pro dosyasına çift tıklayınca Loopster'da açılır; uygulama zaten açıksa yeni pencere
  açmadan mevcut pencerede.
- **Kayıtlar dosya olarak:** kayıtlar `Belgeler/Loopster Kayıtları` klasörüne normal ses dosyası olarak yazılır
  (yanında tempo, loop ve zamanlama bilgisini tutan bir `.json` ile). "Klasörde göster" ile dosyaya gidersin,
  silinenler geri dönüşüm kutusuna gider. Tarayıcı sürümünde kayıtlar tarayıcıda tutulur.

### Klavye kısayolları

| Tuş | İşlev |
| --- | --- |
| Boşluk | Çal / duraklat |
| Esc | Durdur (açık bir panel varsa önce onu kapatır) |
| ← / → | Bir ölçü geri / ileri |
| L | Loop aç / kapa |
| Z | Zorlandım: hızı bir adım düşür, tur sayacını sıfırla |
| M | Metronom aç / kapa |
| − / + | Hızı %5 azalt / artır |
| R | Kayda başla / durdur |
| P | Alttaki ayarları aç / kapa |
| ? | Kısayol listesi |

## Geliştirme

Node.js 24 ile geliştirildi (en az 20.19 gerekir).

```bash
npm install
npm run dev
```

Masaüstü penceresinde açmak için (ilk çalıştırmada Electron kendini indirir):

```bash
npm run desktop
```

Hızlı yenilemeyle masaüstünde çalışmak için, ayrı bir terminalde `npm run dev` açıkken:

```bash
npm run desktop:dev
```

Windows kurulum dosyasını yerelde üretmek için (çıktı `release/` klasörüne yazılır):

```bash
npm run desktop:build
```

Göndermeden önce denetim ve derleme:

```bash
npm run lint
npm run build
```

## Yayın

- `main` dalına yapılan her gönderimde tarayıcı sürümü GitHub Pages'e yayınlanır
  ([pages.yml](.github/workflows/pages.yml)).
- Yeni masaüstü sürümü için `package.json` içindeki `version` değerini artırıp commit'le, sonra aynı numarayla bir
  etiket gönder. GitHub Actions kurulum dosyasını Windows'ta derleyip Sürümler sayfasına yükler
  ([release.yml](.github/workflows/release.yml)); etiket ile `package.json` sürümü uyuşmazsa iş durur.

```bash
git tag v1.0.1
git push origin v1.0.1
```

Çalışma notları: [proje talimatı](docs/PROJE_BRIEF.md) ve [fikir listesi](docs/FIKIRLER.md).

## Teknolojiler

- [alphaTab](https://alphatab.net): Guitar Pro dosyalarını okuma, nota/tab gösterimi ve MIDI çalma
- React, TypeScript, Vite, Tailwind CSS
- Electron ve electron-builder (masaüstü sürümü)

## Lisans

MIT. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

Uygulamayla birlikte dağıtılan üçüncü taraf bileşenler kendi lisanslarıyla gelir:

- alphaTab: Mozilla Public License 2.0
- Bravura nota yazı tipi (Steinberg Media Technologies): SIL Open Font License 1.1
- Sonivox SoundFont (Sonic Network): Apache License 2.0
