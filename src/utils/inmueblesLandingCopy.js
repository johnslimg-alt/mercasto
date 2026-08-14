import { normalizeLanguage } from './translations.js';

const copy = {
  es: {
    operations: ['Venta', 'Renta'], types: ['Casa', 'Departamento', 'Local', 'Terreno'],
    subsections: ['Casas', 'Departamentos', 'Renta', 'Terrenos', 'Locales', 'Oficinas', 'Vacacional'], applySearch: 'Buscar →',
    mapTitle: 'Propiedades en el mapa', mapDescription: 'Busca casas, departamentos y locales con filtros en pantalla completa.', mapMarkerTitle: 'Inmuebles en México', citiesTitle: 'Buscar por ciudad',
    tipsTitle: 'Consejos para comprar o rentar', tips: [
      ['Verifica el título de propiedad', 'Solicita la escritura y confirma que esté libre de gravámenes antes de firmar cualquier contrato.'],
      ['Conoce tus opciones de crédito', 'INFONAVIT, FOVISSSTE y créditos bancarios: compara tasas y condiciones antes de comprometerte.'],
      ['Visita siempre en persona', 'Las fotos no lo cuentan todo. Programa una visita para verificar el estado real del inmueble.'],
    ],
    ctaTitle: 'Tienes una propiedad para vender o rentar?', ctaBody: 'Llega a miles de compradores e inquilinos en toda la República.', ctaButton: 'Publicar propiedad gratis →',
  },
  en: {
    operations: ['For sale', 'For rent'], types: ['House', 'Apartment', 'Commercial space', 'Land'],
    subsections: ['Houses', 'Apartments', 'Rentals', 'Land', 'Commercial spaces', 'Offices', 'Vacation rentals'], applySearch: 'Search →',
    mapTitle: 'Properties on the map', mapDescription: 'Find houses, apartments and commercial spaces with full-screen filters.', mapMarkerTitle: 'Properties in Mexico', citiesTitle: 'Search by city',
    tipsTitle: 'Tips for buying or renting', tips: [
      ['Verify the property title', 'Request the deed and confirm there are no liens before signing any contract.'],
      ['Know your financing options', 'Compare INFONAVIT, FOVISSSTE and bank loan rates and terms before committing.'],
      ['Always visit in person', 'Photos do not show everything. Schedule a visit to verify the property’s actual condition.'],
    ],
    ctaTitle: 'Have a property to sell or rent?', ctaBody: 'Reach thousands of buyers and tenants across Mexico.', ctaButton: 'Post a property for free →',
  },
  pt: {
    operations: ['Venda', 'Aluguel'], types: ['Casa', 'Apartamento', 'Ponto comercial', 'Terreno'],
    subsections: ['Casas', 'Apartamentos', 'Aluguel', 'Terrenos', 'Pontos comerciais', 'Escritórios', 'Temporada'], applySearch: 'Buscar →',
    mapTitle: 'Imóveis no mapa', mapDescription: 'Encontre casas, apartamentos e pontos comerciais com filtros em tela cheia.', mapMarkerTitle: 'Imóveis no México', citiesTitle: 'Buscar por cidade',
    tipsTitle: 'Dicas para comprar ou alugar', tips: [
      ['Verifique o título do imóvel', 'Solicite a escritura e confirme que não há ônus antes de assinar qualquer contrato.'],
      ['Conheça suas opções de crédito', 'Compare taxas e condições de INFONAVIT, FOVISSSTE e bancos antes de se comprometer.'],
      ['Sempre visite pessoalmente', 'As fotos não mostram tudo. Agende uma visita para verificar o estado real do imóvel.'],
    ],
    ctaTitle: 'Tem um imóvel para vender ou alugar?', ctaBody: 'Alcance milhares de compradores e inquilinos em todo o México.', ctaButton: 'Publicar imóvel grátis →',
  },
  fr: {
    operations: ['Vente', 'Location'], types: ['Maison', 'Appartement', 'Local commercial', 'Terrain'],
    subsections: ['Maisons', 'Appartements', 'Locations', 'Terrains', 'Locaux commerciaux', 'Bureaux', 'Locations vacances'], applySearch: 'Rechercher →',
    mapTitle: 'Biens sur la carte', mapDescription: 'Trouvez maisons, appartements et locaux avec des filtres plein écran.', mapMarkerTitle: 'Biens immobiliers au Mexique', citiesTitle: 'Rechercher par ville',
    tipsTitle: 'Conseils pour acheter ou louer', tips: [
      ['Vérifiez le titre de propriété', 'Demandez l’acte et vérifiez l’absence de charges avant de signer un contrat.'],
      ['Comparez vos options de financement', 'Comparez les taux et conditions INFONAVIT, FOVISSSTE et bancaires avant de vous engager.'],
      ['Visitez toujours sur place', 'Les photos ne montrent pas tout. Planifiez une visite pour vérifier l’état réel du bien.'],
    ],
    ctaTitle: 'Vous avez un bien à vendre ou à louer ?', ctaBody: 'Touchez des milliers d’acheteurs et de locataires partout au Mexique.', ctaButton: 'Publier un bien gratuitement →',
  },
  zh: {
    operations: ['出售', '出租'], types: ['住宅', '公寓', '商铺', '土地'],
    subsections: ['住宅', '公寓', '出租', '土地', '商铺', '办公室', '度假租赁'], applySearch: '搜索 →',
    mapTitle: '地图上的房产', mapDescription: '使用全屏筛选查找住宅、公寓和商铺。', mapMarkerTitle: '墨西哥房产', citiesTitle: '按城市搜索',
    tipsTitle: '购买或租赁建议', tips: [
      ['核实产权文件', '签署任何合同前，请索取产权契据并确认房产没有抵押或其他权利负担。'],
      ['了解融资选择', '决定前比较 INFONAVIT、FOVISSSTE 和银行贷款的利率与条件。'],
      ['务必亲自看房', '照片无法展示全部情况。安排实地看房以确认房产真实状况。'],
    ],
    ctaTitle: '有房产要出售或出租？', ctaBody: '触达墨西哥各地数千名买家和租客。', ctaButton: '免费发布房产 →',
  },
  ko: {
    operations: ['매매', '임대'], types: ['주택', '아파트', '상가', '토지'],
    subsections: ['주택', '아파트', '임대', '토지', '상가', '사무실', '휴가용 임대'], applySearch: '검색 →',
    mapTitle: '지도에서 매물 보기', mapDescription: '전체 화면 필터로 주택, 아파트, 상가를 찾아보세요.', mapMarkerTitle: '멕시코 부동산', citiesTitle: '도시별 검색',
    tipsTitle: '구매·임대 팁', tips: [
      ['소유권 문서를 확인하세요', '계약 전 등기를 요청하고 담보권 등 권리 제한이 없는지 확인하세요.'],
      ['대출 선택지를 비교하세요', '결정 전에 INFONAVIT, FOVISSSTE, 은행 대출의 금리와 조건을 비교하세요.'],
      ['반드시 직접 방문하세요', '사진만으로는 모든 상태를 알 수 없습니다. 방문해 실제 상태를 확인하세요.'],
    ],
    ctaTitle: '판매하거나 임대할 부동산이 있나요?', ctaBody: '멕시코 전역의 수천 명 구매자와 임차인에게 도달하세요.', ctaButton: '부동산 무료 등록 →',
  },
  de: {
    operations: ['Kaufen', 'Mieten'], types: ['Haus', 'Wohnung', 'Gewerberaum', 'Grundstück'],
    subsections: ['Häuser', 'Wohnungen', 'Miete', 'Grundstücke', 'Gewerberäume', 'Büros', 'Ferienvermietung'], applySearch: 'Suchen →',
    mapTitle: 'Immobilien auf der Karte', mapDescription: 'Häuser, Wohnungen und Gewerberäume mit Vollbildfiltern finden.', mapMarkerTitle: 'Immobilien in Mexiko', citiesTitle: 'Nach Stadt suchen',
    tipsTitle: 'Tipps zum Kaufen oder Mieten', tips: [
      ['Eigentumsnachweis prüfen', 'Fordern Sie die Urkunde an und prüfen Sie vor Vertragsabschluss, ob Belastungen bestehen.'],
      ['Finanzierungsoptionen vergleichen', 'Vergleichen Sie INFONAVIT, FOVISSSTE und Bankkredite nach Zinsen und Konditionen.'],
      ['Immer persönlich besichtigen', 'Fotos zeigen nicht alles. Vereinbaren Sie eine Besichtigung und prüfen Sie den tatsächlichen Zustand.'],
    ],
    ctaTitle: 'Sie möchten eine Immobilie verkaufen oder vermieten?', ctaBody: 'Erreichen Sie Tausende Käufer und Mieter in ganz Mexiko.', ctaButton: 'Immobilie kostenlos inserieren →',
  },
  it: {
    operations: ['Vendita', 'Affitto'], types: ['Casa', 'Appartamento', 'Locale commerciale', 'Terreno'],
    subsections: ['Case', 'Appartamenti', 'Affitti', 'Terreni', 'Locali commerciali', 'Uffici', 'Affitti vacanze'], applySearch: 'Cerca →',
    mapTitle: 'Immobili sulla mappa', mapDescription: 'Trova case, appartamenti e locali con filtri a schermo intero.', mapMarkerTitle: 'Immobili in Messico', citiesTitle: 'Cerca per città',
    tipsTitle: 'Consigli per comprare o affittare', tips: [
      ['Verifica il titolo di proprietà', 'Richiedi l’atto e controlla che non ci siano vincoli prima di firmare un contratto.'],
      ['Confronta le opzioni di credito', 'Confronta tassi e condizioni di INFONAVIT, FOVISSSTE e banche prima di impegnarti.'],
      ['Visita sempre di persona', 'Le foto non mostrano tutto. Prenota una visita per verificare le condizioni reali.'],
    ],
    ctaTitle: 'Hai un immobile da vendere o affittare?', ctaBody: 'Raggiungi migliaia di acquirenti e inquilini in tutto il Messico.', ctaButton: 'Pubblica immobile gratis →',
  },
  ar: {
    operations: ['للبيع', 'للإيجار'], types: ['منزل', 'شقة', 'محل تجاري', 'أرض'],
    subsections: ['منازل', 'شقق', 'إيجار', 'أراضٍ', 'محلات تجارية', 'مكاتب', 'إيجار للعطلات'], applySearch: 'بحث ←',
    mapTitle: 'العقارات على الخريطة', mapDescription: 'ابحث عن المنازل والشقق والمحلات باستخدام فلاتر بملء الشاشة.', mapMarkerTitle: 'عقارات في المكسيك', citiesTitle: 'البحث حسب المدينة',
    tipsTitle: 'نصائح للشراء أو الإيجار', tips: [
      ['تحقق من سند الملكية', 'اطلب سند الملكية وتأكد من خلو العقار من القيود قبل توقيع أي عقد.'],
      ['قارن خيارات التمويل', 'قارن معدلات وشروط INFONAVIT وFOVISSSTE والبنوك قبل الالتزام.'],
      ['عاين العقار شخصيًا', 'الصور لا تظهر كل شيء. رتب زيارة للتحقق من الحالة الفعلية للعقار.'],
    ],
    ctaTitle: 'لديك عقار للبيع أو الإيجار؟', ctaBody: 'صل إلى آلاف المشترين والمستأجرين في جميع أنحاء المكسيك.', ctaButton: 'انشر عقارك مجانًا ←',
  },
  ru: {
    operations: ['Продажа', 'Аренда'], types: ['Дом', 'Квартира', 'Коммерческое помещение', 'Участок'],
    subsections: ['Дома', 'Квартиры', 'Аренда', 'Участки', 'Коммерческие помещения', 'Офисы', 'Посуточная аренда'], applySearch: 'Найти →',
    mapTitle: 'Недвижимость на карте', mapDescription: 'Ищите дома, квартиры и коммерческие помещения с полноэкранными фильтрами.', mapMarkerTitle: 'Недвижимость в Мексике', citiesTitle: 'Поиск по городу',
    tipsTitle: 'Советы по покупке и аренде', tips: [
      ['Проверьте право собственности', 'Запросите документ о собственности и убедитесь в отсутствии обременений до подписания договора.'],
      ['Сравните варианты кредита', 'Сравните ставки и условия INFONAVIT, FOVISSSTE и банков до принятия решения.'],
      ['Всегда осматривайте лично', 'Фотографии показывают не всё. Запланируйте осмотр и проверьте реальное состояние объекта.'],
    ],
    ctaTitle: 'Есть недвижимость для продажи или аренды?', ctaBody: 'Покажите объект тысячам покупателей и арендаторов по всей Мексике.', ctaButton: 'Разместить объект бесплатно →',
  },
  ja: {
    operations: ['売買', '賃貸'], types: ['一戸建て', 'マンション', '店舗', '土地'],
    subsections: ['一戸建て', 'マンション', '賃貸', '土地', '店舗', 'オフィス', 'バケーションレンタル'], applySearch: '検索 →',
    mapTitle: '地図上の不動産', mapDescription: '全画面フィルターで住宅、マンション、店舗を探せます。', mapMarkerTitle: 'メキシコの不動産', citiesTitle: '都市から探す',
    tipsTitle: '購入・賃貸のポイント', tips: [
      ['所有権書類を確認', '契約前に権利証を確認し、抵当権などの負担がないことを確かめてください。'],
      ['融資条件を比較', 'INFONAVIT、FOVISSSTE、銀行ローンの金利と条件を比較してから決めましょう。'],
      ['必ず現地を見学', '写真だけでは分からない点があります。訪問して実際の状態を確認してください。'],
    ],
    ctaTitle: '売却・賃貸したい不動産がありますか？', ctaBody: 'メキシコ全土の何千人もの買主・借主に届けられます。', ctaButton: '不動産を無料掲載 →',
  },
};

export function getInmueblesLandingCopy(language) {
  const lang = normalizeLanguage(language);
  return copy[lang] || copy.es;
}

export function hasInmueblesLandingCopy(language) {
  const lang = String(language || '').toLowerCase().split('-')[0];
  return Boolean(copy[lang]);
}

export default copy;
