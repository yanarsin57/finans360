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

## Finans360 2.0

- Özet ekranındaki ay seçici, dönem bütçesini değiştirir. Üstteki güncel varlık kartı cihazın bugünkü tarihini kullanır. Maaş gününü **Ayarlar → Bütçe ayarları** bölümünde belirleyin.
- Bir banka hesabında **Açılış bakiyesi tarihi** gün başındaki bakiyeyi ifade eder. Önceki işlemler raporlarda görünür. Daha sonra **Bakiyeyi düzelt** ile yeni bir mutabakat kaydı ekleyebilirsiniz. V1 hesaplarında bu alan boşsa eski bakiye davranışı korunur.
- Tekrarlanan bir işlemi açtığınızda **Yalnızca bu dönem** ya da **Bu dönem ve sonrakiler** seçeneğini kullanın. Faturanın durumunu takvim veya işlem listesinde değiştirebilirsiniz.
- Yatırımda toplam veya ayrıntılı takipten birini kullanın. Güncel fiyatın tarihini girin ve geçmiş dönemler için ayrı değerleme kaydı ekleyin. Alım ve satımlar adedi ve ağırlıklı maliyeti değiştirir. Banka bakiyesine yansımasını istiyorsanız banka kaydını ayrıca girin. Geçmişte bütün pozisyonların değeri bilinmiyorsa grafik o dönemi boş bırakır.
- Mevduat getirileri varsayılan olarak 365 günlük yıl üzerinden hesaplanır. Bileşik modda brüt faiz günlük bileşir ve stopaj kazanç üzerinde uygulanır. Bankanızın gerçek hesabı farklı olabilir. Tahsil edilen tutarı ayrı gelir olarak kaydedin.
- Ekstre borcunu bankanın bildirdiği tutara göre güncelleyin. Kart ödemesi harcamaya eklenmez. Kalan ekstre tahmini, kesimden sonra kaydedilen ödemeleri kullanır.
- **Raporlar** ekranında seçili dönemi Excel veya PDF olarak indirebilirsiniz. PDF yazı tipi uygulama dosyalarıyla birlikte çevrimdışı önbelleğe alınır.
- İsteğe bağlı PIN ekranı arka plana geçişte ve üç dakika kullanılmadığında kilitlenir. PIN doğrulaması cihazda yapılır. Bu ekran IndexedDB kayıtlarını şifrelemez ve Face ID kullanılmaz. PIN ekranı ve tema ayarları yedek dosyasına dahil edilmez.
- Şifreli JSON yedeklerinde PBKDF2 ve AES-GCM kullanılır. Dosya kişisel finans kayıtlarını içerir. Parola unutulursa şifreli dosya kurtarılamaz.
- Güncelleme geldiğinde **Güncelle** düğmesi açık kayıt formu kapatıldıktan sonra kullanılabilir. Eski sürümden geçişte güncelleme görünmezse uygulamayı kapatıp yeniden açın. Mevcut uygulama adresi, PWA kimliği ve IndexedDB alanı korunur.

## Finans360 2.1

- Özet kartının üst kısmı güncel finansal durumu, aylık bütçe bölümü seçilen ayı gösterir. **Maaşa kadar → Borç ve faturalar** bölümünde hesaplamaya dahil olan kalemleri açabilirsiniz. Gecikmiş ve maaş günü dahil vadesi gelen ödemeler düşülür. Günlük bütçe, kalan nakdin takvim günü sayısına (en az bir) bölünüp aşağı kuruşa yuvarlanmasıyla hesaplanır.
- Kartta **Son ekstre kesim tarihi** ve ekstre tutarı girildiğinde ödeme takibi o ekstre dönemine bağlanır. Tarih girilmemiş eski kayıtlarda uygulama, kayıtlı aylık kesim gününden dönem tahmini yapar.
- Ayrıntılı yatırım takibinde, alım veya satışa isterseniz banka hesabı bağlayın. Bağlı alımlar nakdi düşürür, satışlar artırır. Aynı hareket için ayrıca banka kaydı oluşturmayın. Önceden girilmiş bağlantısız yatırım hareketleri eski davranışlarını korur.
- **Ayarlar → Uygulama bilgisi** bölümünde yeni sürümü kontrol edebilirsiniz. Güncelleme, açık kayıt formu kapandıktan sonra etkinleştirilebilir. Adres, PWA kimliği ve IndexedDB alanı aynı kalır.
- Yedek oluşturma sonucu indirmenin başlatıldığını bildirir. Dosyanın cihazda bulunduğunu iPhone’un **Dosyalar** uygulamasında kontrol edin.
- Mobil regresyon testi için üretim derlemesinden sonra `npx playwright install chromium` ve `npm run test:mobile` çalıştırın. Kurulu Chromium için `MOBILE_BROWSER` yolunu, WebKit için `MOBILE_ENGINE=webkit` değişkenini kullanabilirsiniz. `MOBILE_SCREENSHOTS` ekran görüntüsü dizini için isteğe bağlıdır.
