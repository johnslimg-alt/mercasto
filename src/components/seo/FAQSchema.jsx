/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { useUI } from '../../contexts/UIContext';
import { translations } from '../../constants/mockData';

/**
 * Predefined FAQ data for different page types in all 13 languages
 */
export const FAQ_DATA = {
  home: {
    es: [
      { question: "¿Qué es Mercasto?", answer: "Mercasto es el marketplace líder de anuncios clasificados en México donde puedes comprar, vender y rentar autos, inmuebles, servicios, empleo, electrónica y más en los 32 estados del país." },
      { question: "¿Es gratis publicar anuncios en Mercasto?", answer: "Sí, publicar anuncios básicos es completamente gratuito. También ofrecemos planes PRO con características avanzadas como fotos ilimitadas, posicionamiento prioritario y estadísticas detalladas." },
      { question: "¿En qué estados de México opera Mercasto?", answer: "Mercasto opera en los 32 estados de México: Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Ciudad de México, Coahuila, Colima, Durango, Estado de México, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán y Zacatecas." },
      { question: "¿Cómo puedo verificar mi cuenta?", answer: "Puedes verificar tu cuenta a través de email, teléfono o documento de identidad (KYC). La verificación aumenta la confianza de otros usuarios y te permite acceder a funciones premium." },
      { question: "¿Mercasto es seguro?", answer: "Sí, Mercasto cuenta con verificación de usuarios, encriptación SSL, protección contra fraudes, sistema de reportes y moderación 24/7 para garantizar transacciones seguras." }
    ],
    en: [
      { question: "What is Mercasto?", answer: "Mercasto is the leading classifieds marketplace in Mexico where you can buy, sell, and rent cars, real estate, services, jobs, electronics, and more across all 32 states." },
      { question: "Is it free to post ads on Mercasto?", answer: "Yes, posting basic ads is completely free. We also offer PRO plans with advanced features like unlimited photos, priority positioning, and detailed statistics." },
      { question: "In which states of Mexico does Mercasto operate?", answer: "Mercasto operates in all 32 Mexican states: Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Mexico City, Coahuila, Colima, Durango, State of Mexico, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán, and Zacatecas." },
      { question: "How can I verify my account?", answer: "You can verify your account via email, phone, or identity document (KYC). Verification increases trust among other users and grants access to premium features." },
      { question: "Is Mercasto safe?", answer: "Yes, Mercasto features user verification, SSL encryption, fraud protection, a reporting system, and 24/7 moderation to ensure safe transactions." }
    ],
    pt: [
      { question: "O que é o Mercasto?", answer: "O Mercasto é o principal marketplace de classificados no México, onde você pode comprar, vender e alugar carros, imóveis, serviços, empregos, eletrônicos e muito mais em todos os 32 estados do país." },
      { question: "É grátis publicar anúncios no Mercasto?", answer: "Sim, publicar anúncios básicos é totalmente gratuito. Também oferecemos planos PRO com recursos avançados, como fotos ilimitadas, posicionamento prioritário e estatísticas detalhadas." },
      { question: "Em quais estados do México o Mercasto opera?", answer: "O Mercasto opera em todos os 32 estados do México: Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Cidade do México, Coahuila, Colima, Durango, Estado do México, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán e Zacatecas." },
      { question: "Como posso verificar minha conta?", answer: "Você pode verificar sua conta via e-mail, telefone ou documento de identidade (KYC). A verificação aumenta a confiança de outros usuários e permite acessar recursos premium." },
      { question: "O Mercasto é seguro?", answer: "Sim, o Mercasto possui verificação de usuários, criptografia SSL, proteção contra fraudes, sistema de denúncias e moderação 24/7 para garantir transações seguras." }
    ],
    ru: [
      { question: "Что такое Mercasto?", answer: "Mercasto — это ведущая площадка объявлений в Мексике, где вы можете покупать, продавать и арендовать автомобили, недвижимость, услуги, вакансии, электронику и многое другое во всех 32 штатах." },
      { question: "Бесплатно ли размещать объявления на Mercasto?", answer: "Да, размещение базовых объявлений совершенно бесплатно. Мы также предлагаем тарифы PRO с расширенными функциями, такими как неограниченное количество фотографий, приоритетное размещение и детальная статистика." },
      { question: "В каких штатах Мексики работает Mercasto?", answer: "Mercasto работает во всех 32 штатах Мексики: Агуаскальентес, Нижняя Калифорния, Южная Нижняя Калифорния, Кампече, Чьяпас, Чиуауа, Мехико, Коауила, Колима, Дуранго, штат Мехико, Гуанахуато, Герреро, Идальго, Халиско, Мичоакан, Морелос, Наярит, Нуэво-Леон, Оахака, Пуэбла, Керетаро, Кинтана-Роо, Сан-Луис-Потоси, Синалоа, Сонора, Табаско, Тамаулипас, Тласкала, Веракрус, Юкатан и Сакатекас." },
      { question: "Как я могу подтвердить свой профиль?", answer: "Вы можете подтвердить свой профиль с помощью электронной почты, телефона или документа, удостоверяющего личность (KYC). Верификация повышает доверие со стороны других пользователей и дает доступ к премиум-функциям." },
      { question: "Безопасен ли Mercasto?", answer: "Да, Mercasto использует верификацию пользователей, SSL-шифрование, защиту от мошенничества, систему жалоб и круглосуточную модерацию для обеспечения безопасности сделок." }
    ],
    zh: [
      { question: "什么是 Mercasto？", answer: "Mercasto 是墨西哥领先的分类广告市场，您可以在全国 32 个州购买、出售和出租汽车、房地产、服务、工作、电子产品等。" },
      { question: "在 Mercasto 发布广告免费吗？", answer: "是的，发布基本广告是完全免费的。我们还提供 PRO 计划，具有无限照片、优先展示和详细统计等高级功能。" },
      { question: "Mercasto 在墨西哥哪些州运营？", answer: "Mercasto 在墨西哥所有 32 个州运营：阿瓜斯卡连特斯、下加利福尼亚、南下加利福尼亚、坎佩切、恰帕斯、奇瓦瓦、墨西哥城、科阿韦拉、科利马、杜兰戈、墨西哥州、瓜纳华托、格雷罗、伊达尔戈、哈利斯科、米却肯、莫雷洛斯、纳亚里特、新莱昂、瓦哈卡、普埃布拉、克雷塔罗、金塔纳罗奥、圣路易斯波托西、锡那罗亚、索诺拉、塔巴斯科、塔毛利帕斯、特拉斯卡拉、韦拉克鲁斯、尤卡坦和萨卡特卡斯。" },
      { question: "如何验证我的账户？", answer: "您可以通过电子邮件、电话或身份证件 (KYC) 验证您的账户。验证可以增加其他用户的信任，并允许使用高级功能。" },
      { question: "Mercasto 安全吗？", answer: "是的，Mercasto 具有用户验证、SSL 加密、欺诈保护、举报系统和 24/7 审核，以确保交易安全。" }
    ],
    ko: [
      { question: "Mercasto는 무엇인가요?", answer: "Mercasto는 멕시코 전역의 32개 주에서 자동차, 부동산, 서비스, 채용, 전자 제품 등을 구매, 판매 및 대여할 수 있는 선도적인 분류 광고 시장입니다." },
      { question: "Mercasto에 광고를 게시하는 것은 무료인가요?", answer: "예, 기본 광고 게시는 완전 무료입니다. 무제한 사진, 우선 노출, 상세 통계와 같은 고급 기능을 제공하는 PRO 요금제도 있습니다." },
      { question: "Mercasto는 멕시코의 어느 주에서 운영되나요?", answer: "Mercasto는 멕시코의 32개 주 전체에서 운영됩니다: 아과스칼리엔테스, 바하칼리포르니아, 바하칼리포르니아수르, 캄페체, 치아파스, 치와와, 멕시코시티, 코아우일라, 콜리마, 두랑고, 멕시코주, 과나후아토, 게레로, 이달고, 할리스코, 미초아칸, 모렐로스, 나야리트, 누에보레온, 오아하카, 푸에블라, 케레타로, 킨타나로오, 산루이스포토시, 시날로아, 소노라, 타바스코, 타마울리파스, 트laxcala, 베라크루스, 유카탄, 사카테카스." },
      { question: "계정을 어떻게 인증하나요?", answer: "이메일, 전화 또는 신원 확인 문서(KYC)를 통해 계정을 인증할 수 있습니다. 인증은 다른 사용자 간의 신뢰를 높이고 프리미엄 기능에 대한 액세스를 허용합니다." },
      { question: "Mercasto는 안전한가요?", answer: "예, Mercasto는 안전한 거래를 보장하기 위해 사용자 인증, SSL 암호화, 사기 방지, 신고 시스템 및 24/7 모니터링을 제공합니다." }
    ],
    de: [
      { question: "Was ist Mercasto?", answer: "Mercasto ist der führende Kleinanzeigenmarkt in Mexiko, auf dem Sie in allen 32 Bundesstaaten Autos, Immobilien, Dienstleistungen, Jobs, Elektronik und mehr kaufen, verkaufen und mieten können." },
      { question: "Ist das Aufgeben von Anzeigen auf Mercasto kostenlos?", answer: "Ja, das Aufgeben von Basisanzeigen ist völlig kostenlos. Wir bieten auch PRO-Pläne mit erweiterten Funktionen wie unbegrenzten Fotos, Premium-Platzierung und detaillierten Statistiken an." },
      { question: "In welchen mexikanischen Bundesstaaten ist Mercasto aktiv?", answer: "Mercasto ist in allen 32 mexikanischen Bundesstaaten aktiv: Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Mexiko-Stadt, Coahuila, Colima, Durango, Bundesstaat Mexiko, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán und Zacatecas." },
      { question: "Wie kann ich mein Konto verifizieren?", answer: "Sie können Ihr Konto per E-Mail, Telefon oder Ausweisdokument (KYC) verifizieren. Die Verifizierung erhöht das Vertrauen anderer Benutzer und ermöglicht den Zugriff auf Premium-Funktionen." },
      { question: "Ist Mercasto sicher?", answer: "Ja, Mercasto bietet Benutzerverifizierung, SSL-Verschlüsselung, Betrugsschutz, ein Meldesystem und eine 24/7-Moderation, um sichere Transaktionen zu gewährleisten." }
    ],
    it: [
      { question: "Cos'è Mercasto?", answer: "Mercasto è il mercato di annunci leader in Messico dove puoi comprare, vendere e affittare auto, immobili, servizi, lavoro, elettronica e altro in tutti i 32 stati del paese." },
      { question: "È gratuito pubblicare annunci su Mercasto?", answer: "Sì, la pubblicazione di annunci di base è completamente gratuita. Offriamo anche piani PRO con funzionalità avanzate come foto illimitate, posizionamento prioritario e statistiche dettagliate." },
      { question: "In quali stati del Messico opera Mercasto?", answer: "Mercasto opera in tutti i 32 stati del Messico: Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Città del Messico, Coahuila, Colima, Durango, Stato del Messico, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Campania, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán e Zacatecas." },
      { question: "Come posso verificare il mio account?", answer: "Puoi verificare il tuo account tramite e-mail, telefono o documento d'identità (KYC). La verifica aumenta la fiducia tra gli utenti e consente l'accesso alle funzionalità premium." },
      { question: "Mercasto è sicuro?", answer: "Sì, Mercasto dispone di verifica degli utenti, crittografia SSL, protezione dalle frodi, sistema di segnalazione e moderazione 24/7 per garantire transazioni sicure." }
    ],
    ar: [
      { question: "ما هو ميركاستو؟", answer: "ميركاستو هو السوق الرائد للإعلانات المبوبة في المكسيك حيث يمكنك شراء وبيع وتأجير السيارات والعقارات والخدمات والوظائف والإلكترونيات والمزيد في جميع الولايات الـ 32." },
      { question: "هل نشر الإعلانات على ميركاستو مجاني؟", answer: "نعم، نشر الإعلانات الأساسية مجاني تمامًا. كما نقدم خطط PRO بميزات متقدمة مثل صور غير محدودة، أولوية الظهور، وإحصاءات مفصلة." },
      { question: "في أي ولايات المكسيك يعمل ميركاستو؟", answer: "يعمل ميركاستو في جميع ولايات المكسيك الـ 32: أغواسكالينتس، باخا كاليفورنيا، باخا كاليفورنيا سور، كامبيتشي، تشياباس، تشيواوا، مكسيكو سيتي، كواهويلا، كوليما، دورانجو، ولاية مكسيكو، غواناخواتو، غويريرو، هيدالغو، خاليسكو، ميتشواكان، موريلوس، ناياريت، نويفو ليون، أوخاكا، بويبلا، كيريتارو، كينتانا رو، سان لويس بوتوسي، سينالوا، سونورا، تاباسكو، تاماوليباس، تلاكسكالا، فيراكروز، يوكاتان، وزاكاتيكاس." },
      { question: "كيف يمكنني توثيق حسابي؟", answer: "يمكنك توثيق حسابك عبر البريد الإلكتروني أو الهاتف أو وثيقة الهوية (KYC). يزيد التوثيق من ثقة المستخدمين الآخرين ويمنحك إمكانية الوصول إلى الميزات المميزة." },
      { question: "هل ميركاستو آمن؟", answer: "نعم، يتميز ميركاستو بتوثيق المستخدمين، تشفير SSL، الحماية من الاحتيال، نظام الإبلاغ، والمراقبة على مدار الساعة لضمان معاملات آمنة." }
    ],
    he: [
      { question: "מה זה Mercasto?", answer: "Mercasto הוא לוח המודעות המוביל במקסיקו בו ניתן לקנות, למכור ולשכור מכוניות, נדל\"ן, שירותים, משרות, מוצרי אלקטروניקה ועוד בכל 32 המדינות." },
      { question: "האם פרסום מודעות ב-Mercasto הוא בחינם?", answer: "כן, פרסום מודעות בסיסיות הוא חינמי לחלוטין. אנו מציעים גם תוכניות PRO עם תכונות מתקדמות כמו תמונות ללא הגבלה, מיקום בעדיפות וסטטיסטיקות מפורטות." },
      { question: "באילו מדינות במקסיקו פועל Mercasto?", answer: "Mercasto פועל בכל 32 מדינות מקסיקו: אגואסקליינטס, באחה קליפורניה, באחה קליפורניה סור, קמפצ'ה, צ'יאפס, צ'יוואווה, מקסיקו סיטי, קואווילה, קולימה, דורנגו, מדינת מקסיקו, גואנחואטו, גררו, הידלגו, חליסקו, מיצ'ואקאן, מורלוס, ניאריט, נואבו לאון, אואחאקה, פואבלה, קרטרו, קינטנה רו, סן לואיס פוטוסי, סינלואה, סונורה, טבסקו, טמאוליפס, טלקסקלה, וראקרוס, יוקטן וזקאטקאס." },
      { question: "כיצד אוכל לאמת את החשבון שלי?", answer: "תוכל לאמת את החשבון שלך באמצעות אימייל, טלפון או מסמך זיהוי (KYC). האימות מגביר את האמון בקרב משתמשים אחרים ומאפשר גישה לתכונות פרימיום." },
      { question: "האם Mercasto בטוח?", answer: "כן, Mercasto כולל אימות משתמשים, הצפנת SSL, הגנה מפני הונאות, מערכת דיווחים וסינון תוכן 24/7 כדי להבטיح עסקאות בטוחות." }
    ],
    yi: [
      { question: "וואס איז מערקאסטא?", answer: "מערקאַסטאָ איז דער לידינג קלאַססיפיעדס מאַרק אין מעקסיקא ווו איר קענען קויפן, פאַרקויפן און דינגען קאַרס, גרונטייגנס, באַדינונגס, דזשאָבס, עלעקטראָניקס און מער אין אַלע 32 שטאַטן." },
      { question: "איז עס פריי צו פּאָסטן מודעות אויף מערקאסטא?", answer: "יאָ, פּאָסטינג יקערדיק מודעות איז גאָר פריי. מיר אויך אָנבאָט PRO פּלאַנז מיט אַוואַנסירטע פֿעיִקייטן ווי אומבאַגרענעצט פאָטאָס, בילכערקייַט פּאַזישאַנינג און דיטיילד סטאַטיסטיק." },
      { question: "אין וועלכע שטאַטן פון מעקסיקא אַרבעט מערקאסטא?", answer: "מערקאַסטאָ אַרבעט אין אַלע 32 מעקסיקאַן שטאַטן: אגואסקאַליענטעס, באַדזשאַ קאַליפאָרניאַ, באַדזשאַ קאַליפאָרניאַ סור, קאַמפּעטשע, טשיאַפּאַס, טשיוואַוואַ, מעקסיקא סיטי, קאָאַהוילאַ, קאָלימאַ, דוראַנגאָ, שטאַט פון מעקסיקא, גואַנאַדזשואַטאָ, גרעראָ, הידאַלגאָ, דזשאַליסקאָ, מיטשאָאַקאַן, מאָרעלאָס, נאַיאַריט, נועוואָ לעאָן, אָאַקסאַקאַ, פּועבלאַ, קווערעטאַראָ, קינטאַנאַ ראָאָ, סאַן לויס פּאָטאָסי, סינאַלאָאַ, סאָנאָראַ, טאַבאַסקאָ, טאַמאַוליפּאַס, טלאַקסקאַלאַ, וועראַקרוז, יוקאַטאַן און זאַקאַטעקאַס." },
      { question: "ווי קען איך באַשטעטיקן מיין חשבון?", answer: "איר קענען באַשטעטיקן דיין חשבון דורך בליצפּאָסט, טעלעפאָן אָדער אידענטיטעט דאָקומענט (KYC). באַשטעטיקונג ינקריסיז צוטרוי צווישן אנדערע ניצערס און גיט אַקסעס צו פּרעמיע פֿעיִקייטן." },
      { question: "איז מערקאסטא זיכער?", answer: "יאָ, מערקאַסטאָ פֿעיִקייטן באַניצער באַשטעטיקונג, SSL ענקריפּשאַן, שווינדל שוץ, אַ ריפּאָרטינג סיסטעם, און 24/7 מאַדעריישאַן צו ענשור זיכער טראַנסאַקטיאָנס." }
    ],
    ja: [
      { question: "Mercastoとは何ですか？", answer: "Mercastoは、メキシコの全32州で車、不動産、サービス、求人、電子機器などを購入、販売、レンタルできる主要なクラシファイド市場です。" },
      { question: "Mercastoへの広告掲載は無料ですか？", answer: "はい、基本的な広告の掲載は完全に無料です。また、無制限の写真、優先掲載、詳細な統計などの高度な機能を提供するPROプランもご用意しています。" },
      { question: "Mercastoはメキシコのどの州で利用できますか？", answer: "Mercastoはメキシコの全32州でご利用いただけます：アグアスカリエンテス、バハ・カリフォルニア、バハ・カリフォルニア・スル、カンペチェ、チアパス、チワワ、メキシコシティ、コアウイラ、コリマ、ドゥランゴ、メキシコ州、グアナフアト、ゲレロ、イダルゴ、ハリスコ、ミチョアカン、モレロス、ナヤリット、ヌエボ・レオン、オアハカ、プエブラ、ケレタロ、キンタナ・ロー、サン・ルイ・ポトシ、シナロア、ソノラ、タバスコ、タマウリパス、トラスカラ、ベラクルス、ユカタン、サカテカス。" },
      { question: "アカウントの認証方法を教えてください。", answer: "メール、電話、または身元確認書類（KYC）でアカウントを認証できます。認証により他のユーザーからの信頼が高まり、プレミアム機能にアクセスできるようになります。" },
      { question: "Mercastoは安全ですか？", answer: "はい、Mercastoは安全な取引を保証するため、ユーザー認証、SSL暗号化、詐欺防止、通報システム、24時間365日のモデレーションを提供しています。" }
    ],
    fr: [
      { question: "Qu'est-ce que Mercasto ?", answer: "Mercasto est le premier marché de petites annonces au Mexique où vous pouvez acheter, vendre et louer des voitures, de l'immobilier, des services, des emplois, de l'électronique et plus encore dans les 32 États du pays." },
      { question: "Est-ce gratuit de publier des annonces sur Mercasto ?", answer: "Oui, la publication d'annonces de base est entièrement gratuite. Nous proposons également des plans PRO avec des fonctionnalités avancées telles que des photos illimitées, un positionnement prioritaire et des statistiques détaillées." },
      { question: "Dans quels États du Mexique opère Mercasto ?", answer: "Mercasto opère dans les 32 États du Mexique : Aguascalientes, Basse-Californie, Basse-Californie du Sud, Campeche, Chiapas, Chihuahua, Ville de Mexico, Coahuila, Colima, Durango, État de Mexico, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán et Zacatecas." },
      { question: "Comment puis-je vérifier mon compte ?", answer: "Vous pouvez vérifier votre compte par e-mail, téléphone ou document d'identité (KYC). La vérification augmente la confiance des autres utilisateurs et vous permet d'accéder aux fonctionnalités premium." },
      { question: "Mercasto est-il sûr ?", answer: "Oui, Mercasto dispose de la vérification des utilisateurs, du cryptage SSL, de la protection contre la fraude, d'un système de signalement et d'une modération 24h/24 et 7j/7 pour garantir des transactions sécurisées." }
    ]
  },
  category: (categoryName) => [
    {
      question: `¿Cómo comprar ${categoryName} en Mercasto?`,
      answer: `Para comprar ${categoryName}, busca en nuestra categoría, filtra por ubicación, precio y características. Contacta al vendedor directamente a través de la plataforma y verifica su perfil antes de realizar la transacción.`
    },
    {
      question: `¿Cómo vender ${categoryName} en Mercasto?`,
      answer: `Publica tu anuncio gratis con fotos detalladas, descripción completa y precio justo. Usa nuestra IA para generar descripciones automáticas y responde rápidamente a las consultas de compradores interesados.`
    },
    {
      question: `¿Cuánto cuesta publicar ${categoryName}?`,
      answer: `Publicar ${categoryName} es gratis en el plan básico. Los planes PRO ofrecen mayor visibilidad, fotos ilimitadas y posicionamiento prioritario desde $99 MXN al mes.`
    }
  ],
  state: (stateName) => [
    {
      question: `¿Qué puedo encontrar en ${stateName}?`,
      answer: `En ${stateName} puedes encontrar autos, inmuebles, empleos, servicios, electrónica y más. Mercasto tiene anuncios verificados de vendedores locales en todas las ciudades del estado.`
    },
    {
      question: `¿Cómo buscar anuncios en ${stateName}?`,
      answer: `Usa nuestro mapa interactivo o filtros de búsqueda para encontrar anuncios específicos en ${stateName}. Puedes filtrar por categoría, precio, ciudad y características.`
    },
    {
      question: `¿Es seguro comprar en ${stateName} a través de Mercasto?`,
      answer: `Sí, todos los vendedores en ${stateName} pasan por verificación. Además, contamos con sistema de reportes, calificaciones y protección contra fraudes para transacciones seguras.`
    }
  ]
};

export default function FAQSchema({ faqs, pageType = 'general', lang = 'es' }) {
  useUI();
  const currentLang = lang || 'es';
  const t = translations[currentLang] || translations['es'];

  // Resolve localized home FAQs if pageType is home and no customized faqs passed, or if we want home FAQs specifically
  const activeFaqs = pageType === 'home' 
    ? (FAQ_DATA.home[currentLang] || FAQ_DATA.home['es']) 
    : (faqs || []);

  useEffect(() => {
    if (!activeFaqs || activeFaqs.length === 0) return;

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": activeFaqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    script.id = 'faq-schema';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('faq-schema');
      if (existing) existing.remove();
    };
  }, [activeFaqs]);

  // Also render visible FAQ content for users
  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        {t.faq_title || 'Preguntas Frecuentes'}
      </h2>
      <div className="space-y-4">
        {activeFaqs.map((faq, index) => (
          <details key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white hover:text-[#84CC16] dark:hover:text-[#84CC16]">
              {faq.question}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400 pl-4">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
