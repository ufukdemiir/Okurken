# Arşiv PDF'i için gömülü fontlar

Bu klasördeki `*.ts` dosyaları, `/arsiv` sayfasındaki "Arşivi indir" PDF
çıktısında kullanılan fontların **base64** kodlanmış hâllerini içerir.
PDF'ler derleme sırasında (build-time) Node ortamında üretildiği için
fontlar `pdfmake`'e doğrudan `Buffer` olarak verilir; harici bir dosya
sisteminden okumaya gerek kalmaz (bu, Vite/Astro derleme çıktısında yol
sorunları yaşanmasını da engeller).

## Kaynak ve lisans

Fontlar, sitenin kendi arayüzünde de kullanılan **Source Serif 4** ve
**Plus Jakarta Sans** ailelerinden, Google Fonts deposundaki (google/fonts,
`ofl/` dizini) değişken (variable) font dosyalarından türetilmiştir.
Her ikisi de **SIL Open Font License 1.1** ile lisanslıdır — bkz.
`licenses/OFL-SourceSerif4.txt` ve `licenses/OFL-PlusJakartaSans.txt`.

## Neden yeniden üretildi (statik + alt küme)

- `pdfmake`/`pdfkit`, OpenType değişken font eksenlerini (`wght`, `opsz`)
  desteklemez; bu yüzden ihtiyaç duyulan ağırlık/optik boyut kombinasyonları
  `fonttools varLib.instancer` ile **statik örneklere (instance)** dönüştürüldü.
- Dosya boyutunu küçültmek ve derleme çıktısını hafif tutmak için fontlar
  Latin (Türkçe dahil: ğ ş ı İ ç ö ü ve aksanlı Latin harfleri), temel
  noktalama, para birimi sembolleri (₺, €) ve birkaç yardımcı Unicode
  bloğuyla sınırlı bir **alt kümeye (subset)** indirgendi
  (`fonttools subset`, `--layout-features=kern,mark,mkmk,ccmp,locl`).

## Üretilen aileler

| Dosya (bu klasörde)                          | Kullanım                                   |
| --------------------------------------------- | ------------------------------------------- |
| `SourceSerif4-Regular`                        | Gövde metni (inceleme, alıntı, blog metni)  |
| `SourceSerif4-SemiBold`                       | Gövde metni kalın                           |
| `SourceSerif4-Italic`                         | Gövde metni italik                          |
| `SourceSerif4-SemiBoldItalic`                 | Gövde metni kalın italik                    |
| `SourceSerif4Display-SemiBold`                | Başlıklar (daha büyük optik boyut)          |
| `SourceSerif4Display-SemiBoldItalic`          | Başlık italik varyantı                      |
| `PlusJakartaSans-Regular`                     | Arayüz metni (üstbilgi, altbilgi, etiketler)|
| `PlusJakartaSans-SemiBold`                    | Arayüz metni kalın                          |

## Yeniden üretme

Kaynak değişken dosyalar `google/fonts` deposundan indirilip aşağıdaki gibi
işlenerek bu klasördeki `.ts` dosyaları elde edilebilir (özetle):

```bash
fonttools varLib.instancer SourceSerif4[opsz,wght].ttf wght=400 opsz=14 \
  --update-name-table -o SourceSerif4-Regular.ttf
# ...diğer ağırlık/boyut kombinasyonları için tekrarlanır...

fonttools subset SourceSerif4-Regular.ttf \
  --unicodes="U+0020-007E,U+00A0-024F,...,U+20A0-20CF,..." \
  --layout-features=kern,mark,mkmk,ccmp,locl --no-hinting \
  --output-file=SourceSerif4-Regular.subset.ttf

# ardından base64 kodlanıp `export const ..._B64 = "..."` şeklinde
# bir .ts dosyasına yazılır.
```

Fontları güncellemek istersen (ör. yeni bir ağırlık eklemek), yukarıdaki
adımları tekrarlayıp ilgili `.ts` dosyasını ve `src/lib/pdf/fonts/index.ts`
ile `src/lib/pdf/pdfArchive.ts` içindeki `fonts` tanımını güncellemen yeterli.
