# Finans360

Finans360, harcamaları, gelirleri, hesapları, kredi kartlarını, mevduatı ve yatırımları cihazda takip eden Türkçe bir kişisel finans uygulamasıdır.

## iPhone’da kullanım

1. GitHub’da pull request’i açın. İnceledikten sonra **Merge pull request** ve **Confirm merge** düğmelerine dokunun.
2. Depoda **Settings → Pages → Build and deployment → Source → GitHub Actions** seçin. Menü mobil görünümde görünmüyorsa Safari’nin sayfa menüsünden **Masaüstü Web Sitesi İste** seçeneğini kullanın.
3. Depoda **Actions → GitHub Pages → Run workflow** bölümünde `main` dalını seçin ve çalıştırın. Pages kaynağı birleştirmeden önce ayarlandıysa iş akışı birleştirme sırasında otomatik çalışır.
4. İş akışı yeşile döndüğünde Safari’de [Finans360](https://yanarsin57.github.io/finans360/) adresini açın. **Paylaş → Ana Ekrana Ekle → Ekle** adımlarını izleyin.
5. İlk açılışı çevrimiçi yapın. Uygulama dosyaları indirildikten sonra ana ekran simgesinden çevrimdışı açabilirsiniz.

## Finansal kayıtlar

- **Varlıklar** ekranında başlangıç bakiyelerinizi girin. Gelir ve giderlere hesap bağladığınızda bakiyeler otomatik değişir. Hesap seçilmeden kaydedilen işlemler raporlarda görünür.
- Kart harcaması borcu artırır. Taksitli alışverişin toplamı kart borcuna, aylık taksitler ise ilgili ayların giderlerine yansır. Kart ödemesi borcu ve banka bakiyesini azaltır. Hesap transferleri ve kart ödemeleri gelir-gider toplamlarına girmez.
- Mevduat getirisi, yıllık oran ve 365 gün üzerinden basit faizle hesaplanır. Aylık tahminde 30 gün kullanılır. Gerçekleşen faizi mevduat kartından kaydedebilirsiniz.
- Yatırım fiyatlarını elle girin. Fiyat girilmediyse portföy değerinde birim maliyet kullanılır. Geçmiş grafikler, işlemlerden ve mevcut yatırım fiyatından yeniden hesaplanır.
- **Ayarlar** altında örnek veriye geçebilir, etkin veri modunun Excel dökümünü ve JSON yedeğini indirebilirsiniz. JSON yedeği geri yüklenirken etkin modun kayıtları değiştirilir. Örnek veri ayrı bir IndexedDB anahtarında saklanır.
- Veriler giriş yaptığınız cihaz ve tarayıcıda saklanır. Tarayıcı verilerini temizlemeden veya cihaz değiştirmeden önce JSON yedeği alın. Uygulama banka giriş bilgisi istemez ve kayıtları harici sunucuya göndermez.

## Geliştirme

Node.js 24 ile `npm ci`, `npm test` ve `npm run build` çalıştırın. Geliştirme sunucusu için `npm run dev` kullanın. Üretim derlemesi `dist/` altında ve GitHub Pages için `/finans360/` yolundadır.
