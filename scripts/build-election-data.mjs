import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates the comprehensive Turkey 81 Provinces, 87 Electoral Districts (600 MPs),
 * and all 973 İlçeler dataset for both 2023 General Elections (May 14, 2023)
 * and 2024 Local Elections (March 31, 2024).
 */

const PROVINCES_RAW = [
  // [plate, name, region, lat, lng, voters2023, turnout2023, mpCount, shares2023(AKP,CHP,MHP,IYI,DEM,YRP,ZP,TIP,BBP,OTHER), ilcelerList]
  ["01", "Adana", "Akdeniz", 37.00, 35.32, 1613450, 86.7, 15, [30.8, 28.6, 11.0, 10.8, 9.7, 1.9, 2.2, 2.4, 0.9, 1.7], ["Seyhan", "Yüreğir", "Çukurova", "Sarıçam", "Ceyhan", "Kozan", "İmamoğlu", "Karataş", "Karaisalı", "Pozantı", "Yumurtalık", "Tufanbeyli", "Feke", "Aladağ", "Saimbeyli"]],
  ["02", "Adıyaman", "Güneydoğu Anadolu", 37.76, 38.27, 399300, 82.8, 5, [52.4, 18.7, 4.2, 0.5, 12.1, 4.9, 0.7, 0.4, 1.4, 4.7], ["Merkez", "Kahta", "Besni", "Gölbaşı", "Gerger", "Sincik", "Çelikhan", "Tut", "Samsat"]],
  ["03", "Afyonkarahisar", "Ege", 38.75, 30.54, 536900, 90.2, 6, [44.2, 18.8, 16.1, 12.4, 0.6, 3.0, 2.2, 0.3, 1.2, 1.2], ["Merkez", "Sandıklı", "Dinar", "Bolvadin", "Sinanpaşa", "Emirdağ", "Şuhut", "Çay", "İhsaniye", "İscehisar", "Sultandağı", "Çobanlar", "Dazkırı", "Başmakçı", "Hocalar", "Bayat", "Evciler", "Kızılören"]],
  ["04", "Ağrı", "Doğu Anadolu", 39.72, 43.05, 307100, 79.4, 4, [25.4, 11.1, 2.6, 1.7, 54.5, 1.9, 0.5, 0.4, 0.4, 1.5], ["Merkez", "Patnos", "Doğubayazıt", "Diyadin", "Eleşkirt", "Tutak", "Taşlıçay", "Hamur"]],
  ["05", "Amasya", "Karadeniz", 40.65, 35.83, 259100, 91.2, 3, [39.6, 29.7, 16.7, 7.2, 0.6, 2.4, 1.6, 0.4, 0.9, 0.9], ["Merkez", "Merzifon", "Suluova", "Taşova", "Göynücek", "Gümüşhacıköy", "Hamamözü"]],
  ["06", "Ankara", "İç Anadolu", 39.93, 32.85, 4280600, 90.6, 36, [32.5, 30.6, 10.2, 12.8, 3.1, 2.6, 3.4, 1.9, 1.2, 1.7], []], // Handled via 3 districts below
  ["07", "Antalya", "Akdeniz", 36.89, 30.71, 1906900, 88.8, 17, [29.0, 32.3, 10.0, 11.3, 4.9, 1.3, 2.8, 4.6, 0.8, 3.0], ["Kepez", "Muratpaşa", "Alanya", "Manavgat", "Konyaaltı", "Serik", "Aksu", "Kumluca", "Döşemealtı", "Kaş", "Korkuteli", "Gazipaşa", "Finike", "Kemer", "Elmalı", "Demre", "Akseki", "Gündoğmuş", "İbradı"]],
  ["08", "Artvin", "Karadeniz", 41.18, 41.82, 130600, 89.0, 2, [37.1, 30.0, 9.7, 13.3, 1.2, 2.8, 1.7, 1.4, 0.8, 2.0], ["Merkez", "Hopa", "Borçka", "Yusufeli", "Arhavi", "Şavşat", "Ardanuç", "Kemalpaşa", "Murgul"]],
  ["09", "Aydın", "Ege", 37.84, 27.84, 885100, 89.2, 8, [28.7, 35.6, 8.5, 13.0, 7.3, 1.1, 2.2, 1.3, 0.7, 1.6], ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim", "Çine", "İncirliova", "Germencik", "Bozdoğan", "Köşk", "Kuyucak", "Sultanhisar", "Karacasu", "Yenipazar", "Buharkent", "Karpuzlu", "Koçarlı"]],
  ["10", "Balıkesir", "Marmara", 39.65, 27.88, 991800, 90.5, 9, [34.7, 31.5, 8.1, 15.1, 2.2, 2.1, 2.2, 1.2, 0.8, 2.1], ["Karesi", "Altıeylül", "Edremit", "Bandırma", "Gönen", "Ayvalık", "Burhaniye", "Bigadiç", "Susurluk", "Dursunbey", "Sındırgı", "İvrindi", "Erdek", "Havran", "Kepsut", "Manyas", "Savaştepe", "Balya", "Gömeç", "Marmara"]],
  ["11", "Bilecik", "Marmara", 40.14, 29.98, 165600, 91.1, 2, [37.4, 26.7, 10.4, 12.2, 2.8, 3.5, 2.5, 1.0, 1.3, 2.2], ["Merkez", "Bozüyük", "Osmaneli", "Söğüt", "Gölpazarı", "Pazaryeri", "İnhisar", "Yenipazar"]],
  ["12", "Bingöl", "Doğu Anadolu", 38.88, 40.49, 185200, 82.0, 3, [39.1, 5.9, 13.6, 2.4, 24.0, 9.8, 0.7, 0.4, 1.0, 3.1], ["Merkez", "Genç", "Solhan", "Karlıova", "Adaklı", "Kiğı", "Yedisu", "Yayladere"]],
  ["13", "Bitlis", "Doğu Anadolu", 38.40, 42.11, 219500, 82.2, 3, [37.4, 7.9, 3.9, 3.8, 39.9, 3.4, 0.6, 0.4, 0.6, 2.1], ["Tatvan", "Merkez", "Güroymak", "Ahlat", "Hizan", "Mutki", "Adilcevaz"]],
  ["14", "Bolu", "Karadeniz", 40.73, 31.61, 238400, 90.8, 3, [37.0, 21.8, 23.3, 7.4, 1.0, 3.9, 2.0, 0.6, 1.2, 1.8], ["Merkez", "Gerede", "Mudurnu", "Göynük", "Mengen", "Yeniçağa", "Dörtdivan", "Seben", "Kıbrıscık"]],
  ["15", "Burdur", "Akdeniz", 37.72, 30.29, 204200, 90.6, 3, [36.5, 31.1, 14.0, 11.4, 0.9, 1.7, 1.6, 0.5, 0.9, 1.4], ["Merkez", "Bucak", "Gölhisar", "Yeşilova", "Çavdır", "Tefenni", "Ağlasun", "Karamanlı", "Altınyayla", "Çeltikçi", "Kemer"]],
  ["16", "Bursa", "Marmara", 40.18, 29.06, 2368900, 89.9, 20, [39.0, 24.4, 8.6, 11.9, 4.4, 3.9, 3.6, 1.2, 1.0, 2.0], []], // Handled via 2 districts below
  ["17", "Çanakkale", "Marmara", 40.15, 26.41, 439900, 90.8, 4, [31.9, 35.4, 6.6, 16.5, 2.1, 1.3, 2.1, 1.6, 0.6, 1.9], ["Merkez", "Biga", "Çan", "Gelibolu", "Ayvacık", "Ezine", "Yenice", "Bayramiç", "Lapseki", "Eceabat", "Gökçeada", "Bozcaada"]],
  ["18", "Çankırı", "İç Anadolu", 40.60, 33.61, 143500, 89.2, 2, [42.6, 7.6, 31.0, 10.6, 0.5, 3.1, 1.8, 0.3, 1.4, 1.1], ["Merkez", "Çerkeş", "Ilgaz", "Orta", "Şabanözü", "Kurşunlu", "Yapraklı", "Kızılırmak", "Atkaracalar", "Eldivan", "Korgun", "Bayramören"]],
  ["19", "Çorum", "Karadeniz", 40.55, 34.95, 396800, 90.4, 4, [40.1, 30.8, 20.1, 2.0, 0.7, 3.3, 1.2, 0.3, 0.8, 0.7], ["Merkez", "Sungurlu", "Osmancık", "İskilip", "Alaca", "Bayat", "Mecitözü", "Kargı", "Ortaköy", "Uğurludağ", "Dodurga", "Oğuzlar", "Laçin", "Boğazkale"]],
  ["20", "Denizli", "Ege", 37.77, 29.08, 795100, 90.5, 7, [33.9, 31.9, 8.4, 14.1, 2.6, 1.9, 2.7, 1.1, 1.1, 2.3], ["Pamukkale", "Merkezefendi", "Çivril", "Acıpayam", "Tavas", "Honaz", "Sarayköy", "Buldan", "Kale", "Çal", "Çameli", "Serinhisar", "Bozkurt", "Güney", "Çardak", "Bekilli", "Babadağ", "Baklan", "Beyağaç"]],
  ["21", "Diyarbakır", "Güneydoğu Anadolu", 37.91, 40.23, 1144100, 81.8, 12, [23.2, 8.2, 1.5, 2.3, 60.9, 1.5, 0.5, 0.4, 0.3, 1.2], ["Bağlar", "Kayapınar", "Yenişehir", "Sur", "Ergani", "Bismil", "Silvan", "Çınar", "Çermik", "Dicle", "Kulp", "Hani", "Lice", "Eğil", "Hazro", "Kocaköy", "Çüngüş"]],
  ["22", "Edirne", "Marmara", 41.67, 26.55, 316100, 89.8, 4, [23.5, 39.6, 7.7, 20.7, 1.9, 0.9, 1.7, 1.6, 0.4, 2.0], ["Merkez", "Keşan", "Uzunköprü", "İpsala", "Havsa", "Meriç", "Enez", "Süloğlu", "Lalapaşa"]],
  ["23", "Elazığ", "Doğu Anadolu", 38.68, 39.22, 429100, 86.2, 5, [40.4, 20.7, 11.5, 2.4, 7.1, 3.6, 1.1, 0.4, 0.9, 11.9], ["Merkez", "Kovancılar", "Karakoçan", "Palu", "Arıcak", "Baskil", "Maden", "Sivrice", "Alacakaya", "Keban", "Ağın"]],
  ["24", "Erzincan", "Doğu Anadolu", 39.75, 39.50, 171100, 90.0, 2, [38.6, 36.0, 19.6, 0.8, 1.2, 1.6, 0.9, 0.3, 0.5, 0.5], ["Merkez", "Tercan", "Üzümlü", "Çayırlı", "İliç", "Kemaliye", "Otlukbeli", "Kemah", "Refahiye"]],
  ["25", "Erzurum", "Doğu Anadolu", 39.90, 41.27, 513100, 87.6, 6, [43.3, 7.0, 16.7, 9.5, 9.9, 5.0, 2.3, 0.4, 2.4, 3.5], ["Yakutiye", "Palandöken", "Aziziye", "Horasan", "Oltu", "Pasinler", "Karayazı", "Hınıs", "Tekman", "Karaçoban", "Aşkale", "Şenkaya", "Çat", "Köprüköy", "İspir", "Tortum", "Narman", "Uzundere", "Olur", "Pazaryolu"]],
  ["26", "Eskişehir", "İç Anadolu", 39.77, 30.52, 687100, 90.6, 6, [33.2, 34.1, 7.1, 13.8, 2.1, 2.0, 3.1, 1.6, 1.0, 2.0], ["Odunpazarı", "Tepebaşı", "Sivrihisar", "Çifteler", "Seyitgazi", "Alpu", "Mihalıççık", "Mahmudiye", "Beylikova", "İnönü", "Günyüzü", "Sarıcakaya", "Mihalgazi", "Han"]],
  ["27", "Gaziantep", "Güneydoğu Anadolu", 37.06, 37.38, 1369100, 86.4, 14, [44.9, 20.3, 9.7, 5.4, 9.1, 4.2, 3.2, 0.7, 0.9, 1.6], ["Şahinbey", "Şehitkamil", "Nizip", "İslahiye", "Nurdağı", "Oğuzeli", "Araban", "Yavuzeli", "Karkamış"]],
  ["28", "Giresun", "Karadeniz", 40.91, 38.38, 350100, 88.8, 4, [43.1, 20.7, 15.6, 12.7, 0.5, 2.7, 1.7, 0.5, 1.1, 1.4], ["Merkez", "Bulancak", "Espiye", "Görele", "Tirebolu", "Dereli", "Şebinkarahisar", "Keşap", "Yağlıdere", "Piraziz", "Eynesil", "Alucra", "Güce", "Çamoluk", "Çanakçı", "Doğankent"]],
  ["29", "Gümüşhane", "Karadeniz", 40.46, 39.48, 97800, 85.4, 2, [47.5, 7.4, 26.3, 11.6, 0.4, 3.1, 1.3, 0.2, 1.1, 1.1], ["Merkez", "Kelkit", "Şiran", "Kürtün", "Torul", "Köse"]],
  ["30", "Hakkari", "Doğu Anadolu", 37.57, 43.74, 195100, 83.2, 3, [19.2, 7.2, 3.0, 1.2, 63.9, 1.8, 0.6, 0.4, 0.4, 2.3], ["Yüksekova", "Merkez", "Şemdinli", "Çukurca", "Derecik"]],
  ["31", "Hatay", "Akdeniz", 36.20, 36.16, 1062100, 83.1, 11, [33.9, 28.4, 12.2, 8.1, 3.2, 1.8, 1.4, 8.6, 0.9, 1.5], ["Antakya", "İskenderun", "Defne", "Dörtyol", "Samandağ", "Kırıkhan", "Reyhanlı", "Arsuz", "Payas", "Erzin", "Hassa", "Altınözü", "Belen", "Yayladağı", "Kumlu"]],
  ["32", "Isparta", "Akdeniz", 37.76, 30.55, 326100, 89.6, 4, [32.7, 22.3, 20.4, 16.4, 1.0, 2.2, 2.0, 0.5, 0.9, 1.6], ["Merkez", "Yalvaç", "Eğirdir", "Şarkikaraağaç", "Gelendost", "Keçiborlu", "Senirkent", "Sütçüler", "Gönen", "Uluborlu", "Atabey", "Aksu", "Yenişarbademli"]],
  ["33", "Mersin", "Akdeniz", 36.81, 34.64, 1392100, 88.9, 13, [24.9, 30.9, 12.0, 11.9, 13.3, 1.1, 1.9, 2.0, 0.6, 1.4], ["Tarsus", "Toroslar", "Yenişehir", "Akdeniz", "Mezitli", "Erdemli", "Silifke", "Anamur", "Mut", "Bozyazı", "Gülnar", "Aydıncık", "Çamlıyayla"]],
  ["34", "İstanbul", "Marmara", 41.01, 28.97, 11358000, 89.8, 98, [36.1, 28.3, 6.2, 8.1, 8.2, 3.3, 2.8, 4.0, 0.9, 2.1], []], // Handled via 3 districts below
  ["35", "İzmir", "Ege", 38.42, 27.14, 3441000, 90.4, 28, [25.3, 40.9, 5.4, 11.4, 7.5, 1.0, 2.4, 3.3, 0.5, 2.3], []], // Handled via 2 districts below
  ["36", "Kars", "Doğu Anadolu", 40.60, 43.09, 185900, 81.9, 3, [25.8, 16.5, 9.7, 15.0, 27.9, 1.9, 0.8, 0.5, 0.5, 1.4], ["Merkez", "Kağızman", "Sarıkamış", "Selim", "Digor", "Arpaçay", "Akyaka", "Susuz"]],
  ["37", "Kastamonu", "Karadeniz", 41.38, 33.78, 297100, 89.1, 3, [45.5, 21.8, 15.0, 7.6, 0.4, 4.1, 1.8, 0.4, 1.4, 2.0], ["Merkez", "Tosya", "Taşköprü", "Cide", "İnebolu", "Araç", "Devrekani", "Bozkurt", "Daday", "Azdavay", "Çatalzeytin", "Küre", "Doğanyurt", "İhsangazi", "Pınarbaşı", "Şenpazar", "Abana", "Seydiler", "Hanönü", "Ağlı"]],
  ["38", "Kayseri", "İç Anadolu", 38.73, 35.48, 1029100, 90.7, 10, [40.7, 17.2, 19.0, 10.0, 1.0, 3.5, 3.2, 0.5, 2.6, 2.3], ["Melikgazi", "Kocasinan", "Talas", "Develi", "Yahyalı", "Bünyan", "İncesu", "Pınarbaşı", "Tomarza", "Yeşilhisar", "Sarıoğlan", "Hacılar", "Sarız", "Akkışla", "Felahiye", "Özvatan"]],
  ["39", "Kırklareli", "Marmara", 41.73, 27.22, 291100, 90.9, 3, [24.9, 45.8, 4.8, 15.4, 1.8, 0.8, 1.7, 1.8, 0.5, 2.5], ["Lüleburgaz", "Merkez", "Babaeski", "Vize", "Pınarhisar", "Demirköy", "Pehlivanköy", "Kofçaz"]],
  ["40", "Kırşehir", "İç Anadolu", 39.14, 34.16, 175100, 88.8, 2, [38.9, 29.1, 14.9, 7.3, 2.8, 2.2, 1.8, 0.5, 1.2, 1.3], ["Merkez", "Kaman", "Mucur", "Çiçekdağı", "Akpınar", "Boztepe", "Akçakent"]],
  ["41", "Kocaeli", "Marmara", 40.76, 29.94, 1515100, 90.7, 14, [39.2, 23.9, 8.4, 9.5, 5.8, 6.2, 3.1, 1.3, 1.1, 1.5], ["Gebze", "İzmit", "Darıca", "Körfez", "Gölcük", "Derince", "Çayırova", "Kartepe", "Başiskele", "Karamürsel", "Kandıra", "Dilovası"]],
  ["42", "Konya", "İç Anadolu", 37.87, 32.48, 1638100, 89.5, 15, [48.0, 13.7, 14.3, 8.7, 2.8, 5.1, 2.9, 0.4, 2.3, 1.8], ["Selçuklu", "Meram", "Karatay", "Ereğli", "Akşehir", "Beyşehir", "Çumra", "Seydişehir", "Ilgın", "Cihanbeyli", "Kulu", "Karapınar", "Kadınhanı", "Sarayönü", "Bozkır", "Yunak", "Doğanhisar", "Hüyük", "Altınekin", "Hadim", "Çeltik", "Emirgazi", "Tuzlukçu", "Derebucak", "Akören", "Halkapınar", "Taşkent", "Güneysınır", "Ahırlı", "Derbent", "Yalıhüyük"]],
  ["43", "Kütahya", "Ege", 39.42, 29.98, 436100, 91.2, 5, [46.7, 16.9, 13.0, 10.6, 0.5, 7.1, 1.9, 0.3, 1.3, 1.7], ["Merkez", "Tavşanlı", "Simav", "Gediz", "Emet", "Altıntaş", "Domaniç", "Hisarcık", "Aslanapa", "Çavdarhisar", "Şaphane", "Pazarlar", "Dumlupınar"]],
  ["44", "Malatya", "Doğu Anadolu", 38.35, 38.31, 535100, 83.4, 6, [45.2, 21.6, 12.9, 3.9, 3.2, 9.3, 1.1, 0.4, 1.2, 1.2], ["Yeşilyurt", "Battalgazi", "Doğanşehir", "Akçadağ", "Darende", "Hekimhan", "Yazıhan", "Pütürge", "Arapgir", "Kuluncak", "Arguvan", "Kale", "Doğanyol"]],
  ["45", "Manisa", "Ege", 38.61, 27.42, 1118100, 90.8, 10, [31.8, 29.5, 14.1, 11.1, 5.7, 2.1, 2.2, 1.0, 1.0, 1.5], ["Yunusemre", "Şehzadeler", "Akhisar", "Turgutlu", "Salihli", "Soma", "Alaşehir", "Saruhanlı", "Kula", "Kırkağaç", "Demirci", "Sarıgöl", "Gördes", "Gölmarmara", "Ahmetli", "Selendi", "Köprübaşı"]],
  ["46", "Kahramanmaraş", "Akdeniz", 37.57, 36.93, 753100, 85.9, 8, [47.7, 16.3, 16.2, 7.1, 1.4, 5.5, 1.9, 0.4, 2.1, 1.4], ["Onikişubat", "Dulkadiroğlu", "Elbistan", "Afşin", "Türkoğlu", "Pazarcık", "Göksun", "Andırın", "Çağlayancerit", "Nurhak", "Ekinözü"]],
  ["47", "Mardin", "Güneydoğu Anadolu", 37.31, 40.73, 541100, 82.9, 6, [25.2, 7.1, 3.4, 1.3, 54.8, 1.6, 0.5, 0.4, 0.3, 5.4], ["Kızıltepe", "Artuklu", "Midyat", "Nusaybin", "Derik", "Mazıdağı", "Dargeçit", "Savur", "Yeşilli", "Ömerli"]],
  ["48", "Muğla", "Ege", 37.21, 28.36, 807100, 89.6, 7, [24.6, 37.8, 6.2, 17.0, 3.5, 0.8, 1.8, 5.7, 0.4, 2.2], ["Bodrum", "Fethiye", "Milas", "Menteşe", "Marmaris", "Seydikemer", "Ortaca", "Yatağan", "Dalaman", "Köyceğiz", "Ula", "Datça", "Kavaklıdere"]],
  ["49", "Muş", "Doğu Anadolu", 38.74, 41.49, 236100, 79.8, 3, [21.5, 4.9, 16.5, 5.5, 46.8, 2.2, 0.5, 0.3, 0.4, 1.4], ["Merkez", "Bulanık", "Malazgirt", "Varto", "Hasköy", "Korkut"]],
  ["50", "Nevşehir", "İç Anadolu", 38.62, 34.71, 227100, 90.0, 3, [39.5, 17.5, 20.3, 15.8, 0.7, 2.2, 1.5, 0.4, 1.1, 1.0], ["Merkez", "Ürgüp", "Avanos", "Gülşehir", "Derinkuyu", "Acıgöl", "Kozaklı", "Hacıbektaş"]],
  ["51", "Niğde", "İç Anadolu", 37.96, 34.67, 255100, 88.9, 3, [34.0, 24.2, 22.4, 12.3, 0.8, 2.4, 1.7, 0.4, 0.9, 0.9], ["Merkez", "Bor", "Çiftlik", "Ulukışla", "Altunhisar", "Çamardı"]],
  ["52", "Ordu", "Karadeniz", 40.98, 37.87, 591100, 88.6, 6, [45.2, 24.2, 12.7, 9.9, 0.4, 2.8, 1.5, 0.5, 1.1, 1.7], ["Altınordu", "Ünye", "Fatsa", "Perşembe", "Kumru", "Korgan", "Gölköy", "Ulubey", "Mesudiye", "Aybastı", "Akkuş", "İkizce", "Gürgentepe", "Çatalpınar", "Çaybaşı", "Kabataş", "Çamaş", "Gülyalı", "Kabadüz"]],
  ["53", "Rize", "Karadeniz", 41.02, 40.52, 266100, 88.8, 3, [53.4, 21.5, 13.0, 2.5, 0.5, 5.1, 1.5, 0.4, 1.0, 1.1], ["Merkez", "Çayeli", "Ardeşen", "Pazar", "Fındıklı", "Güneysu", "Kalkandere", "İyidere", "Derepazarı", "Çamlıhemşin", "İkizdere", "Hemşin"]],
  ["54", "Sakarya", "Marmara", 40.77, 30.40, 795100, 90.4, 8, [47.3, 16.4, 12.0, 10.9, 1.8, 5.0, 2.7, 0.6, 1.5, 1.8], ["Adapazarı", "Serdivan", "Akyazı", "Erenler", "Hendek", "Karasu", "Geyve", "Arifiye", "Sapanca", "Pamukova", "Ferizli", "Kaynarca", "Kocaali", "Söğütlü", "Karapürçek", "Taraklı"]],
  ["55", "Samsun", "Karadeniz", 41.28, 36.33, 1024100, 89.4, 9, [42.5, 19.8, 14.2, 12.1, 0.6, 4.0, 2.2, 0.6, 1.9, 2.1], ["İlkadım", "Atakum", "Bafra", "Çarşamba", "Canik", "Vezirköprü", "Terme", "Tekkeköy", "Havza", "Alaçam", "19 Mayıs", "Ayvacık", "Kavak", "Salıpazarı", "Asarcık", "Ladik", "Yakakent"]],
  ["56", "Siirt", "Güneydoğu Anadolu", 37.93, 41.94, 200100, 82.5, 3, [35.7, 7.7, 3.9, 1.5, 46.2, 1.9, 0.5, 0.3, 0.4, 1.9], ["Merkez", "Kurtalan", "Pervari", "Baykan", "Şirvan", "Eruh", "Tillo"]],
  ["57", "Sinop", "Karadeniz", 42.02, 35.15, 174100, 88.2, 2, [42.9, 25.8, 9.2, 9.5, 0.6, 2.5, 1.6, 1.2, 3.8, 2.9], ["Merkez", "Boyabat", "Ayancık", "Gerze", "Türkeli", "Durağan", "Erfelek", "Saraydüzü", "Dikmen"]],
  ["58", "Sivas", "İç Anadolu", 39.74, 37.01, 464100, 89.6, 5, [40.6, 16.4, 18.0, 7.3, 0.7, 3.8, 1.7, 0.3, 9.9, 1.3], ["Merkez", "Şarkışla", "Yıldızeli", "Suşehri", "Gemerek", "Zara", "Kangal", "Gürün", "Divriği", "Koyulhisar", "Altınyayla", "Hafik", "Ulaş", "İmranlı", "Akıncılar", "Gölova", "Doğanşar"]],
  ["59", "Tekirdağ", "Marmara", 40.97, 27.51, 849100, 90.6, 8, [30.7, 36.3, 6.4, 11.3, 6.2, 1.7, 2.4, 1.9, 0.7, 2.4], ["Çorlu", "Süleymanpaşa", "Çerkezköy", "Kapaklı", "Ergene", "Malkara", "Saray", "Hayrabolu", "Şarköy", "Muratlı", "Marmaraereğlisi"]],
  ["60", "Tokat", "Karadeniz", 40.31, 36.55, 444100, 90.0, 5, [37.4, 20.7, 22.1, 11.0, 0.6, 2.9, 1.5, 0.4, 2.2, 1.2], ["Merkez", "Erbaa", "Turhal", "Niksar", "Zile", "Reşadiye", "Almus", "Pazar", "Başçiftlik", "Yeşilyurt", "Artova", "Sulusaray"]],
  ["61", "Trabzon", "Karadeniz", 41.00, 39.71, 613100, 88.9, 6, [47.8, 18.0, 10.9, 12.1, 0.5, 4.6, 2.1, 0.4, 1.5, 2.1], ["Ortahisar", "Akçaabat", "Araklı", "Of", "Yomra", "Arsin", "Vakfıkebir", "Sürmene", "Maçka", "Beşikdüzü", "Çarşıbaşı", "Tonya", "Çaykara", "Şalpazarı", "Düzköy", "Köprübaşı", "Dernekpazarı", "Hayrat"]],
  ["62", "Tunceli", "Doğu Anadolu", 39.10, 39.54, 65100, 86.2, 1, [12.9, 32.0, 5.6, 2.1, 42.9, 0.5, 0.7, 1.1, 0.3, 1.9], ["Merkez", "Pertek", "Mazgirt", "Çemişgezek", "Hozat", "Ovacık", "Pülümür", "Nazımiye"]],
  ["63", "Şanlıurfa", "Güneydoğu Anadolu", 37.16, 38.79, 1221100, 81.9, 14, [43.0, 8.0, 9.4, 4.5, 24.8, 2.9, 0.7, 0.3, 0.6, 5.8], ["Eyyübiye", "Haliliye", "Karaköprü", "Siverek", "Viranşehir", "Suruç", "Akçakale", "Birecik", "Ceylanpınar", "Harran", "Bozova", "Hilvan", "Halfeti"]],
  ["64", "Uşak", "Ege", 38.68, 29.40, 281100, 90.4, 3, [36.0, 29.0, 9.5, 17.4, 1.2, 1.7, 2.0, 0.5, 0.9, 1.8], ["Merkez", "Banaz", "Eşme", "Sivaslı", "Ulubey", "Karahallı"]],
  ["65", "Van", "Doğu Anadolu", 38.49, 43.38, 707100, 79.4, 8, [26.2, 8.7, 5.1, 1.3, 52.8, 3.1, 0.6, 0.4, 0.4, 1.4], ["İpekyolu", "Erciş", "Tuşba", "Edremit", "Özalp", "Çaldıran", "Başkale", "Muradiye", "Gürpınar", "Gevaş", "Çatak", "Bahçesaray", "Saray"]],
  ["66", "Yozgat", "İç Anadolu", 39.82, 34.81, 302100, 88.2, 4, [43.6, 2.2, 23.0, 22.9, 0.5, 4.3, 1.3, 0.2, 1.3, 0.7], ["Merkez", "Sorgun", "Akdağmadeni", "Yerköy", "Boğazlıyan", "Sarıkaya", "Çekerek", "Şefaatli", "Saraykent", "Çayıralan", "Kadışehri", "Aydıncık", "Yenifakılı", "Çandır"]],
  ["67", "Zonguldak", "Karadeniz", 41.45, 31.79, 456100, 89.2, 5, [40.0, 32.1, 8.4, 10.0, 0.6, 2.5, 2.4, 0.7, 1.0, 2.3], ["Ereğli", "Merkez", "Çaycuma", "Devrek", "Kozlu", "Alaplı", "Kilimli", "Gökçebey"]],
  ["68", "Aksaray", "İç Anadolu", 38.36, 34.03, 296100, 87.9, 4, [44.1, 2.5, 21.0, 24.6, 0.7, 2.6, 1.6, 0.3, 1.5, 1.1], ["Merkez", "Ortaköy", "Eskil", "Gülağaç", "Güzelyurt", "Sultanhanı", "Ağaçören", "Sarıyahşi"]],
  ["69", "Bayburt", "Karadeniz", 40.25, 40.22, 59100, 87.5, 1, [59.5, 2.1, 16.6, 15.8, 0.4, 3.0, 1.0, 0.2, 0.7, 0.7], ["Merkez", "Demirözü", "Aydıntepe"]],
  ["70", "Karaman", "İç Anadolu", 37.18, 33.22, 189100, 90.1, 3, [41.1, 19.3, 18.1, 11.1, 0.7, 3.6, 2.1, 0.4, 2.0, 1.6], ["Merkez", "Ermenek", "Sarıveliler", "Ayrancı", "Kazımkarabekir", "Başyayla"]],
  ["71", "Kırıkkale", "İç Anadolu", 39.84, 33.51, 206100, 89.4, 3, [35.6, 26.6, 21.3, 10.1, 0.6, 1.9, 1.5, 0.3, 1.0, 1.1], ["Merkez", "Yahşihan", "Keskin", "Delice", "Bahşılı", "Sulakyurt", "Balışeyh", "Karakeçili", "Çelebi"]],
  ["72", "Batman", "Güneydoğu Anadolu", 37.88, 41.13, 396100, 83.8, 5, [27.5, 8.1, 1.8, 1.1, 57.9, 1.5, 0.4, 0.3, 0.3, 1.1], ["Merkez", "Kozluk", "Beşiri", "Sason", "Gercüş", "Hasankeyf"]],
  ["73", "Şırnak", "Güneydoğu Anadolu", 37.51, 42.46, 326100, 83.9, 4, [21.3, 8.6, 2.4, 1.2, 62.7, 1.1, 0.6, 0.3, 0.3, 1.5], ["Cizre", "Silopi", "Merkez", "İdil", "Uludere", "Beytüşşebap", "Güçlükonak"]],
  ["74", "Bartın", "Karadeniz", 41.63, 32.33, 156100, 89.2, 2, [36.9, 31.5, 23.6, 3.2, 0.5, 1.7, 1.1, 0.4, 0.5, 0.6], ["Merkez", "Ulus", "Amasra", "Kurucaşile"]],
  ["75", "Ardahan", "Doğu Anadolu", 41.11, 42.70, 68100, 84.5, 2, [34.8, 29.6, 3.3, 4.9, 21.6, 1.1, 0.9, 0.6, 0.5, 2.7], ["Merkez", "Göle", "Çıldır", "Hanak", "Posof", "Damal"]],
  ["76", "Iğdır", "Doğu Anadolu", 39.92, 44.04, 136100, 78.6, 2, [35.2, 6.4, 4.7, 6.7, 43.9, 0.7, 0.6, 0.3, 0.4, 1.1], ["Merkez", "Tuzluca", "Aralık", "Karakoyunlu"]],
  ["77", "Yalova", "Marmara", 40.65, 29.27, 206100, 88.2, 3, [34.2, 28.8, 11.3, 9.5, 5.7, 2.6, 2.4, 1.4, 0.8, 3.3], ["Merkez", "Çiftlikköy", "Çınarcık", "Altınova", "Armutlu", "Termal"]],
  ["78", "Karabük", "Karadeniz", 41.20, 32.62, 187100, 89.4, 3, [37.6, 22.0, 15.9, 9.7, 0.6, 8.2, 2.2, 0.4, 1.2, 2.2], ["Merkez", "Safranbolu", "Yenice", "Eskipazar", "Eflani", "Ovacık"]],
  ["79", "Kilis", "Güneydoğu Anadolu", 36.71, 37.11, 99100, 87.8, 2, [39.7, 20.2, 26.8, 5.6, 1.2, 2.6, 1.6, 0.3, 0.8, 1.2], ["Merkez", "Musabeyli", "Elbeyli", "Polateli"]],
  ["80", "Osmaniye", "Akdeniz", 37.07, 36.24, 386100, 87.9, 4, [33.1, 17.2, 28.5, 12.6, 2.1, 2.0, 1.9, 0.4, 1.0, 1.2], ["Merkez", "Kadirli", "Düziçi", "Bahçe", "Toprakkale", "Sumbas", "Hasanbeyli"]],
  ["81", "Düzce", "Karadeniz", 40.84, 31.16, 300100, 90.5, 3, [49.4, 22.7, 16.1, 2.0, 1.1, 3.9, 1.8, 0.5, 1.1, 1.4], ["Merkez", "Akçakoca", "Kaynaşlı", "Gölyaka", "Çilimli", "Yığılca", "Gümüşova", "Cumayeri"]]
];

// Multi-district provinces (87 Electoral Districts total: 77 single-district provinces + 10 sub-districts in Ankara, Bursa, İstanbul, İzmir)
const MULTI_DISTRICTS_RAW = [
  // [districtId, ilId, name, mpCount, voters2023, turnout2023, shares(AKP,CHP,MHP,IYI,DEM,YRP,ZP,TIP,BBP,OTHER), ilcelerList]
  [
    "06-1", "06", "Ankara 1. Bölge", 13, 1580000, 90.8,
    [25.1, 41.3, 8.2, 13.1, 3.8, 1.7, 3.1, 2.0, 0.7, 1.0],
    ["Çankaya", "Mamak", "Gölbaşı", "Polatlı", "Elmadağ", "Şereflikoçhisar", "Bala", "Haymana", "Evren"]
  ],
  [
    "06-2", "06", "Ankara 2. Bölge", 11, 1290000, 90.4,
    [42.0, 20.5, 11.9, 11.4, 2.6, 3.9, 3.3, 1.1, 1.8, 1.5],
    ["Keçiören", "Altındağ", "Pursaklar", "Çubuk", "Akyurt", "Kahramankazan", "Kızılcahamam", "Kalecik", "Çamlıdere", "Güdül"]
  ],
  [
    "06-3", "06", "Ankara 3. Bölge", 12, 1410600, 90.6,
    [32.1, 27.9, 10.9, 13.8, 2.8, 2.5, 3.8, 2.5, 1.2, 2.5],
    ["Yenimahalle", "Etimesgut", "Sincan", "Beypazarı", "Nallıhan", "Ayaş"]
  ],
  [
    "16-1", "16", "Bursa 1. Bölge", 10, 1228900, 90.3,
    [36.3, 27.1, 8.0, 13.6, 3.4, 3.5, 3.8, 1.4, 0.9, 2.0],
    ["Nilüfer", "Osmangazi", "Karacabey", "Mustafakemalpaşa", "Orhaneli", "Büyükorhan"]
  ],
  [
    "16-2", "16", "Bursa 2. Bölge", 10, 1140000, 89.5,
    [42.0, 21.4, 9.2, 10.1, 5.5, 4.4, 3.4, 1.0, 1.1, 1.9],
    ["Yıldırım", "İnegöl", "Gemlik", "Mudanya", "Gürsu", "Kestel", "Orhangazi", "İznik", "Yenişehir", "Keles", "Harmancık"]
  ],
  [
    "34-1", "34", "İstanbul 1. Bölge", 35, 4218000, 90.3,
    [34.7, 31.7, 5.9, 7.8, 6.3, 3.2, 2.7, 4.4, 1.0, 2.3],
    ["Kadıköy", "Üsküdar", "Ataşehir", "Maltepe", "Kartal", "Pendik", "Ümraniye", "Tuzla", "Sancaktepe", "Çekmeköy", "Sultanbeyli", "Beykoz", "Şile", "Adalar"]
  ],
  [
    "34-2", "34", "İstanbul 2. Bölge", 27, 3180000, 89.5,
    [38.3, 26.5, 5.8, 8.5, 7.4, 3.7, 2.7, 3.9, 0.9, 2.3],
    ["Beşiktaş", "Şişli", "Sarıyer", "Beyoğlu", "Kağıthane", "Fatih", "Eyüpsultan", "Gaziosmanpaşa", "Sultangazi", "Bayrampaşa", "Esenler", "Zeytinburnu"]
  ],
  [
    "34-3", "34", "İstanbul 3. Bölge", 36, 3960000, 89.6,
    [35.5, 26.4, 6.8, 8.1, 11.4, 3.0, 3.0, 3.7, 0.8, 1.3],
    ["Bakırköy", "Bahçelievler", "Bağcılar", "Küçükçekmece", "Avcılar", "Esenyurt", "Beylikdüzü", "Büyükçekmece", "Başakşehir", "Arnavutköy", "Çatalca", "Silivri", "Güngören"]
  ],
  [
    "35-1", "35", "İzmir 1. Bölge", 14, 1691000, 90.1,
    [25.5, 42.2, 4.9, 11.9, 9.0, 0.9, 2.3, 0.6, 0.5, 2.2],
    ["Konak", "Karabağlar", "Buca", "Balçova", "Narlıdere", "Güzelbahçe", "Gaziemir", "Torbalı", "Menderes", "Selçuk", "Seferihisar", "Urla", "Çeşme", "Karaburun"]
  ],
  [
    "35-2", "35", "İzmir 2. Bölge", 14, 1750000, 90.7,
    [25.6, 39.2, 5.8, 11.7, 6.1, 1.0, 2.4, 5.2, 0.5, 2.5],
    ["Karşıyaka", "Bornova", "Bayraklı", "Çiğli", "Menemen", "Aliağa", "Foça", "Bergama", "Kınık", "Dikili", "Tire", "Ödemiş", "Kiraz", "Beydağ", "Bayındır", "Kemalpaşa"]
  ]
];

const PARTY_KEYS = ["AKP", "CHP", "MHP", "IYI", "DEM", "YRP", "ZP", "TIP", "BBP", "OTHER"];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Deterministic pseudo-random generator so ilçe variations are realistic and reproducible
function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Known iconic ilçe ideological profiles so major urban districts reflect real-world political character
const SPECIAL_ILCE_PROFILES = {
  "34-kadikoy": { AKP: 12.2, CHP: 64.5, MHP: 2.1, IYI: 7.4, DEM: 3.1, YRP: 0.6, ZP: 1.8, TIP: 6.9, BBP: 0.3, OTHER: 1.1 },
  "34-besiktas": { AKP: 11.4, CHP: 65.2, MHP: 2.0, IYI: 8.1, DEM: 3.2, YRP: 0.5, ZP: 1.7, TIP: 6.5, BBP: 0.2, OTHER: 1.2 },
  "34-bakirkoy": { AKP: 16.5, CHP: 57.8, MHP: 3.1, IYI: 8.8, DEM: 4.2, YRP: 0.8, ZP: 2.0, TIP: 5.2, BBP: 0.3, OTHER: 1.3 },
  "34-sisli": { AKP: 20.5, CHP: 51.2, MHP: 3.2, IYI: 7.1, DEM: 7.5, YRP: 1.1, ZP: 2.1, TIP: 5.5, BBP: 0.4, OTHER: 1.4 },
  "34-sultanbeyli": { AKP: 52.8, CHP: 10.5, MHP: 7.9, IYI: 3.5, DEM: 13.8, YRP: 6.8, ZP: 1.8, TIP: 0.9, BBP: 1.1, OTHER: 0.9 },
  "34-esenyurt": { AKP: 33.4, CHP: 24.8, MHP: 5.9, IYI: 5.2, DEM: 21.5, YRP: 2.6, ZP: 2.4, TIP: 2.5, BBP: 0.6, OTHER: 1.1 },
  "34-uskudar": { AKP: 36.2, CHP: 34.8, MHP: 5.4, IYI: 8.9, DEM: 3.6, YRP: 3.4, ZP: 2.6, TIP: 3.2, BBP: 0.8, OTHER: 1.1 },
  "34-fatih": { AKP: 42.1, CHP: 26.4, MHP: 5.2, IYI: 6.8, DEM: 7.2, YRP: 4.5, ZP: 2.7, TIP: 2.5, BBP: 0.9, OTHER: 1.7 },
  "06-cankaya": { AKP: 16.8, CHP: 53.4, MHP: 5.8, IYI: 12.6, DEM: 3.2, YRP: 1.0, ZP: 2.8, TIP: 2.6, BBP: 0.6, OTHER: 1.2 },
  "06-kecioren": { AKP: 40.5, CHP: 22.8, MHP: 12.1, IYI: 11.8, DEM: 2.4, YRP: 3.6, ZP: 3.5, TIP: 1.1, BBP: 1.2, OTHER: 1.0 },
  "06-yenimahalle": { AKP: 29.8, CHP: 35.6, MHP: 9.8, IYI: 13.9, DEM: 2.5, YRP: 2.1, ZP: 3.2, TIP: 1.5, BBP: 0.8, OTHER: 0.8 },
  "35-karsiyaka": { AKP: 14.2, CHP: 59.4, MHP: 3.2, IYI: 11.2, DEM: 3.8, YRP: 0.5, ZP: 2.1, TIP: 4.1, BBP: 0.3, OTHER: 1.2 },
  "35-konak": { AKP: 22.4, CHP: 46.8, MHP: 4.1, IYI: 10.4, DEM: 8.9, YRP: 0.8, ZP: 2.2, TIP: 2.5, BBP: 0.4, OTHER: 1.5 },
};

function generateIlcelerForDistrict(districtId, ilId, baseLat, baseLng, districtVoters, districtTurnout, districtSharesArray, ilceNames) {
  const ilceler = [];
  const n = ilceNames.length;
  // Distribute voters with realistic Zipf-like weights (first ilçeler are larger urban centers)
  const weights = ilceNames.map((name, idx) => {
    const r = seededRandom(`${districtId}-${name}-w`);
    return Math.pow(n - idx, 1.35) * (0.75 + 0.5 * r);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // First pass: generate raw shares and voter counts for each ilçe
  const rawIlces = ilceNames.map((name, idx) => {
    const id = `${ilId}-${slugify(name)}`;
    const weight = weights[idx] / totalWeight;
    const registeredVoters = Math.max(1200, Math.round(districtVoters * weight));
    const rTurn = seededRandom(`${id}-turn`);
    const turnout = Number(Math.min(95.5, Math.max(72.0, districtTurnout + (rTurn - 0.5) * 3.2)).toFixed(2));

    // Spiral offset around province/district center for geographic coordinate plotting
    const angle = (idx / Math.max(1, n)) * Math.PI * 2 + seededRandom(`${id}-ang`) * 0.5;
    const radius = idx === 0 ? 0.04 : 0.12 + (idx / n) * 0.38;
    const lat = Number((baseLat + Math.sin(angle) * radius * 0.75).toFixed(4));
    const lng = Number((baseLng + Math.cos(angle) * radius).toFixed(4));

    let shares = {};
    if (SPECIAL_ILCE_PROFILES[id]) {
      shares = { ...SPECIAL_ILCE_PROFILES[id] };
    } else {
      let sum = 0;
      PARTY_KEYS.forEach((pKey, pIdx) => {
        const baseVal = districtSharesArray[pIdx];
        const r = seededRandom(`${id}-${pKey}`);
        // Urban vs rural gradient based on idx
        const variation = (r - 0.5) * 0.28 * baseVal;
        const val = Math.max(0.1, baseVal + variation);
        shares[pKey] = val;
        sum += val;
      });
      PARTY_KEYS.forEach((pKey) => {
        shares[pKey] = Number(((shares[pKey] / sum) * 100).toFixed(2));
      });
    }

    return {
      id,
      name,
      ilId,
      districtId,
      registeredVoters,
      turnout,
      validVoteRatio: 97.6,
      partyShares: shares,
      lat,
      lng,
    };
  });

  // Second pass: calibrate unlocked ilçe shares so the weighted district average matches districtSharesArray closely
  const currentWeightedVotes = {};
  let totalValid = 0;
  for (const ilce of rawIlces) {
    const valid = ilce.registeredVoters * (ilce.turnout / 100) * (ilce.validVoteRatio / 100);
    totalValid += valid;
    for (const pKey of PARTY_KEYS) {
      currentWeightedVotes[pKey] = (currentWeightedVotes[pKey] || 0) + valid * (ilce.partyShares[pKey] / 100);
    }
  }

  for (const ilce of rawIlces) {
    let sum = 0;
    const calibrated = {};
    PARTY_KEYS.forEach((pKey, pIdx) => {
      const targetPct = districtSharesArray[pIdx];
      const actualPct = totalValid > 0 ? (currentWeightedVotes[pKey] / totalValid) * 100 : targetPct;
      const ratio = actualPct > 0.1 ? targetPct / actualPct : 1;
      const val = Math.max(0.05, ilce.partyShares[pKey] * ratio);
      calibrated[pKey] = val;
      sum += val;
    });
    PARTY_KEYS.forEach((pKey) => {
      calibrated[pKey] = Number(((calibrated[pKey] / sum) * 100).toFixed(2));
    });
    ilce.partyShares = calibrated;
    ilceler.push(ilce);
  }

  return ilceler;
}

// Convert 2023 General Election shares into 2024 Local Election (31 Mart 2024 İl Genel / Belediye Meclisi) shares
function convertTo2024LocalShares(shares2023, seedKey) {
  // 2024 Local Election national trend: CHP ~37.8%, AKP ~35.5%, YRP ~6.2%, DEM ~5.7%, MHP ~5.0%, IYI ~3.8%, ZP ~1.7%, BBP ~1.6%
  const multipliers = {
    AKP: 0.91,
    CHP: 1.38,
    MHP: 0.72,
    IYI: 0.42,
    DEM: 0.88,
    YRP: 2.18,
    ZP: 0.78,
    TIP: 0.45,
    BBP: 1.35,
    OTHER: 1.15,
  };
  const raw = {};
  let sum = 0;
  for (const pKey of PARTY_KEYS) {
    const r = 0.95 + seededRandom(`${seedKey}-2024-${pKey}`) * 0.1;
    raw[pKey] = Math.max(0.05, (shares2023[pKey] || 0) * multipliers[pKey] * r);
    sum += raw[pKey];
  }
  const normalized = {};
  for (const pKey of PARTY_KEYS) {
    normalized[pKey] = Number(((raw[pKey] / sum) * 100).toFixed(2));
  }
  return normalized;
}

function buildDatasets() {
  const provinces = [];
  const districts2023 = [];
  const ilceler2023 = [];

  const multiMap = {};
  for (const m of MULTI_DISTRICTS_RAW) {
    if (!multiMap[m[1]]) multiMap[m[1]] = [];
    multiMap[m[1]].push(m);
  }

  for (const pRow of PROVINCES_RAW) {
    const [plateStr, name, region, lat, lng, voters, turnout, mpCount, sharesArr, ilceNames] = pRow;
    const plateCode = Number(plateStr);

    if (multiMap[plateStr]) {
      const subDistricts = multiMap[plateStr];
      provinces.push({
        id: plateStr,
        plateCode,
        name,
        region,
        districtIds: subDistricts.map((d) => d[0]),
        lat,
        lng,
      });

      subDistricts.forEach((dRow, dIdx) => {
        const [dId, ilId, dName, dMp, dVoters, dTurnout, dSharesArr, dIlceNames] = dRow;
        districts2023.push({
          id: dId,
          ilId,
          name: dName,
          mpCount: dMp,
        });
        const dLat = lat + (dIdx - 1) * 0.08;
        const dLng = lng + (dIdx - 1) * 0.12;
        const generated = generateIlcelerForDistrict(
          dId,
          ilId,
          dLat,
          dLng,
          dVoters,
          dTurnout,
          dSharesArr,
          dIlceNames
        );
        ilceler2023.push(...generated);
      });
    } else {
      provinces.push({
        id: plateStr,
        plateCode,
        name,
        region,
        districtIds: [plateStr],
        lat,
        lng,
      });
      districts2023.push({
        id: plateStr,
        ilId: plateStr,
        name,
        mpCount,
      });
      const generated = generateIlcelerForDistrict(
        plateStr,
        plateStr,
        lat,
        lng,
        voters,
        turnout,
        sharesArr,
        ilceNames
      );
      ilceler2023.push(...generated);
    }
  }

  const abroad2023 = {
    enabled: true,
    syncWithNationalSwing: true,
    registeredVoters: 3416098,
    turnout: 53.8,
    validVoteRatio: 98.4,
    partyShares: {
      AKP: 45.4,
      CHP: 24.5,
      MHP: 12.6,
      IYI: 3.5,
      DEM: 9.4,
      YRP: 1.1,
      ZP: 0.9,
      TIP: 1.5,
      BBP: 0.4,
      OTHER: 0.7,
    },
  };

  // Compute exact national baseline shares from generated ilceler + abroad
  let totalValid2023 = 0;
  let totalVoters2023 = 0;
  let totalCast2023 = 0;
  const partyVotes2023 = {};
  for (const pKey of PARTY_KEYS) partyVotes2023[pKey] = 0;

  for (const ilce of ilceler2023) {
    const cast = Math.round(ilce.registeredVoters * (ilce.turnout / 100));
    const valid = Math.round(cast * (ilce.validVoteRatio / 100));
    totalVoters2023 += ilce.registeredVoters;
    totalCast2023 += cast;
    totalValid2023 += valid;
    for (const pKey of PARTY_KEYS) {
      partyVotes2023[pKey] += Math.round(valid * (ilce.partyShares[pKey] / 100));
    }
  }

  const abroadValid = Math.round(
    abroad2023.registeredVoters * (abroad2023.turnout / 100) * (abroad2023.validVoteRatio / 100)
  );
  totalValid2023 += abroadValid;
  for (const pKey of PARTY_KEYS) {
    partyVotes2023[pKey] += Math.round(abroadValid * (abroad2023.partyShares[pKey] / 100));
  }

  const nationalBaseShares2023 = {};
  for (const pKey of PARTY_KEYS) {
    nationalBaseShares2023[pKey] = Number(((partyVotes2023[pKey] / totalValid2023) * 100).toFixed(2));
  }
  const nationalBaseTurnout2023 = Number(((totalCast2023 / totalVoters2023) * 100).toFixed(2));

  // Build 2024 Local Election baseline dataset
  const ilceler2024 = ilceler2023.map((ilce) => ({
    ...ilce,
    registeredVoters: Math.round(ilce.registeredVoters * 1.012),
    turnout: Number(Math.max(65.0, ilce.turnout - 10.1).toFixed(2)),
    partyShares: convertTo2024LocalShares(ilce.partyShares, ilce.id),
  }));

  let totalValid2024 = 0;
  let totalVoters2024 = 0;
  let totalCast2024 = 0;
  const partyVotes2024 = {};
  for (const pKey of PARTY_KEYS) partyVotes2024[pKey] = 0;

  for (const ilce of ilceler2024) {
    const cast = Math.round(ilce.registeredVoters * (ilce.turnout / 100));
    const valid = Math.round(cast * (ilce.validVoteRatio / 100));
    totalVoters2024 += ilce.registeredVoters;
    totalCast2024 += cast;
    totalValid2024 += valid;
    for (const pKey of PARTY_KEYS) {
      partyVotes2024[pKey] += Math.round(valid * (ilce.partyShares[pKey] / 100));
    }
  }

  const nationalBaseShares2024 = {};
  for (const pKey of PARTY_KEYS) {
    nationalBaseShares2024[pKey] = Number(((partyVotes2024[pKey] / totalValid2024) * 100).toFixed(2));
  }
  const nationalBaseTurnout2024 = Number(((totalCast2024 / totalVoters2024) * 100).toFixed(2));

  const dataset2023 = {
    id: '2023_general',
    nameTr: '14 Mayıs 2023 Genel Seçimi',
    nameEn: 'May 14, 2023 General Election',
    provinces,
    districts: districts2023,
    ilceler: ilceler2023,
    abroad: abroad2023,
    nationalBaseShares: nationalBaseShares2023,
    nationalBaseTurnout: nationalBaseTurnout2023,
  };

  const dataset2024 = {
    id: '2024_local',
    nameTr: '31 Mart 2024 Yerel Seçimi (İl Genel/Belediye Meclisi)',
    nameEn: 'March 31, 2024 Local Election Baseline',
    provinces,
    districts: districts2023,
    ilceler: ilceler2024,
    abroad: {
      ...abroad2023,
      enabled: false,
    },
    nationalBaseShares: nationalBaseShares2024,
    nationalBaseTurnout: nationalBaseTurnout2024,
  };

  const outDir = path.resolve('src/data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'baseline2023.json'),
    JSON.stringify(dataset2023)
  );
  fs.writeFileSync(
    path.join(outDir, 'baseline2024.json'),
    JSON.stringify(dataset2024)
  );

  console.log(`Generated ${provinces.length} provinces, ${districts2023.length} electoral districts (${districts2023.reduce((s, d) => s + d.mpCount, 0)} MPs), and ${ilceler2023.length} ilçeler!`);
}

buildDatasets();
