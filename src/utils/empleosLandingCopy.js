import { normalizeLanguage } from './translations.js';

const copy = {
  es: {
    areas: ['Tecnología', 'Ventas', 'Administración', 'Marketing', 'Finanzas', 'Educación', 'Salud', 'Diseño'],
    modalities: ['Presencial', 'Remoto', 'Híbrido'],
    subsections: ['Vacantes', 'Busco empleo', 'Tecnología', 'Ventas', 'Administración', 'Salud', 'Turismo', 'Medio tiempo', 'Cursos'],
    applyJobs: 'Buscar empleos →', mapTitle: 'Empleos en el mapa', mapDescription: 'Filtra oportunidades por ciudad, rango salarial y ubicación real.', mapMarkerTitle: 'Empleos en México',
    stats: [['Todo México', 'Busca por estado y ciudad'], ['Directo', 'Contacto con el anunciante'], ['Remoto', 'Filtra por modalidad'], ['Gratis', 'Buscar oportunidades']],
    areasTitle: 'Explorar por área', employerTitle: 'Buscas talento para tu empresa?', employerBody: 'Publica tu oferta de trabajo y conecta con candidatos en México.', employerButton: 'Publicar vacante gratis →',
  },
  en: {
    areas: ['Technology', 'Sales', 'Administration', 'Marketing', 'Finance', 'Education', 'Healthcare', 'Design'],
    modalities: ['On-site', 'Remote', 'Hybrid'], subsections: ['Open positions', 'Looking for work', 'Technology', 'Sales', 'Administration', 'Healthcare', 'Tourism', 'Part-time', 'Courses'],
    applyJobs: 'Search jobs →', mapTitle: 'Jobs on the map', mapDescription: 'Filter opportunities by city, salary range and real location.', mapMarkerTitle: 'Jobs in Mexico',
    stats: [['All Mexico', 'Search by state and city'], ['Direct', 'Contact the advertiser'], ['Remote', 'Filter by work mode'], ['Free', 'Search opportunities']],
    areasTitle: 'Explore by area', employerTitle: 'Looking for talent for your company?', employerBody: 'Post your job opening and connect with candidates in Mexico.', employerButton: 'Post a job for free →',
  },
  pt: {
    areas: ['Tecnologia', 'Vendas', 'Administração', 'Marketing', 'Finanças', 'Educação', 'Saúde', 'Design'],
    modalities: ['Presencial', 'Remoto', 'Híbrido'], subsections: ['Vagas', 'Procuro emprego', 'Tecnologia', 'Vendas', 'Administração', 'Saúde', 'Turismo', 'Meio período', 'Cursos'],
    applyJobs: 'Buscar empregos →', mapTitle: 'Empregos no mapa', mapDescription: 'Filtre oportunidades por cidade, faixa salarial e localização real.', mapMarkerTitle: 'Empregos no México',
    stats: [['Todo o México', 'Busque por estado e cidade'], ['Direto', 'Contato com o anunciante'], ['Remoto', 'Filtre por modalidade'], ['Grátis', 'Buscar oportunidades']],
    areasTitle: 'Explorar por área', employerTitle: 'Procurando talentos para sua empresa?', employerBody: 'Publique sua vaga e conecte-se com candidatos no México.', employerButton: 'Publicar vaga grátis →',
  },
  fr: {
    areas: ['Technologie', 'Ventes', 'Administration', 'Marketing', 'Finance', 'Éducation', 'Santé', 'Design'],
    modalities: ['Sur site', 'À distance', 'Hybride'], subsections: ['Offres', 'Recherche d’emploi', 'Technologie', 'Ventes', 'Administration', 'Santé', 'Tourisme', 'Temps partiel', 'Cours'],
    applyJobs: 'Rechercher des emplois →', mapTitle: 'Emplois sur la carte', mapDescription: 'Filtrez les opportunités par ville, salaire et localisation réelle.', mapMarkerTitle: 'Emplois au Mexique',
    stats: [['Tout le Mexique', 'Recherche par État et ville'], ['Direct', 'Contact avec l’annonceur'], ['À distance', 'Filtrer par modalité'], ['Gratuit', 'Rechercher des opportunités']],
    areasTitle: 'Explorer par domaine', employerTitle: 'Vous recherchez des talents ?', employerBody: 'Publiez votre offre et contactez des candidats au Mexique.', employerButton: 'Publier une offre gratuitement →',
  },
  zh: {
    areas: ['科技', '销售', '行政', '市场营销', '金融', '教育', '医疗健康', '设计'],
    modalities: ['现场办公', '远程', '混合办公'], subsections: ['招聘职位', '求职', '科技', '销售', '行政', '医疗健康', '旅游', '兼职', '课程'],
    applyJobs: '搜索职位 →', mapTitle: '地图上的职位', mapDescription: '按城市、薪资范围和实际位置筛选工作机会。', mapMarkerTitle: '墨西哥职位',
    stats: [['墨西哥全境', '按州和城市搜索'], ['直接联系', '联系发布者'], ['远程', '按工作方式筛选'], ['免费', '搜索工作机会']],
    areasTitle: '按领域浏览', employerTitle: '公司正在寻找人才？', employerBody: '发布职位，与墨西哥的求职者直接联系。', employerButton: '免费发布职位 →',
  },
  ko: {
    areas: ['기술', '영업', '관리', '마케팅', '금융', '교육', '의료', '디자인'],
    modalities: ['출근', '원격', '하이브리드'], subsections: ['채용 공고', '구직', '기술', '영업', '관리', '의료', '관광', '파트타임', '교육 과정'],
    applyJobs: '채용 정보 검색 →', mapTitle: '지도에서 채용 정보 보기', mapDescription: '도시, 급여 범위, 실제 위치로 채용 정보를 필터링하세요.', mapMarkerTitle: '멕시코 채용 정보',
    stats: [['멕시코 전역', '주 및 도시로 검색'], ['직접', '광고주와 직접 연락'], ['원격', '근무 형태로 필터링'], ['무료', '채용 정보 검색']],
    areasTitle: '분야별 탐색', employerTitle: '회사에 필요한 인재를 찾고 있나요?', employerBody: '채용 공고를 올리고 멕시코의 지원자와 연결하세요.', employerButton: '무료 채용 공고 등록 →',
  },
  de: {
    areas: ['Technologie', 'Vertrieb', 'Verwaltung', 'Marketing', 'Finanzen', 'Bildung', 'Gesundheit', 'Design'],
    modalities: ['Vor Ort', 'Remote', 'Hybrid'], subsections: ['Stellenangebote', 'Arbeit gesucht', 'Technologie', 'Vertrieb', 'Verwaltung', 'Gesundheit', 'Tourismus', 'Teilzeit', 'Kurse'],
    applyJobs: 'Jobs suchen →', mapTitle: 'Jobs auf der Karte', mapDescription: 'Stellen nach Stadt, Gehaltsspanne und tatsächlichem Standort filtern.', mapMarkerTitle: 'Jobs in Mexiko',
    stats: [['Ganz Mexiko', 'Nach Bundesstaat und Stadt suchen'], ['Direkt', 'Kontakt mit dem Inserenten'], ['Remote', 'Nach Arbeitsmodell filtern'], ['Kostenlos', 'Stellen suchen']],
    areasTitle: 'Nach Bereich entdecken', employerTitle: 'Suchen Sie Talente für Ihr Unternehmen?', employerBody: 'Veröffentlichen Sie Ihre Stelle und erreichen Sie Kandidaten in Mexiko.', employerButton: 'Stelle kostenlos veröffentlichen →',
  },
  it: {
    areas: ['Tecnologia', 'Vendite', 'Amministrazione', 'Marketing', 'Finanza', 'Istruzione', 'Sanità', 'Design'],
    modalities: ['In sede', 'Da remoto', 'Ibrido'], subsections: ['Offerte di lavoro', 'Cerco lavoro', 'Tecnologia', 'Vendite', 'Amministrazione', 'Sanità', 'Turismo', 'Part-time', 'Corsi'],
    applyJobs: 'Cerca lavoro →', mapTitle: 'Lavori sulla mappa', mapDescription: 'Filtra le opportunità per città, fascia salariale e posizione reale.', mapMarkerTitle: 'Lavori in Messico',
    stats: [['Tutto il Messico', 'Cerca per stato e città'], ['Diretto', 'Contatto con l’inserzionista'], ['Da remoto', 'Filtra per modalità'], ['Gratis', 'Cerca opportunità']],
    areasTitle: 'Esplora per settore', employerTitle: 'Cerchi talenti per la tua azienda?', employerBody: 'Pubblica la tua offerta e connettiti con candidati in Messico.', employerButton: 'Pubblica un’offerta gratis →',
  },
  ar: {
    areas: ['التقنية', 'المبيعات', 'الإدارة', 'التسويق', 'المالية', 'التعليم', 'الصحة', 'التصميم'],
    modalities: ['حضوري', 'عن بُعد', 'هجين'], subsections: ['وظائف شاغرة', 'أبحث عن عمل', 'التقنية', 'المبيعات', 'الإدارة', 'الصحة', 'السياحة', 'دوام جزئي', 'دورات'],
    applyJobs: 'البحث عن وظائف ←', mapTitle: 'الوظائف على الخريطة', mapDescription: 'صفِّ الفرص حسب المدينة ونطاق الراتب والموقع الفعلي.', mapMarkerTitle: 'وظائف في المكسيك',
    stats: [['كل المكسيك', 'ابحث حسب الولاية والمدينة'], ['مباشر', 'تواصل مع صاحب الإعلان'], ['عن بُعد', 'صفِّ حسب نمط العمل'], ['مجانًا', 'ابحث عن فرص']],
    areasTitle: 'استكشف حسب المجال', employerTitle: 'تبحث عن مواهب لشركتك؟', employerBody: 'انشر شاغرك وتواصل مع مرشحين في المكسيك.', employerButton: 'انشر وظيفة مجانًا ←',
  },
  ru: {
    areas: ['Технологии', 'Продажи', 'Администрирование', 'Маркетинг', 'Финансы', 'Образование', 'Здравоохранение', 'Дизайн'],
    modalities: ['В офисе', 'Удалённо', 'Гибрид'], subsections: ['Вакансии', 'Ищу работу', 'Технологии', 'Продажи', 'Администрирование', 'Здравоохранение', 'Туризм', 'Неполный день', 'Курсы'],
    applyJobs: 'Найти вакансии →', mapTitle: 'Вакансии на карте', mapDescription: 'Фильтруйте вакансии по городу, диапазону зарплаты и фактическому местоположению.', mapMarkerTitle: 'Вакансии в Мексике',
    stats: [['Вся Мексика', 'Поиск по штату и городу'], ['Напрямую', 'Связь с автором объявления'], ['Удалённо', 'Фильтр по формату работы'], ['Бесплатно', 'Поиск вакансий']],
    areasTitle: 'Поиск по сфере', employerTitle: 'Ищете сотрудников для компании?', employerBody: 'Разместите вакансию и свяжитесь с кандидатами в Мексике.', employerButton: 'Разместить вакансию бесплатно →',
  },
  ja: {
    areas: ['テクノロジー', '営業', '管理', 'マーケティング', '金融', '教育', '医療', 'デザイン'],
    modalities: ['出社', 'リモート', 'ハイブリッド'], subsections: ['求人', '求職', 'テクノロジー', '営業', '管理', '医療', '観光', 'パートタイム', '講座'],
    applyJobs: '求人を検索 →', mapTitle: '地図上の求人', mapDescription: '都市、給与帯、実際の勤務地で求人を絞り込めます。', mapMarkerTitle: 'メキシコの求人',
    stats: [['メキシコ全域', '州・都市で検索'], ['直接', '広告主に直接連絡'], ['リモート', '勤務形態で絞り込み'], ['無料', '求人を検索']],
    areasTitle: '分野から探す', employerTitle: '会社の人材をお探しですか？', employerBody: '求人を掲載して、メキシコの候補者とつながりましょう。', employerButton: '求人を無料掲載 →',
  },
};

export function getEmpleosLandingCopy(language) {
  const lang = normalizeLanguage(language);
  return copy[lang] || copy.es;
}

export function hasEmpleosLandingCopy(language) {
  const lang = String(language || '').toLowerCase().split('-')[0];
  return Boolean(copy[lang]);
}

export default copy;
