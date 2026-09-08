# Okurken

**Okurken**, Ufuk Demir'in kişisel okuma günlüğü için hazırlanmış; tamamen
statik, hızlı, SEO odaklı bir [Astro](https://astro.build) sitesidir.
İçerik [Decap CMS](https://decapcms.org) üzerinden Git tabanlı olarak
yönetilir ve [GitHub Pages](https://pages.github.com) üzerinde ücretsiz
olarak yayınlanır.

- **Framework:** Astro (Static Site Generation)
- **Stil:** Tailwind CSS v4
- **İçerik:** Markdown + Astro Content Collections (type-safe)
- **CMS:** Decap CMS (GitHub OAuth ile, Cloudflare Worker üzerinden)
- **Arama:** İstemci taraflı, Fuse.js ile bulanık arama (`Ctrl/Cmd+K`)
- **Barındırma:** GitHub Pages + GitHub Actions

---

## 1. Gereksinimler

- [Node.js](https://nodejs.org) **22.12 veya üzeri**
- Bir GitHub hesabı ve bu proje için bir depo (repository)
- (CMS kullanmak istiyorsanız) Ücretsiz bir [Cloudflare](https://cloudflare.com) hesabı

## 2. Yerel kurulum

```bash
npm install
npm run dev
```

Site `http://localhost:4321` adresinde açılır. Üretim derlemesi için:

```bash
npm run build      # ./dist klasörüne statik siteyi üretir
npm run preview    # üretilen siteyi yerelde önizler
```

## 3. Proje yapısı

```
├── src/
│   ├── content.config.ts     # Content Collections şeması (books, settings)
│   ├── content/books/*.md    # Her dosya bir kitap (örnek veri içerir)
│   ├── data/site.json        # Okur bilgileri, yıllık hedef, sosyal linkler
│   ├── components/           # Header, SearchModal, BookCard, vb.
│   ├── layouts/BaseLayout.astro
│   ├── lib/                  # Veri sorguları, istatistik, slug, tarih yardımcıları
│   └── pages/                # Tüm rotalar (/, /arsiv, /kitaplar/[slug], ...)
├── public/
│   ├── admin/                # Decap CMS (config.yml + index.html)
│   └── favicon.svg
└── .github/workflows/deploy.yml
```

> **Astro sürüm notu:** İçerik yapılandırma dosyası bilinçli olarak
> `src/content/config.ts` yerine **`src/content.config.ts`** konumuna
> yerleştirildi. Güncel Astro sürümlerinde (Content Layer API) dosya eski
> konumda olursa derleme hata verir; doğru ve çalışan konum budur.

## 4. Örnek içerikler

`src/content/books/` klasöründeki 8 dosya, sitenin tüm özelliklerini
(okunuyor/okundu/okunacak/yarım bırakıldı durumları, alıntılar, notlar,
istatistikler) gösterebilmek için eklenmiş **örnek/demo** verilerdir.
Kendi kütüphanenizi eklemeye başlarken bu dosyaları silip yerine kendi
kitaplarınızı ekleyebilir ya da CMS panelinden düzenleyebilirsiniz.

Yeni bir kitap eklemenin iki yolu vardır:

1. **Decap CMS panelinden** (`/admin`) — kod bilmeden, formlar üzerinden.
2. **Elle Markdown dosyası ekleyerek** — `src/content/books/` klasörüne
   aşağıdaki gibi bir `.md` dosyası eklemeniz yeterli:

```md
---
title: "Kitabın Adı"
author: "Yazar Adı"
publisher: "Yayınevi"
pageCount: 250
startDate: 2026-09-01
endDate: 2026-09-10
status: "completed" # reading | completed | want-to-read | dropped
rating: 8
genres: ["Roman"]
notes: ["Kısa bir not."]
quotes:
  - text: "Seçtiğiniz alıntı."
    page: 42
---

İncelemenizi buraya Markdown olarak yazın.
```

## 5. Yayına almadan önce yapılandırma

Aşağıdaki 3 dosyayı kendi bilgilerinizle güncelleyin:

| Dosya | Ne değişecek |
|---|---|
| `astro.config.mjs` | `SITE_URL` ve `BASE_PATH` — GitHub kullanıcı adınız ve depo adınız |
| `public/admin/config.yml` | `repo`, `base_url`, `site_url`, `display_url` |
| `src/data/site.json` | Okur adı, biyografi, yıllık okuma hedefi, sosyal linkler |

**Depo adı `kullanici-adi.github.io` ise:**
`site: "https://kullanici-adi.github.io"`, `base: "/"`

**Depo adı farklıysa (ör. `okurken`):**
`site: "https://kullanici-adi.github.io"`, `base: "/okurken"`

## 6. GitHub Pages'e dağıtım

1. Bu projeyi GitHub'da yeni bir depoya push'layın.
2. Depo **Settings → Pages** sayfasında **Source** olarak **GitHub Actions**'ı seçin.
3. `main` branch'e her push'ta `.github/workflows/deploy.yml` otomatik
   olarak siteyi derleyip yayınlar (ilk yayın birkaç dakika sürebilir).
4. Elle tetiklemek isterseniz **Actions** sekmesinden workflow'u
   *"Run workflow"* ile de başlatabilirsiniz.

## 7. Decap CMS için GitHub OAuth Kurulumu (ücretsiz)

GitHub Pages, Netlify'ın aksine yerleşik bir CMS girişi (OAuth) sunmaz.
Bunun için ücretsiz bir **Cloudflare Worker** ile küçük bir "OAuth
gateway" çalıştırıyoruz. Aşağıda [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)
projesi kullanılmıştır — Decap CMS ile de tam uyumludur ve Netlify
gerektirmez.

### Adım 1 — Worker'ı Cloudflare'e dağıtın

- [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) deposundaki
  **"Deploy to Cloudflare Workers"** butonuna tıklayıp Cloudflare
  hesabınızla dağıtın (ya da depoyu klonlayıp yerelde `wrangler deploy`
  çalıştırın).
- Dağıtım tamamlanınca Cloudflare panelinde worker'ınızın adresini
  göreceksiniz: `https://sveltia-cms-auth.<SIZIN-ALT-ALAN-ADINIZ>.workers.dev`
  Bu adresi not edin.

### Adım 2 — GitHub OAuth uygulaması oluşturun

GitHub'da **Settings → Developer settings → OAuth Apps → New OAuth App**
üzerinden yeni bir uygulama kaydedin:

- **Application name:** Okurken CMS (istediğiniz bir isim)
- **Homepage URL:** `https://kullanici-adi.github.io/okurken/`
- **Authorization callback URL:** `<WORKER_ADRESINIZ>/callback`
  (ör. `https://sveltia-cms-auth.xxxx.workers.dev/callback`)

Kaydettikten sonra **"Generate a new client secret"** ile bir client
secret oluşturun. **Client ID** ve **Client Secret** değerlerini
kaydedin — bir daha secret'ı göremezsiniz.

### Adım 3 — Worker'a ortam değişkenlerini ekleyin

Cloudflare panelinde worker'ınızın **Settings → Variables** kısmına şu
değişkenleri ekleyin:

| Değişken | Değer |
|---|---|
| `GITHUB_CLIENT_ID` | Adım 2'deki Client ID |
| `GITHUB_CLIENT_SECRET` | Adım 2'deki Client Secret (**Encrypt** işaretleyin) |
| `ALLOWED_DOMAINS` | Sitenizin barındığı alan adı, ör. `kullanici-adi.github.io` |

Değişiklikleri kaydettikten sonra worker otomatik olarak yeniden dağıtılır.

### Adım 4 — `config.yml`'i güncelleyin

`public/admin/config.yml` içinde:

```yaml
backend:
  name: github
  repo: kullanici-adi/okurken
  branch: main
  base_url: https://sveltia-cms-auth.xxxx.workers.dev
  auth_endpoint: auth
```

Değişikliği push'layıp siteniz yeniden yayınlandıktan sonra
`https://kullanici-adi.github.io/okurken/admin/` adresine gidip GitHub
hesabınızla giriş yapabilirsiniz.

> **Not:** Decap CMS panelinin kendi arayüz metinleri (düğmeler, menüler)
> için `config.yml` içinde `locale: "tr"` ayarlanmıştır. Kullandığınız
> Decap CMS sürümünde Türkçe arayüz çevirisi henüz yoksa panel otomatik
> olarak İngilizce arayüze döner — bu bir hata değildir. Bu projede
> tanımladığımız tüm alan adları (başlık, yazar, durum vb.) zaten
> Türkçe'dir ve bundan etkilenmez.

## 8. Global arama nasıl çalışır?

Derleme sırasında `src/pages/search-index.json.ts`, tüm kitapları,
yazarları, alıntıları, incelemeleri ve notları tek bir statik JSON
dosyasında toplar. Tarayıcıda `Ctrl/Cmd+K` ile açılan pencere bu dosyayı
bir kez indirir ve [Fuse.js](https://www.fusejs.io) ile anlık, Türkçe
karaktere duyarlı bulanık arama yapar. (Not: Görev tanımında alternatif
olarak sunulan Pagefind yerine Fuse.js tercih edildi; bunun nedeni,
sonuçları kitap/yazar/alıntı/inceleme/not olarak gruplandıran özel
filtre arayüzü üzerinde tam kontrol sağlamasıdır.)

## 9. Sık karşılaşılan sorunlar

- **CSS/bağlantılar bozuk görünüyor:** `astro.config.mjs` içindeki `site`
  ve `base` değerlerinin gerçek GitHub Pages adresinizle birebir
  eşleştiğinden emin olun.
- **Admin paneli "Not Found" veriyor:** GitHub Pages henüz ilk
  dağıtımını tamamlamamış olabilir; Actions sekmesinden build'in yeşil
  olduğunu doğrulayın.
- **Girişte "Something went wrong" hatası:** `ALLOWED_DOMAINS` değerinin
  sitenizin gerçek alan adıyla (protokol olmadan) birebir eşleştiğinden
  ve `config.yml`'deki `base_url`'in worker adresinizle aynı olduğundan
  emin olun.

---

© 2026 Okurken — Ufuk Demir
