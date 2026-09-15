# Proje Brief: Gitar Pratik Uygulaması (kod adı: **Loopster** — isim değişebilir)

> Bu dosya bir **çalışma talimatıdır**, tek seferlik bir prompt değil.
> Sen (AI ajanı) bu dosyayı okuyup projeyi **fazlar halinde** inşa edeceksin.
> Her fazın sonunda **durup kullanıcıya soracaksın**. Tüm fazları tek seferde yapma.

---

## 0. Bu projede nasıl çalışacaksın (ÖNEMLİ — önce bunu oku)

Kullanıcı deneyimli bir yazılımcı değil ama teknik konuşmayı anlıyor. Amacı kendi
kullanacağı, GitHub'da yayınlayacağı bir uygulama çıkarmak. Çalışma kuralların:

1. **Fazları sırayla yap.** Faz bitince dur, çalıştırma talimatını ver, kullanıcının
   test etmesini bekle. Onay gelmeden sonraki faza geçme.
2. **Soru sorarken az ve net sor.** Her seferinde en fazla 3-4 soru. Her soruya
   kendi önerini de ekle ("bence X, çünkü Y — sen ne dersin?"). Kullanıcı
   "sen bilirsin" derse kendi önerinle devam et, seçimi tek cümleyle not düş.
3. **Varsayım yapma, sorup geç.** Ama küçük teknik detayları (değişken ismi,
   dosya yapısı, CSS birimi) sorma — onlar senin işin.
4. **Her fazın sonunda çalışan bir şey olsun.** Yarım bırakılmış, açılmayan bir
   uygulama teslim etme. Her faz kendi başına çalışabilir olmalı.
5. **Küçük ve anlamlı commit'ler at.** Türkçe veya İngilizce, tutarlı olsun.
6. **Bilmediğin API'yi uydurma.** alphaTab'ın API'si sürümden sürüme değişiyor.
   Kod yazmadan önce `node_modules/@coderline/alphatab` içindeki tip tanımlarını
   (`.d.ts`) oku veya https://alphatab.net/docs/ adresine bak. Hafızandan
   metot ismi uydurup "çalışması lazım" deme.
7. **Hata olursa gizleme.** Bir şey çalışmıyorsa kullanıcıya açıkça söyle.
8. Tüm arayüz metinleri ve kullanıcıya gösterilen yazılar **Türkçe** olsun.
   Kod, değişken isimleri, commit mesajları İngilizce olabilir.

---

## 1. Amaç

Gitar egzersizi çalışırken kullanılacak bir **tab çalar ve pratik aracı**.
Kullanıcı Guitar Pro 5 (`.gp5`) dosyalarını açacak, zor kısımları loop'a alıp
yavaşlatarak, metronom eşliğinde çalışacak.

Bu bir Guitar Pro klonu **değil**. Nota yazma/düzenleme özelliği yok.
Bu bir **pratik aleti**: aç, loop'a al, yavaşlat, çalış.

### Çekirdek senaryo (uygulamanın var olma sebebi)
> "Solonun 33-40. ölçüleri arasını loop'a al, %60 hızda başlat, metronom açık,
> her 4 tekrarda hızı %5 artır. Ben gitarı çalıp bu bölümü çalışayım."

Bu senaryo akıcı çalışmıyorsa uygulama başarısız demektir.

---

## 2. Teknik yığın (bunlar karar verilmiş, tartışma)

- **alphaTab** (`@coderline/alphatab`) — gp3/gp4/gp5/gp6/gp7 parse etme, tab ve
  nota render'ı, MIDI playback, çalarken nota takibi. Projenin motoru bu.
  Kritik özellikleri zaten sağlıyor: `playbackSpeed`, `metronomeVolume`,
  `playbackRange` (loop), track susturma, transpoze.
- **Vite** + **TypeScript** — build ve dev server.
- **React** — bileşen bazlı arayüz için. (Kullanıcı isterse sade JS'e düşülebilir,
  Faz 0'da sor.)
- **Stil:** Tailwind CSS veya sade CSS — Faz 0'da sor.
- **Deploy:** GitHub Pages (`vite build` → `gh-pages` branch veya GitHub Actions).
- **Lisans:** MIT (kullanıcı aksini söylemezse).

### Kapsam dışı (bunları YAPMA, önerme de)
- Nota/tab **yazma veya düzenleme**
- `.gp5` formatına **geri kaydetme** (alphaTab okur, yazmaz)
- Kendi ses motoru, gerçekçi gitar tonu, amfi simülasyonu
- Backend, kullanıcı hesabı, sunucu, veritabanı
- Profesyonel nota basımı / PDF export

---

## 3. Fazlar

### FAZ 0 — Anlaşma ve kurulum
**Çıktı:** boş ama çalışan bir iskelet proje + cevaplanmış sorular.

Yapacakların:
1. Kullanıcıya şu soruları sor (hepsine kendi önerini ekle):
   - Uygulamanın adı ne olsun? (GitHub repo adı olacak)
   - Arayüz dili/çerçevesi: React mi, sade TypeScript mi? (**öneri: React** —
     ileride özellik eklemek kolay olur)
   - Stil: Tailwind mı sade CSS mi? (**öneri: Tailwind** — hızlı iterasyon)
   - Görsel tema tercihi: koyu tema mı, açık mı, ikisi de mi?
     (**öneri: koyu varsayılan** — sahnede/loş odada çalışırken göz yormaz)
   - Hedef cihaz: sadece masaüstü mü, tablet/telefon da önemli mi?
     (**öneri: tablet de çalışsın** — nota sehpasında kullanışlı)
2. Cevaplara göre Vite projesini kur, alphaTab'ı ekle, dev server'ın ayağa
   kalktığını doğrula.
3. Git deposunu başlat, `.gitignore` ve iskelet `README.md` ekle.
4. **DUR.** Kullanıcıya `npm run dev` komutunu ver, boş sayfanın açıldığını
   doğrulamasını iste.

---

### FAZ 1 — Çekirdek: dosya aç, gör, çal
**Çıktı:** gp5 dosyası açılıp çalınabilen, çalışan bir uygulama. Çirkin olabilir.

Özellikler:
- Dosya seçme **ve sürükle-bırak** ile `.gp5` / `.gp4` / `.gp3` / `.gpx` / `.gp` yükleme
- Tab + nota render'ı (alphaTab varsayılan görünümü yeterli)
- Play / Pause / Stop
- Çalarken aktif notanın vurgulanması ve **sayfanın otomatik kayması**
- Parça (track) seçimi — dosyada birden fazla enstrüman varsa hangisi gösterilsin
- Şarkı adı, sanatçı, toplam ölçü sayısı, orijinal BPM'in gösterilmesi
- Yükleme durumu ve hata mesajları (bozuk dosya sessizce yutulmasın)

Teknik notlar:
- alphaTab'ın player'ı için **SoundFont** ve **worker dosyaları** gerekiyor.
  Bunların Vite ile doğru şekilde servis edilmesi bu fazın en çok uğraştıran
  kısmı olacak — alphaTab'ın Vite/bundler kurulum dokümanını oku, deneme yanılma
  yapma.
- Ses **kullanıcı etkileşimi olmadan başlamaz** (tarayıcı AudioContext kuralı).
  Play'e basılana kadar audio context'i başlatma.

**DUR ve sor:** Kullanıcı kendi gp5 dosyalarından birkaçını denesin. Açılmayan
veya garip görünen dosya var mı? Devam etmeden önce bunu düzelt.

---

### FAZ 2 — Pratik özellikleri (projenin asıl kalbi)
**Çıktı:** gerçekten pratik yapılabilen bir alet.

Özellikler:
- **Tempo kontrolü:** yüzde bazlı kaydırıcı (%25–%150) + hesaplanan gerçek BPM'in
  gösterilmesi. Hızlı erişim düğmeleri: %50, %75, %100.
- **Metronom:** aç/kapa + ses seviyesi.
- **Count-in:** çalmadan önce bir ölçü boş metronom sayması (aç/kapa).
- **A-B Loop:** başlangıç ve bitiş ölçüsünü seçme. İki yolu da olsun:
  - Nota üzerinde ölçüye tıklayarak A ve B işaretleme
  - Sayı girerek (ör. 33 → 40)
- **Kademeli hızlanma (bu projenin yıldız özelliği):**
  "Her N tekrarda hızı X% artır, Y%'ye ulaşınca dur." Çalışırken ekranda
  mevcut tur sayısı ve mevcut hız görünsün.
- **Track susturma / solo:** ritim gitarı sustur, sadece davul+bas kalsın gibi.
- **Transpoze:** yarım ses bazında (kapodastro veya farklı akort için).
- **Klavye kısayolları:** Space = play/pause, ok tuşları = ölçü atlama,
  A / B = loop noktası işaretle. Hepsi ekranda bir "kısayollar" panelinde listelensin.

**DUR ve sor:** Kullanıcı gerçek bir egzersizle 15-20 dakika çalışsın.
Sonra sor: Ne rahatsız etti? Ne eksik? Hangi kontrole en çok uzandın?

---

### FAZ 3 — Arayüz ve tasarım
**Çıktı:** kullanıcının GitHub'da paylaşmaktan çekinmeyeceği bir görünüm.

- Faz 0'da konuşulan temaya göre arayüzü baştan tasarla. Bootstrap'vari
  jenerik görünümden kaçın; bu bir müzisyen aleti, karakteri olsun.
- Transport kontrolleri (play, tempo, loop) **her zaman görünür ve büyük** olsun —
  elinde gitar varken tıklanacaklar. Küçük ikonlar kullanma.
- Nota alanı ekranın çoğunu kaplasın, kontroller kenarda/altta sabit dursun.
- Tablet ve telefonda kullanılabilir olsun (Faz 0'da evet dendiyse).
- Boş durum ekranı: dosya yüklenmediğinde ne yapılacağını anlatan düzgün bir karşılama.

**DUR ve sor:** Ekran görüntüsü üzerinden geri bildirim al, iterasyon yap.

---

### FAZ 4 — Kalıcılık ve yayın
**Çıktı:** GitHub'da yayında, linki paylaşılabilir bir proje.

- **Pratik oturumu kaydetme (localStorage):** son açılan dosyalar, her dosya için
  kaydedilmiş loop'lar ve tempo ayarları. Uygulamayı kapatıp açınca kaldığı
  yerden devam etsin.
- (Opsiyonel, kullanıcıya sor) **Pratik istatistikleri:** hangi parçaya kaç dakika
  çalışıldı, hangi loop kaç kez tekrarlandı.
- `README.md`: ne işe yaradığı, ekran görüntüsü, kurulum, kullanım, kısayollar,
  alphaTab'a atıf ve lisans bilgisi.
- MIT lisans dosyası.
- GitHub Pages deploy (Actions workflow ile otomatik).
- Canlı demo linkini README'ye koy.

---

## 4. Beklenen tuzaklar (bunlara hazırlıklı ol)

- **AudioContext / autoplay politikası:** ses ancak kullanıcı tıklamasından sonra
  başlatılabilir.
- **alphaTab worker ve SoundFont dosyalarının yolu:** Vite'ın asset işleme
  mantığıyla çakışır. Dev'de çalışıp production build'de bozulması çok tipiktir —
  **her fazın sonunda `npm run build && npm run preview` ile production'ı da test et.**
- **Loop'un tam ölçü başında dönmemesi:** en sinir bozucu bug bu olacak, ciddiye al.
- **Mobil tarayıcıda ses gecikmesi:** iOS Safari özellikle sorunlu.
- **Büyük dosyalarda render yavaşlığı:** 200+ ölçülü parçalarda `lazy` render
  ayarlarına bak.

---

## 5. Kabul kriteri

Proje şu cümle doğru olduğunda bitmiştir:

> Kullanıcı elinde gitarla oturup, gp5 dosyasını açıp, zor bölümü loop'a alıp,
> yavaşlatıp, metronom eşliğinde, hıza kademeli çıkarak **klavyeye hiç uzanmadan**
> 20 dakika egzersiz yapabiliyor.

---

## 6. Şimdi başla

FAZ 0'ın sorularını sor. Kod yazmaya başlama.
