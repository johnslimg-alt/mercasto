import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  MessageSquare, 
  DollarSign, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown,
  Car,
  Home,
  Briefcase,
  Wrench,
  ShoppingBag
} from 'lucide-react';
import { trackPageView, trackEvent } from '../../utils/analytics';

const TRANSLATIONS = {
  es: {
    seo_title: 'Publica Anuncios Gratis en México | Mercasto',
    badge: 'Clasificados 100% Gratis en México',
    hero_title: 'Vende más rápido y sin pagar comisiones',
    hero_title_before: "Vende más rápido y ",
    hero_title_highlight: "sin pagar comisiones",
    hero_title_after: "",
    hero_desc: 'Publica tus autos, casas, servicios o productos gratis. Los compradores te contactan directamente por WhatsApp o Telegram sin intermediarios.',
    cta_btn: 'Publicar Anuncio Gratis',
    mockup_caption: 'Vista previa del panel de control de vendedor: administra tus anuncios y visualiza estadísticas en tiempo real.',
    categories_title: '¿Qué puedes publicar en Mercasto?',
    categories_desc: 'Elige una categoría y comienza a recibir ofertas de compradores interesados en todo México.',
    cat_motor: 'Motor',
    cat_motor_desc: 'Autos, camionetas, motos y repuestos.',
    cat_inmuebles: 'Inmuebles',
    cat_inmuebles_desc: 'Casas, departamentos y terrenos.',
    cat_empleos: 'Empleos',
    cat_empleos_desc: 'Vacantes y perfiles profesionales.',
    cat_servicios: 'Servicios',
    cat_servicios_desc: 'Servicios profesionales y del hogar.',
    cat_productos: 'Productos',
    cat_productos_desc: 'Artículos personales, tecnología y más.',
    feature1_title: 'Publicación Fácil',
    feature1_desc: 'Sube tus fotos y descripción en menos de 2 minutos. Diseñado para verse increíble tanto en móviles como en computadoras.',
    feature2_title: '0% Comisiones',
    feature2_desc: 'Toda la ganancia es tuya. Mercasto no interviene en tus cobros ni te descuenta porcentajes de tus ventas.',
    feature3_title: 'Contacto Directo',
    feature3_desc: 'Olvídate de chats lentos en plataformas complejas. Los interesados te escriben directamente a tu WhatsApp personal.',
    how_title: '¿Cómo funciona Mercasto?',
    step1_title: 'Crea tu Cuenta',
    step1_desc: 'Regístrate de forma segura con tu correo. Estarás listo para publicar de inmediato.',
    step2_title: 'Sube tu Anuncio',
    step2_desc: 'Añade el título, precio, fotos y detalles de tu producto, auto, servicio o inmueble.',
    step3_title: 'Vende Directo',
    step3_desc: 'Recibe los mensajes de compradores directamente en tu móvil y coordina la entrega.',
    faq_title: 'Preguntas Frecuentes',
    faq_q1: '¿Es realmente gratis publicar anuncios en Mercasto?',
    faq_a1: 'Sí, publicar anuncios es 100% gratuito. No cobramos comisiones por venta, cuotas mensuales ni tarifas ocultas. Te quedas con el 100% del dinero de tu venta.',
    faq_q2: '¿Cómo me contactarán los interesados?',
    faq_a2: 'En Mercasto los compradores te contactan de forma directa. Puedes configurar tu perfil para recibir mensajes directamente en tu WhatsApp, Telegram o recibir llamadas telefónicas tradicionales.',
    faq_q3: '¿Qué categorías de anuncios puedo publicar?',
    faq_a3: 'Puedes publicar prácticamente cualquier tipo de clasificado: autos y motocicletas (Motor), inmuebles (venta o renta), servicios profesionales, artículos personales, tecnología, ofertas de empleo y más.',
    faq_q4: '¿Cuántos anuncios puedo publicar de forma gratuita?',
    faq_a4: 'No hay límites restrictivos para los vendedores particulares. Puedes publicar múltiples anuncios activos para dar a conocer todos tus productos o servicios.',
    safety_title: 'Tu seguridad es nuestra prioridad',
    safety_desc: 'En Mercasto validamos perfiles de forma continua para garantizar una comunidad de venta confiable. Recuerda siempre realizar transacciones en lugares públicos y seguros para tu tranquilidad.',
    cta_footer_title: '¿Listo para empezar a vender hoy mismo?',
    cta_footer_desc: 'Miles de personas en todo México están buscando lo que tú ofreces. ¡Haz tu publicación totalmente gratis!',
    cta_footer_btn: 'Empezar Ahora'
  },
  en: {
    seo_title: 'Publish Free Classified Ads in Mexico | Mercasto',
    badge: '100% Free Classifieds in Mexico',
    hero_title: 'Sell faster and without paying commissions',
    hero_title_before: "Sell faster and ",
    hero_title_highlight: "without paying commissions",
    hero_title_after: "",
    hero_desc: 'Publish your cars, houses, services, or products for free. Buyers contact you directly via WhatsApp or Telegram without intermediaries.',
    cta_btn: 'Publish Free Ad',
    mockup_caption: 'Seller control panel preview: manage your ads and view real-time statistics.',
    categories_title: 'What can you publish on Mercasto?',
    categories_desc: 'Choose a category and start receiving offers from interested buyers all over Mexico.',
    cat_motor: 'Motor',
    cat_motor_desc: 'Cars, trucks, motorcycles, and parts.',
    cat_inmuebles: 'Real Estate',
    cat_inmuebles_desc: 'Houses, apartments, and land.',
    cat_empleos: 'Jobs',
    cat_empleos_desc: 'Vacancies and professional profiles.',
    cat_servicios: 'Services',
    cat_servicios_desc: 'Professional and home services.',
    cat_productos: 'Products',
    cat_productos_desc: 'Personal items, tech, and more.',
    feature1_title: 'Easy Publishing',
    feature1_desc: 'Upload your photos and description in less than 2 minutes. Designed to look great on both mobile and desktop.',
    feature2_title: '0% Commissions',
    feature2_desc: 'All the profit is yours. Mercasto does not interfere with your payments or deduct percentages from your sales.',
    feature3_title: 'Direct Contact',
    feature3_desc: 'Forget slow chats on complex platforms. Interested buyers write to you directly on your personal WhatsApp.',
    how_title: 'How does Mercasto work?',
    step1_title: 'Create your Account',
    step1_desc: 'Sign up securely with your email. You will be ready to publish immediately.',
    step2_title: 'Upload your Ad',
    step2_desc: 'Add the title, price, photos, and details of your product, car, service, or property.',
    step3_title: 'Sell Direct',
    step3_desc: 'Receive messages from buyers directly on your mobile and coordinate delivery.',
    faq_title: 'Frequently Asked Questions',
    faq_q1: 'Is it really free to publish ads on Mercasto?',
    faq_a1: 'Yes, publishing ads is 100% free. We do not charge sales commissions, monthly fees, or hidden rates. You keep 100% of your sales money.',
    faq_q2: 'How will interested buyers contact me?',
    faq_a2: 'On Mercasto, buyers contact you directly. You can set up your profile to receive messages directly on your WhatsApp, Telegram, or receive traditional phone calls.',
    faq_q3: 'What categories of ads can I publish?',
    faq_a3: 'You can publish almost any type of classified: cars and motorcycles (Motor), real estate (sale or rent), professional services, personal items, technology, job offers, and more.',
    faq_q4: 'How many ads can I publish for free?',
    faq_a4: 'There are no restrictive limits for private sellers. You can publish multiple active ads to showcase all your products or services.',
    safety_title: 'Your safety is our priority',
    safety_desc: 'At Mercasto we continuously validate profiles to guarantee a trusted selling community. Remember to always make transactions in public and safe places for your peace of mind.',
    cta_footer_title: 'Ready to start selling today?',
    cta_footer_desc: 'Thousands of people all over Mexico are looking for what you offer. Make your publication completely free!',
    cta_footer_btn: 'Get Started'
  },
  pt: {
    seo_title: 'Publique anúncios classificados gratuitos no México | Mercasto',
    badge: 'Classificados 100% Gratuitos no México',
    hero_title: 'Venda mais rápido e sem pagar comissões',
    hero_title_before: "Venda mais rápido e ",
    hero_title_highlight: "sem pagar comissões",
    hero_title_after: "",
    hero_desc: 'Publique seus carros, casas, serviços ou produtos gratuitamente. Os compradores entram em contato diretamente via WhatsApp ou Telegram, sem intermediários.',
    cta_btn: 'Publicar Anúncio Grátis',
    mockup_caption: 'Prévia do painel de controle do vendedor: gerencie seus anúncios e visualize estatísticas em tempo real.',
    categories_title: 'O que você pode publicar no Mercasto?',
    categories_desc: 'Escolha uma categoria e comece a receber propostas de compradores interessados em todo o México.',
    cat_motor: 'Motor',
    cat_motor_desc: 'Carros, caminhonetes, motos e peças.',
    cat_inmuebles: 'Imóveis',
    cat_inmuebles_desc: 'Casas, apartamentos e terrenos.',
    cat_empleos: 'Empregos',
    cat_empleos_desc: 'Vagas e perfis profissionais.',
    cat_servicios: 'Serviços',
    cat_servicios_desc: 'Serviços profissionais e residenciais.',
    cat_productos: 'Produtos',
    cat_productos_desc: 'Itens pessoais, tecnologia e muito mais.',
    feature1_title: 'Publicação Fácil',
    feature1_desc: 'Envie suas fotos e descrição em menos de 2 minutos. Projetado para ficar incrível no celular e no computador.',
    feature2_title: '0% de Comissões',
    feature2_desc: 'Todo o lucro é seu. O Mercasto não interfere nas suas cobranças nem deduz porcentagens das suas vendas.',
    feature3_title: 'Contato Direto',
    feature3_desc: 'Esqueça os chats lentos em plataformas complexas. Os interessados escrevem diretamente para o seu WhatsApp pessoal.',
    how_title: 'Como funciona o Mercasto?',
    step1_title: 'Crie sua Conta',
    step1_desc: 'Cadastre-se de forma segura com o seu e-mail. Você estará pronto para publicar imediatamente.',
    step2_title: 'Envie seu Anúncio',
    step2_desc: 'Adicione o título, preço, fotos e detalhes do seu produto, carro, serviço ou imóvel.',
    step3_title: 'Venda Direto',
    step3_desc: 'Receba as mensagens dos compradores diretamente no seu celular e coordene a entrega.',
    faq_title: 'Perguntas Frequentes',
    faq_q1: 'É realmente gratuito publicar anúncios no Mercasto?',
    faq_a1: 'Sim, a publicação de anúncios é 100% gratuita. Não cobramos comissões sobre vendas, mensalidades ou taxas ocultas. Você fica com 100% do valor da sua venda.',
    faq_q2: 'Como os interessados entrarão em contato comigo?',
    faq_a2: 'No Mercasto, os compradores entram em contato diretamente. Você pode configurar seu perfil para receber mensagens direto no seu WhatsApp, Telegram ou receber chamadas telefônicas tradicionais.',
    faq_q3: 'Quais categorias de anúncios posso publicar?',
    faq_a3: 'Você pode publicar quase qualquer tipo de classificado: carros e motocicletas (Motor), imóveis (venda ou aluguel), serviços profissionais, itens pessoais, tecnologia, ofertas de emprego e muito mais.',
    faq_q4: 'Quantos anúncios posso publicar gratuitamente?',
    faq_a4: 'Não há limites restritivos para vendedores particulares. Você pode publicar múltiplos anúncios ativos para divulgar todos os seus produtos ou serviços.',
    safety_title: 'Sua segurança é nossa prioridade',
    safety_desc: 'No Mercasto, validamos perfis continuamente para garantir uma comunidade de vendas confiável. Lembre-se sempre de realizar transações em locais públicos e seguros para sua tranquilidade.',
    cta_footer_title: 'Pronto para começar a vender hoje?',
    cta_footer_desc: 'Milhares de pessoas em todo o México estão procurando o que você oferece. Publique totalmente grátis!',
    cta_footer_btn: 'Começar Agora'
  },
  fr: {
    seo_title: 'Publiez des petites annonces gratuites au Mexique | Mercasto',
    badge: 'Petites annonces 100% gratuites au Mexique',
    hero_title: 'Vendez plus vite et sans payer de commissions',
    hero_title_before: "Vendez plus vite et ",
    hero_title_highlight: "sans payer de commissions",
    hero_title_after: "",
    hero_desc: 'Publiez gratuitement vos voitures, maisons, services ou produits. Les acheteurs vous contactent directement par WhatsApp ou Telegram sans intermédiaire.',
    cta_btn: 'Publier une annonce gratuite',
    mockup_caption: 'Aperçu du panneau de contrôle du vendeur : gérez vos annonces et visualisez les statistiques en temps réel.',
    categories_title: 'Que pouvez-vous publier sur Mercasto ?',
    categories_desc: 'Choisissez une catégorie et commencez à recevoir des offres d’acheteurs intéressés dans tout le Mexique.',
    cat_motor: 'Moteur',
    cat_motor_desc: 'Voitures, camionnettes, motos et pièces.',
    cat_inmuebles: 'Immobilier',
    cat_inmuebles_desc: 'Maisons, appartements et terrains.',
    cat_empleos: 'Emplois',
    cat_empleos_desc: 'Offres d’emploi et profils professionnels.',
    cat_servicios: 'Services',
    cat_servicios_desc: 'Services professionnels et à domicile.',
    cat_productos: 'Produits',
    cat_productos_desc: 'Effets personnels, technologie et plus.',
    feature1_title: 'Publication facile',
    feature1_desc: 'Téléchargez vos photos et votre description en moins de 2 minutes. Conçu pour être superbe sur mobile et sur ordinateur.',
    feature2_title: '0% de commissions',
    feature2_desc: 'Tout le profit est pour vous. Mercasto n’intervient pas dans vos paiements et ne déduit aucun pourcentage de vos ventes.',
    feature3_title: 'Contact direct',
    feature3_desc: 'Oubliez les discussions lentes sur les plateformes complexes. Les acheteurs intéressés vous écrivent directement sur votre WhatsApp personnel.',
    how_title: 'Comment fonctionne Mercasto ?',
    step1_title: 'Créez votre compte',
    step1_desc: 'Inscrivez-vous en toute sécurité avec votre e-mail. Vous serez prêt à publier immédiatement.',
    step2_title: 'Publiez votre annonce',
    step2_desc: 'Ajoutez le titre, le prix, les photos et les détails de votre produit, voiture, service ou bien immobilier.',
    step3_title: 'Vendez directement',
    step3_desc: 'Recevez les messages des acheteurs directement sur votre mobile et coordonnez la livraison.',
    faq_title: 'Foire aux questions',
    faq_q1: 'Est-ce vraiment gratuit de publier des annonces sur Mercasto ?',
    faq_a1: 'Oui, la publication d’annonces est 100% gratuite. Nous ne facturons aucune commission de vente, frais mensuels ou frais cachés. Vous gardez 100% de l’argent de votre vente.',
    faq_q2: 'Comment les acheteurs intéressés me contacteront-ils ?',
    faq_a2: 'Sur Mercasto, les acheteurs vous contactent directement. Vous pouvez configurer votre profil pour recevoir des messages directement sur WhatsApp, Telegram ou recevoir des appels téléphoniques traditionnels.',
    faq_q3: 'Quelles catégories d’annonces puis-je publier ?',
    faq_a3: 'Vous pouvez publier presque tout type de petites annonces : voitures et motos (Motor), immobilier (vente ou location), services professionnels, articles personnels, technologie, offres d’emploi et plus encore.',
    faq_q4: 'Combien d’annonces puis-je publier gratuitement ?',
    faq_a4: 'Il n’y a pas de limites restrictives pour les vendeurs particuliers. Vous pouvez publier plusieurs annonces actives pour présenter tous vos produits ou services.',
    safety_title: 'Votre sécurité est notre priorité',
    safety_desc: 'Chez Mercasto, nous validons en permanence les profils afin de garantir une communauté de vente de confiance. N’oubliez pas de toujours effectuer vos transactions dans des lieux publics et sûrs pour votre tranquillité d’esprit.',
    cta_footer_title: 'Prêt à commencer à vendre dès aujourd’hui ?',
    cta_footer_desc: 'Des milliers de personnes dans tout le Mexique recherchent ce que vous proposez. Publiez tout à fait gratuitement !',
    cta_footer_btn: 'Commencer maintenant'
  },
  de: {
    seo_title: 'Kostenlose Kleinanzeigen in Mexiko veröffentlichen | Mercasto',
    badge: '100% kostenlose Kleinanzeigen in Mexiko',
    hero_title: 'Schneller verkaufen und ohne Provisionen zu zahlen',
    hero_title_before: "Schneller verkaufen und ",
    hero_title_highlight: "ohne Provisionen zu zahlen",
    hero_title_after: "",
    hero_desc: 'Veröffentlichen Sie Ihre Autos, Häuser, Dienstleistungen oder Produkte kostenlos. Käufer kontaktieren Sie direkt über WhatsApp oder Telegram ohne Zwischenhändler.',
    cta_btn: 'Kostenlose Anzeige aufgeben',
    mockup_caption: 'Vorschau des Verkäufer-Dashboards: Verwalten Sie Ihre Anzeigen und sehen Sie Statistiken in Echtzeit.',
    categories_title: 'Was können Sie auf Mercasto veröffentlichen?',
    categories_desc: 'Wählen Sie eine Kategorie und erhalten Sie Angebote von interessierten Käufern in ganz Mexiko.',
    cat_motor: 'Motor',
    cat_motor_desc: 'Autos, Transporter, Motorräder und Teile.',
    cat_inmuebles: 'Immobilien',
    cat_inmuebles_desc: 'Häuser, Wohnungen und Grundstücke.',
    cat_empleos: 'Jobs',
    cat_empleos_desc: 'Stellenangebote und Bewerberprofile.',
    cat_servicios: 'Dienstleistungen',
    cat_servicios_desc: 'Professionelle und haushaltsnahe Dienste.',
    cat_productos: 'Produkte',
    cat_productos_desc: 'Persönliche Artikel, Technik und mehr.',
    feature1_title: 'Einfaches Veröffentlichen',
    feature1_desc: 'Laden Sie Ihre Fotos und Beschreibung in weniger als 2 Minuten hoch. Optimiert für Mobilgeräte und Computer.',
    feature2_title: '0% Provisionen',
    feature2_desc: 'Der gesamte Gewinn gehört Ihnen. Mercasto mischt sich nicht in Ihre Zahlungen ein und zieht keine Prozentsätze ab.',
    feature3_title: 'Direkter Kontakt',
    feature3_desc: 'Vergessen Sie langsame Chats auf komplexen Plattformen. Interessenten schreiben Ihnen direkt auf Ihr persönliches WhatsApp.',
    how_title: 'Wie funktioniert Mercasto?',
    step1_title: 'Konto erstellen',
    step1_desc: 'Registrieren Sie sich sicher mit Ihrer E-Mail-Adresse. Sie können sofort mit dem Veröffentlichen beginnen.',
    step2_title: 'Anzeige hochladen',
    step2_desc: 'Fügen Sie Titel, Preis, Fotos und Details Ihres Produkts, Autos, Service oder Ihrer Immobilie hinzu.',
    step3_title: 'Direkt verkaufen',
    step3_desc: 'Erhalten Sie Nachrichten von Käufern direkt auf Ihr Handy und koordinieren Sie die Lieferung.',
    faq_title: 'Häufig gestellte Fragen',
    faq_q1: 'Ist das Aufgeben von Anzeigen auf Mercasto wirklich kostenlos?',
    faq_a1: 'Ja, das Veröffentlichen von Anzeigen ist zu 100% kostenlos. Wir erheben keine Verkaufsprovisionen, monatlichen Gebühren oder versteckten Kosten. Sie behalten 100% Ihres Verkaufserlöses.',
    faq_q2: 'Wie kontaktieren mich interessierte Käufer?',
    faq_a2: 'Bei Mercasto kontaktieren Käufer Sie direkt. Sie können Ihr Profil so einrichten, dass Sie Nachrichten direkt auf WhatsApp, Telegram oder über herkömmliche Telefonanrufe erhalten.',
    faq_q3: 'Welche Kategorien von Anzeigen kann ich veröffentlichen?',
    faq_a3: 'Sie können fast jede Art von Kleinanzeigen veröffentlichen: Autos und Motorräder (Motor), Immobilien (Verkauf oder Vermietung), professionelle Dienstleistungen, persönliche Artikel, Technologie, Stellenangebote und mehr.',
    faq_q4: 'Wie viele Anzeigen kann ich kostenlos veröffentlichen?',
    faq_a4: 'Für private Verkäufer gibt es keine einschränkenden Limits. Sie können mehrere aktive Anzeigen schalten, um all Ihre Produkte oder Dienstleistungen zu präsentieren.',
    safety_title: 'Ihre Sicherheit ist unsere Priorität',
    safety_desc: 'Bei Mercasto validieren wir kontinuierlich Profile, um eine vertrauenswürdige Verkaufsgemeinschaft zu gewährleisten. Denken Sie immer daran, Transaktionen an öffentlichen und sicheren Orten durchzuführen.',
    cta_footer_title: 'Bereit, heute mit dem Verkauf zu beginnen?',
    cta_footer_desc: 'Tausende Menschen in ganz Mexiko suchen nach dem, was Sie anbieten. Veröffentlichen Sie völlig kostenlos!',
    cta_footer_btn: 'Jetzt starten'
  },
  it: {
    seo_title: 'Pubblica annunci gratuiti in Messico | Mercasto',
    badge: 'Annunci classificati gratuiti al 100% in Messico',
    hero_title: 'Vendi più velocemente e senza pagare commissioni',
    hero_title_before: "Vendi più velocemente e ",
    hero_title_highlight: "senza pagare commissioni",
    hero_title_after: "",
    hero_desc: 'Pubblica gratis auto, case, servizi o prodotti. Gli acquirenti ti contattano direttamente tramite WhatsApp o Telegram senza intermediari.',
    cta_btn: 'Pubblica annuncio gratuito',
    mockup_caption: 'Anteprima del pannello di controllo del venditore: gestisci i tuoi annunci e visualizza le statistiche in tempo reale.',
    categories_title: 'Cosa puoi pubblicare su Mercasto?',
    categories_desc: 'Scegli una categoria e inizia a ricevere offerte da acquirenti interessati in tutto il Messico.',
    cat_motor: 'Motori',
    cat_motor_desc: 'Auto, moto, furgoni e ricambi.',
    cat_inmuebles: 'Immobili',
    cat_inmuebles_desc: 'Case, appartamenti e terreni.',
    cat_empleos: 'Lavoro',
    cat_empleos_desc: 'Offerte di lavoro e profili professionali.',
    cat_servicios: 'Servizi',
    cat_servicios_desc: 'Servizi professionali e per la casa.',
    cat_productos: 'Prodotti',
    cat_productos_desc: 'Articoli personali, tecnologia e altro.',
    feature1_title: 'Pubblicazione facile',
    feature1_desc: 'Carica foto e descrizione in meno di 2 minuti. Progettato per essere perfetto sia su dispositivi mobili che su computer.',
    feature2_title: '0% Commissioni',
    feature2_desc: 'Tutto il guadagno è tuo. Mercasto non interviene nei tuoi pagamenti e non trattiene percentuali sulle tue vendite.',
    feature3_title: 'Contatto diretto',
    feature3_desc: 'Dimentica le chat lente su piattaforme complesse. I potenziali acquirenti ti scrivono direttamente sul tuo WhatsApp personale.',
    how_title: 'Come funziona Mercasto?',
    step1_title: 'Crea il tuo account',
    step1_desc: 'Registrati in modo sicuro con la tua e-mail. Sarai pronto a pubblicare immediatamente.',
    step2_title: 'Carica il tuo annuncio',
    step2_desc: 'Aggiungi titolo, prezzo, foto e dettagli del tuo prodotto, auto, servizio o immobile.',
    step3_title: 'Vendi direttamente',
    step3_desc: 'Ricevi i messaggi degli acquirenti direttamente sul tuo cellulare e coordina la consegna.',
    faq_title: 'Domande frequenti',
    faq_q1: 'È davvero gratuito pubblicare annunci su Mercasto?',
    faq_a1: 'Sí, la pubblicazione degli annunci è gratuita al 100%. Non applichiamo commissioni sulle vendite, canoni mensili o costi nascosti. Trattieni il 100% dell’importo della tua vendita.',
    faq_q2: 'In che modo mi contatteranno gli acquirenti interessati?',
    faq_a2: 'Su Messico, gli acquirenti ti contattano direttamente. Puoi impostare il tuo profilo per ricevere messaggi direttamente su WhatsApp, Telegram o ricevere chiamate telefoniche tradizionali.',
    faq_q3: 'Quali categorie di annunci posso pubblicare?',
    faq_a3: 'Puoi pubblicare quasi qualsiasi tipo di annuncio: auto e moto (Motor), immobili (vendita o affitto), servizi professionali, articoli personali, tecnologia, offerte di lavoro e altro ancora.',
    faq_q4: 'Quanti annunci posso pubblicare gratuitamente?',
    faq_a4: 'Non ci sono limiti restrittivi per i venditori privati. Puoi pubblicare più annunci attivi per presentare tutti i tuoi prodotti o servizi.',
    safety_title: 'La tua sicurezza è la nostra priorità',
    safety_desc: 'Su Mercasto validiamo costantemente i profili per garantire una community di vendita affidabile. Ricorda sempre di effettuare transazioni in luoghi pubblici e sicuri per la tua tranquillità.',
    cta_footer_title: 'Pronto per iniziare a vendere oggi stesso?',
    cta_footer_desc: 'Migliaia di persone in tutto il Messico stanno cercando quello che offri. Pubblica il tuo annuncio gratis!',
    cta_footer_btn: 'Inizia ora'
  },
  ru: {
    seo_title: 'Подать бесплатные объявления в Мексике | Mercasto',
    badge: '100% бесплатные объявления в Мексике',
    hero_title: 'Продавайте быстрее и без комиссии',
    hero_title_before: "Продавайте быстрее и ",
    hero_title_highlight: "без комиссии",
    hero_title_after: "",
    hero_desc: 'Публикуйте объявления об авто, недвижимости, услугах или товарах бесплатно. Покупатели свяжутся с вами напрямую через WhatsApp или Telegram без посредников.',
    cta_btn: 'Подать объявление бесплатно',
    mockup_caption: 'Предварительный просмотр панели продавца: управляйте своими объявлениями и просматривайте статистику в реальном времени.',
    categories_title: 'Что вы можете опубликовать на Mercasto?',
    categories_desc: 'Выберите категорию и начните получать предложения от заинтересованных покупателей по всей Мексике.',
    cat_motor: 'Транспорт',
    cat_motor_desc: 'Автомобили, мотоциклы и запчасти.',
    cat_inmuebles: 'Недвижимость',
    cat_inmuebles_desc: 'Дома, квартиры и участки.',
    cat_empleos: 'Работа',
    cat_empleos_desc: 'Вакансии и резюме кандидатов.',
    cat_servicios: 'Услуги',
    cat_servicios_desc: 'Бытовые и профессиональные услуги.',
    cat_productos: 'Товары',
    cat_productos_desc: 'Личные вещи, техника и другое.',
    feature1_title: 'Простая публикация',
    feature1_desc: 'Загрузите фотографии и описание менее чем за 2 минуты. Отлично выглядит как на мобильных телефонах, так и на компьютерах.',
    feature2_title: '0% комиссии',
    feature2_desc: 'Вся прибыль остается вам. Mercasto не берет процент от ваших продаж и не участвует в платежах.',
    feature3_title: 'Прямой контакт',
    feature3_desc: 'Забудьте о медленных чатах на сложных платформах. Покупатели будут писать вам напрямую в ваш личный WhatsApp.',
    how_title: 'Как работает Mercasto?',
    step1_title: 'Создайте профиль',
    step1_desc: 'Безопасно зарегистрируйтесь с помощью вашей электронной почты. Вы сразу сможете подать объявление.',
    step2_title: 'Опубликуйте объявление',
    step2_desc: 'Укажите название, цену, добавьте фотографии и детали вашего товара, авто, услуги или объекта недвижимости.',
    step3_title: 'Продавайте напрямую',
    step3_desc: 'Получайте сообщения от покупателей прямо на свой телефон и договаривайтесь о сделке.',
    faq_title: 'Часто задаваемые вопросы',
    faq_q1: 'Действительно ли публикация объявлений на Mercasto бесплатна?',
    faq_a1: 'Да, подача объявлений абсолютно бесплатна на 100%. Мы не берем комиссию за продажи, ежемесячную плату или скрытые сборы. Вы оставляете себе 100% от сделки.',
    faq_q2: 'Как со мной свяжутся покупатели?',
    faq_a2: 'На Mercasto покупатели связываются с вами напрямую. Вы можете настроить профиль для связи через WhatsApp, Telegram или обычные телефонные звонки.',
    faq_q3: 'Какие категории объявлений я могу публиковать?',
    faq_a3: 'Вы можете подать практически любое объявление: автомобили и мотоциклы (Motor), недвижимость (продажа или аренда), профессиональные услуги, личные вещи, электронику, вакансии и многое другое.',
    faq_q4: 'Сколько объявлений я могу разместить бесплатно?',
    faq_a4: 'Для частных продавцов нет жестких ограничений. Вы можете опубликовать несколько активных объявлений, чтобы показать все свои товары или услуги.',
    safety_title: 'Ваша безопасность — наш приоритет',
    safety_desc: 'Мы в Mercasto постоянно проверяем профили для обеспечения надежности сообщества. Всегда совершайте сделки в общественных и безопасных местах.',
    cta_footer_title: 'Готовы начать продавать прямо сейчас?',
    cta_footer_desc: 'Тысячи людей по всей Мексике ищут то, что вы предлагаете. Опубликуйте объявление бесплатно!',
    cta_footer_btn: 'Начать сейчас'
  },
  zh: {
    seo_title: '在墨西哥发布免费分类广告 | Mercasto',
    badge: '墨西哥 100% 免费分类广告',
    hero_title: '销售更快且无需支付佣金',
    hero_title_before: "销售更快且",
    hero_title_highlight: "无需支付佣金",
    hero_title_after: "",
    hero_desc: '免费发布您的汽车、房屋、服务或产品。买家直接通过 WhatsApp 或 Telegram 与您联系，无需中介。',
    cta_btn: '免费发布广告',
    mockup_caption: '卖家控制面板预览：管理您的广告并实时查看统计数据。',
    categories_title: '您可以在 Mercasto 发布什么？',
    categories_desc: '选择一个类别，开始接收来自墨西哥各地感兴趣买家的报价。',
    cat_motor: '车辆交通',
    cat_motor_desc: '轿车、皮卡、摩托车和配件。',
    cat_inmuebles: '房地产',
    cat_inmuebles_desc: '房屋、公寓和土地。',
    cat_empleos: '招贤纳士',
    cat_empleos_desc: '职位空缺和求职简历。',
    cat_servicios: '生活服务',
    cat_servicios_desc: '专业和家庭便民服务。',
    cat_productos: '二手商品',
    cat_productos_desc: '个人物品、数码科技及其他。',
    feature1_title: '轻松发布',
    feature1_desc: '在不到 2 分钟的时间内上传您的照片和描述。专为手机和电脑端完美显示而设计。',
    feature2_title: '0% 佣金',
    feature2_desc: '所有利润都归您所有。Mercasto 不会干预您的收款，也不会扣除您的销售额百分比。',
    feature3_title: '直接联系',
    feature3_desc: '忘记复杂平台上的慢速聊天。有意向的买家直接在您的个人 WhatsApp 上给您写信。',
    how_title: 'Mercasto 如何运作？',
    step1_title: '创建您的账户',
    step1_desc: '使用您的邮箱安全注册。您将立即准备好发布。',
    step2_title: '上传您的广告',
    step2_desc: '添加您的产品、汽车、服务或房产的标题、价格、照片和详细信息。',
    step3_title: '直接销售',
    step3_desc: '直接在手机上接收买家的消息，并协商配送事宜。',
    faq_title: '常见问题',
    faq_q1: '在 Mercasto 上发布广告真的是免费的吗？',
    faq_a1: '是的，发布广告 100% 免费。我们不收取销售佣金、月费或隐藏费用。您保留 100% 的销售款项。',
    faq_q2: '感兴趣的买家将如何与我联系？',
    faq_a2: '在 Mercasto 上，买家直接与您联系。您可以设置您的个人资料以直接在您的 WhatsApp、Telegram 上接收消息，或接收传统的电话呼叫。',
    faq_q3: '我可以发布哪些类别的广告？',
    faq_a3: '您几乎可以发布任何类型的分类广告：汽车和摩托车 (Motor)、房地产（出售或出租）、专业服务、个人物品、科技产品、工作机会等。',
    faq_q4: '我可以免费发布多少个广告？',
    faq_a4: '对于私人卖家，没有限制性的额度。您可以发布多个活动广告来展示您的所有产品 or 服务。',
    safety_title: '您的安全是我们的首要任务',
    safety_desc: '在 Mercasto， we 持续验证用户资料以确保销售社区的真实可信。为了您的安心，请记住务必在公共且安全的地方进行交易。',
    cta_footer_title: '准备好今天开始销售了吗？',
    cta_footer_desc: '墨西哥各地成千上万的人正在寻找您提供的东西。完全免费发布您的广告！',
    cta_footer_btn: '立即开始'
  },
  ja: {
    seo_title: 'メキシコで無料広告を掲載 | Mercasto',
    badge: 'メキシコで100%無料のクラシファイド広告',
    hero_title: '手数料なしでより速く売却',
    hero_title_before: "",
    hero_title_highlight: "手数料なしで",
    hero_title_after: "より速く売却",
    hero_desc: '車、不動産、サービス、製品を無料で掲載。仲介者なしで、購入者からWhatsAppやTelegramを通じて直接連絡が届きます。',
    cta_btn: '無料で広告を掲載する',
    mockup_caption: '出品者管理画面プレビュー：掲載中の広告管理や統計データのリアルタイム確認が可能です。',
    categories_title: 'Mercastoには何を掲載できますか？',
    categories_desc: 'カテゴリを選択して、メキシコ国内の興味のある購入者から直接オファーを受け取りましょう。',
    cat_motor: 'モビリティ',
    cat_motor_desc: '乗用車、トラック、バイク、部品類。',
    cat_inmuebles: '不動産',
    cat_inmuebles_desc: '一戸建て、アパート、土地など。',
    cat_empleos: '採用・求人',
    cat_empleos_desc: '求人募集および就職プロフィール。',
    cat_servicios: 'サービス',
    cat_servicios_desc: '各種専門サービスおよび家庭向け代行。',
    cat_productos: '物品販売',
    cat_productos_desc: '私物、電子機器、その他商品。',
    feature1_title: '簡単掲載',
    feature1_desc: '2分以内に写真と説明文をアップロード。スマートフォンでもパソコンでも綺麗に表示されるように設計されています。',
    feature2_title: '手数料0%',
    feature2_desc: '売上はすべてあなたのもの。Mercastoが支払いに介入したり、売上から手数料を差し引くことはありません。',
    feature3_title: '直接コンタクト',
    feature3_desc: '複雑なプラットフォームの遅いチャットは不要。購入希望者から直接個人のWhatsAppにメッセージが届きます。',
    how_title: 'Mercastoの仕組み',
    step1_title: 'アカウント作成',
    step1_desc: 'メールアドレスで安全に登録。すぐに広告を掲載する準備が整います。',
    step2_title: '広告をアップロード',
    step2_desc: '製品、車、サービス、または不動産のタイトル、価格、写真、詳細情報を入力します。',
    step3_title: '直接販売',
    step3_desc: '携帯電話で購入者から直接メッセージを受け取り、引き渡し方法を調整します。',
    faq_title: 'よくある質問',
    faq_q1: 'Mercastoでの広告掲載は本当に無料ですか？',
    faq_a1: 'はい、広告の掲載は100%無料です。販売手数料、月額利用料、隠れた費用などは一切発生しません。売上金の100%を手元に残せます。',
    faq_q2: '購入希望者はどのように連絡してきますか？',
    faq_a2: 'Mercastoでは購入者から直接連絡が届きます。WhatsApp、Telegramで直接メッセージを受け取るか、通常の電話による連絡をプロフィールで設定できます。',
    faq_q3: 'どのようなカテゴリの広告を掲載できますか？',
    faq_a3: '自動車・バイク (Motor)、不動産（販売・賃貸）、専門サービス、身の回り品、テクノロジー、求人情報など、ほぼすべてのジャンルを掲載できます。',
    faq_q4: '無料で掲載できる広告の数に制限はありますか？',
    faq_a4: '個人出品者に対する制限はありません。複数の広告をアクティブに掲載して、すべての商品やサービスを紹介できます。',
    safety_title: '安全性を最優先に',
    safety_desc: 'Mercastoでは、信頼できるコミュニティを維持するためにプロフィール審査を継続的に実施しています。取引は必ず安全な公共の場所で行うようにしてください。',
    cta_footer_title: '今日から販売を始めましょう',
    cta_footer_desc: 'メキシコ国内で多くの人々があなたの出品物を探しています。今すぐ完全に無料で掲載しましょう！',
    cta_footer_btn: '今すぐ始める'
  },
  ko: {
    seo_title: '멕시코 무료 분류 광고 등록 | Mercasto',
    badge: '멕시코 100% 무료 분류 광고',
    hero_title: '수수료 없이 더 빠르게 판매하세요',
    hero_title_before: "",
    hero_title_highlight: "수수료 없이",
    hero_title_after: " 더 빠르게 판매하세요",
    hero_desc: '자동차, 부동산, 서비스 또는 상품을 무료로 등록하세요. 중개인 없이 구매자가 WhatsApp이나 Telegram으로 직접 연락합니다.',
    cta_btn: '무료 광고 등록하기',
    mockup_caption: '판매자 대시보드 미리보기: 등록한 광고를 관리하고 실시간 방문 통계를 확인하세요.',
    categories_title: 'Mercasto에 무엇을 올릴 수 있나요?',
    categories_desc: '카테고리를 선택하고 멕시코 전역의 구매 희망자들로부터 거래 제안을 받아보세요.',
    cat_motor: '차량·오토바이',
    cat_motor_desc: '자동차, 트럭, 이륜차 및 부품.',
    cat_inmuebles: '부동산',
    cat_inmuebles_desc: '주택, 아파트 및 토지 매매/임대.',
    cat_empleos: '구인구직',
    cat_empleos_desc: '채용 공고 및 인재 프로필.',
    cat_servicios: '서비스',
    cat_servicios_desc: '전문 기술 및 가정용 편의 서비스.',
    cat_productos: '상품·중고',
    cat_productos_desc: '개인 물품, 전자 제품 및 기타 소품.',
    feature1_title: '쉬운 등록',
    feature1_desc: '2분 안에 사진과 상세 정보를 업로드하세요. 모바일과 PC 화면 모두에 완벽하게 최적화되어 있습니다.',
    feature2_title: '수수료 0%',
    feature2_desc: '모든 수익은 판매자의 몫입니다. Mercasto는 결제에 관여하지 않으며 판매 수수료를 떼지 않습니다.',
    feature3_title: '직접 연락',
    feature3_desc: '플랫폼 내부의 느린 채팅은 잊으세요. 구매를 원하는 사람이 판매자의 개인 WhatsApp으로 바로 메시지를 보냅니다.',
    how_title: 'Mercasto 운영 방식',
    step1_title: '계정 생성',
    step1_desc: '이메일로 간편하고 안전하게 가입하세요. 즉시 광고를 등록할 수 있습니다.',
    step2_title: '광고 업로드',
    step2_desc: '상품, 차량, 서비스 또는 부동산의 제목, 가격, 사진 및 상세 정보를 등록하세요.',
    step3_title: '직접 판매',
    step3_desc: '휴대폰으로 구매자의 메시지를 직접 받고 배송 또는 거래를 조율하세요.',
    faq_title: '자주 묻는 질문',
    faq_q1: 'Mercasto 광고 등록은 정말 무료인가요?',
    faq_a1: '네, 광고 등록은 100% 무료입니다. 판매 수수료, 월별 이용료 또는 숨겨진 비용은 전혀 없습니다. 판매 대금의 100%를 가져가실 수 있습니다.',
    faq_q2: '구매 희망자가 어떻게 저에게 연락하나요?',
    faq_a2: 'Mercasto에서는 구매자가 직접 연락합니다. WhatsApp, Telegram으로 바로 메시지를 받거나 일반 전화 통화를 수신하도록 프로필을 설정할 수 있습니다.',
    faq_q3: '어떤 카테고리의 광고를 등록할 수 있나요?',
    faq_a3: '자동차 및 오토바이 (Motor), 부동산 (매매 또는 임대), 전문 서비스, 개인 물품, IT 기기, 구인구직 등 거의 모든 분야의 광고를 등록할 수 있습니다.',
    faq_q4: '무료로 등록할 수 있는 광고 수 제한이 있나요?',
    faq_a4: '개인 판매자를 위한 제한은 없습니다. 판매하고자 하는 모든 상품이나 서비스를 홍보하기 위해 여러 개의 광고를 자유롭게 올릴 수 있습니다.',
    safety_title: '안전 거래를 최우선으로',
    safety_desc: 'Mercasto는 신뢰할 수 있는 거래 환경을 위해 프로필을 지속적으로 인증 및 검토합니다. 거래는 항상 안전한 공공장소에서 진행하시기 바랍니다.',
    cta_footer_title: '오늘 판매를 시작할 준비가 되셨나요?',
    cta_footer_desc: '멕시코 전역의 수많은 이용자가 당신이 판매하려는 상품을 찾고 있습니다. 지금 무료로 광고를 올려보세요!',
    cta_footer_btn: '지금 시작하기'
  },
  ar: {
    seo_title: 'انشر إعلانات مبوبة مجانية في المكسيك | Mercasto',
    badge: 'إعلانات مبوبة مجانية 100% في المكسيك',
    hero_title: 'بع أسرع وبدون دفع أي عمولات',
    hero_title_before: "بع أسرع و",
    hero_title_highlight: "بدون دفع أي عمولات",
    hero_title_after: "",
    hero_desc: 'انشر إعلانات سياراتك، عقاراتك، خدماتك أو منتجاتك مجاناً. يتواصل معك المشترون مباشرة عبر واتساب أو تليجرام بدون وسطاء.',
    cta_btn: 'انشر إعلانك مجاناً',
    mockup_caption: 'معاينة لوحة تحكم البائع: إدارة إعلاناتك واستعراض إحصائيات المشاهدة في الوقت الفعلي.',
    categories_title: 'ماذا يمكنك أن تنشر على Mercasto؟',
    categories_desc: 'اختر تصنيفاً وابدأ في تلقي العروض من المشترين المهتمين في جميع أنحاء المكسيك.',
    cat_motor: 'مركبات',
    cat_motor_desc: 'سيارات، شاحنات، دراجات نارية وقطع غيار.',
    cat_inmuebles: 'عقارات',
    cat_inmuebles_desc: 'منازل، شقق وأراضٍ.',
    cat_empleos: 'وظائف',
    cat_empleos_desc: 'فرص عمل وسير ذاتية مهنية.',
    cat_servicios: 'خدمات',
    cat_servicios_desc: 'خدمات مهنية ومنزلية.',
    cat_productos: 'منتجات وسلع',
    cat_productos_desc: 'أغراض شخصية، تكنولوجيا والمزيد.',
    feature1_title: 'نشر سهل وسريع',
    feature1_desc: 'ارفع صورك واكتب وصف إعلانك في أقل من دقيقتين. مصمم ليظهر بشكل رائع على الهواتف وأجهزة الكمبيوتر.',
    feature2_title: '0% عمولات',
    feature2_desc: 'جميع الأرباح لك بالكامل. لا يتدخل Mercasto في معاملاتك المالية ولا يقتطع أي نسبة من مبيعاتك.',
    feature3_title: 'تواصل مباشر',
    feature3_desc: 'انسَ المحادثات البطيئة في المنصات المعقدة. يتراسل معك المهتمون مباشرة على حساب الواتساب الخاص بك.',
    how_title: 'كيف يعمل Mercasto؟',
    step1_title: 'أنشئ حسابك',
    step1_desc: 'سجل بأمان باستخدام بريدك الإلكتروني. ستكون مستعداً للنشر على الفور.',
    step2_title: 'ارفع إعلانك',
    step2_desc: 'أضف العنوان، السعر، الصور، وتفاصيل منتجك، سيارتك، خدمتك أو عقارك.',
    step3_title: 'بع مباشرة',
    step3_desc: 'تلقى رسائل المشترين مباشرة على هاتفك وقم بالتنسيق لتسليم المبيعات.',
    faq_title: 'الأسئلة الشائعة',
    faq_q1: 'هل نشر الإعلانات على Mercasto مجاني حقاً؟',
    faq_a1: 'نعم، نشر الإعلانات مجاني 100%. لا نتقاضى أي عمولات على المبيعات، رسوم شهرية أو رسوم خفية. تحتفظ بكامل قيمة المبيعات.',
    faq_q2: 'كيف سيتواصل معي المشترون المهتمون؟',
    faq_a2: 'على Mercasto يتواصل معك المشترون مباشرة. يمكنك إعداد ملفك الشخصي لتلقي الرسائل عبر واتساب أو تليجرام أو تلقي مكالمات هاتفية تقليدية.',
    faq_q3: 'ما هي فئات الإعلانات التي يمكنني نشرها؟',
    faq_a3: 'يمكنك نشر أي نوع تقريباً من الإعلانات المبوبة: السيارات والدراجات النارية (Motor), العقارات (بيع أو إيجار)، الخدمات المهنية، الأغراض الشخصية، الإلكترونيات، فرص العمل والمزيد.',
    faq_q4: 'كم عدد الإعلانات التي يمكنني نشرها مجاناً؟',
    faq_a4: 'لا توجد حدود تقييدية للبائعين الأفراد. يمكنك نشر إعلانات متعددة ونشطة لعرض جميع منتجاتك أو خدماتك.',
    safety_title: 'أمانك هو أولويتنا',
    safety_desc: 'في Mercasto نقوم بالتحقق من الحسابات والملفات الشخصية باستمرار لضمان مجتمع بيع آمن وموثوق. تذكر دائماً إجراء المعاملات في أماكن عامة وآمنة.',
    cta_footer_title: 'جاهز لبدء البيع اليوم؟',
    cta_footer_desc: 'آلاف الأشخاص في جميع أنحاء المكسيك يبحثون عما تقدمه. انشر إعلانك الآن مجاناً بالكامل!',
    cta_footer_btn: 'ابدأ الآن'
  },
  he: {
    seo_title: 'פרסם מודעות לוח בחינם במקסיקו | Mercasto',
    badge: 'לוח מודעות 100% חינם במקסיקו',
    hero_title: 'למכור מהר יותר וללא תשלום עמלות',
    hero_title_before: "למכור מהר יותר ו",
    hero_title_highlight: "ללא תשלום עמלות",
    hero_title_after: "",
    hero_desc: 'פרסם את הרכבים, הבתים, השירותים או המוצרים שלך בחינם. הקונים יוצרים איתך קשר ישירות בוואטסאפ או בטלגרם ללא מתווכים.',
    cta_btn: 'פרסם מודעה בחינם',
    mockup_caption: 'תצוגה מקדימה של לוח הבקרה של המוכר: נהל את המודעות שלך וצפה בסטטיסטיקות בזמן אמת.',
    categories_title: 'מה ניתן לפרסם ב-Mercasto?',
    categories_desc: 'בחר קטגוריה והתחל לקבל פניות מקונים מתעניינים בכל רחבי מקסיקו.',
    cat_motor: 'רכב ותחבורה',
    cat_motor_desc: 'מכוניות, אופנועים, חלפים ורכבי שטח.',
    cat_inmuebles: 'נדל"ן',
    cat_inmuebles_desc: 'בתים, דירות, משרדים ושטחים.',
    cat_empleos: 'דרושים',
    cat_empleos_desc: 'משרות פנויות ופרופילי מועמדים.',
    cat_servicios: 'שירותים',
    cat_servicios_desc: 'בעלי מקצוע ושירותים לבית.',
    cat_productos: 'חפצים ומוצרים',
    cat_productos_desc: 'ציוד אישי, אלקטרוניקה ועוד.',
    feature1_title: 'פרסום קל ומהיר',
    feature1_desc: 'העלה תמונות ותיאור בתוך פחות מ-2 דקות. מעוצב להראות מעולה הן בנייד והן במחשב.',
    feature2_title: '0% עמלות',
    feature2_desc: 'כל הרווח שלך. Mercasto אינו מתערב בתשלומים שלך ואינו מנכה אחוזים מהמכירות שלך.',
    feature3_title: 'קשר ישיר',
    feature3_desc: 'תשכח מצ\'אטים איטיים בפלטפורמות מורכבות. המתעניינים כותבים לך ישירות לוואטסאפ האישי שלך.',
    how_title: 'איך Mercasto עובד?',
    step1_title: 'צור חשבון',
    step1_desc: 'הירשם בבטחה עם הדוא"ל שלך. תהיה מוכן לפרסם באופן מיידי.',
    step2_title: 'העלה מודעה',
    step2_desc: 'הוסף כותרת, מחיר, תמונות ופרטים של המוצר, הרכב, השירות או הנכס שלך.',
    step3_title: 'מכור ישירות',
    step3_desc: 'קבל הודעות מקונים ישירות לנייד שלך ותאם את מסירת המוצר.',
    faq_title: 'שאלות נפוצות',
    faq_q1: 'האם פרסום מודעות ב-Mercasto הוא באמת חינם?',
    faq_a1: 'כן, פרסום המודעות הוא 100% חינם. איננו גובים עמלות מכירה, דמי מנוי חודשיים או עמלות נסתרות. אתה שומר 100% מכספי המכירה שלך.',
    faq_q2: 'כיצד יצרו איתי קשר קונים פוטנציאליים?',
    faq_a2: 'ב-Mercasto הקונים פונים אליך ישירות. באפשרותך להגדיר את הפרופיל שלך לקבלת הודעות ישירות לוואטסאפ, לטלגרם או לקבלת שיחות טלפון רגילות.',
    faq_q3: 'אילו קטגוריות של מודעות אני יכול לפרסם?',
    faq_a3: 'ניתן לפרסם כמעט כל סוג מודעה: רכבים ואופנועים (Motor), נדל"ן (מכירה או השכרה), שירותים מקצועיים, פריטים אישיים, טכנולוגיה, הצעות עבודה ועוד.',
    faq_q4: 'כמה מודעות אוכל לפרסם בחינם?',
    faq_a4: 'אין מגבלות חונקות למוכרים פרטיים. תוכל לפרסם מספר מודעות פעילות כדי להציג את כל המוצרים או השירותים שלך.',
    safety_title: 'הבטיחות שלך היא בעדיפות הראשונה שלנו',
    safety_desc: 'ב-Mercasto אנו מאמתים פרופילים באופן שוטף כדי להבטיח קהילת מכירות אמינה ובטוחה. זכור תמיד לבצע עסקאות במקומות ציבוריים ובטוחים.',
    cta_footer_title: 'מוכן להתחיל למכור כבר היום?',
    cta_footer_desc: 'אלפי אנשים ברחבי מקסיקו מחפשים את מה שאתה מציע. פרסם מודעה בחינם לגמרי!',
    cta_footer_btn: 'להתחיל עכשיו'
  },
  yi: {
    seo_title: 'פרסם פרייע קלאסיפייד מודעות אין מעקסיקא | Mercasto',
    badge: '100% פרייע קלאסיפיידס אין מעקסיקא',
    hero_title: 'פאַרקויפֿן פאַסטער און אָן צאָלן קאָמיסיעס',
    hero_title_before: "פאַרקויפֿן פאַסטער און ",
    hero_title_highlight: "אָן צאָלן קאָמיסיעס",
    hero_title_after: "",
    hero_desc: 'פרסם דיין קאַרס, הייזער, באַדינונגען אָדער פּראָדוקטן פֿאַר פֿרייַ. קויפערס קאָנטאַקט איר גלייך דורך WhatsApp אָדער Telegram אָן אינמיטלערס.',
    cta_btn: 'פרסם פרייע מודעה',
    mockup_caption: 'פֿאַרקויפער קאָנטראָל טאַפליע פאָרויסזאָגן: פירן דיין מודעות און זען פאַקטיש-צייט סטאַטיסטיק.',
    categories_title: 'וואָס קען מען פּובליקירן אויף Mercasto?',
    categories_desc: 'קלייַבן א קאַטעגאָריע און אָנהייבן באַקומען אָפפערס פון קויפערס איבער מעקסיקא.',
    cat_motor: 'מאטארן',
    cat_motor_desc: 'קאַרס, טראַקס, מאָטאָציקלעך און טיילן.',
    cat_inmuebles: 'גרונטייגנס',
    cat_inmuebles_desc: 'הייזער, דירות און שטחים.',
    cat_empleos: 'דזשאָבס',
    cat_empleos_desc: 'וואַקאַנסיעס און פערזענלעכע פּראָפילעס.',
    cat_servicios: 'באדינונגען',
    cat_servicios_desc: 'פאַכמאַן און היים באַדינונגען.',
    cat_productos: 'סחורה',
    cat_productos_desc: 'פערזענלעכע זאכן, טעכנאָלאָגיע און מער.',
    feature1_title: 'גריнгע פּובליקאַציע',
    feature1_desc: 'לאָדן דיין פאָטאָס און באַשרייבונג אין ווייניקער ווי 2 מינוט. דיזייнд צו קוקן גרויס אויף מאָביל און קאָמפּיוטער.',
    feature2_title: '0% קאָמיסיעס',
    feature2_desc: 'דער גאנצער נוץ איז דיינער. Mercasto טוט נישט אריינמישן אין דיינע צאָלונגען אָדער אָפּגעצויגן פראצענטן פון דיינע פאַרקויפן.',
    feature3_title: 'דירעקטע קאָנטאַקט',
    feature3_desc: 'פארגעסן פון פּאַמעלעך טשאַץ אויף קאָמפּלעקס פּלאַטפאָרמס. אינטערעסירט קונים שרייבן צו איר דירעקט אויף دיין פערזענלעכע WhatsApp.',
    how_title: 'ווי אַזוי אַרבעט Mercasto?',
    step1_title: 'שאַפֿן דיין קאנטע',
    step1_desc: 'פאַרשרייַבן זיך סיקיורלי מיט דיין בליצפּאָסט. איר וועט זיין גרייט צו פרסם גלייך.',
    step2_title: 'לאָדן דיין מודעה',
    step2_desc: 'לייג דעם טיטל, פּרייַז, פאָטאָס און פרטים פון دיין פּראָדוקט, מאַשין, דינסט אָדער פאַרמאָг.',
    step3_title: 'פאַרקויפן דירעקט',
    step3_desc: 'באַקומען אַרטיקלען פון קויפערס גלייך אויף דיין מאָביל און קאָאָרדינירן די עקספּרעס.',
    faq_title: 'אָפט געשטעלטע פראגעס',
    faq_q1: 'איז עס טאַקע פריי צו פרסם מודעות אויף Mercasto?',
    faq_a1: 'יאָ, פּובליקירן מודעות איז 100% פריי. מיר טאָן ניט אָפּצאָل פארקויפונг קאָמיסיעס, כוידעשלעך פיז אָדער פאַרבאָרגן רייץ. איר האלט 100% פון דיין פארקויפונג געלט.',
    faq_q2: 'ווי וועט אינטערעסירט קויפערס קאָנטאַקט מיר?',
    faq_a2: 'איוו אויף Mercasto קויפערס קאָנטאַקט איר דירעקט. איר קענען שטעלן דיין פּראָפיל צו באַקומען אַרטיקלען גלייך אויף דיין WhatsApp, Telegram אָדער באַקומען טראדיציאנелן טעלעפאָן קאַללס.',
    faq_q3: 'וואָס קאַטעגאָריעס פון מודעות קען איך פרסם?',
    faq_a3: 'איר קענען פרסם כּמעט קיין טיפּ פון קלאַסיפייдס: קאַרס און מאָטאָציקלעך (Motor), גרונטייגנס (פאַרקויף אָדער דינגען), פאַכמאַן באַדינונגען, פערזענלעכע זאכן, טעכנאָלאָגיע, אַרבעט אָפפערס און מער.',
    faq_q4: 'ווי פילע מודעות קען איך פרסם פֿאַר פריי?',
    faq_a4: 'עס זענען קיין ריסטריקטיוו לימאַץ פֿאַר פּריוואַט פארקויפער. איר קענען פרסם קייפל אַקטיוו מודעות צו וויטרינע אַלע דיין פּראָדוקטן אָדער באַדינונגען.',
    safety_title: 'דיין זיכערקייַט איז אונדזער בילכערקייַט',
    safety_desc: 'אין Mercasto מיר קעסיידער וואַלאַדייט פּראָפילעס צו גאַראַנטירן אַ טראַסטיד סעלינג קהл. געדענקט שטענדיק צו מאַכן טראַנזאַקשאַנז אין עפנטלעך און זיכער ערטער.',
    cta_footer_title: 'גרייט צו אָנהייבן פאַרקויפן היינט?',
    cta_footer_desc: 'טויזנטער מענטשן איבער מעקסיקא זוכן פֿאַר וואָס איר פאָרשלאָגן. מאַכן דיין פּובליקאַציע גאָר פריי!',
    cta_footer_btn: 'אָנהייבן איצט'
  }
};

export default function SellerLandingScreen({ lang = 'es' }) {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);

  // Fallback to Spanish if language not found
  const t = TRANSLATIONS[lang] || TRANSLATIONS.es;

  useEffect(() => {
    // Dynamic SEO title
    const oldTitle = document.title;
    document.title = t.seo_title;
    
    // Track page view for analytics
    trackPageView('/vendedores', 'Para Vendedores - Publica Gratis');

    return () => {
      // Restore previous title on unmount
      document.title = oldTitle;
    };
  }, [lang, t.seo_title]);

  const handleStart = (categorySlug = '') => {
    // Navigate to post form, potentially passing selected category
    if (categorySlug) {
      navigate('/post', { state: { preselectedCategory: categorySlug } });
    } else {
      navigate('/post');
    }
  };

  const handleFaqToggle = (index) => {
    const nextFaq = activeFaq === index ? null : index;
    setActiveFaq(nextFaq);
    
    if (nextFaq !== null) {
      // Track FAQ expand action as a micro-conversion
      trackEvent('ui_click', {
        element_type: 'faq',
        element_text: `faq_${index + 1}`,
        page_path: '/vendedores'
      });
    }
  };

  const faqItems = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 }
  ];

  const categories = [
    { slug: 'motor', label: t.cat_motor, desc: t.cat_motor_desc, icon: Car },
    { slug: 'inmuebles', label: t.cat_inmuebles, desc: t.cat_inmuebles_desc, icon: Home },
    { slug: 'empleos', label: t.cat_empleos, desc: t.cat_empleos_desc, icon: Briefcase },
    { slug: 'servicios', label: t.cat_servicios, desc: t.cat_servicios_desc, icon: Wrench },
    { slug: 'productos', label: t.cat_productos, desc: t.cat_productos_desc, icon: ShoppingBag }
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-12 md:pt-32 md:pb-16 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#84CC16]/10 dark:bg-[#84CC16]/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#84CC16]/10 text-[#84CC16] text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse border border-[#84CC16]/20">
          <Sparkles size={14} />
          <span>{t.badge}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
          {t.hero_title_before}
          <span className="text-[#84CC16] drop-shadow-sm">{t.hero_title_highlight}</span>
          {t.hero_title_after}
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed font-medium">
          {t.hero_desc}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
          <button
            onClick={() => handleStart()}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[#84CC16] hover:bg-[#72B013] text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-[#84CC16]/20 transition-all duration-200 text-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle size={22} />
            <span>{t.cta_btn}</span>
            <ArrowRight size={18} className="ml-1" />
          </button>
        </div>
      </section>

      {/* Visual Product Mockup Section */}
      <section className="px-4 max-w-5xl mx-auto mb-16 md:mb-24">
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900/50 p-2 md:p-3">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#84CC16]/5 to-transparent pointer-events-none" />
          <img
            src="/seller-dashboard-mockup.jpg"
            alt="Mercasto Seller Panel Interface Dashboard Mockup"
            className="w-full h-auto rounded-2xl"
          />
        </div>
        <p className="text-center text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium">
          {t.mockup_caption}
        </p>
      </section>

      {/* Categories block ("Qué puedes publicar") */}
      <section className="py-16 px-4 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">{t.categories_title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium">{t.categories_desc}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.slug}
                onClick={() => handleStart(cat.slug)}
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl hover:border-[#84CC16] hover:ring-2 hover:ring-[#84CC16]/10 transition-all duration-300 shadow-sm hover:scale-[1.03] active:scale-[0.97] group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/40 flex items-center justify-center text-[#84CC16] mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon size={24} />
                </div>
                <span className="font-bold text-sm md:text-base mb-1.5">{cat.label}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                  {cat.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 px-4 max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Easy & Fast */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feature1_title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              {t.feature1_desc}
            </p>
          </div>

          {/* Card 2: No commissions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <DollarSign size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feature2_title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              {t.feature2_desc}
            </p>
          </div>

          {/* Card 3: Direct Contact */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feature3_title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              {t.feature3_desc}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900/50 border-y border-slate-200/60 dark:border-slate-800/60 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-12">{t.how_title}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                1
              </div>
              <h4 className="text-lg font-bold mb-2">{t.step1_title}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {t.step1_desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                2
              </div>
              <h4 className="text-lg font-bold mb-2">{t.step2_title}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {t.step2_desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                3
              </div>
              <h4 className="text-lg font-bold mb-2">{t.step3_title}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {t.step3_desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 px-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold text-center mb-12">{t.faq_title}</h2>
        <div className="space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => handleFaqToggle(index)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-base md:text-lg focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-[#84CC16] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? 'max-h-40 border-t border-slate-100 dark:border-slate-800/80' : 'max-h-0'
                  }`}
                >
                  <p className="p-5 text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-lime-500/10 flex items-center justify-center text-[#84CC16] shrink-0">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight">{t.safety_title}</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">
            {t.safety_desc}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#84CC16]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight max-w-2xl mx-auto">
          {t.cta_footer_title}
        </h2>
        <p className="text-slate-400 text-base md:text-lg mb-10 max-w-xl mx-auto">
          {t.cta_footer_desc}
        </p>
        <button
          onClick={() => handleStart()}
          className="flex items-center justify-center gap-2 mx-auto bg-[#84CC16] hover:bg-[#72B013] text-white font-bold px-10 py-4.5 rounded-2xl shadow-xl shadow-[#84CC16]/10 transition-all duration-200 text-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle size={22} />
          <span>{t.cta_footer_btn}</span>
          <ArrowRight size={18} className="ml-1" />
        </button>
      </section>
    </div>
  );
}
