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

- **Tempo:** %25–%150 arası hız. Gerçek BPM hesaplanıp gösterilir; %50 / %75 / %100 hızlı düğmeleri.
- **Metronom** ve ses seviyesi. **Giriş sayımı** açıksa Çal'a basınca bir ölçü sayar.
- **A-B loop:** tam ölçü sınırlarında döner. Başlangıç ölçüsüne gidip **A**'ya, bitiş ölçüsüne gidip **B**'ye bas
  ya da ölçü numaralarını yaz (ör. 33 → 40). Fareyle ölçüleri sürükleyerek de seçebilirsin.
- **Kademeli hızlanma:** "Her N turda hızı %X artır, %Y'ye ulaşınca bu hızda devam et." Tur ve anlık hız ekranda görünür.
- **Parçalar:** her enstrümanı susturma ya da solo.
- **Transpoze:** yarım ses adımlarla, sadece ses kayar (tab aynı kalır). Kapo ya da düşük akort için.

### Klavye kısayolları

| Tuş | İşlev |
| --- | --- |
| Boşluk | Çal / duraklat |
| Esc | Durdur |
| ← / → | Bir ölçü geri / ileri |
| A / B | Loop başlangıcı / bitişi = şu anki ölçü |
| L | Loop aç / kapa |
| M | Metronom aç / kapa |
| − / + | Hızı %5 azalt / artır |
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

## Teknolojiler

- [alphaTab](https://alphatab.net): Guitar Pro dosyalarını okuma, nota/tab gösterimi ve MIDI çalma
- React, TypeScript, Vite, Tailwind CSS

## Lisans

MIT. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
alphaTab, MPL-2.0 lisansıyla dağıtılmaktadır.
