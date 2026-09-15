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

## Teknolojiler

- [alphaTab](https://alphatab.net): Guitar Pro dosyalarını okuma, nota/tab gösterimi ve MIDI çalma
- React, TypeScript, Vite, Tailwind CSS

## Lisans

MIT. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
alphaTab, MPL-2.0 lisansıyla dağıtılmaktadır.
