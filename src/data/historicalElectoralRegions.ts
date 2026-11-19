/**
 * Authentic historical electoral circles (secim cevreleri) and cross-province
 * ilce transfers for 1987 (Law 3270 / RG 19510, 19519, 19525, 19659) and
 * 1991 (RG 20950, 20987, 21038) covering all 973 modern ilce geometries.
 */

export interface CustomDistrictSpec {
  id: string;
  name: string;
  ilId: string;
  mpCount: number;
  ilceIds: string[];
}

export const ILCE_PROVINCE_OVERRIDES_1987: Record<string, string> = {
  "68-agacoren": "06",
  "68-sariyahsi": "06",
  "72-gercus": "47",
  "72-hasankeyf": "47",
  "73-cizre": "47",
  "73-silopi": "47",
  "73-i-dil": "47",
  "73-uludere": "30",
  "73-beytussebap": "30",
  "77-altinova": "41",
  "77-armutlu": "16",
  "78-eskipazar": "18",
  "78-ovacik": "18"
};

export const ILCE_PROVINCE_OVERRIDES_1991: Record<string, string> = {
  "77-altinova": "41",
  "77-armutlu": "16",
  "78-eskipazar": "18",
  "78-ovacik": "18"
};

export const ILCE_MERGES_1987: Record<string, string> = {
  "30-derecik": "30-semdinli",
  "08-kemalpasa": "08-hopa",
  "68-sultanhani": "68-merkez",
  "10-altieylul": "10-karesi",
  "20-merkezefendi": "20-pamukkale",
  "31-defne": "31-antakya",
  "31-arsuz": "31-i-skenderun",
  "31-payas": "31-dortyol",
  "45-sehzadeler": "45-yunusemre",
  "46-dulkadiroglu": "46-onikisubat",
  "48-seydikemer": "48-fethiye",
  "59-kapakli": "59-cerkezkoy",
  "59-ergene": "59-corlu",
  "63-haliliye": "63-eyyubiye",
  "63-karakopru": "63-eyyubiye",
  "65-tusba": "65-i-pekyolu",
  "67-kilimli": "67-merkez",
  "67-kozlu": "67-merkez",
  "01-cukurova": "01-seyhan",
  "01-saricam": "01-yuregir",
  "06-pursaklar": "06-kecioren",
  "07-aksu": "07-muratpasa",
  "07-dosemealti": "07-muratpasa",
  "07-kepez": "07-muratpasa",
  "07-konyaalti": "07-muratpasa",
  "21-baglar": "21-sur",
  "21-kayapinar": "21-sur",
  "21-yenisehir": "21-sur",
  "25-palandoken": "25-yakutiye",
  "25-aziziye": "25-yakutiye",
  "26-tepebasi": "26-odunpazari",
  "33-mezitli": "33-akdeniz",
  "33-toroslar": "33-akdeniz",
  "33-yenisehir": "33-akdeniz",
  "34-atasehir": "34-kadikoy",
  "34-cekmekoy": "34-umraniye",
  "34-sancaktepe": "34-umraniye",
  "34-sultangazi": "34-gaziosmanpasa",
  "34-arnavutkoy": "34-catalca",
  "34-basaksehir": "34-kucukcekmece",
  "34-beylikduzu": "34-buyukcekmece",
  "34-esenyurt": "34-buyukcekmece",
  "35-bayrakli": "35-karsiyaka",
  "41-basiskele": "41-i-zmit",
  "41-kartepe": "41-i-zmit",
  "41-cayirova": "41-gebze",
  "41-darica": "41-gebze",
  "41-dilovasi": "41-gebze",
  "54-arifiye": "54-adapazari",
  "54-erenler": "54-adapazari",
  "54-serdivan": "54-adapazari",
  "55-atakum": "55-i-lkadim",
  "55-canik": "55-i-lkadim"
};

export const ILCE_MERGES_1991: Record<string, string> = {
  "30-derecik": "30-semdinli",
  "08-kemalpasa": "08-hopa",
  "68-sultanhani": "68-merkez",
  "10-altieylul": "10-karesi",
  "20-merkezefendi": "20-pamukkale",
  "31-defne": "31-antakya",
  "31-arsuz": "31-i-skenderun",
  "31-payas": "31-dortyol",
  "45-sehzadeler": "45-yunusemre",
  "46-dulkadiroglu": "46-onikisubat",
  "48-seydikemer": "48-fethiye",
  "59-kapakli": "59-cerkezkoy",
  "59-ergene": "59-corlu",
  "63-haliliye": "63-eyyubiye",
  "63-karakopru": "63-eyyubiye",
  "65-tusba": "65-i-pekyolu",
  "67-kilimli": "67-merkez",
  "67-kozlu": "67-merkez",
  "01-cukurova": "01-seyhan",
  "01-saricam": "01-yuregir",
  "06-pursaklar": "06-kecioren",
  "07-aksu": "07-muratpasa",
  "07-dosemealti": "07-muratpasa",
  "07-kepez": "07-muratpasa",
  "07-konyaalti": "07-muratpasa",
  "21-baglar": "21-sur",
  "21-kayapinar": "21-sur",
  "21-yenisehir": "21-sur",
  "25-palandoken": "25-yakutiye",
  "25-aziziye": "25-yakutiye",
  "26-tepebasi": "26-odunpazari",
  "33-mezitli": "33-akdeniz",
  "33-toroslar": "33-akdeniz",
  "33-yenisehir": "33-akdeniz",
  "34-atasehir": "34-kadikoy",
  "34-cekmekoy": "34-umraniye",
  "34-sancaktepe": "34-umraniye",
  "34-sultangazi": "34-gaziosmanpasa",
  "34-arnavutkoy": "34-catalca",
  "34-basaksehir": "34-kucukcekmece",
  "34-beylikduzu": "34-buyukcekmece",
  "34-esenyurt": "34-buyukcekmece",
  "35-karabaglar": "35-konak",
  "35-bayrakli": "35-karsiyaka",
  "41-basiskele": "41-i-zmit",
  "41-kartepe": "41-i-zmit",
  "41-cayirova": "41-gebze",
  "41-darica": "41-gebze",
  "41-dilovasi": "41-gebze",
  "54-arifiye": "54-adapazari",
  "54-erenler": "54-adapazari",
  "54-serdivan": "54-adapazari",
  "55-atakum": "55-i-lkadim",
  "55-canik": "55-i-lkadim"
};

export const CUSTOM_DISTRICTS_1987: CustomDistrictSpec[] = [
  {
    "id": "01-1",
    "name": "Adana 1. Bölge",
    "ilId": "01",
    "mpCount": 6,
    "ilceIds": [
      "01-ceyhan",
      "01-feke",
      "01-i-mamoglu",
      "01-kozan",
      "01-saimbeyli",
      "01-tufanbeyli",
      "01-yumurtalik",
      "80-bahce",
      "80-duzici",
      "80-hasanbeyli",
      "80-kadirli",
      "80-merkez",
      "80-sumbas",
      "80-toprakkale"
    ]
  },
  {
    "id": "01-2",
    "name": "Adana 2. Bölge",
    "ilId": "01",
    "mpCount": 5,
    "ilceIds": [
      "01-aladag",
      "01-cukurova",
      "01-karaisali",
      "01-seyhan"
    ]
  },
  {
    "id": "01-3",
    "name": "Adana 3. Bölge",
    "ilId": "01",
    "mpCount": 3,
    "ilceIds": [
      "01-karatas",
      "01-pozanti",
      "01-saricam",
      "01-yuregir"
    ]
  },
  {
    "id": "02",
    "name": "Adıyaman",
    "ilId": "02",
    "mpCount": 4,
    "ilceIds": [
      "02-besni",
      "02-celikhan",
      "02-gerger",
      "02-golbasi",
      "02-kahta",
      "02-merkez",
      "02-samsat",
      "02-sincik",
      "02-tut"
    ]
  },
  {
    "id": "03",
    "name": "Afyonkarahisar",
    "ilId": "03",
    "mpCount": 6,
    "ilceIds": [
      "03-basmakci",
      "03-bayat",
      "03-bolvadin",
      "03-cay",
      "03-cobanlar",
      "03-dazkiri",
      "03-dinar",
      "03-emirdag",
      "03-evciler",
      "03-hocalar",
      "03-i-hsaniye",
      "03-i-scehisar",
      "03-kiziloren",
      "03-merkez",
      "03-sandikli",
      "03-sinanpasa",
      "03-suhut",
      "03-sultandagi"
    ]
  },
  {
    "id": "04",
    "name": "Ağrı",
    "ilId": "04",
    "mpCount": 4,
    "ilceIds": [
      "04-diyadin",
      "04-dogubayazit",
      "04-eleskirt",
      "04-hamur",
      "04-merkez",
      "04-patnos",
      "04-taslicay",
      "04-tutak"
    ]
  },
  {
    "id": "05",
    "name": "Amasya",
    "ilId": "05",
    "mpCount": 4,
    "ilceIds": [
      "05-goynucek",
      "05-gumushacikoy",
      "05-hamamozu",
      "05-merkez",
      "05-merzifon",
      "05-suluova",
      "05-tasova"
    ]
  },
  {
    "id": "06-1",
    "name": "Ankara 1. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-bala",
      "06-cankaya",
      "06-evren",
      "06-sereflikochisar",
      "68-agacoren",
      "68-sariyahsi",
      "71-karakecili"
    ]
  },
  {
    "id": "06-2",
    "name": "Ankara 2. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-altindag",
      "06-kalecik",
      "71-bahsili",
      "71-baliseyh",
      "71-delice",
      "71-merkez",
      "71-sulakyurt",
      "71-yahsihan"
    ]
  },
  {
    "id": "06-3",
    "name": "Ankara 3. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-ayas",
      "06-beypazari",
      "06-camlidere",
      "06-etimesgut",
      "06-gudul",
      "06-haymana",
      "06-kahramankazan",
      "06-kizilcahamam",
      "06-nallihan",
      "06-polatli",
      "06-sincan",
      "06-yenimahalle"
    ]
  },
  {
    "id": "06-4",
    "name": "Ankara 4. Bölge",
    "ilId": "06",
    "mpCount": 5,
    "ilceIds": [
      "06-akyurt",
      "06-cubuk",
      "06-elmadag",
      "06-golbasi",
      "06-kecioren",
      "06-pursaklar",
      "71-celebi",
      "71-keskin"
    ]
  },
  {
    "id": "06-5",
    "name": "Ankara 5. Bölge",
    "ilId": "06",
    "mpCount": 3,
    "ilceIds": [
      "06-mamak"
    ]
  },
  {
    "id": "07-1",
    "name": "Antalya 1. Bölge",
    "ilId": "07",
    "mpCount": 5,
    "ilceIds": [
      "07-aksu",
      "07-demre",
      "07-dosemealti",
      "07-elmali",
      "07-finike",
      "07-kas",
      "07-kemer",
      "07-kepez",
      "07-konyaalti",
      "07-korkuteli",
      "07-kumluca",
      "07-muratpasa"
    ]
  },
  {
    "id": "07-2",
    "name": "Antalya 2. Bölge",
    "ilId": "07",
    "mpCount": 3,
    "ilceIds": [
      "07-akseki",
      "07-alanya",
      "07-gazipasa",
      "07-gundogmus",
      "07-i-bradi",
      "07-manavgat",
      "07-serik"
    ]
  },
  {
    "id": "08",
    "name": "Artvin",
    "ilId": "08",
    "mpCount": 3,
    "ilceIds": [
      "08-ardanuc",
      "08-arhavi",
      "08-borcka",
      "08-hopa",
      "08-kemalpasa",
      "08-merkez",
      "08-murgul",
      "08-savsat",
      "08-yusufeli"
    ]
  },
  {
    "id": "09-1",
    "name": "Aydın 1. Bölge",
    "ilId": "09",
    "mpCount": 4,
    "ilceIds": [
      "09-didim",
      "09-efeler",
      "09-germencik",
      "09-i-ncirliova",
      "09-kocarli",
      "09-kosk",
      "09-kusadasi",
      "09-soke"
    ]
  },
  {
    "id": "09-2",
    "name": "Aydın 2. Bölge",
    "ilId": "09",
    "mpCount": 3,
    "ilceIds": [
      "09-bozdogan",
      "09-buharkent",
      "09-cine",
      "09-karacasu",
      "09-karpuzlu",
      "09-kuyucak",
      "09-nazilli",
      "09-sultanhisar",
      "09-yenipazar"
    ]
  },
  {
    "id": "10-1",
    "name": "Balıkesir 1. Bölge",
    "ilId": "10",
    "mpCount": 5,
    "ilceIds": [
      "10-altieylul",
      "10-ayvalik",
      "10-balya",
      "10-bigadic",
      "10-burhaniye",
      "10-edremit",
      "10-gomec",
      "10-havran",
      "10-i-vrindi",
      "10-karesi",
      "10-savastepe",
      "10-sindirgi"
    ]
  },
  {
    "id": "10-2",
    "name": "Balıkesir 2. Bölge",
    "ilId": "10",
    "mpCount": 3,
    "ilceIds": [
      "10-bandirma",
      "10-dursunbey",
      "10-erdek",
      "10-gonen",
      "10-kepsut",
      "10-manyas",
      "10-marmara",
      "10-susurluk"
    ]
  },
  {
    "id": "11",
    "name": "Bilecik",
    "ilId": "11",
    "mpCount": 2,
    "ilceIds": [
      "11-bozuyuk",
      "11-golpazari",
      "11-i-nhisar",
      "11-merkez",
      "11-osmaneli",
      "11-pazaryeri",
      "11-sogut",
      "11-yenipazar"
    ]
  },
  {
    "id": "12",
    "name": "Bingöl",
    "ilId": "12",
    "mpCount": 3,
    "ilceIds": [
      "12-adakli",
      "12-genc",
      "12-karliova",
      "12-kigi",
      "12-merkez",
      "12-solhan",
      "12-yayladere",
      "12-yedisu"
    ]
  },
  {
    "id": "13",
    "name": "Bitlis",
    "ilId": "13",
    "mpCount": 3,
    "ilceIds": [
      "13-adilcevaz",
      "13-ahlat",
      "13-guroymak",
      "13-hizan",
      "13-merkez",
      "13-mutki",
      "13-tatvan"
    ]
  },
  {
    "id": "14",
    "name": "Bolu",
    "ilId": "14",
    "mpCount": 5,
    "ilceIds": [
      "14-dortdivan",
      "14-gerede",
      "14-goynuk",
      "14-kibriscik",
      "14-mengen",
      "14-merkez",
      "14-mudurnu",
      "14-seben",
      "14-yenicaga",
      "81-akcakoca",
      "81-cilimli",
      "81-cumayeri",
      "81-golyaka",
      "81-gumusova",
      "81-kaynasli",
      "81-merkez",
      "81-yigilca"
    ]
  },
  {
    "id": "15",
    "name": "Burdur",
    "ilId": "15",
    "mpCount": 3,
    "ilceIds": [
      "15-aglasun",
      "15-altinyayla",
      "15-bucak",
      "15-cavdir",
      "15-celtikci",
      "15-golhisar",
      "15-karamanli",
      "15-kemer",
      "15-merkez",
      "15-tefenni",
      "15-yesilova"
    ]
  },
  {
    "id": "16-1",
    "name": "Bursa 1. Bölge",
    "ilId": "16",
    "mpCount": 6,
    "ilceIds": [
      "16-gursu",
      "16-kestel",
      "16-nilufer",
      "16-osmangazi",
      "16-yildirim"
    ]
  },
  {
    "id": "16-2",
    "name": "Bursa 2. Bölge",
    "ilId": "16",
    "mpCount": 5,
    "ilceIds": [
      "16-buyukorhan",
      "16-gemlik",
      "16-harmancik",
      "16-i-negol",
      "16-i-znik",
      "16-karacabey",
      "16-keles",
      "16-mudanya",
      "16-mustafakemalpasa",
      "16-orhaneli",
      "16-orhangazi",
      "16-yenisehir",
      "77-armutlu"
    ]
  },
  {
    "id": "17",
    "name": "Çanakkale",
    "ilId": "17",
    "mpCount": 4,
    "ilceIds": [
      "17-ayvacik",
      "17-bayramic",
      "17-biga",
      "17-bozcaada",
      "17-can",
      "17-eceabat",
      "17-ezine",
      "17-gelibolu",
      "17-gokceada",
      "17-lapseki",
      "17-merkez",
      "17-yenice"
    ]
  },
  {
    "id": "18",
    "name": "Çankırı",
    "ilId": "18",
    "mpCount": 3,
    "ilceIds": [
      "18-atkaracalar",
      "18-bayramoren",
      "18-cerkes",
      "18-eldivan",
      "18-ilgaz",
      "18-kizilirmak",
      "18-korgun",
      "18-kursunlu",
      "18-merkez",
      "18-orta",
      "18-sabanozu",
      "18-yaprakli",
      "78-eskipazar",
      "78-ovacik"
    ]
  },
  {
    "id": "19",
    "name": "Çorum",
    "ilId": "19",
    "mpCount": 6,
    "ilceIds": [
      "19-alaca",
      "19-bayat",
      "19-bogazkale",
      "19-dodurga",
      "19-i-skilip",
      "19-kargi",
      "19-lacin",
      "19-mecitozu",
      "19-merkez",
      "19-oguzlar",
      "19-ortakoy",
      "19-osmancik",
      "19-sungurlu",
      "19-ugurludag"
    ]
  },
  {
    "id": "20",
    "name": "Denizli",
    "ilId": "20",
    "mpCount": 6,
    "ilceIds": [
      "20-acipayam",
      "20-babadag",
      "20-baklan",
      "20-bekilli",
      "20-beyagac",
      "20-bozkurt",
      "20-buldan",
      "20-cal",
      "20-cameli",
      "20-cardak",
      "20-civril",
      "20-guney",
      "20-honaz",
      "20-kale",
      "20-merkezefendi",
      "20-pamukkale",
      "20-saraykoy",
      "20-serinhisar",
      "20-tavas"
    ]
  },
  {
    "id": "21-1",
    "name": "Diyarbakır 1. Bölge",
    "ilId": "21",
    "mpCount": 5,
    "ilceIds": [
      "21-baglar",
      "21-cermik",
      "21-cinar",
      "21-cungus",
      "21-egil",
      "21-ergani",
      "21-kayapinar",
      "21-kocakoy",
      "21-sur",
      "21-yenisehir"
    ]
  },
  {
    "id": "21-2",
    "name": "Diyarbakır 2. Bölge",
    "ilId": "21",
    "mpCount": 3,
    "ilceIds": [
      "21-bismil",
      "21-dicle",
      "21-hani",
      "21-hazro",
      "21-kulp",
      "21-lice",
      "21-silvan"
    ]
  },
  {
    "id": "22",
    "name": "Edirne",
    "ilId": "22",
    "mpCount": 4,
    "ilceIds": [
      "22-enez",
      "22-havsa",
      "22-i-psala",
      "22-kesan",
      "22-lalapasa",
      "22-meric",
      "22-merkez",
      "22-suloglu",
      "22-uzunkopru"
    ]
  },
  {
    "id": "23",
    "name": "Elazığ",
    "ilId": "23",
    "mpCount": 5,
    "ilceIds": [
      "23-agin",
      "23-alacakaya",
      "23-aricak",
      "23-baskil",
      "23-karakocan",
      "23-keban",
      "23-kovancilar",
      "23-maden",
      "23-merkez",
      "23-palu",
      "23-sivrice"
    ]
  },
  {
    "id": "24",
    "name": "Erzincan",
    "ilId": "24",
    "mpCount": 3,
    "ilceIds": [
      "24-cayirli",
      "24-i-lic",
      "24-kemah",
      "24-kemaliye",
      "24-merkez",
      "24-otlukbeli",
      "24-refahiye",
      "24-tercan",
      "24-uzumlu"
    ]
  },
  {
    "id": "25-1",
    "name": "Erzurum 1. Bölge",
    "ilId": "25",
    "mpCount": 4,
    "ilceIds": [
      "25-askale",
      "25-aziziye",
      "25-cat",
      "25-i-spir",
      "25-palandoken",
      "25-pazaryolu",
      "25-tortum",
      "25-uzundere",
      "25-yakutiye"
    ]
  },
  {
    "id": "25-2",
    "name": "Erzurum 2. Bölge",
    "ilId": "25",
    "mpCount": 3,
    "ilceIds": [
      "25-hinis",
      "25-horasan",
      "25-karacoban",
      "25-karayazi",
      "25-koprukoy",
      "25-narman",
      "25-oltu",
      "25-olur",
      "25-pasinler",
      "25-senkaya",
      "25-tekman"
    ]
  },
  {
    "id": "26",
    "name": "Eskişehir",
    "ilId": "26",
    "mpCount": 5,
    "ilceIds": [
      "26-alpu",
      "26-beylikova",
      "26-cifteler",
      "26-gunyuzu",
      "26-han",
      "26-i-nonu",
      "26-mahmudiye",
      "26-mihalgazi",
      "26-mihaliccik",
      "26-odunpazari",
      "26-saricakaya",
      "26-seyitgazi",
      "26-sivrihisar",
      "26-tepebasi"
    ]
  },
  {
    "id": "27-1",
    "name": "Gaziantep 1. Bölge",
    "ilId": "27",
    "mpCount": 5,
    "ilceIds": [
      "27-oguzeli",
      "27-sahinbey",
      "27-sehitkamil"
    ]
  },
  {
    "id": "27-2",
    "name": "Gaziantep 2. Bölge",
    "ilId": "27",
    "mpCount": 3,
    "ilceIds": [
      "27-araban",
      "27-i-slahiye",
      "27-karkamis",
      "27-nizip",
      "27-nurdagi",
      "27-yavuzeli",
      "79-elbeyli",
      "79-merkez",
      "79-musabeyli",
      "79-polateli"
    ]
  },
  {
    "id": "28",
    "name": "Giresun",
    "ilId": "28",
    "mpCount": 5,
    "ilceIds": [
      "28-alucra",
      "28-bulancak",
      "28-camoluk",
      "28-canakci",
      "28-dereli",
      "28-dogankent",
      "28-espiye",
      "28-eynesil",
      "28-gorele",
      "28-guce",
      "28-kesap",
      "28-merkez",
      "28-piraziz",
      "28-sebinkarahisar",
      "28-tirebolu",
      "28-yaglidere"
    ]
  },
  {
    "id": "29",
    "name": "Gümüşhane",
    "ilId": "29",
    "mpCount": 3,
    "ilceIds": [
      "29-kelkit",
      "29-kose",
      "29-kurtun",
      "29-merkez",
      "29-siran",
      "29-torul",
      "69-aydintepe",
      "69-demirozu",
      "69-merkez"
    ]
  },
  {
    "id": "30",
    "name": "Hakkari",
    "ilId": "30",
    "mpCount": 2,
    "ilceIds": [
      "30-cukurca",
      "30-derecik",
      "30-merkez",
      "30-semdinli",
      "30-yuksekova",
      "73-beytussebap",
      "73-uludere"
    ]
  },
  {
    "id": "31-1",
    "name": "Hatay 1. Bölge",
    "ilId": "31",
    "mpCount": 6,
    "ilceIds": [
      "31-antakya",
      "31-arsuz",
      "31-belen",
      "31-defne",
      "31-dortyol",
      "31-erzin",
      "31-hassa",
      "31-i-skenderun",
      "31-payas"
    ]
  },
  {
    "id": "31-2",
    "name": "Hatay 2. Bölge",
    "ilId": "31",
    "mpCount": 3,
    "ilceIds": [
      "31-altinozu",
      "31-kirikhan",
      "31-kumlu",
      "31-reyhanli",
      "31-samandag",
      "31-yayladagi"
    ]
  },
  {
    "id": "32",
    "name": "Isparta",
    "ilId": "32",
    "mpCount": 4,
    "ilceIds": [
      "32-aksu",
      "32-atabey",
      "32-egirdir",
      "32-gelendost",
      "32-gonen",
      "32-keciborlu",
      "32-merkez",
      "32-sarkikaraagac",
      "32-senirkent",
      "32-sutculer",
      "32-uluborlu",
      "32-yalvac",
      "32-yenisarbademli"
    ]
  },
  {
    "id": "33-1",
    "name": "Mersin 1. Bölge",
    "ilId": "33",
    "mpCount": 6,
    "ilceIds": [
      "33-akdeniz",
      "33-camliyayla",
      "33-mezitli",
      "33-tarsus",
      "33-toroslar",
      "33-yenisehir"
    ]
  },
  {
    "id": "33-2",
    "name": "Mersin 2. Bölge",
    "ilId": "33",
    "mpCount": 3,
    "ilceIds": [
      "33-anamur",
      "33-aydincik",
      "33-bozyazi",
      "33-erdemli",
      "33-gulnar",
      "33-mut",
      "33-silifke"
    ]
  },
  {
    "id": "34-1",
    "name": "İstanbul 1. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-atasehir",
      "34-besiktas",
      "34-kadikoy"
    ]
  },
  {
    "id": "34-2",
    "name": "İstanbul 2. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-beyoglu",
      "34-fatih"
    ]
  },
  {
    "id": "34-3",
    "name": "İstanbul 3. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-adalar",
      "34-kartal",
      "34-maltepe",
      "34-pendik",
      "34-sultanbeyli",
      "34-tuzla",
      "77-ciftlikkoy",
      "77-cinarcik",
      "77-merkez",
      "77-termal"
    ]
  },
  {
    "id": "34-4",
    "name": "İstanbul 4. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-beykoz",
      "34-cekmekoy",
      "34-sancaktepe",
      "34-sariyer",
      "34-sile",
      "34-umraniye",
      "34-uskudar"
    ]
  },
  {
    "id": "34-5",
    "name": "İstanbul 5. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-arnavutkoy",
      "34-beylikduzu",
      "34-buyukcekmece",
      "34-catalca",
      "34-esenyurt",
      "34-kagithane",
      "34-sisli",
      "34-zeytinburnu"
    ]
  },
  {
    "id": "34-6",
    "name": "İstanbul 6. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-bayrampasa",
      "34-eyupsultan",
      "34-gaziosmanpasa",
      "34-silivri",
      "34-sultangazi"
    ]
  },
  {
    "id": "34-7",
    "name": "İstanbul 7. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-bagcilar",
      "34-bahcelievler",
      "34-basaksehir",
      "34-esenler",
      "34-gungoren",
      "34-kucukcekmece"
    ]
  },
  {
    "id": "34-8",
    "name": "İstanbul 8. Bölge",
    "ilId": "34",
    "mpCount": 3,
    "ilceIds": [
      "34-avcilar",
      "34-bakirkoy"
    ]
  },
  {
    "id": "35-1",
    "name": "İzmir 1. Bölge",
    "ilId": "35",
    "mpCount": 5,
    "ilceIds": [
      "35-balcova",
      "35-buca",
      "35-konak",
      "35-narlidere"
    ]
  },
  {
    "id": "35-2",
    "name": "İzmir 2. Bölge",
    "ilId": "35",
    "mpCount": 3,
    "ilceIds": [
      "35-gaziemir",
      "35-karabaglar",
      "35-menderes"
    ]
  },
  {
    "id": "35-3",
    "name": "İzmir 3. Bölge",
    "ilId": "35",
    "mpCount": 6,
    "ilceIds": [
      "35-aliaga",
      "35-bayrakli",
      "35-bergama",
      "35-cigli",
      "35-dikili",
      "35-foca",
      "35-karsiyaka",
      "35-kemalpasa",
      "35-kinik",
      "35-menemen",
      "35-torbali"
    ]
  },
  {
    "id": "35-4",
    "name": "İzmir 4. Bölge",
    "ilId": "35",
    "mpCount": 5,
    "ilceIds": [
      "35-bayindir",
      "35-beydag",
      "35-bornova",
      "35-cesme",
      "35-guzelbahce",
      "35-karaburun",
      "35-kiraz",
      "35-odemis",
      "35-seferihisar",
      "35-selcuk",
      "35-tire",
      "35-urla"
    ]
  },
  {
    "id": "36",
    "name": "Kars",
    "ilId": "36",
    "mpCount": 6,
    "ilceIds": [
      "36-akyaka",
      "36-arpacay",
      "36-digor",
      "36-kagizman",
      "36-merkez",
      "36-sarikamis",
      "36-selim",
      "36-susuz",
      "75-cildir",
      "75-damal",
      "75-gole",
      "75-hanak",
      "75-merkez",
      "75-posof",
      "76-aralik",
      "76-karakoyunlu",
      "76-merkez",
      "76-tuzluca"
    ]
  },
  {
    "id": "37",
    "name": "Kastamonu",
    "ilId": "37",
    "mpCount": 4,
    "ilceIds": [
      "37-abana",
      "37-agli",
      "37-arac",
      "37-azdavay",
      "37-bozkurt",
      "37-catalzeytin",
      "37-cide",
      "37-daday",
      "37-devrekani",
      "37-doganyurt",
      "37-hanonu",
      "37-i-hsangazi",
      "37-i-nebolu",
      "37-kure",
      "37-merkez",
      "37-pinarbasi",
      "37-senpazar",
      "37-seydiler",
      "37-taskopru",
      "37-tosya"
    ]
  },
  {
    "id": "38-1",
    "name": "Kayseri 1. Bölge",
    "ilId": "38",
    "mpCount": 5,
    "ilceIds": [
      "38-hacilar",
      "38-i-ncesu",
      "38-kocasinan",
      "38-melikgazi",
      "38-talas",
      "38-yesilhisar"
    ]
  },
  {
    "id": "38-2",
    "name": "Kayseri 2. Bölge",
    "ilId": "38",
    "mpCount": 3,
    "ilceIds": [
      "38-akkisla",
      "38-bunyan",
      "38-develi",
      "38-felahiye",
      "38-ozvatan",
      "38-pinarbasi",
      "38-sarioglan",
      "38-sariz",
      "38-tomarza",
      "38-yahyali"
    ]
  },
  {
    "id": "39",
    "name": "Kırklareli",
    "ilId": "39",
    "mpCount": 3,
    "ilceIds": [
      "39-babaeski",
      "39-demirkoy",
      "39-kofcaz",
      "39-luleburgaz",
      "39-merkez",
      "39-pehlivankoy",
      "39-pinarhisar",
      "39-vize"
    ]
  },
  {
    "id": "40",
    "name": "Kırşehir",
    "ilId": "40",
    "mpCount": 3,
    "ilceIds": [
      "40-akcakent",
      "40-akpinar",
      "40-boztepe",
      "40-cicekdagi",
      "40-kaman",
      "40-merkez",
      "40-mucur"
    ]
  },
  {
    "id": "41-1",
    "name": "Kocaeli 1. Bölge",
    "ilId": "41",
    "mpCount": 4,
    "ilceIds": [
      "41-basiskele",
      "41-derince",
      "41-i-zmit",
      "41-kandira",
      "41-kartepe",
      "41-korfez"
    ]
  },
  {
    "id": "41-2",
    "name": "Kocaeli 2. Bölge",
    "ilId": "41",
    "mpCount": 3,
    "ilceIds": [
      "41-cayirova",
      "41-darica",
      "41-dilovasi",
      "41-gebze",
      "41-golcuk",
      "41-karamursel",
      "77-altinova"
    ]
  },
  {
    "id": "42-1",
    "name": "Konya 1. Bölge",
    "ilId": "42",
    "mpCount": 6,
    "ilceIds": [
      "42-akoren",
      "42-altinekin",
      "42-cihanbeyli",
      "42-cumra",
      "42-derbent",
      "42-guneysinir",
      "42-karatay",
      "42-kulu",
      "42-meram",
      "42-selcuklu"
    ]
  },
  {
    "id": "42-2",
    "name": "Konya 2. Bölge",
    "ilId": "42",
    "mpCount": 5,
    "ilceIds": [
      "42-ahirli",
      "42-aksehir",
      "42-beysehir",
      "42-bozkir",
      "42-celtik",
      "42-derebucak",
      "42-doganhisar",
      "42-hadim",
      "42-huyuk",
      "42-ilgin",
      "42-kadinhani",
      "42-sarayonu",
      "42-seydisehir",
      "42-taskent",
      "42-tuzlukcu",
      "42-yalihuyuk",
      "42-yunak"
    ]
  },
  {
    "id": "42-3",
    "name": "Konya 3. Bölge",
    "ilId": "42",
    "mpCount": 3,
    "ilceIds": [
      "42-emirgazi",
      "42-eregli",
      "42-halkapinar",
      "42-karapinar",
      "70-ayranci",
      "70-basyayla",
      "70-ermenek",
      "70-kazimkarabekir",
      "70-merkez",
      "70-sariveliler"
    ]
  },
  {
    "id": "43",
    "name": "Kütahya",
    "ilId": "43",
    "mpCount": 5,
    "ilceIds": [
      "43-altintas",
      "43-aslanapa",
      "43-cavdarhisar",
      "43-domanic",
      "43-dumlupinar",
      "43-emet",
      "43-gediz",
      "43-hisarcik",
      "43-merkez",
      "43-pazarlar",
      "43-saphane",
      "43-simav",
      "43-tavsanli"
    ]
  },
  {
    "id": "44",
    "name": "Malatya",
    "ilId": "44",
    "mpCount": 6,
    "ilceIds": [
      "44-akcadag",
      "44-arapgir",
      "44-arguvan",
      "44-battalgazi",
      "44-darende",
      "44-dogansehir",
      "44-doganyol",
      "44-hekimhan",
      "44-kale",
      "44-kuluncak",
      "44-puturge",
      "44-yazihan",
      "44-yesilyurt"
    ]
  },
  {
    "id": "45-1",
    "name": "Manisa 1. Bölge",
    "ilId": "45",
    "mpCount": 6,
    "ilceIds": [
      "45-ahmetli",
      "45-akhisar",
      "45-golmarmara",
      "45-gordes",
      "45-kirkagac",
      "45-koprubasi",
      "45-saruhanli",
      "45-sehzadeler",
      "45-soma",
      "45-turgutlu",
      "45-yunusemre"
    ]
  },
  {
    "id": "45-2",
    "name": "Manisa 2. Bölge",
    "ilId": "45",
    "mpCount": 3,
    "ilceIds": [
      "45-alasehir",
      "45-demirci",
      "45-kula",
      "45-salihli",
      "45-sarigol",
      "45-selendi"
    ]
  },
  {
    "id": "46-1",
    "name": "Kahramanmaraş 1. Bölge",
    "ilId": "46",
    "mpCount": 4,
    "ilceIds": [
      "46-caglayancerit",
      "46-dulkadiroglu",
      "46-onikisubat",
      "46-pazarcik",
      "46-turkoglu"
    ]
  },
  {
    "id": "46-2",
    "name": "Kahramanmaraş 2. Bölge",
    "ilId": "46",
    "mpCount": 3,
    "ilceIds": [
      "46-afsin",
      "46-andirin",
      "46-ekinozu",
      "46-elbistan",
      "46-goksun",
      "46-nurhak"
    ]
  },
  {
    "id": "47",
    "name": "Mardin",
    "ilId": "47",
    "mpCount": 6,
    "ilceIds": [
      "47-artuklu",
      "47-dargecit",
      "47-derik",
      "47-kiziltepe",
      "47-mazidagi",
      "47-midyat",
      "47-nusaybin",
      "47-omerli",
      "47-savur",
      "47-yesilli",
      "72-gercus",
      "72-hasankeyf",
      "73-cizre",
      "73-i-dil",
      "73-silopi"
    ]
  },
  {
    "id": "48",
    "name": "Muğla",
    "ilId": "48",
    "mpCount": 5,
    "ilceIds": [
      "48-bodrum",
      "48-dalaman",
      "48-datca",
      "48-fethiye",
      "48-kavaklidere",
      "48-koycegiz",
      "48-marmaris",
      "48-mentese",
      "48-milas",
      "48-ortaca",
      "48-seydikemer",
      "48-ula",
      "48-yatagan"
    ]
  },
  {
    "id": "49",
    "name": "Muş",
    "ilId": "49",
    "mpCount": 4,
    "ilceIds": [
      "49-bulanik",
      "49-haskoy",
      "49-korkut",
      "49-malazgirt",
      "49-merkez",
      "49-varto"
    ]
  },
  {
    "id": "50",
    "name": "Nevşehir",
    "ilId": "50",
    "mpCount": 3,
    "ilceIds": [
      "50-acigol",
      "50-avanos",
      "50-derinkuyu",
      "50-gulsehir",
      "50-hacibektas",
      "50-kozakli",
      "50-merkez",
      "50-urgup"
    ]
  },
  {
    "id": "51",
    "name": "Niğde",
    "ilId": "51",
    "mpCount": 5,
    "ilceIds": [
      "51-altunhisar",
      "51-bor",
      "51-camardi",
      "51-ciftlik",
      "51-merkez",
      "51-ulukisla",
      "68-eskil",
      "68-gulagac",
      "68-guzelyurt",
      "68-merkez",
      "68-ortakoy",
      "68-sultanhani"
    ]
  },
  {
    "id": "52-1",
    "name": "Ordu 1. Bölge",
    "ilId": "52",
    "mpCount": 4,
    "ilceIds": [
      "52-altinordu",
      "52-camas",
      "52-catalpinar",
      "52-fatsa",
      "52-golkoy",
      "52-gulyali",
      "52-gurgentepe",
      "52-kabaduz",
      "52-mesudiye",
      "52-persembe",
      "52-ulubey"
    ]
  },
  {
    "id": "52-2",
    "name": "Ordu 2. Bölge",
    "ilId": "52",
    "mpCount": 3,
    "ilceIds": [
      "52-akkus",
      "52-aybasti",
      "52-caybasi",
      "52-i-kizce",
      "52-kabatas",
      "52-korgan",
      "52-kumru",
      "52-unye"
    ]
  },
  {
    "id": "53",
    "name": "Rize",
    "ilId": "53",
    "mpCount": 4,
    "ilceIds": [
      "53-ardesen",
      "53-camlihemsin",
      "53-cayeli",
      "53-derepazari",
      "53-findikli",
      "53-guneysu",
      "53-hemsin",
      "53-i-kizdere",
      "53-i-yidere",
      "53-kalkandere",
      "53-merkez",
      "53-pazar"
    ]
  },
  {
    "id": "54",
    "name": "Sakarya",
    "ilId": "54",
    "mpCount": 6,
    "ilceIds": [
      "54-adapazari",
      "54-akyazi",
      "54-arifiye",
      "54-erenler",
      "54-ferizli",
      "54-geyve",
      "54-hendek",
      "54-karapurcek",
      "54-karasu",
      "54-kaynarca",
      "54-kocaali",
      "54-pamukova",
      "54-sapanca",
      "54-serdivan",
      "54-sogutlu",
      "54-tarakli"
    ]
  },
  {
    "id": "55-1",
    "name": "Samsun 1. Bölge",
    "ilId": "55",
    "mpCount": 6,
    "ilceIds": [
      "55-asarcik",
      "55-atakum",
      "55-ayvacik",
      "55-canik",
      "55-carsamba",
      "55-i-lkadim",
      "55-kavak",
      "55-ladik",
      "55-salipazari",
      "55-tekkekoy",
      "55-terme"
    ]
  },
  {
    "id": "55-2",
    "name": "Samsun 2. Bölge",
    "ilId": "55",
    "mpCount": 3,
    "ilceIds": [
      "55-19-mayis",
      "55-alacam",
      "55-bafra",
      "55-havza",
      "55-vezirkopru",
      "55-yakakent"
    ]
  },
  {
    "id": "56",
    "name": "Siirt",
    "ilId": "56",
    "mpCount": 5,
    "ilceIds": [
      "56-baykan",
      "56-eruh",
      "56-kurtalan",
      "56-merkez",
      "56-pervari",
      "56-sirvan",
      "56-tillo",
      "72-besiri",
      "72-kozluk",
      "72-merkez",
      "72-sason",
      "73-guclukonak",
      "73-merkez"
    ]
  },
  {
    "id": "57",
    "name": "Sinop",
    "ilId": "57",
    "mpCount": 3,
    "ilceIds": [
      "57-ayancik",
      "57-boyabat",
      "57-dikmen",
      "57-duragan",
      "57-erfelek",
      "57-gerze",
      "57-merkez",
      "57-sarayduzu",
      "57-turkeli"
    ]
  },
  {
    "id": "58-1",
    "name": "Sivas 1. Bölge",
    "ilId": "58",
    "mpCount": 4,
    "ilceIds": [
      "58-akincilar",
      "58-dogansar",
      "58-golova",
      "58-hafik",
      "58-i-mranli",
      "58-koyulhisar",
      "58-merkez",
      "58-susehri",
      "58-ulas",
      "58-zara"
    ]
  },
  {
    "id": "58-2",
    "name": "Sivas 2. Bölge",
    "ilId": "58",
    "mpCount": 3,
    "ilceIds": [
      "58-altinyayla",
      "58-divrigi",
      "58-gemerek",
      "58-gurun",
      "58-kangal",
      "58-sarkisla",
      "58-yildizeli"
    ]
  },
  {
    "id": "59",
    "name": "Tekirdağ",
    "ilId": "59",
    "mpCount": 4,
    "ilceIds": [
      "59-cerkezkoy",
      "59-corlu",
      "59-ergene",
      "59-hayrabolu",
      "59-kapakli",
      "59-malkara",
      "59-marmaraereglisi",
      "59-muratli",
      "59-saray",
      "59-sarkoy",
      "59-suleymanpasa"
    ]
  },
  {
    "id": "60",
    "name": "Tokat",
    "ilId": "60",
    "mpCount": 6,
    "ilceIds": [
      "60-almus",
      "60-artova",
      "60-basciftlik",
      "60-erbaa",
      "60-merkez",
      "60-niksar",
      "60-pazar",
      "60-resadiye",
      "60-sulusaray",
      "60-turhal",
      "60-yesilyurt",
      "60-zile"
    ]
  },
  {
    "id": "61-1",
    "name": "Trabzon 1. Bölge",
    "ilId": "61",
    "mpCount": 4,
    "ilceIds": [
      "61-akcaabat",
      "61-besikduzu",
      "61-carsibasi",
      "61-duzkoy",
      "61-ortahisar",
      "61-salpazari",
      "61-tonya",
      "61-vakfikebir"
    ]
  },
  {
    "id": "61-2",
    "name": "Trabzon 2. Bölge",
    "ilId": "61",
    "mpCount": 3,
    "ilceIds": [
      "61-arakli",
      "61-arsin",
      "61-caykara",
      "61-dernekpazari",
      "61-hayrat",
      "61-koprubasi",
      "61-macka",
      "61-of",
      "61-surmene",
      "61-yomra"
    ]
  },
  {
    "id": "62",
    "name": "Tunceli",
    "ilId": "62",
    "mpCount": 2,
    "ilceIds": [
      "62-cemisgezek",
      "62-hozat",
      "62-mazgirt",
      "62-merkez",
      "62-nazimiye",
      "62-ovacik",
      "62-pertek",
      "62-pulumur"
    ]
  },
  {
    "id": "63-1",
    "name": "Şanlıurfa 1. Bölge",
    "ilId": "63",
    "mpCount": 4,
    "ilceIds": [
      "63-birecik",
      "63-bozova",
      "63-eyyubiye",
      "63-halfeti",
      "63-haliliye",
      "63-karakopru",
      "63-suruc"
    ]
  },
  {
    "id": "63-2",
    "name": "Şanlıurfa 2. Bölge",
    "ilId": "63",
    "mpCount": 3,
    "ilceIds": [
      "63-akcakale",
      "63-ceylanpinar",
      "63-harran",
      "63-hilvan",
      "63-siverek",
      "63-viransehir"
    ]
  },
  {
    "id": "64",
    "name": "Uşak",
    "ilId": "64",
    "mpCount": 3,
    "ilceIds": [
      "64-banaz",
      "64-esme",
      "64-karahalli",
      "64-merkez",
      "64-sivasli",
      "64-ulubey"
    ]
  },
  {
    "id": "65",
    "name": "Van",
    "ilId": "65",
    "mpCount": 5,
    "ilceIds": [
      "65-bahcesaray",
      "65-baskale",
      "65-caldiran",
      "65-catak",
      "65-edremit",
      "65-ercis",
      "65-gevas",
      "65-gurpinar",
      "65-i-pekyolu",
      "65-muradiye",
      "65-ozalp",
      "65-saray",
      "65-tusba"
    ]
  },
  {
    "id": "66",
    "name": "Yozgat",
    "ilId": "66",
    "mpCount": 5,
    "ilceIds": [
      "66-akdagmadeni",
      "66-aydincik",
      "66-bogazliyan",
      "66-candir",
      "66-cayiralan",
      "66-cekerek",
      "66-kadisehri",
      "66-merkez",
      "66-saraykent",
      "66-sarikaya",
      "66-sefaatli",
      "66-sorgun",
      "66-yenifakili",
      "66-yerkoy"
    ]
  },
  {
    "id": "67-1",
    "name": "Zonguldak 1. Bölge",
    "ilId": "67",
    "mpCount": 6,
    "ilceIds": [
      "67-alapli",
      "67-caycuma",
      "67-eregli",
      "67-kilimli",
      "67-kozlu",
      "67-merkez",
      "74-amasra",
      "74-kurucasile",
      "74-merkez"
    ]
  },
  {
    "id": "67-2",
    "name": "Zonguldak 2. Bölge",
    "ilId": "67",
    "mpCount": 3,
    "ilceIds": [
      "67-devrek",
      "67-gokcebey",
      "74-ulus",
      "78-eflani",
      "78-merkez",
      "78-safranbolu",
      "78-yenice"
    ]
  }
];

export const CUSTOM_DISTRICTS_1991: CustomDistrictSpec[] = [
  {
    "id": "01-1",
    "name": "Adana 1. Bölge",
    "ilId": "01",
    "mpCount": 6,
    "ilceIds": [
      "01-aladag",
      "01-ceyhan",
      "01-feke",
      "01-i-mamoglu",
      "01-karaisali",
      "01-kozan",
      "01-pozanti",
      "01-saimbeyli",
      "01-tufanbeyli",
      "80-bahce",
      "80-duzici",
      "80-hasanbeyli",
      "80-kadirli",
      "80-merkez",
      "80-sumbas",
      "80-toprakkale"
    ]
  },
  {
    "id": "01-2",
    "name": "Adana 2. Bölge",
    "ilId": "01",
    "mpCount": 5,
    "ilceIds": [
      "01-cukurova",
      "01-seyhan"
    ]
  },
  {
    "id": "01-3",
    "name": "Adana 3. Bölge",
    "ilId": "01",
    "mpCount": 3,
    "ilceIds": [
      "01-karatas",
      "01-saricam",
      "01-yumurtalik",
      "01-yuregir"
    ]
  },
  {
    "id": "02",
    "name": "Adıyaman",
    "ilId": "02",
    "mpCount": 4,
    "ilceIds": [
      "02-besni",
      "02-celikhan",
      "02-gerger",
      "02-golbasi",
      "02-kahta",
      "02-merkez",
      "02-samsat",
      "02-sincik",
      "02-tut"
    ]
  },
  {
    "id": "03",
    "name": "Afyonkarahisar",
    "ilId": "03",
    "mpCount": 6,
    "ilceIds": [
      "03-basmakci",
      "03-bayat",
      "03-bolvadin",
      "03-cay",
      "03-cobanlar",
      "03-dazkiri",
      "03-dinar",
      "03-emirdag",
      "03-evciler",
      "03-hocalar",
      "03-i-hsaniye",
      "03-i-scehisar",
      "03-kiziloren",
      "03-merkez",
      "03-sandikli",
      "03-sinanpasa",
      "03-suhut",
      "03-sultandagi"
    ]
  },
  {
    "id": "04",
    "name": "Ağrı",
    "ilId": "04",
    "mpCount": 4,
    "ilceIds": [
      "04-diyadin",
      "04-dogubayazit",
      "04-eleskirt",
      "04-hamur",
      "04-merkez",
      "04-patnos",
      "04-taslicay",
      "04-tutak"
    ]
  },
  {
    "id": "05",
    "name": "Amasya",
    "ilId": "05",
    "mpCount": 3,
    "ilceIds": [
      "05-goynucek",
      "05-gumushacikoy",
      "05-hamamozu",
      "05-merkez",
      "05-merzifon",
      "05-suluova",
      "05-tasova"
    ]
  },
  {
    "id": "06-1",
    "name": "Ankara 1. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-bala",
      "06-cankaya",
      "06-evren",
      "06-golbasi",
      "06-sereflikochisar"
    ]
  },
  {
    "id": "06-2",
    "name": "Ankara 2. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-altindag",
      "06-mamak"
    ]
  },
  {
    "id": "06-3",
    "name": "Ankara 3. Bölge",
    "ilId": "06",
    "mpCount": 6,
    "ilceIds": [
      "06-ayas",
      "06-beypazari",
      "06-camlidere",
      "06-etimesgut",
      "06-gudul",
      "06-haymana",
      "06-kahramankazan",
      "06-kizilcahamam",
      "06-nallihan",
      "06-polatli",
      "06-sincan",
      "06-yenimahalle"
    ]
  },
  {
    "id": "06-4",
    "name": "Ankara 4. Bölge",
    "ilId": "06",
    "mpCount": 5,
    "ilceIds": [
      "06-akyurt",
      "06-cubuk",
      "06-elmadag",
      "06-kalecik",
      "06-kecioren",
      "06-pursaklar"
    ]
  },
  {
    "id": "07-1",
    "name": "Antalya 1. Bölge",
    "ilId": "07",
    "mpCount": 6,
    "ilceIds": [
      "07-aksu",
      "07-demre",
      "07-dosemealti",
      "07-elmali",
      "07-finike",
      "07-kas",
      "07-kemer",
      "07-kepez",
      "07-konyaalti",
      "07-korkuteli",
      "07-kumluca",
      "07-muratpasa",
      "07-serik"
    ]
  },
  {
    "id": "07-2",
    "name": "Antalya 2. Bölge",
    "ilId": "07",
    "mpCount": 3,
    "ilceIds": [
      "07-akseki",
      "07-alanya",
      "07-gazipasa",
      "07-gundogmus",
      "07-i-bradi",
      "07-manavgat"
    ]
  },
  {
    "id": "08",
    "name": "Artvin",
    "ilId": "08",
    "mpCount": 2,
    "ilceIds": [
      "08-ardanuc",
      "08-arhavi",
      "08-borcka",
      "08-hopa",
      "08-kemalpasa",
      "08-merkez",
      "08-murgul",
      "08-savsat",
      "08-yusufeli"
    ]
  },
  {
    "id": "09",
    "name": "Aydın",
    "ilId": "09",
    "mpCount": 6,
    "ilceIds": [
      "09-bozdogan",
      "09-buharkent",
      "09-cine",
      "09-didim",
      "09-efeler",
      "09-germencik",
      "09-i-ncirliova",
      "09-karacasu",
      "09-karpuzlu",
      "09-kocarli",
      "09-kosk",
      "09-kusadasi",
      "09-kuyucak",
      "09-nazilli",
      "09-soke",
      "09-sultanhisar",
      "09-yenipazar"
    ]
  },
  {
    "id": "10-1",
    "name": "Balıkesir 1. Bölge",
    "ilId": "10",
    "mpCount": 4,
    "ilceIds": [
      "10-altieylul",
      "10-ayvalik",
      "10-bigadic",
      "10-burhaniye",
      "10-edremit",
      "10-gomec",
      "10-havran",
      "10-karesi",
      "10-savastepe",
      "10-sindirgi"
    ]
  },
  {
    "id": "10-2",
    "name": "Balıkesir 2. Bölge",
    "ilId": "10",
    "mpCount": 3,
    "ilceIds": [
      "10-balya",
      "10-bandirma",
      "10-dursunbey",
      "10-erdek",
      "10-gonen",
      "10-i-vrindi",
      "10-kepsut",
      "10-manyas",
      "10-marmara",
      "10-susurluk"
    ]
  },
  {
    "id": "11",
    "name": "Bilecik",
    "ilId": "11",
    "mpCount": 2,
    "ilceIds": [
      "11-bozuyuk",
      "11-golpazari",
      "11-i-nhisar",
      "11-merkez",
      "11-osmaneli",
      "11-pazaryeri",
      "11-sogut",
      "11-yenipazar"
    ]
  },
  {
    "id": "12",
    "name": "Bingöl",
    "ilId": "12",
    "mpCount": 3,
    "ilceIds": [
      "12-adakli",
      "12-genc",
      "12-karliova",
      "12-kigi",
      "12-merkez",
      "12-solhan",
      "12-yayladere",
      "12-yedisu"
    ]
  },
  {
    "id": "13",
    "name": "Bitlis",
    "ilId": "13",
    "mpCount": 3,
    "ilceIds": [
      "13-adilcevaz",
      "13-ahlat",
      "13-guroymak",
      "13-hizan",
      "13-merkez",
      "13-mutki",
      "13-tatvan"
    ]
  },
  {
    "id": "14",
    "name": "Bolu",
    "ilId": "14",
    "mpCount": 5,
    "ilceIds": [
      "14-dortdivan",
      "14-gerede",
      "14-goynuk",
      "14-kibriscik",
      "14-mengen",
      "14-merkez",
      "14-mudurnu",
      "14-seben",
      "14-yenicaga",
      "81-akcakoca",
      "81-cilimli",
      "81-cumayeri",
      "81-golyaka",
      "81-gumusova",
      "81-kaynasli",
      "81-merkez",
      "81-yigilca"
    ]
  },
  {
    "id": "15",
    "name": "Burdur",
    "ilId": "15",
    "mpCount": 3,
    "ilceIds": [
      "15-aglasun",
      "15-altinyayla",
      "15-bucak",
      "15-cavdir",
      "15-celtikci",
      "15-golhisar",
      "15-karamanli",
      "15-kemer",
      "15-merkez",
      "15-tefenni",
      "15-yesilova"
    ]
  },
  {
    "id": "16-1",
    "name": "Bursa 1. Bölge",
    "ilId": "16",
    "mpCount": 6,
    "ilceIds": [
      "16-gursu",
      "16-harmancik",
      "16-i-negol",
      "16-keles",
      "16-kestel",
      "16-orhaneli",
      "16-osmangazi",
      "16-yenisehir"
    ]
  },
  {
    "id": "16-2",
    "name": "Bursa 2. Bölge",
    "ilId": "16",
    "mpCount": 6,
    "ilceIds": [
      "16-buyukorhan",
      "16-gemlik",
      "16-i-znik",
      "16-karacabey",
      "16-mudanya",
      "16-mustafakemalpasa",
      "16-nilufer",
      "16-orhangazi",
      "16-yildirim",
      "77-armutlu"
    ]
  },
  {
    "id": "17",
    "name": "Çanakkale",
    "ilId": "17",
    "mpCount": 4,
    "ilceIds": [
      "17-ayvacik",
      "17-bayramic",
      "17-biga",
      "17-bozcaada",
      "17-can",
      "17-eceabat",
      "17-ezine",
      "17-gelibolu",
      "17-gokceada",
      "17-lapseki",
      "17-merkez",
      "17-yenice"
    ]
  },
  {
    "id": "18",
    "name": "Çankırı",
    "ilId": "18",
    "mpCount": 3,
    "ilceIds": [
      "18-atkaracalar",
      "18-bayramoren",
      "18-cerkes",
      "18-eldivan",
      "18-ilgaz",
      "18-kizilirmak",
      "18-korgun",
      "18-kursunlu",
      "18-merkez",
      "18-orta",
      "18-sabanozu",
      "18-yaprakli",
      "78-eskipazar",
      "78-ovacik"
    ]
  },
  {
    "id": "19",
    "name": "Çorum",
    "ilId": "19",
    "mpCount": 5,
    "ilceIds": [
      "19-alaca",
      "19-bayat",
      "19-bogazkale",
      "19-dodurga",
      "19-i-skilip",
      "19-kargi",
      "19-lacin",
      "19-mecitozu",
      "19-merkez",
      "19-oguzlar",
      "19-ortakoy",
      "19-osmancik",
      "19-sungurlu",
      "19-ugurludag"
    ]
  },
  {
    "id": "20",
    "name": "Denizli",
    "ilId": "20",
    "mpCount": 6,
    "ilceIds": [
      "20-acipayam",
      "20-babadag",
      "20-baklan",
      "20-bekilli",
      "20-beyagac",
      "20-bozkurt",
      "20-buldan",
      "20-cal",
      "20-cameli",
      "20-cardak",
      "20-civril",
      "20-guney",
      "20-honaz",
      "20-kale",
      "20-merkezefendi",
      "20-pamukkale",
      "20-saraykoy",
      "20-serinhisar",
      "20-tavas"
    ]
  },
  {
    "id": "21-1",
    "name": "Diyarbakır 1. Bölge",
    "ilId": "21",
    "mpCount": 5,
    "ilceIds": [
      "21-baglar",
      "21-cermik",
      "21-cinar",
      "21-cungus",
      "21-egil",
      "21-ergani",
      "21-kayapinar",
      "21-kocakoy",
      "21-sur",
      "21-yenisehir"
    ]
  },
  {
    "id": "21-2",
    "name": "Diyarbakır 2. Bölge",
    "ilId": "21",
    "mpCount": 3,
    "ilceIds": [
      "21-bismil",
      "21-dicle",
      "21-hani",
      "21-hazro",
      "21-kulp",
      "21-lice",
      "21-silvan"
    ]
  },
  {
    "id": "22",
    "name": "Edirne",
    "ilId": "22",
    "mpCount": 4,
    "ilceIds": [
      "22-enez",
      "22-havsa",
      "22-i-psala",
      "22-kesan",
      "22-lalapasa",
      "22-meric",
      "22-merkez",
      "22-suloglu",
      "22-uzunkopru"
    ]
  },
  {
    "id": "23",
    "name": "Elazığ",
    "ilId": "23",
    "mpCount": 4,
    "ilceIds": [
      "23-agin",
      "23-alacakaya",
      "23-aricak",
      "23-baskil",
      "23-karakocan",
      "23-keban",
      "23-kovancilar",
      "23-maden",
      "23-merkez",
      "23-palu",
      "23-sivrice"
    ]
  },
  {
    "id": "24",
    "name": "Erzincan",
    "ilId": "24",
    "mpCount": 3,
    "ilceIds": [
      "24-cayirli",
      "24-i-lic",
      "24-kemah",
      "24-kemaliye",
      "24-merkez",
      "24-otlukbeli",
      "24-refahiye",
      "24-tercan",
      "24-uzumlu"
    ]
  },
  {
    "id": "25-1",
    "name": "Erzurum 1. Bölge",
    "ilId": "25",
    "mpCount": 4,
    "ilceIds": [
      "25-askale",
      "25-aziziye",
      "25-cat",
      "25-i-spir",
      "25-palandoken",
      "25-pazaryolu",
      "25-tortum",
      "25-uzundere",
      "25-yakutiye"
    ]
  },
  {
    "id": "25-2",
    "name": "Erzurum 2. Bölge",
    "ilId": "25",
    "mpCount": 3,
    "ilceIds": [
      "25-hinis",
      "25-horasan",
      "25-karacoban",
      "25-karayazi",
      "25-koprukoy",
      "25-narman",
      "25-oltu",
      "25-olur",
      "25-pasinler",
      "25-senkaya",
      "25-tekman"
    ]
  },
  {
    "id": "26",
    "name": "Eskişehir",
    "ilId": "26",
    "mpCount": 5,
    "ilceIds": [
      "26-alpu",
      "26-beylikova",
      "26-cifteler",
      "26-gunyuzu",
      "26-han",
      "26-i-nonu",
      "26-mahmudiye",
      "26-mihalgazi",
      "26-mihaliccik",
      "26-odunpazari",
      "26-saricakaya",
      "26-seyitgazi",
      "26-sivrihisar",
      "26-tepebasi"
    ]
  },
  {
    "id": "27-1",
    "name": "Gaziantep 1. Bölge",
    "ilId": "27",
    "mpCount": 6,
    "ilceIds": [
      "27-araban",
      "27-sahinbey",
      "27-sehitkamil",
      "27-yavuzeli"
    ]
  },
  {
    "id": "27-2",
    "name": "Gaziantep 2. Bölge",
    "ilId": "27",
    "mpCount": 3,
    "ilceIds": [
      "27-i-slahiye",
      "27-karkamis",
      "27-nizip",
      "27-nurdagi",
      "27-oguzeli",
      "79-elbeyli",
      "79-merkez",
      "79-musabeyli",
      "79-polateli"
    ]
  },
  {
    "id": "28",
    "name": "Giresun",
    "ilId": "28",
    "mpCount": 4,
    "ilceIds": [
      "28-alucra",
      "28-bulancak",
      "28-camoluk",
      "28-canakci",
      "28-dereli",
      "28-dogankent",
      "28-espiye",
      "28-eynesil",
      "28-gorele",
      "28-guce",
      "28-kesap",
      "28-merkez",
      "28-piraziz",
      "28-sebinkarahisar",
      "28-tirebolu",
      "28-yaglidere"
    ]
  },
  {
    "id": "29",
    "name": "Gümüşhane",
    "ilId": "29",
    "mpCount": 2,
    "ilceIds": [
      "29-kelkit",
      "29-kose",
      "29-kurtun",
      "29-merkez",
      "29-siran",
      "29-torul"
    ]
  },
  {
    "id": "30",
    "name": "Hakkari",
    "ilId": "30",
    "mpCount": 2,
    "ilceIds": [
      "30-cukurca",
      "30-derecik",
      "30-merkez",
      "30-semdinli",
      "30-yuksekova"
    ]
  },
  {
    "id": "31-1",
    "name": "Hatay 1. Bölge",
    "ilId": "31",
    "mpCount": 5,
    "ilceIds": [
      "31-altinozu",
      "31-antakya",
      "31-defne",
      "31-hassa",
      "31-kirikhan",
      "31-kumlu",
      "31-reyhanli",
      "31-samandag",
      "31-yayladagi"
    ]
  },
  {
    "id": "31-2",
    "name": "Hatay 2. Bölge",
    "ilId": "31",
    "mpCount": 3,
    "ilceIds": [
      "31-arsuz",
      "31-belen",
      "31-dortyol",
      "31-erzin",
      "31-i-skenderun",
      "31-payas"
    ]
  },
  {
    "id": "32",
    "name": "Isparta",
    "ilId": "32",
    "mpCount": 4,
    "ilceIds": [
      "32-aksu",
      "32-atabey",
      "32-egirdir",
      "32-gelendost",
      "32-gonen",
      "32-keciborlu",
      "32-merkez",
      "32-sarkikaraagac",
      "32-senirkent",
      "32-sutculer",
      "32-uluborlu",
      "32-yalvac",
      "32-yenisarbademli"
    ]
  },
  {
    "id": "33-1",
    "name": "Mersin 1. Bölge",
    "ilId": "33",
    "mpCount": 6,
    "ilceIds": [
      "33-akdeniz",
      "33-camliyayla",
      "33-mezitli",
      "33-tarsus",
      "33-toroslar",
      "33-yenisehir"
    ]
  },
  {
    "id": "33-2",
    "name": "Mersin 2. Bölge",
    "ilId": "33",
    "mpCount": 3,
    "ilceIds": [
      "33-anamur",
      "33-aydincik",
      "33-bozyazi",
      "33-erdemli",
      "33-gulnar",
      "33-mut",
      "33-silifke"
    ]
  },
  {
    "id": "34-1",
    "name": "İstanbul 1. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-adalar",
      "34-atasehir",
      "34-kadikoy",
      "77-ciftlikkoy",
      "77-cinarcik",
      "77-merkez",
      "77-termal"
    ]
  },
  {
    "id": "34-2",
    "name": "İstanbul 2. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-besiktas",
      "34-beyoglu",
      "34-fatih"
    ]
  },
  {
    "id": "34-3",
    "name": "İstanbul 3. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-kartal",
      "34-maltepe",
      "34-pendik",
      "34-sultanbeyli",
      "34-tuzla"
    ]
  },
  {
    "id": "34-4",
    "name": "İstanbul 4. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-beykoz",
      "34-cekmekoy",
      "34-sancaktepe",
      "34-sile",
      "34-umraniye",
      "34-uskudar"
    ]
  },
  {
    "id": "34-5",
    "name": "İstanbul 5. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-kagithane",
      "34-sariyer",
      "34-sisli",
      "34-zeytinburnu"
    ]
  },
  {
    "id": "34-6",
    "name": "İstanbul 6. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-bayrampasa",
      "34-eyupsultan",
      "34-gaziosmanpasa",
      "34-sultangazi"
    ]
  },
  {
    "id": "34-7",
    "name": "İstanbul 7. Bölge",
    "ilId": "34",
    "mpCount": 6,
    "ilceIds": [
      "34-arnavutkoy",
      "34-avcilar",
      "34-basaksehir",
      "34-beylikduzu",
      "34-buyukcekmece",
      "34-catalca",
      "34-esenyurt",
      "34-kucukcekmece",
      "34-silivri"
    ]
  },
  {
    "id": "34-8",
    "name": "İstanbul 8. Bölge",
    "ilId": "34",
    "mpCount": 5,
    "ilceIds": [
      "34-bakirkoy",
      "34-esenler",
      "34-gungoren"
    ]
  },
  {
    "id": "34-9",
    "name": "İstanbul 9. Bölge",
    "ilId": "34",
    "mpCount": 3,
    "ilceIds": [
      "34-bagcilar",
      "34-bahcelievler"
    ]
  },
  {
    "id": "35-1",
    "name": "İzmir 1. Bölge",
    "ilId": "35",
    "mpCount": 6,
    "ilceIds": [
      "35-balcova",
      "35-gaziemir",
      "35-guzelbahce",
      "35-karabaglar",
      "35-konak",
      "35-narlidere"
    ]
  },
  {
    "id": "35-2",
    "name": "İzmir 2. Bölge",
    "ilId": "35",
    "mpCount": 6,
    "ilceIds": [
      "35-aliaga",
      "35-bayindir",
      "35-bayrakli",
      "35-bergama",
      "35-cigli",
      "35-dikili",
      "35-foca",
      "35-karsiyaka",
      "35-kemalpasa",
      "35-kinik",
      "35-menemen"
    ]
  },
  {
    "id": "35-3",
    "name": "İzmir 3. Bölge",
    "ilId": "35",
    "mpCount": 4,
    "ilceIds": [
      "35-bornova",
      "35-buca",
      "35-torbali"
    ]
  },
  {
    "id": "35-4",
    "name": "İzmir 4. Bölge",
    "ilId": "35",
    "mpCount": 3,
    "ilceIds": [
      "35-beydag",
      "35-cesme",
      "35-karaburun",
      "35-kiraz",
      "35-menderes",
      "35-odemis",
      "35-seferihisar",
      "35-selcuk",
      "35-tire",
      "35-urla"
    ]
  },
  {
    "id": "36",
    "name": "Kars",
    "ilId": "36",
    "mpCount": 5,
    "ilceIds": [
      "36-akyaka",
      "36-arpacay",
      "36-digor",
      "36-kagizman",
      "36-merkez",
      "36-sarikamis",
      "36-selim",
      "36-susuz",
      "75-cildir",
      "75-damal",
      "75-gole",
      "75-hanak",
      "75-merkez",
      "75-posof",
      "76-aralik",
      "76-karakoyunlu",
      "76-merkez",
      "76-tuzluca"
    ]
  },
  {
    "id": "37",
    "name": "Kastamonu",
    "ilId": "37",
    "mpCount": 4,
    "ilceIds": [
      "37-abana",
      "37-agli",
      "37-arac",
      "37-azdavay",
      "37-bozkurt",
      "37-catalzeytin",
      "37-cide",
      "37-daday",
      "37-devrekani",
      "37-doganyurt",
      "37-hanonu",
      "37-i-hsangazi",
      "37-i-nebolu",
      "37-kure",
      "37-merkez",
      "37-pinarbasi",
      "37-senpazar",
      "37-seydiler",
      "37-taskopru",
      "37-tosya"
    ]
  },
  {
    "id": "38-1",
    "name": "Kayseri 1. Bölge",
    "ilId": "38",
    "mpCount": 4,
    "ilceIds": [
      "38-hacilar",
      "38-i-ncesu",
      "38-kocasinan",
      "38-melikgazi",
      "38-talas"
    ]
  },
  {
    "id": "38-2",
    "name": "Kayseri 2. Bölge",
    "ilId": "38",
    "mpCount": 3,
    "ilceIds": [
      "38-akkisla",
      "38-bunyan",
      "38-develi",
      "38-felahiye",
      "38-ozvatan",
      "38-pinarbasi",
      "38-sarioglan",
      "38-sariz",
      "38-tomarza",
      "38-yahyali",
      "38-yesilhisar"
    ]
  },
  {
    "id": "39",
    "name": "Kırklareli",
    "ilId": "39",
    "mpCount": 3,
    "ilceIds": [
      "39-babaeski",
      "39-demirkoy",
      "39-kofcaz",
      "39-luleburgaz",
      "39-merkez",
      "39-pehlivankoy",
      "39-pinarhisar",
      "39-vize"
    ]
  },
  {
    "id": "40",
    "name": "Kırşehir",
    "ilId": "40",
    "mpCount": 3,
    "ilceIds": [
      "40-akcakent",
      "40-akpinar",
      "40-boztepe",
      "40-cicekdagi",
      "40-kaman",
      "40-merkez",
      "40-mucur"
    ]
  },
  {
    "id": "41-1",
    "name": "Kocaeli 1. Bölge",
    "ilId": "41",
    "mpCount": 4,
    "ilceIds": [
      "41-basiskele",
      "41-derince",
      "41-golcuk",
      "41-i-zmit",
      "41-kandira",
      "41-kartepe"
    ]
  },
  {
    "id": "41-2",
    "name": "Kocaeli 2. Bölge",
    "ilId": "41",
    "mpCount": 3,
    "ilceIds": [
      "41-cayirova",
      "41-darica",
      "41-dilovasi",
      "41-gebze",
      "41-karamursel",
      "41-korfez",
      "77-altinova"
    ]
  },
  {
    "id": "42-1",
    "name": "Konya 1. Bölge",
    "ilId": "42",
    "mpCount": 6,
    "ilceIds": [
      "42-akoren",
      "42-altinekin",
      "42-cihanbeyli",
      "42-derbent",
      "42-karatay",
      "42-kulu",
      "42-meram",
      "42-sarayonu",
      "42-selcuklu"
    ]
  },
  {
    "id": "42-2",
    "name": "Konya 2. Bölge",
    "ilId": "42",
    "mpCount": 4,
    "ilceIds": [
      "42-aksehir",
      "42-beysehir",
      "42-celtik",
      "42-derebucak",
      "42-doganhisar",
      "42-huyuk",
      "42-ilgin",
      "42-kadinhani",
      "42-seydisehir",
      "42-tuzlukcu",
      "42-yunak"
    ]
  },
  {
    "id": "42-3",
    "name": "Konya 3. Bölge",
    "ilId": "42",
    "mpCount": 3,
    "ilceIds": [
      "42-ahirli",
      "42-bozkir",
      "42-cumra",
      "42-emirgazi",
      "42-eregli",
      "42-guneysinir",
      "42-hadim",
      "42-halkapinar",
      "42-karapinar",
      "42-taskent",
      "42-yalihuyuk"
    ]
  },
  {
    "id": "43",
    "name": "Kütahya",
    "ilId": "43",
    "mpCount": 5,
    "ilceIds": [
      "43-altintas",
      "43-aslanapa",
      "43-cavdarhisar",
      "43-domanic",
      "43-dumlupinar",
      "43-emet",
      "43-gediz",
      "43-hisarcik",
      "43-merkez",
      "43-pazarlar",
      "43-saphane",
      "43-simav",
      "43-tavsanli"
    ]
  },
  {
    "id": "44",
    "name": "Malatya",
    "ilId": "44",
    "mpCount": 6,
    "ilceIds": [
      "44-akcadag",
      "44-arapgir",
      "44-arguvan",
      "44-battalgazi",
      "44-darende",
      "44-dogansehir",
      "44-doganyol",
      "44-hekimhan",
      "44-kale",
      "44-kuluncak",
      "44-puturge",
      "44-yazihan",
      "44-yesilyurt"
    ]
  },
  {
    "id": "45-1",
    "name": "Manisa 1. Bölge",
    "ilId": "45",
    "mpCount": 6,
    "ilceIds": [
      "45-ahmetli",
      "45-akhisar",
      "45-golmarmara",
      "45-gordes",
      "45-kirkagac",
      "45-koprubasi",
      "45-saruhanli",
      "45-sehzadeler",
      "45-soma",
      "45-turgutlu",
      "45-yunusemre"
    ]
  },
  {
    "id": "45-2",
    "name": "Manisa 2. Bölge",
    "ilId": "45",
    "mpCount": 3,
    "ilceIds": [
      "45-alasehir",
      "45-demirci",
      "45-kula",
      "45-salihli",
      "45-sarigol",
      "45-selendi"
    ]
  },
  {
    "id": "46-1",
    "name": "Kahramanmaraş 1. Bölge",
    "ilId": "46",
    "mpCount": 4,
    "ilceIds": [
      "46-caglayancerit",
      "46-dulkadiroglu",
      "46-onikisubat",
      "46-pazarcik",
      "46-turkoglu"
    ]
  },
  {
    "id": "46-2",
    "name": "Kahramanmaraş 2. Bölge",
    "ilId": "46",
    "mpCount": 3,
    "ilceIds": [
      "46-afsin",
      "46-andirin",
      "46-ekinozu",
      "46-elbistan",
      "46-goksun",
      "46-nurhak"
    ]
  },
  {
    "id": "47",
    "name": "Mardin",
    "ilId": "47",
    "mpCount": 5,
    "ilceIds": [
      "47-artuklu",
      "47-dargecit",
      "47-derik",
      "47-kiziltepe",
      "47-mazidagi",
      "47-midyat",
      "47-nusaybin",
      "47-omerli",
      "47-savur",
      "47-yesilli"
    ]
  },
  {
    "id": "48",
    "name": "Muğla",
    "ilId": "48",
    "mpCount": 5,
    "ilceIds": [
      "48-bodrum",
      "48-dalaman",
      "48-datca",
      "48-fethiye",
      "48-kavaklidere",
      "48-koycegiz",
      "48-marmaris",
      "48-mentese",
      "48-milas",
      "48-ortaca",
      "48-seydikemer",
      "48-ula",
      "48-yatagan"
    ]
  },
  {
    "id": "49",
    "name": "Muş",
    "ilId": "49",
    "mpCount": 3,
    "ilceIds": [
      "49-bulanik",
      "49-haskoy",
      "49-korkut",
      "49-malazgirt",
      "49-merkez",
      "49-varto"
    ]
  },
  {
    "id": "50",
    "name": "Nevşehir",
    "ilId": "50",
    "mpCount": 3,
    "ilceIds": [
      "50-acigol",
      "50-avanos",
      "50-derinkuyu",
      "50-gulsehir",
      "50-hacibektas",
      "50-kozakli",
      "50-merkez",
      "50-urgup"
    ]
  },
  {
    "id": "51",
    "name": "Niğde",
    "ilId": "51",
    "mpCount": 3,
    "ilceIds": [
      "51-altunhisar",
      "51-bor",
      "51-camardi",
      "51-ciftlik",
      "51-merkez",
      "51-ulukisla"
    ]
  },
  {
    "id": "52",
    "name": "Ordu",
    "ilId": "52",
    "mpCount": 6,
    "ilceIds": [
      "52-akkus",
      "52-altinordu",
      "52-aybasti",
      "52-camas",
      "52-catalpinar",
      "52-caybasi",
      "52-fatsa",
      "52-golkoy",
      "52-gulyali",
      "52-gurgentepe",
      "52-i-kizce",
      "52-kabaduz",
      "52-kabatas",
      "52-korgan",
      "52-kumru",
      "52-mesudiye",
      "52-persembe",
      "52-ulubey",
      "52-unye"
    ]
  },
  {
    "id": "53",
    "name": "Rize",
    "ilId": "53",
    "mpCount": 3,
    "ilceIds": [
      "53-ardesen",
      "53-camlihemsin",
      "53-cayeli",
      "53-derepazari",
      "53-findikli",
      "53-guneysu",
      "53-hemsin",
      "53-i-kizdere",
      "53-i-yidere",
      "53-kalkandere",
      "53-merkez",
      "53-pazar"
    ]
  },
  {
    "id": "54",
    "name": "Sakarya",
    "ilId": "54",
    "mpCount": 6,
    "ilceIds": [
      "54-adapazari",
      "54-akyazi",
      "54-arifiye",
      "54-erenler",
      "54-ferizli",
      "54-geyve",
      "54-hendek",
      "54-karapurcek",
      "54-karasu",
      "54-kaynarca",
      "54-kocaali",
      "54-pamukova",
      "54-sapanca",
      "54-serdivan",
      "54-sogutlu",
      "54-tarakli"
    ]
  },
  {
    "id": "55-1",
    "name": "Samsun 1. Bölge",
    "ilId": "55",
    "mpCount": 6,
    "ilceIds": [
      "55-asarcik",
      "55-atakum",
      "55-ayvacik",
      "55-canik",
      "55-carsamba",
      "55-i-lkadim",
      "55-kavak",
      "55-ladik",
      "55-salipazari",
      "55-tekkekoy",
      "55-terme"
    ]
  },
  {
    "id": "55-2",
    "name": "Samsun 2. Bölge",
    "ilId": "55",
    "mpCount": 3,
    "ilceIds": [
      "55-19-mayis",
      "55-alacam",
      "55-bafra",
      "55-havza",
      "55-vezirkopru",
      "55-yakakent"
    ]
  },
  {
    "id": "56",
    "name": "Siirt",
    "ilId": "56",
    "mpCount": 3,
    "ilceIds": [
      "56-baykan",
      "56-eruh",
      "56-kurtalan",
      "56-merkez",
      "56-pervari",
      "56-sirvan",
      "56-tillo"
    ]
  },
  {
    "id": "57",
    "name": "Sinop",
    "ilId": "57",
    "mpCount": 3,
    "ilceIds": [
      "57-ayancik",
      "57-boyabat",
      "57-dikmen",
      "57-duragan",
      "57-erfelek",
      "57-gerze",
      "57-merkez",
      "57-sarayduzu",
      "57-turkeli"
    ]
  },
  {
    "id": "58",
    "name": "Sivas",
    "ilId": "58",
    "mpCount": 6,
    "ilceIds": [
      "58-akincilar",
      "58-altinyayla",
      "58-divrigi",
      "58-dogansar",
      "58-gemerek",
      "58-golova",
      "58-gurun",
      "58-hafik",
      "58-i-mranli",
      "58-kangal",
      "58-koyulhisar",
      "58-merkez",
      "58-sarkisla",
      "58-susehri",
      "58-ulas",
      "58-yildizeli",
      "58-zara"
    ]
  },
  {
    "id": "59",
    "name": "Tekirdağ",
    "ilId": "59",
    "mpCount": 4,
    "ilceIds": [
      "59-cerkezkoy",
      "59-corlu",
      "59-ergene",
      "59-hayrabolu",
      "59-kapakli",
      "59-malkara",
      "59-marmaraereglisi",
      "59-muratli",
      "59-saray",
      "59-sarkoy",
      "59-suleymanpasa"
    ]
  },
  {
    "id": "60",
    "name": "Tokat",
    "ilId": "60",
    "mpCount": 6,
    "ilceIds": [
      "60-almus",
      "60-artova",
      "60-basciftlik",
      "60-erbaa",
      "60-merkez",
      "60-niksar",
      "60-pazar",
      "60-resadiye",
      "60-sulusaray",
      "60-turhal",
      "60-yesilyurt",
      "60-zile"
    ]
  },
  {
    "id": "61",
    "name": "Trabzon",
    "ilId": "61",
    "mpCount": 6,
    "ilceIds": [
      "61-akcaabat",
      "61-arakli",
      "61-arsin",
      "61-besikduzu",
      "61-carsibasi",
      "61-caykara",
      "61-dernekpazari",
      "61-duzkoy",
      "61-hayrat",
      "61-koprubasi",
      "61-macka",
      "61-of",
      "61-ortahisar",
      "61-salpazari",
      "61-surmene",
      "61-tonya",
      "61-vakfikebir",
      "61-yomra"
    ]
  },
  {
    "id": "62",
    "name": "Tunceli",
    "ilId": "62",
    "mpCount": 2,
    "ilceIds": [
      "62-cemisgezek",
      "62-hozat",
      "62-mazgirt",
      "62-merkez",
      "62-nazimiye",
      "62-ovacik",
      "62-pertek",
      "62-pulumur"
    ]
  },
  {
    "id": "63-1",
    "name": "Şanlıurfa 1. Bölge",
    "ilId": "63",
    "mpCount": 5,
    "ilceIds": [
      "63-birecik",
      "63-bozova",
      "63-eyyubiye",
      "63-halfeti",
      "63-haliliye",
      "63-karakopru",
      "63-suruc"
    ]
  },
  {
    "id": "63-2",
    "name": "Şanlıurfa 2. Bölge",
    "ilId": "63",
    "mpCount": 3,
    "ilceIds": [
      "63-akcakale",
      "63-ceylanpinar",
      "63-harran",
      "63-hilvan",
      "63-siverek",
      "63-viransehir"
    ]
  },
  {
    "id": "64",
    "name": "Uşak",
    "ilId": "64",
    "mpCount": 3,
    "ilceIds": [
      "64-banaz",
      "64-esme",
      "64-karahalli",
      "64-merkez",
      "64-sivasli",
      "64-ulubey"
    ]
  },
  {
    "id": "65",
    "name": "Van",
    "ilId": "65",
    "mpCount": 5,
    "ilceIds": [
      "65-bahcesaray",
      "65-baskale",
      "65-caldiran",
      "65-catak",
      "65-edremit",
      "65-ercis",
      "65-gevas",
      "65-gurpinar",
      "65-i-pekyolu",
      "65-muradiye",
      "65-ozalp",
      "65-saray",
      "65-tusba"
    ]
  },
  {
    "id": "66",
    "name": "Yozgat",
    "ilId": "66",
    "mpCount": 5,
    "ilceIds": [
      "66-akdagmadeni",
      "66-aydincik",
      "66-bogazliyan",
      "66-candir",
      "66-cayiralan",
      "66-cekerek",
      "66-kadisehri",
      "66-merkez",
      "66-saraykent",
      "66-sarikaya",
      "66-sefaatli",
      "66-sorgun",
      "66-yenifakili",
      "66-yerkoy"
    ]
  },
  {
    "id": "67-1",
    "name": "Zonguldak 1. Bölge",
    "ilId": "67",
    "mpCount": 4,
    "ilceIds": [
      "67-caycuma",
      "67-eregli",
      "67-kilimli",
      "67-kozlu",
      "67-merkez"
    ]
  },
  {
    "id": "67-2",
    "name": "Zonguldak 2. Bölge",
    "ilId": "67",
    "mpCount": 3,
    "ilceIds": [
      "67-alapli",
      "67-devrek",
      "67-gokcebey",
      "78-eflani",
      "78-merkez",
      "78-safranbolu",
      "78-yenice"
    ]
  },
  {
    "id": "68",
    "name": "Aksaray",
    "ilId": "68",
    "mpCount": 3,
    "ilceIds": [
      "68-agacoren",
      "68-eskil",
      "68-gulagac",
      "68-guzelyurt",
      "68-merkez",
      "68-ortakoy",
      "68-sariyahsi",
      "68-sultanhani"
    ]
  },
  {
    "id": "69",
    "name": "Bayburt",
    "ilId": "69",
    "mpCount": 2,
    "ilceIds": [
      "69-aydintepe",
      "69-demirozu",
      "69-merkez"
    ]
  },
  {
    "id": "70",
    "name": "Karaman",
    "ilId": "70",
    "mpCount": 2,
    "ilceIds": [
      "70-ayranci",
      "70-basyayla",
      "70-ermenek",
      "70-kazimkarabekir",
      "70-merkez",
      "70-sariveliler"
    ]
  },
  {
    "id": "71",
    "name": "Kırıkkale",
    "ilId": "71",
    "mpCount": 3,
    "ilceIds": [
      "71-bahsili",
      "71-baliseyh",
      "71-celebi",
      "71-delice",
      "71-karakecili",
      "71-keskin",
      "71-merkez",
      "71-sulakyurt",
      "71-yahsihan"
    ]
  },
  {
    "id": "72",
    "name": "Batman",
    "ilId": "72",
    "mpCount": 3,
    "ilceIds": [
      "72-besiri",
      "72-gercus",
      "72-hasankeyf",
      "72-kozluk",
      "72-merkez",
      "72-sason"
    ]
  },
  {
    "id": "73",
    "name": "Şırnak",
    "ilId": "73",
    "mpCount": 3,
    "ilceIds": [
      "73-beytussebap",
      "73-cizre",
      "73-guclukonak",
      "73-i-dil",
      "73-merkez",
      "73-silopi",
      "73-uludere"
    ]
  },
  {
    "id": "74",
    "name": "Bartın",
    "ilId": "74",
    "mpCount": 2,
    "ilceIds": [
      "74-amasra",
      "74-kurucasile",
      "74-merkez",
      "74-ulus"
    ]
  }
];
