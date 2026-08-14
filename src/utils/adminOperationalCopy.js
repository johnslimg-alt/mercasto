import { normalizeLanguage } from './translations.js';

export const ADMIN_OPERATIONAL_LANGUAGES = Object.freeze(["es", "en", "pt", "fr", "zh", "ko", "de", "it", "ar", "ru", "ja"]);

const COPY = Object.freeze({
  "es": {
    "seo": {
      "loadError": "No se pudo cargar el reporte SEO/GEO.",
      "noPeriod": "Sin periodo",
      "noSnapshots": "Aún no hay snapshots semanales.",
      "schedulerNote": "El scheduler genera el reporte los lunes a las 08:15.",
      "weeklyTitle": "SEO / GEO semanal",
      "privacyOk": "Privacidad verificada",
      "privacyReview": "Revisar privacidad",
      "generated": "generado",
      "noDate": "sin fecha",
      "refresh": "Actualizar",
      "connected": "Conectado",
      "temporaryError": "Error temporal",
      "notConfigured": "No configurado",
      "readReady": "Acceso de lectura preparado",
      "readMissing": "Falta acceso de lectura externo",
      "activeGenuine": "Oferta genuine activa",
      "sellers": "vendedores",
      "readyConfirm": "Listos para confirmar",
      "sellerAction": "Requieren acción del vendedor",
      "indexableGenuine": "URLs genuine indexables",
      "noindexRefs": "referencias noindex",
      "sourcePages": "Source pages",
      "factualPages": "Páginas factuales oficiales",
      "newUsers": "Usuarios nuevos",
      "verified": "verificados",
      "firstPublishers": "Primeros publicadores",
      "genuineViews": "Vistas genuine",
      "contacts": "contactos",
      "contactConversion": "Conversión contacto",
      "contactedListings": "anuncios contactados",
      "nationalReached": "Umbral nacional alcanzado",
      "localBlocked": "GEO local permanece bloqueado",
      "twoSnapshots": "Aún se requieren dos snapshots semanales consecutivos antes de habilitar rutas.",
      "blockedReason": "No se abrirán páginas de estado o ciudad hasta cumplir oferta genuine, diversidad, ubicación y dos semanas consecutivas.",
      "routesOpen": "Rutas location abiertas",
      "qualifiedCategories": "categorías calificadas",
      "stateCategories": "estado/categoría",
      "cityCategories": "ciudad/categoría",
      "historyTitle": "Historial de snapshots",
      "historyDesc": "Hasta 12 periodos, solo datos agregados.",
      "period": "Periodo",
      "genuineActive": "Genuine activos",
      "users": "Usuarios",
      "firstPublications": "Primeras publicaciones",
      "indexables": "Indexables",
      "external": "External",
      "privacy": "Privacidad",
      "complete": "Completo",
      "partial": "Parcial",
      "review": "Revisar"
    },
    "marketing": {
      "headerDesc": "Una sola consola para campañas, medición, presupuestos y automatización multiplataforma.",
      "backAdmin": "Volver al admin",
      "authMissing": "No hay una sesión administrativa activa.",
      "metaStatusError": "No se pudo comprobar Meta Ads.",
      "campaignsLoadError": "No se pudieron cargar las campañas de Meta.",
      "loadError": "Error al cargar Meta Ads.",
      "metaRejected": "Meta rechazó la operación.",
      "updateError": "No se pudo actualizar la campaña.",
      "confirmToggle": "Confirmas {action} la campaña “{name}”?",
      "activateVerb": "activar",
      "pauseVerb": "pausar",
      "activated": "Campaña activada.",
      "paused": "Campaña pausada.",
      "budgetMin": "El presupuesto diario debe ser de al menos 1 MXN.",
      "confirmBudget": "Cambiar el presupuesto diario de “{name}” a {amount}?",
      "budgetUpdated": "Presupuesto actualizado a {amount}.",
      "missingCredentials": "Faltan credenciales del servidor",
      "spend7": "Gasto · 7 días",
      "registrations": "Registros",
      "campaigns": "campañas",
      "purchases": "Compras",
      "metaAttribution": "Atribución Meta",
      "connectionsTitle": "Conexiones de plataformas",
      "adaptersDesc": "Los adaptadores comparten un único modelo interno de campañas y métricas.",
      "campaignsTitle": "Campañas de Meta",
      "campaignsDesc": "Resultados y control de campañas. Los cambios requieren confirmación.",
      "campaign": "Campaña",
      "dailyBudget": "Presupuesto diario",
      "spend": "Gasto",
      "actions": "Acciones",
      "adSetBudget": "Presupuesto del conjunto",
      "noCampaigns": "No hay campañas disponibles o Meta todavía no está configurado.",
      "moduleSuffix": "Este módulo se conectará al mismo modelo interno de campañas y métricas.",
      "ready": "Listo",
      "attention": "Atención",
      "planned": "Planificado",
      "sections": {
        "dashboard": {
          "label": "Panel",
          "description": "Resultados de todas las plataformas."
        },
        "connections": {
          "label": "Conexiones",
          "description": "Meta, TikTok, Google, X y Microsoft."
        },
        "campaigns": {
          "label": "Campañas",
          "description": "Campañas, conjuntos y anuncios."
        },
        "creatives": {
          "label": "Creativos",
          "description": "Imágenes, videos, textos y variantes."
        },
        "audiences": {
          "label": "Audiencias",
          "description": "Segmentos y públicos sincronizados."
        },
        "tracking": {
          "label": "Píxeles",
          "description": "Píxeles, CAPI, eventos y UTM."
        },
        "budgets": {
          "label": "Presupuestos",
          "description": "Presupuestos y reglas de distribución."
        },
        "tests": {
          "label": "Pruebas A/B",
          "description": "Pruebas entre creativos y audiencias."
        },
        "automations": {
          "label": "Automatizaciones",
          "description": "Pausas, escalado y alertas automáticas."
        },
        "ai": {
          "label": "Analista AI",
          "description": "Análisis diario y recomendaciones."
        }
      },
      "platformDetails": [
        "Reconectar cuenta publicitaria",
        "Adaptador API planificado",
        "Feed de productos planificado",
        "Adaptador de medición planificado",
        "Se requiere acceso API",
        "Adaptador API planificado"
      ]
    }
  },
  "en": {
    "seo": {
      "loadError": "The SEO/GEO report could not be loaded.",
      "noPeriod": "No period",
      "noSnapshots": "No weekly snapshots yet.",
      "schedulerNote": "The scheduler generates the report on Mondays at 08:15.",
      "weeklyTitle": "Weekly SEO / GEO",
      "privacyOk": "Privacy verified",
      "privacyReview": "Review privacy",
      "generated": "generated",
      "noDate": "no date",
      "refresh": "Refresh",
      "connected": "Connected",
      "temporaryError": "Temporary error",
      "notConfigured": "Not configured",
      "readReady": "Read access ready",
      "readMissing": "External read access missing",
      "activeGenuine": "Active genuine supply",
      "sellers": "sellers",
      "readyConfirm": "Ready to confirm",
      "sellerAction": "Seller action required",
      "indexableGenuine": "Indexable genuine URLs",
      "noindexRefs": "noindex references",
      "sourcePages": "Source pages",
      "factualPages": "Official factual pages",
      "newUsers": "New users",
      "verified": "verified",
      "firstPublishers": "First publishers",
      "genuineViews": "Genuine views",
      "contacts": "contacts",
      "contactConversion": "Contact conversion",
      "contactedListings": "contacted listings",
      "nationalReached": "National threshold reached",
      "localBlocked": "Local GEO remains blocked",
      "twoSnapshots": "Two consecutive weekly snapshots are still required before routes can be enabled.",
      "blockedReason": "State or city pages will not open until genuine supply, diversity, location and two consecutive weeks meet the threshold.",
      "routesOpen": "Open location routes",
      "qualifiedCategories": "qualified categories",
      "stateCategories": "state/category",
      "cityCategories": "city/category",
      "historyTitle": "Snapshot history",
      "historyDesc": "Up to 12 periods, aggregated data only.",
      "period": "Period",
      "genuineActive": "Active genuine",
      "users": "Users",
      "firstPublications": "First publications",
      "indexables": "Indexable",
      "external": "External",
      "privacy": "Privacy",
      "complete": "Complete",
      "partial": "Partial",
      "review": "Review"
    },
    "marketing": {
      "headerDesc": "One console for campaigns, measurement, budgets and cross-platform automation.",
      "backAdmin": "Back to admin",
      "authMissing": "There is no active admin session.",
      "metaStatusError": "Meta Ads status could not be checked.",
      "campaignsLoadError": "Meta campaigns could not be loaded.",
      "loadError": "Error loading Meta Ads.",
      "metaRejected": "Meta rejected the operation.",
      "updateError": "The campaign could not be updated.",
      "confirmToggle": "Confirm {action} for campaign “{name}”?",
      "activateVerb": "activation",
      "pauseVerb": "pause",
      "activated": "Campaign activated.",
      "paused": "Campaign paused.",
      "budgetMin": "The daily budget must be at least 1 MXN.",
      "confirmBudget": "Change the daily budget for “{name}” to {amount}?",
      "budgetUpdated": "Budget updated to {amount}.",
      "missingCredentials": "Server credentials are missing",
      "spend7": "Spend · 7 days",
      "registrations": "Registrations",
      "campaigns": "campaigns",
      "purchases": "Purchases",
      "metaAttribution": "Meta attribution",
      "connectionsTitle": "Platform connections",
      "adaptersDesc": "Adapters share one internal campaign and metrics model.",
      "campaignsTitle": "Meta campaigns",
      "campaignsDesc": "Campaign results and controls. Changes require confirmation.",
      "campaign": "Campaign",
      "dailyBudget": "Daily budget",
      "spend": "Spend",
      "actions": "Actions",
      "adSetBudget": "Ad set budget",
      "noCampaigns": "No campaigns are available or Meta is not configured yet.",
      "moduleSuffix": "This module will use the same internal campaign and metrics model.",
      "ready": "Ready",
      "attention": "Attention",
      "planned": "Planned",
      "sections": {
        "dashboard": {
          "label": "Dashboard",
          "description": "Results from all platforms."
        },
        "connections": {
          "label": "Connections",
          "description": "Meta, TikTok, Google, X and Microsoft."
        },
        "campaigns": {
          "label": "Campaigns",
          "description": "Campaigns, ad sets and ads."
        },
        "creatives": {
          "label": "Creatives",
          "description": "Images, videos, copy and variants."
        },
        "audiences": {
          "label": "Audiences",
          "description": "Synchronized segments and audiences."
        },
        "tracking": {
          "label": "Pixels",
          "description": "Pixels, CAPI, events and UTM."
        },
        "budgets": {
          "label": "Budgets",
          "description": "Budgets and distribution rules."
        },
        "tests": {
          "label": "A/B Tests",
          "description": "Tests across creatives and audiences."
        },
        "automations": {
          "label": "Automations",
          "description": "Pauses, scaling and automatic alerts."
        },
        "ai": {
          "label": "AI Analyst",
          "description": "Daily analysis and recommendations."
        }
      },
      "platformDetails": [
        "Reconnect advertiser account",
        "API adapter planned",
        "Product feed planned",
        "Measurement adapter planned",
        "API access required",
        "API adapter planned"
      ]
    }
  },
  "pt": {
    "seo": {
      "loadError": "Não foi possível carregar o relatório SEO/GEO.",
      "noPeriod": "Sem período",
      "noSnapshots": "Ainda não há snapshots semanais.",
      "schedulerNote": "O agendador gera o relatório às segundas-feiras às 08:15.",
      "weeklyTitle": "SEO / GEO semanal",
      "privacyOk": "Privacidade verificada",
      "privacyReview": "Revisar privacidade",
      "generated": "gerado",
      "noDate": "sem data",
      "refresh": "Atualizar",
      "connected": "Conectado",
      "temporaryError": "Erro temporário",
      "notConfigured": "Não configurado",
      "readReady": "Acesso de leitura pronto",
      "readMissing": "Falta acesso externo de leitura",
      "activeGenuine": "Oferta genuine ativa",
      "sellers": "vendedores",
      "readyConfirm": "Prontos para confirmar",
      "sellerAction": "Exigem ação do vendedor",
      "indexableGenuine": "URLs genuine indexáveis",
      "noindexRefs": "referências noindex",
      "sourcePages": "Páginas de origem",
      "factualPages": "Páginas factuais oficiais",
      "newUsers": "Novos usuários",
      "verified": "verificados",
      "firstPublishers": "Primeiros anunciantes",
      "genuineViews": "Visualizações genuine",
      "contacts": "contatos",
      "contactConversion": "Conversão de contato",
      "contactedListings": "anúncios contatados",
      "nationalReached": "Limite nacional alcançado",
      "localBlocked": "GEO local continua bloqueado",
      "twoSnapshots": "Ainda são necessários dois snapshots semanais consecutivos antes de ativar rotas.",
      "blockedReason": "Páginas de estado ou cidade não serão abertas até cumprir oferta genuine, diversidade, localização e duas semanas consecutivas.",
      "routesOpen": "Rotas de localização abertas",
      "qualifiedCategories": "categorias qualificadas",
      "stateCategories": "estado/categoria",
      "cityCategories": "cidade/categoria",
      "historyTitle": "Histórico de snapshots",
      "historyDesc": "Até 12 períodos, apenas dados agregados.",
      "period": "Período",
      "genuineActive": "Genuine ativos",
      "users": "Usuários",
      "firstPublications": "Primeiras publicações",
      "indexables": "Indexáveis",
      "external": "Externo",
      "privacy": "Privacidade",
      "complete": "Completo",
      "partial": "Parcial",
      "review": "Revisar"
    },
    "marketing": {
      "headerDesc": "Um único console para campanhas, medição, orçamentos e automação multiplataforma.",
      "backAdmin": "Voltar ao admin",
      "authMissing": "Não há uma sessão administrativa ativa.",
      "metaStatusError": "Não foi possível verificar o Meta Ads.",
      "campaignsLoadError": "Não foi possível carregar as campanhas da Meta.",
      "loadError": "Erro ao carregar Meta Ads.",
      "metaRejected": "A Meta rejeitou a operação.",
      "updateError": "Não foi possível atualizar a campanha.",
      "confirmToggle": "Confirmar {action} da campanha “{name}”?",
      "activateVerb": "ativação",
      "pauseVerb": "pausa",
      "activated": "Campanha ativada.",
      "paused": "Campanha pausada.",
      "budgetMin": "O orçamento diário deve ser de pelo menos 1 MXN.",
      "confirmBudget": "Alterar o orçamento diário de “{name}” para {amount}?",
      "budgetUpdated": "Orçamento atualizado para {amount}.",
      "missingCredentials": "Faltam credenciais do servidor",
      "spend7": "Gasto · 7 dias",
      "registrations": "Cadastros",
      "campaigns": "campanhas",
      "purchases": "Compras",
      "metaAttribution": "Atribuição Meta",
      "connectionsTitle": "Conexões de plataformas",
      "adaptersDesc": "Os adaptadores compartilham um único modelo interno de campanhas e métricas.",
      "campaignsTitle": "Campanhas da Meta",
      "campaignsDesc": "Resultados e controle de campanhas. Alterações exigem confirmação.",
      "campaign": "Campanha",
      "dailyBudget": "Orçamento diário",
      "spend": "Gasto",
      "actions": "Ações",
      "adSetBudget": "Orçamento do conjunto",
      "noCampaigns": "Não há campanhas disponíveis ou a Meta ainda não está configurada.",
      "moduleSuffix": "Este módulo usará o mesmo modelo interno de campanhas e métricas.",
      "ready": "Pronto",
      "attention": "Atenção",
      "planned": "Planejado",
      "sections": {
        "dashboard": {
          "label": "Painel",
          "description": "Resultados de todas as plataformas."
        },
        "connections": {
          "label": "Conexões",
          "description": "Meta, TikTok, Google, X e Microsoft."
        },
        "campaigns": {
          "label": "Campanhas",
          "description": "Campanhas, conjuntos e anúncios."
        },
        "creatives": {
          "label": "Criativos",
          "description": "Imagens, vídeos, textos e variantes."
        },
        "audiences": {
          "label": "Públicos",
          "description": "Segmentos e públicos sincronizados."
        },
        "tracking": {
          "label": "Pixels",
          "description": "Pixels, CAPI, eventos e UTM."
        },
        "budgets": {
          "label": "Orçamentos",
          "description": "Orçamentos e regras de distribuição."
        },
        "tests": {
          "label": "Testes A/B",
          "description": "Testes entre criativos e públicos."
        },
        "automations": {
          "label": "Automações",
          "description": "Pausas, escala e alertas automáticos."
        },
        "ai": {
          "label": "Analista AI",
          "description": "Análise diária e recomendações."
        }
      },
      "platformDetails": [
        "Reconectar conta de anúncios",
        "Adaptador de API planejado",
        "Feed de produtos planejado",
        "Adaptador de medição planejado",
        "Acesso à API necessário",
        "Adaptador de API planejado"
      ]
    }
  },
  "fr": {
    "seo": {
      "loadError": "Impossible de charger le rapport SEO/GEO.",
      "noPeriod": "Aucune période",
      "noSnapshots": "Aucun snapshot hebdomadaire pour le moment.",
      "schedulerNote": "Le planificateur génère le rapport le lundi à 08:15.",
      "weeklyTitle": "SEO / GEO hebdomadaire",
      "privacyOk": "Confidentialité vérifiée",
      "privacyReview": "Vérifier la confidentialité",
      "generated": "généré",
      "noDate": "sans date",
      "refresh": "Actualiser",
      "connected": "Connecté",
      "temporaryError": "Erreur temporaire",
      "notConfigured": "Non configuré",
      "readReady": "Accès en lecture prêt",
      "readMissing": "Accès externe en lecture manquant",
      "activeGenuine": "Offre genuine active",
      "sellers": "vendeurs",
      "readyConfirm": "Prêts à confirmer",
      "sellerAction": "Action du vendeur requise",
      "indexableGenuine": "URL genuine indexables",
      "noindexRefs": "références noindex",
      "sourcePages": "Pages sources",
      "factualPages": "Pages factuelles officielles",
      "newUsers": "Nouveaux utilisateurs",
      "verified": "vérifiés",
      "firstPublishers": "Premiers annonceurs",
      "genuineViews": "Vues genuine",
      "contacts": "contacts",
      "contactConversion": "Conversion contact",
      "contactedListings": "annonces contactées",
      "nationalReached": "Seuil national atteint",
      "localBlocked": "Le GEO local reste bloqué",
      "twoSnapshots": "Deux snapshots hebdomadaires consécutifs sont encore requis avant d’activer les routes.",
      "blockedReason": "Les pages d’État ou de ville ne seront pas ouvertes avant de respecter l’offre genuine, la diversité, la localisation et deux semaines consécutives.",
      "routesOpen": "Routes de localisation ouvertes",
      "qualifiedCategories": "catégories qualifiées",
      "stateCategories": "État/catégorie",
      "cityCategories": "ville/catégorie",
      "historyTitle": "Historique des snapshots",
      "historyDesc": "Jusqu’à 12 périodes, données agrégées uniquement.",
      "period": "Période",
      "genuineActive": "Genuine actifs",
      "users": "Utilisateurs",
      "firstPublications": "Premières publications",
      "indexables": "Indexables",
      "external": "Externe",
      "privacy": "Confidentialité",
      "complete": "Complet",
      "partial": "Partiel",
      "review": "Vérifier"
    },
    "marketing": {
      "headerDesc": "Une seule console pour les campagnes, la mesure, les budgets et l’automatisation multiplateforme.",
      "backAdmin": "Retour à l’admin",
      "authMissing": "Aucune session administrateur active.",
      "metaStatusError": "Impossible de vérifier Meta Ads.",
      "campaignsLoadError": "Impossible de charger les campagnes Meta.",
      "loadError": "Erreur lors du chargement de Meta Ads.",
      "metaRejected": "Meta a rejeté l’opération.",
      "updateError": "Impossible de mettre à jour la campagne.",
      "confirmToggle": "Confirmer {action} pour la campagne « {name} » ?",
      "activateVerb": "l’activation",
      "pauseVerb": "la pause",
      "activated": "Campagne activée.",
      "paused": "Campagne mise en pause.",
      "budgetMin": "Le budget quotidien doit être d’au moins 1 MXN.",
      "confirmBudget": "Changer le budget quotidien de « {name} » à {amount} ?",
      "budgetUpdated": "Budget mis à jour à {amount}.",
      "missingCredentials": "Identifiants serveur manquants",
      "spend7": "Dépenses · 7 jours",
      "registrations": "Inscriptions",
      "campaigns": "campagnes",
      "purchases": "Achats",
      "metaAttribution": "Attribution Meta",
      "connectionsTitle": "Connexions aux plateformes",
      "adaptersDesc": "Les adaptateurs partagent un modèle interne unique de campagnes et de métriques.",
      "campaignsTitle": "Campagnes Meta",
      "campaignsDesc": "Résultats et contrôle des campagnes. Les modifications nécessitent une confirmation.",
      "campaign": "Campagne",
      "dailyBudget": "Budget quotidien",
      "spend": "Dépenses",
      "actions": "Actions",
      "adSetBudget": "Budget de l’ensemble",
      "noCampaigns": "Aucune campagne disponible ou Meta n’est pas encore configuré.",
      "moduleSuffix": "Ce module utilisera le même modèle interne de campagnes et de métriques.",
      "ready": "Prêt",
      "attention": "Attention",
      "planned": "Planifié",
      "sections": {
        "dashboard": {
          "label": "Tableau de bord",
          "description": "Résultats de toutes les plateformes."
        },
        "connections": {
          "label": "Connexions",
          "description": "Meta, TikTok, Google, X et Microsoft."
        },
        "campaigns": {
          "label": "Campagnes",
          "description": "Campagnes, ensembles et annonces."
        },
        "creatives": {
          "label": "Créatifs",
          "description": "Images, vidéos, textes et variantes."
        },
        "audiences": {
          "label": "Audiences",
          "description": "Segments et audiences synchronisés."
        },
        "tracking": {
          "label": "Pixels",
          "description": "Pixels, CAPI, événements et UTM."
        },
        "budgets": {
          "label": "Budgets",
          "description": "Budgets et règles de répartition."
        },
        "tests": {
          "label": "Tests A/B",
          "description": "Tests entre créatifs et audiences."
        },
        "automations": {
          "label": "Automatisations",
          "description": "Pauses, montée en charge et alertes automatiques."
        },
        "ai": {
          "label": "Analyste AI",
          "description": "Analyse quotidienne et recommandations."
        }
      },
      "platformDetails": [
        "Reconnecter le compte publicitaire",
        "Adaptateur API prévu",
        "Flux produits prévu",
        "Adaptateur de mesure prévu",
        "Accès API requis",
        "Adaptateur API prévu"
      ]
    }
  },
  "zh": {
    "seo": {
      "loadError": "无法加载 SEO/GEO 报告。",
      "noPeriod": "无周期",
      "noSnapshots": "目前还没有每周快照。",
      "schedulerNote": "调度器每周一 08:15 生成报告。",
      "weeklyTitle": "每周 SEO / GEO",
      "privacyOk": "隐私已验证",
      "privacyReview": "检查隐私",
      "generated": "生成于",
      "noDate": "无日期",
      "refresh": "刷新",
      "connected": "已连接",
      "temporaryError": "临时错误",
      "notConfigured": "未配置",
      "readReady": "读取权限已就绪",
      "readMissing": "缺少外部读取权限",
      "activeGenuine": "活跃 genuine 供给",
      "sellers": "卖家",
      "readyConfirm": "可确认",
      "sellerAction": "需要卖家操作",
      "indexableGenuine": "可索引 genuine URL",
      "noindexRefs": "noindex 引用",
      "sourcePages": "来源页面",
      "factualPages": "官方事实页面",
      "newUsers": "新用户",
      "verified": "已验证",
      "firstPublishers": "首次发布者",
      "genuineViews": "Genuine 浏览",
      "contacts": "联系",
      "contactConversion": "联系转化率",
      "contactedListings": "被联系的广告",
      "nationalReached": "已达到全国阈值",
      "localBlocked": "本地 GEO 仍被阻止",
      "twoSnapshots": "启用路由前仍需要连续两周的快照。",
      "blockedReason": "在 genuine 供给、多样性、位置和连续两周达到要求前，不会开放州或城市页面。",
      "routesOpen": "已开放位置路由",
      "qualifiedCategories": "合格类别",
      "stateCategories": "州/类别",
      "cityCategories": "城市/类别",
      "historyTitle": "快照历史",
      "historyDesc": "最多 12 个周期，仅显示汇总数据。",
      "period": "周期",
      "genuineActive": "活跃 genuine",
      "users": "用户",
      "firstPublications": "首次发布",
      "indexables": "可索引",
      "external": "外部",
      "privacy": "隐私",
      "complete": "完整",
      "partial": "部分",
      "review": "检查"
    },
    "marketing": {
      "headerDesc": "一个控制台统一管理多平台广告、衡量、预算和自动化。",
      "backAdmin": "返回管理后台",
      "authMissing": "没有有效的管理员会话。",
      "metaStatusError": "无法检查 Meta Ads 状态。",
      "campaignsLoadError": "无法加载 Meta 广告系列。",
      "loadError": "加载 Meta Ads 时出错。",
      "metaRejected": "Meta 拒绝了该操作。",
      "updateError": "无法更新广告系列。",
      "confirmToggle": "确认对广告系列“{name}”执行{action}？",
      "activateVerb": "启用",
      "pauseVerb": "暂停",
      "activated": "广告系列已启用。",
      "paused": "广告系列已暂停。",
      "budgetMin": "每日预算至少为 1 MXN。",
      "confirmBudget": "将“{name}”的每日预算更改为 {amount}？",
      "budgetUpdated": "预算已更新为 {amount}。",
      "missingCredentials": "缺少服务器凭据",
      "spend7": "花费 · 7 天",
      "registrations": "注册",
      "campaigns": "广告系列",
      "purchases": "购买",
      "metaAttribution": "Meta 归因",
      "connectionsTitle": "平台连接",
      "adaptersDesc": "所有适配器共享统一的内部广告系列和指标模型。",
      "campaignsTitle": "Meta 广告系列",
      "campaignsDesc": "广告系列结果与控制。更改需要确认。",
      "campaign": "广告系列",
      "dailyBudget": "每日预算",
      "spend": "花费",
      "actions": "操作",
      "adSetBudget": "广告组预算",
      "noCampaigns": "没有可用广告系列，或 Meta 尚未配置。",
      "moduleSuffix": "此模块将使用相同的内部广告系列和指标模型。",
      "ready": "就绪",
      "attention": "需注意",
      "planned": "已计划",
      "sections": {
        "dashboard": {
          "label": "仪表盘",
          "description": "所有平台的结果。"
        },
        "connections": {
          "label": "连接",
          "description": "Meta、TikTok、Google、X 和 Microsoft。"
        },
        "campaigns": {
          "label": "广告系列",
          "description": "广告系列、广告组和广告。"
        },
        "creatives": {
          "label": "素材",
          "description": "图片、视频、文案和变体。"
        },
        "audiences": {
          "label": "受众",
          "description": "同步的细分和受众。"
        },
        "tracking": {
          "label": "像素",
          "description": "像素、CAPI、事件和 UTM。"
        },
        "budgets": {
          "label": "预算",
          "description": "预算和分配规则。"
        },
        "tests": {
          "label": "A/B 测试",
          "description": "素材与受众之间的测试。"
        },
        "automations": {
          "label": "自动化",
          "description": "暂停、扩量和自动提醒。"
        },
        "ai": {
          "label": "AI 分析师",
          "description": "每日分析和建议。"
        }
      },
      "platformDetails": [
        "重新连接广告账户",
        "已计划 API 适配器",
        "已计划商品 Feed",
        "已计划衡量适配器",
        "需要 API 访问权限",
        "已计划 API 适配器"
      ]
    }
  },
  "ko": {
    "seo": {
      "loadError": "SEO/GEO 보고서를 불러올 수 없습니다.",
      "noPeriod": "기간 없음",
      "noSnapshots": "아직 주간 스냅샷이 없습니다.",
      "schedulerNote": "스케줄러는 매주 월요일 08:15에 보고서를 생성합니다.",
      "weeklyTitle": "주간 SEO / GEO",
      "privacyOk": "개인정보 보호 확인됨",
      "privacyReview": "개인정보 보호 검토",
      "generated": "생성",
      "noDate": "날짜 없음",
      "refresh": "새로고침",
      "connected": "연결됨",
      "temporaryError": "일시적 오류",
      "notConfigured": "설정되지 않음",
      "readReady": "읽기 권한 준비됨",
      "readMissing": "외부 읽기 권한 없음",
      "activeGenuine": "활성 genuine 공급",
      "sellers": "판매자",
      "readyConfirm": "확인 준비됨",
      "sellerAction": "판매자 작업 필요",
      "indexableGenuine": "인덱싱 가능한 genuine URL",
      "noindexRefs": "noindex 참조",
      "sourcePages": "소스 페이지",
      "factualPages": "공식 사실 페이지",
      "newUsers": "신규 사용자",
      "verified": "인증됨",
      "firstPublishers": "첫 게시자",
      "genuineViews": "Genuine 조회",
      "contacts": "연락",
      "contactConversion": "연락 전환율",
      "contactedListings": "연락된 광고",
      "nationalReached": "전국 기준 도달",
      "localBlocked": "로컬 GEO는 계속 차단됨",
      "twoSnapshots": "경로를 활성화하기 전에 연속 두 주의 스냅샷이 더 필요합니다.",
      "blockedReason": "genuine 공급, 다양성, 위치 및 연속 2주 기준을 충족하기 전에는 주 또는 도시 페이지를 열지 않습니다.",
      "routesOpen": "열린 위치 경로",
      "qualifiedCategories": "적격 카테고리",
      "stateCategories": "주/카테고리",
      "cityCategories": "도시/카테고리",
      "historyTitle": "스냅샷 기록",
      "historyDesc": "최대 12개 기간, 집계 데이터만 표시합니다.",
      "period": "기간",
      "genuineActive": "활성 genuine",
      "users": "사용자",
      "firstPublications": "첫 게시",
      "indexables": "인덱싱 가능",
      "external": "외부",
      "privacy": "개인정보",
      "complete": "완료",
      "partial": "부분",
      "review": "검토"
    },
    "marketing": {
      "headerDesc": "캠페인, 측정, 예산 및 멀티플랫폼 자동화를 하나의 콘솔에서 관리합니다.",
      "backAdmin": "관리자로 돌아가기",
      "authMissing": "활성 관리자 세션이 없습니다.",
      "metaStatusError": "Meta Ads 상태를 확인할 수 없습니다.",
      "campaignsLoadError": "Meta 캠페인을 불러올 수 없습니다.",
      "loadError": "Meta Ads를 불러오는 중 오류가 발생했습니다.",
      "metaRejected": "Meta가 작업을 거부했습니다.",
      "updateError": "캠페인을 업데이트할 수 없습니다.",
      "confirmToggle": "“{name}” 캠페인의 {action}을 확인하시겠습니까?",
      "activateVerb": "활성화",
      "pauseVerb": "일시중지",
      "activated": "캠페인이 활성화되었습니다.",
      "paused": "캠페인이 일시중지되었습니다.",
      "budgetMin": "일일 예산은 최소 1 MXN이어야 합니다.",
      "confirmBudget": "“{name}”의 일일 예산을 {amount}(으)로 변경하시겠습니까?",
      "budgetUpdated": "예산이 {amount}(으)로 업데이트되었습니다.",
      "missingCredentials": "서버 자격 증명이 없습니다",
      "spend7": "지출 · 7일",
      "registrations": "가입",
      "campaigns": "캠페인",
      "purchases": "구매",
      "metaAttribution": "Meta 기여",
      "connectionsTitle": "플랫폼 연결",
      "adaptersDesc": "어댑터는 하나의 내부 캠페인 및 지표 모델을 공유합니다.",
      "campaignsTitle": "Meta 캠페인",
      "campaignsDesc": "캠페인 결과와 제어입니다. 변경에는 확인이 필요합니다.",
      "campaign": "캠페인",
      "dailyBudget": "일일 예산",
      "spend": "지출",
      "actions": "작업",
      "adSetBudget": "광고 세트 예산",
      "noCampaigns": "사용 가능한 캠페인이 없거나 Meta가 아직 설정되지 않았습니다.",
      "moduleSuffix": "이 모듈은 동일한 내부 캠페인 및 지표 모델을 사용합니다.",
      "ready": "준비됨",
      "attention": "주의",
      "planned": "예정",
      "sections": {
        "dashboard": {
          "label": "대시보드",
          "description": "모든 플랫폼의 결과입니다."
        },
        "connections": {
          "label": "연결",
          "description": "Meta, TikTok, Google, X, Microsoft."
        },
        "campaigns": {
          "label": "캠페인",
          "description": "캠페인, 광고 세트 및 광고."
        },
        "creatives": {
          "label": "크리에이티브",
          "description": "이미지, 동영상, 문구 및 변형."
        },
        "audiences": {
          "label": "오디언스",
          "description": "동기화된 세그먼트와 오디언스."
        },
        "tracking": {
          "label": "픽셀",
          "description": "픽셀, CAPI, 이벤트 및 UTM."
        },
        "budgets": {
          "label": "예산",
          "description": "예산과 배분 규칙."
        },
        "tests": {
          "label": "A/B 테스트",
          "description": "크리에이티브와 오디언스 간 테스트."
        },
        "automations": {
          "label": "자동화",
          "description": "일시중지, 확장 및 자동 알림."
        },
        "ai": {
          "label": "AI 분석가",
          "description": "일일 분석 및 권장 사항."
        }
      },
      "platformDetails": [
        "광고주 계정 다시 연결",
        "API 어댑터 예정",
        "제품 피드 예정",
        "측정 어댑터 예정",
        "API 액세스 필요",
        "API 어댑터 예정"
      ]
    }
  },
  "de": {
    "seo": {
      "loadError": "Der SEO/GEO-Bericht konnte nicht geladen werden.",
      "noPeriod": "Kein Zeitraum",
      "noSnapshots": "Noch keine wöchentlichen Snapshots.",
      "schedulerNote": "Der Scheduler erstellt den Bericht montags um 08:15 Uhr.",
      "weeklyTitle": "Wöchentliches SEO / GEO",
      "privacyOk": "Datenschutz geprüft",
      "privacyReview": "Datenschutz prüfen",
      "generated": "erstellt",
      "noDate": "ohne Datum",
      "refresh": "Aktualisieren",
      "connected": "Verbunden",
      "temporaryError": "Temporärer Fehler",
      "notConfigured": "Nicht konfiguriert",
      "readReady": "Lesezugriff bereit",
      "readMissing": "Externer Lesezugriff fehlt",
      "activeGenuine": "Aktives genuine Angebot",
      "sellers": "Verkäufer",
      "readyConfirm": "Bereit zur Bestätigung",
      "sellerAction": "Aktion des Verkäufers erforderlich",
      "indexableGenuine": "Indexierbare genuine URLs",
      "noindexRefs": "noindex-Referenzen",
      "sourcePages": "Quellseiten",
      "factualPages": "Offizielle Faktseiten",
      "newUsers": "Neue Benutzer",
      "verified": "verifiziert",
      "firstPublishers": "Erste Anbieter",
      "genuineViews": "Genuine Aufrufe",
      "contacts": "Kontakte",
      "contactConversion": "Kontakt-Conversion",
      "contactedListings": "kontaktierte Anzeigen",
      "nationalReached": "Nationaler Schwellenwert erreicht",
      "localBlocked": "Lokales GEO bleibt gesperrt",
      "twoSnapshots": "Vor der Aktivierung von Routen sind weiterhin zwei aufeinanderfolgende wöchentliche Snapshots erforderlich.",
      "blockedReason": "Bundesstaat- oder Stadtseiten werden erst geöffnet, wenn genuine Angebot, Vielfalt, Standort und zwei aufeinanderfolgende Wochen die Kriterien erfüllen.",
      "routesOpen": "Offene Standort-Routen",
      "qualifiedCategories": "qualifizierte Kategorien",
      "stateCategories": "Bundesstaat/Kategorie",
      "cityCategories": "Stadt/Kategorie",
      "historyTitle": "Snapshot-Verlauf",
      "historyDesc": "Bis zu 12 Zeiträume, nur aggregierte Daten.",
      "period": "Zeitraum",
      "genuineActive": "Aktive genuine",
      "users": "Benutzer",
      "firstPublications": "Erste Veröffentlichungen",
      "indexables": "Indexierbar",
      "external": "Extern",
      "privacy": "Datenschutz",
      "complete": "Vollständig",
      "partial": "Teilweise",
      "review": "Prüfen"
    },
    "marketing": {
      "headerDesc": "Eine Konsole für Kampagnen, Messung, Budgets und plattformübergreifende Automatisierung.",
      "backAdmin": "Zurück zum Admin",
      "authMissing": "Keine aktive Admin-Sitzung vorhanden.",
      "metaStatusError": "Meta Ads konnte nicht geprüft werden.",
      "campaignsLoadError": "Meta-Kampagnen konnten nicht geladen werden.",
      "loadError": "Fehler beim Laden von Meta Ads.",
      "metaRejected": "Meta hat den Vorgang abgelehnt.",
      "updateError": "Die Kampagne konnte nicht aktualisiert werden.",
      "confirmToggle": "{action} für Kampagne „{name}“ bestätigen?",
      "activateVerb": "Aktivierung",
      "pauseVerb": "Pause",
      "activated": "Kampagne aktiviert.",
      "paused": "Kampagne pausiert.",
      "budgetMin": "Das Tagesbudget muss mindestens 1 MXN betragen.",
      "confirmBudget": "Tagesbudget von „{name}“ auf {amount} ändern?",
      "budgetUpdated": "Budget auf {amount} aktualisiert.",
      "missingCredentials": "Server-Zugangsdaten fehlen",
      "spend7": "Ausgaben · 7 Tage",
      "registrations": "Registrierungen",
      "campaigns": "Kampagnen",
      "purchases": "Käufe",
      "metaAttribution": "Meta-Attribution",
      "connectionsTitle": "Plattformverbindungen",
      "adaptersDesc": "Adapter teilen ein gemeinsames internes Kampagnen- und Metrikmodell.",
      "campaignsTitle": "Meta-Kampagnen",
      "campaignsDesc": "Kampagnenergebnisse und Steuerung. Änderungen müssen bestätigt werden.",
      "campaign": "Kampagne",
      "dailyBudget": "Tagesbudget",
      "spend": "Ausgaben",
      "actions": "Aktionen",
      "adSetBudget": "Anzeigengruppenbudget",
      "noCampaigns": "Keine Kampagnen verfügbar oder Meta ist noch nicht eingerichtet.",
      "moduleSuffix": "Dieses Modul nutzt dasselbe interne Kampagnen- und Metrikmodell.",
      "ready": "Bereit",
      "attention": "Achtung",
      "planned": "Geplant",
      "sections": {
        "dashboard": {
          "label": "Dashboard",
          "description": "Ergebnisse aller Plattformen."
        },
        "connections": {
          "label": "Verbindungen",
          "description": "Meta, TikTok, Google, X und Microsoft."
        },
        "campaigns": {
          "label": "Kampagnen",
          "description": "Kampagnen, Anzeigengruppen und Anzeigen."
        },
        "creatives": {
          "label": "Werbemittel",
          "description": "Bilder, Videos, Texte und Varianten."
        },
        "audiences": {
          "label": "Zielgruppen",
          "description": "Synchronisierte Segmente und Zielgruppen."
        },
        "tracking": {
          "label": "Pixel",
          "description": "Pixel, CAPI, Ereignisse und UTM."
        },
        "budgets": {
          "label": "Budgets",
          "description": "Budgets und Verteilungsregeln."
        },
        "tests": {
          "label": "A/B-Tests",
          "description": "Tests zwischen Werbemitteln und Zielgruppen."
        },
        "automations": {
          "label": "Automatisierungen",
          "description": "Pausen, Skalierung und automatische Hinweise."
        },
        "ai": {
          "label": "AI-Analyst",
          "description": "Tägliche Analyse und Empfehlungen."
        }
      },
      "platformDetails": [
        "Werbekonto erneut verbinden",
        "API-Adapter geplant",
        "Produktfeed geplant",
        "Messadapter geplant",
        "API-Zugriff erforderlich",
        "API-Adapter geplant"
      ]
    }
  },
  "it": {
    "seo": {
      "loadError": "Impossibile caricare il rapporto SEO/GEO.",
      "noPeriod": "Nessun periodo",
      "noSnapshots": "Non ci sono ancora snapshot settimanali.",
      "schedulerNote": "Lo scheduler genera il rapporto il lunedì alle 08:15.",
      "weeklyTitle": "SEO / GEO settimanale",
      "privacyOk": "Privacy verificata",
      "privacyReview": "Verifica privacy",
      "generated": "generato",
      "noDate": "senza data",
      "refresh": "Aggiorna",
      "connected": "Connesso",
      "temporaryError": "Errore temporaneo",
      "notConfigured": "Non configurato",
      "readReady": "Accesso in lettura pronto",
      "readMissing": "Manca l’accesso esterno in lettura",
      "activeGenuine": "Offerta genuine attiva",
      "sellers": "venditori",
      "readyConfirm": "Pronti da confermare",
      "sellerAction": "Richiede azione del venditore",
      "indexableGenuine": "URL genuine indicizzabili",
      "noindexRefs": "riferimenti noindex",
      "sourcePages": "Pagine sorgente",
      "factualPages": "Pagine fattuali ufficiali",
      "newUsers": "Nuovi utenti",
      "verified": "verificati",
      "firstPublishers": "Primi inserzionisti",
      "genuineViews": "Visualizzazioni genuine",
      "contacts": "contatti",
      "contactConversion": "Conversione contatto",
      "contactedListings": "annunci contattati",
      "nationalReached": "Soglia nazionale raggiunta",
      "localBlocked": "Il GEO locale resta bloccato",
      "twoSnapshots": "Sono ancora necessari due snapshot settimanali consecutivi prima di abilitare le rotte.",
      "blockedReason": "Le pagine di stato o città non verranno aperte finché offerta genuine, diversità, posizione e due settimane consecutive non soddisfano i criteri.",
      "routesOpen": "Rotte di posizione aperte",
      "qualifiedCategories": "categorie qualificate",
      "stateCategories": "stato/categoria",
      "cityCategories": "città/categoria",
      "historyTitle": "Cronologia snapshot",
      "historyDesc": "Fino a 12 periodi, solo dati aggregati.",
      "period": "Periodo",
      "genuineActive": "Genuine attivi",
      "users": "Utenti",
      "firstPublications": "Prime pubblicazioni",
      "indexables": "Indicizzabili",
      "external": "Esterno",
      "privacy": "Privacy",
      "complete": "Completo",
      "partial": "Parziale",
      "review": "Verifica"
    },
    "marketing": {
      "headerDesc": "Un’unica console per campagne, misurazione, budget e automazione multipiattaforma.",
      "backAdmin": "Torna all’admin",
      "authMissing": "Non c’è una sessione amministratore attiva.",
      "metaStatusError": "Impossibile verificare Meta Ads.",
      "campaignsLoadError": "Impossibile caricare le campagne Meta.",
      "loadError": "Errore durante il caricamento di Meta Ads.",
      "metaRejected": "Meta ha rifiutato l’operazione.",
      "updateError": "Impossibile aggiornare la campagna.",
      "confirmToggle": "Confermare {action} per la campagna “{name}”?",
      "activateVerb": "l’attivazione",
      "pauseVerb": "la pausa",
      "activated": "Campagna attivata.",
      "paused": "Campagna in pausa.",
      "budgetMin": "Il budget giornaliero deve essere almeno 1 MXN.",
      "confirmBudget": "Cambiare il budget giornaliero di “{name}” a {amount}?",
      "budgetUpdated": "Budget aggiornato a {amount}.",
      "missingCredentials": "Mancano le credenziali del server",
      "spend7": "Spesa · 7 giorni",
      "registrations": "Registrazioni",
      "campaigns": "campagne",
      "purchases": "Acquisti",
      "metaAttribution": "Attribuzione Meta",
      "connectionsTitle": "Connessioni alle piattaforme",
      "adaptersDesc": "Gli adapter condividono un unico modello interno di campagne e metriche.",
      "campaignsTitle": "Campagne Meta",
      "campaignsDesc": "Risultati e controllo delle campagne. Le modifiche richiedono conferma.",
      "campaign": "Campagna",
      "dailyBudget": "Budget giornaliero",
      "spend": "Spesa",
      "actions": "Azioni",
      "adSetBudget": "Budget del gruppo",
      "noCampaigns": "Nessuna campagna disponibile oppure Meta non è ancora configurato.",
      "moduleSuffix": "Questo modulo userà lo stesso modello interno di campagne e metriche.",
      "ready": "Pronto",
      "attention": "Attenzione",
      "planned": "Pianificato",
      "sections": {
        "dashboard": {
          "label": "Dashboard",
          "description": "Risultati di tutte le piattaforme."
        },
        "connections": {
          "label": "Connessioni",
          "description": "Meta, TikTok, Google, X e Microsoft."
        },
        "campaigns": {
          "label": "Campagne",
          "description": "Campagne, gruppi e annunci."
        },
        "creatives": {
          "label": "Creatività",
          "description": "Immagini, video, testi e varianti."
        },
        "audiences": {
          "label": "Pubblici",
          "description": "Segmenti e pubblici sincronizzati."
        },
        "tracking": {
          "label": "Pixel",
          "description": "Pixel, CAPI, eventi e UTM."
        },
        "budgets": {
          "label": "Budget",
          "description": "Budget e regole di distribuzione."
        },
        "tests": {
          "label": "Test A/B",
          "description": "Test tra creatività e pubblici."
        },
        "automations": {
          "label": "Automazioni",
          "description": "Pause, scalabilità e avvisi automatici."
        },
        "ai": {
          "label": "Analista AI",
          "description": "Analisi giornaliera e raccomandazioni."
        }
      },
      "platformDetails": [
        "Ricollega account pubblicitario",
        "Adapter API pianificato",
        "Feed prodotti pianificato",
        "Adapter di misurazione pianificato",
        "Accesso API richiesto",
        "Adapter API pianificato"
      ]
    }
  },
  "ar": {
    "seo": {
      "loadError": "تعذر تحميل تقرير SEO/GEO.",
      "noPeriod": "لا توجد فترة",
      "noSnapshots": "لا توجد لقطات أسبوعية بعد.",
      "schedulerNote": "ينشئ المجدول التقرير يوم الاثنين الساعة 08:15.",
      "weeklyTitle": "SEO / GEO أسبوعي",
      "privacyOk": "تم التحقق من الخصوصية",
      "privacyReview": "مراجعة الخصوصية",
      "generated": "تم الإنشاء",
      "noDate": "بدون تاريخ",
      "refresh": "تحديث",
      "connected": "متصل",
      "temporaryError": "خطأ مؤقت",
      "notConfigured": "غير مهيأ",
      "readReady": "وصول القراءة جاهز",
      "readMissing": "وصول القراءة الخارجي مفقود",
      "activeGenuine": "عرض genuine نشط",
      "sellers": "بائعون",
      "readyConfirm": "جاهز للتأكيد",
      "sellerAction": "يتطلب إجراء من البائع",
      "indexableGenuine": "روابط genuine قابلة للفهرسة",
      "noindexRefs": "مراجع noindex",
      "sourcePages": "صفحات المصدر",
      "factualPages": "صفحات معلومات رسمية",
      "newUsers": "مستخدمون جدد",
      "verified": "تم التحقق",
      "firstPublishers": "أول ناشرين",
      "genuineViews": "مشاهدات genuine",
      "contacts": "جهات اتصال",
      "contactConversion": "تحويل الاتصال",
      "contactedListings": "إعلانات تم التواصل بشأنها",
      "nationalReached": "تم بلوغ الحد الوطني",
      "localBlocked": "GEO المحلي ما زال محظورًا",
      "twoSnapshots": "لا تزال هناك حاجة إلى لقطتين أسبوعيتين متتاليتين قبل تفعيل المسارات.",
      "blockedReason": "لن تُفتح صفحات الولاية أو المدينة حتى يتحقق عرض genuine والتنوع والموقع وأسبوعان متتاليان.",
      "routesOpen": "مسارات الموقع المفتوحة",
      "qualifiedCategories": "فئات مؤهلة",
      "stateCategories": "ولاية/فئة",
      "cityCategories": "مدينة/فئة",
      "historyTitle": "سجل اللقطات",
      "historyDesc": "حتى 12 فترة، بيانات مجمعة فقط.",
      "period": "الفترة",
      "genuineActive": "Genuine نشط",
      "users": "المستخدمون",
      "firstPublications": "أول منشورات",
      "indexables": "قابل للفهرسة",
      "external": "خارجي",
      "privacy": "الخصوصية",
      "complete": "كامل",
      "partial": "جزئي",
      "review": "مراجعة"
    },
    "marketing": {
      "headerDesc": "وحدة تحكم واحدة للحملات والقياس والميزانيات والأتمتة عبر المنصات.",
      "backAdmin": "العودة إلى الإدارة",
      "authMissing": "لا توجد جلسة إدارة نشطة.",
      "metaStatusError": "تعذر التحقق من Meta Ads.",
      "campaignsLoadError": "تعذر تحميل حملات Meta.",
      "loadError": "خطأ في تحميل Meta Ads.",
      "metaRejected": "رفضت Meta العملية.",
      "updateError": "تعذر تحديث الحملة.",
      "confirmToggle": "تأكيد {action} للحملة «{name}»؟",
      "activateVerb": "التفعيل",
      "pauseVerb": "الإيقاف المؤقت",
      "activated": "تم تفعيل الحملة.",
      "paused": "تم إيقاف الحملة مؤقتًا.",
      "budgetMin": "يجب ألا تقل الميزانية اليومية عن 1 MXN.",
      "confirmBudget": "تغيير الميزانية اليومية للحملة «{name}» إلى {amount}؟",
      "budgetUpdated": "تم تحديث الميزانية إلى {amount}.",
      "missingCredentials": "بيانات اعتماد الخادم مفقودة",
      "spend7": "الإنفاق · 7 أيام",
      "registrations": "التسجيلات",
      "campaigns": "حملات",
      "purchases": "المشتريات",
      "metaAttribution": "إسناد Meta",
      "connectionsTitle": "اتصالات المنصات",
      "adaptersDesc": "تشترك المحولات في نموذج داخلي موحد للحملات والمقاييس.",
      "campaignsTitle": "حملات Meta",
      "campaignsDesc": "نتائج الحملات والتحكم فيها. تتطلب التغييرات تأكيدًا.",
      "campaign": "الحملة",
      "dailyBudget": "الميزانية اليومية",
      "spend": "الإنفاق",
      "actions": "الإجراءات",
      "adSetBudget": "ميزانية مجموعة الإعلانات",
      "noCampaigns": "لا توجد حملات متاحة أو لم يتم إعداد Meta بعد.",
      "moduleSuffix": "ستستخدم هذه الوحدة نفس النموذج الداخلي للحملات والمقاييس.",
      "ready": "جاهز",
      "attention": "يتطلب الانتباه",
      "planned": "مخطط",
      "sections": {
        "dashboard": {
          "label": "لوحة التحكم",
          "description": "نتائج جميع المنصات."
        },
        "connections": {
          "label": "الاتصالات",
          "description": "Meta وTikTok وGoogle وX وMicrosoft."
        },
        "campaigns": {
          "label": "الحملات",
          "description": "الحملات ومجموعات الإعلانات والإعلانات."
        },
        "creatives": {
          "label": "المواد الإعلانية",
          "description": "الصور والفيديو والنصوص والنسخ."
        },
        "audiences": {
          "label": "الجماهير",
          "description": "شرائح وجماهير متزامنة."
        },
        "tracking": {
          "label": "البكسلات",
          "description": "Pixels وCAPI والأحداث وUTM."
        },
        "budgets": {
          "label": "الميزانيات",
          "description": "الميزانيات وقواعد التوزيع."
        },
        "tests": {
          "label": "اختبارات A/B",
          "description": "اختبارات بين المواد والجماهير."
        },
        "automations": {
          "label": "الأتمتة",
          "description": "الإيقاف والتوسيع والتنبيهات التلقائية."
        },
        "ai": {
          "label": "محلل AI",
          "description": "تحليل يومي وتوصيات."
        }
      },
      "platformDetails": [
        "إعادة ربط حساب المعلن",
        "محول API مخطط",
        "خلاصة المنتجات مخططة",
        "محول القياس مخطط",
        "يتطلب وصول API",
        "محول API مخطط"
      ]
    }
  },
  "ru": {
    "seo": {
      "loadError": "Не удалось загрузить отчёт SEO/GEO.",
      "noPeriod": "Нет периода",
      "noSnapshots": "Еженедельных снимков пока нет.",
      "schedulerNote": "Планировщик создаёт отчёт по понедельникам в 08:15.",
      "weeklyTitle": "Еженедельный SEO / GEO",
      "privacyOk": "Конфиденциальность проверена",
      "privacyReview": "Проверить конфиденциальность",
      "generated": "создан",
      "noDate": "без даты",
      "refresh": "Обновить",
      "connected": "Подключено",
      "temporaryError": "Временная ошибка",
      "notConfigured": "Не настроено",
      "readReady": "Доступ на чтение готов",
      "readMissing": "Нет внешнего доступа на чтение",
      "activeGenuine": "Активное genuine-предложение",
      "sellers": "продавцов",
      "readyConfirm": "Готовы к подтверждению",
      "sellerAction": "Нужно действие продавца",
      "indexableGenuine": "Индексируемые genuine URL",
      "noindexRefs": "noindex-ссылок",
      "sourcePages": "Страницы-источники",
      "factualPages": "Официальные фактологические страницы",
      "newUsers": "Новые пользователи",
      "verified": "подтверждены",
      "firstPublishers": "Первые публикаторы",
      "genuineViews": "Genuine-просмотры",
      "contacts": "контактов",
      "contactConversion": "Конверсия в контакт",
      "contactedListings": "объявлений с контактом",
      "nationalReached": "Национальный порог достигнут",
      "localBlocked": "Локальный GEO пока заблокирован",
      "twoSnapshots": "Перед включением маршрутов нужны ещё два последовательных еженедельных снимка.",
      "blockedReason": "Страницы штата или города не откроются, пока genuine-предложение, разнообразие, география и две последовательные недели не достигнут порога.",
      "routesOpen": "Открытые location-маршруты",
      "qualifiedCategories": "подходящих категорий",
      "stateCategories": "штат/категория",
      "cityCategories": "город/категория",
      "historyTitle": "История снимков",
      "historyDesc": "До 12 периодов, только агрегированные данные.",
      "period": "Период",
      "genuineActive": "Активные genuine",
      "users": "Пользователи",
      "firstPublications": "Первые публикации",
      "indexables": "Индексируемые",
      "external": "Внешние данные",
      "privacy": "Конфиденциальность",
      "complete": "Полностью",
      "partial": "Частично",
      "review": "Проверить"
    },
    "marketing": {
      "headerDesc": "Единая консоль для кампаний, измерений, бюджетов и автоматизации на разных платформах.",
      "backAdmin": "Назад в админку",
      "authMissing": "Нет активной административной сессии.",
      "metaStatusError": "Не удалось проверить Meta Ads.",
      "campaignsLoadError": "Не удалось загрузить кампании Meta.",
      "loadError": "Ошибка загрузки Meta Ads.",
      "metaRejected": "Meta отклонила операцию.",
      "updateError": "Не удалось обновить кампанию.",
      "confirmToggle": "Подтвердить {action} кампании «{name}»?",
      "activateVerb": "активацию",
      "pauseVerb": "приостановку",
      "activated": "Кампания активирована.",
      "paused": "Кампания приостановлена.",
      "budgetMin": "Дневной бюджет должен быть не меньше 1 MXN.",
      "confirmBudget": "Изменить дневной бюджет «{name}» на {amount}?",
      "budgetUpdated": "Бюджет обновлён до {amount}.",
      "missingCredentials": "Не заданы серверные учётные данные",
      "spend7": "Расход · 7 дней",
      "registrations": "Регистрации",
      "campaigns": "кампаний",
      "purchases": "Покупки",
      "metaAttribution": "Атрибуция Meta",
      "connectionsTitle": "Подключения платформ",
      "adaptersDesc": "Адаптеры используют единую внутреннюю модель кампаний и метрик.",
      "campaignsTitle": "Кампании Meta",
      "campaignsDesc": "Результаты и управление кампаниями. Изменения требуют подтверждения.",
      "campaign": "Кампания",
      "dailyBudget": "Дневной бюджет",
      "spend": "Расход",
      "actions": "Действия",
      "adSetBudget": "Бюджет группы объявлений",
      "noCampaigns": "Нет доступных кампаний или Meta ещё не настроена.",
      "moduleSuffix": "Этот модуль будет использовать ту же внутреннюю модель кампаний и метрик.",
      "ready": "Готово",
      "attention": "Требует внимания",
      "planned": "Запланировано",
      "sections": {
        "dashboard": {
          "label": "Панель",
          "description": "Результаты со всех платформ."
        },
        "connections": {
          "label": "Подключения",
          "description": "Meta, TikTok, Google, X и Microsoft."
        },
        "campaigns": {
          "label": "Кампании",
          "description": "Кампании, группы и объявления."
        },
        "creatives": {
          "label": "Креативы",
          "description": "Изображения, видео, тексты и варианты."
        },
        "audiences": {
          "label": "Аудитории",
          "description": "Синхронизированные сегменты и аудитории."
        },
        "tracking": {
          "label": "Пиксели",
          "description": "Пиксели, CAPI, события и UTM."
        },
        "budgets": {
          "label": "Бюджеты",
          "description": "Бюджеты и правила распределения."
        },
        "tests": {
          "label": "A/B-тесты",
          "description": "Тесты креативов и аудиторий."
        },
        "automations": {
          "label": "Автоматизации",
          "description": "Паузы, масштабирование и автоматические оповещения."
        },
        "ai": {
          "label": "AI-аналитик",
          "description": "Ежедневный анализ и рекомендации."
        }
      },
      "platformDetails": [
        "Переподключить рекламный аккаунт",
        "API-адаптер запланирован",
        "Фид товаров запланирован",
        "Адаптер измерений запланирован",
        "Требуется доступ к API",
        "API-адаптер запланирован"
      ]
    }
  },
  "ja": {
    "seo": {
      "loadError": "SEO/GEOレポートを読み込めませんでした。",
      "noPeriod": "期間なし",
      "noSnapshots": "週間スナップショットはまだありません。",
      "schedulerNote": "スケジューラは毎週月曜日08:15にレポートを生成します。",
      "weeklyTitle": "週間 SEO / GEO",
      "privacyOk": "プライバシー確認済み",
      "privacyReview": "プライバシーを確認",
      "generated": "生成",
      "noDate": "日付なし",
      "refresh": "更新",
      "connected": "接続済み",
      "temporaryError": "一時的なエラー",
      "notConfigured": "未設定",
      "readReady": "読み取りアクセス準備済み",
      "readMissing": "外部読み取りアクセスがありません",
      "activeGenuine": "アクティブな genuine 供給",
      "sellers": "出品者",
      "readyConfirm": "確認準備済み",
      "sellerAction": "出品者の対応が必要",
      "indexableGenuine": "インデックス可能な genuine URL",
      "noindexRefs": "noindex参照",
      "sourcePages": "ソースページ",
      "factualPages": "公式ファクトページ",
      "newUsers": "新規ユーザー",
      "verified": "確認済み",
      "firstPublishers": "初回出品者",
      "genuineViews": "Genuine閲覧",
      "contacts": "連絡",
      "contactConversion": "連絡コンバージョン",
      "contactedListings": "連絡された広告",
      "nationalReached": "全国しきい値に到達",
      "localBlocked": "ローカルGEOは引き続きブロック中",
      "twoSnapshots": "ルートを有効にする前に、連続2週間のスナップショットが必要です。",
      "blockedReason": "genuine供給、多様性、位置情報、連続2週間の条件を満たすまで州・都市ページは公開しません。",
      "routesOpen": "公開中の位置ルート",
      "qualifiedCategories": "適格カテゴリ",
      "stateCategories": "州/カテゴリ",
      "cityCategories": "都市/カテゴリ",
      "historyTitle": "スナップショット履歴",
      "historyDesc": "最大12期間、集計データのみ。",
      "period": "期間",
      "genuineActive": "アクティブ genuine",
      "users": "ユーザー",
      "firstPublications": "初回公開",
      "indexables": "インデックス可能",
      "external": "外部",
      "privacy": "プライバシー",
      "complete": "完全",
      "partial": "一部",
      "review": "確認"
    },
    "marketing": {
      "headerDesc": "キャンペーン、計測、予算、複数プラットフォームの自動化を1つのコンソールで管理します。",
      "backAdmin": "管理画面へ戻る",
      "authMissing": "有効な管理者セッションがありません。",
      "metaStatusError": "Meta Adsの状態を確認できませんでした。",
      "campaignsLoadError": "Metaキャンペーンを読み込めませんでした。",
      "loadError": "Meta Adsの読み込み中にエラーが発生しました。",
      "metaRejected": "Metaが操作を拒否しました。",
      "updateError": "キャンペーンを更新できませんでした。",
      "confirmToggle": "キャンペーン「{name}」の{action}を確認しますか？",
      "activateVerb": "有効化",
      "pauseVerb": "一時停止",
      "activated": "キャンペーンを有効化しました。",
      "paused": "キャンペーンを一時停止しました。",
      "budgetMin": "1日の予算は1 MXN以上にしてください。",
      "confirmBudget": "「{name}」の1日予算を{amount}に変更しますか？",
      "budgetUpdated": "予算を{amount}に更新しました。",
      "missingCredentials": "サーバー認証情報がありません",
      "spend7": "支出 · 7日",
      "registrations": "登録",
      "campaigns": "キャンペーン",
      "purchases": "購入",
      "metaAttribution": "Metaアトリビューション",
      "connectionsTitle": "プラットフォーム接続",
      "adaptersDesc": "アダプターは共通の内部キャンペーン・指標モデルを使用します。",
      "campaignsTitle": "Metaキャンペーン",
      "campaignsDesc": "キャンペーンの結果と操作です。変更には確認が必要です。",
      "campaign": "キャンペーン",
      "dailyBudget": "1日予算",
      "spend": "支出",
      "actions": "操作",
      "adSetBudget": "広告セット予算",
      "noCampaigns": "利用可能なキャンペーンがないか、Metaがまだ設定されていません。",
      "moduleSuffix": "このモジュールは同じ内部キャンペーン・指標モデルを使用します。",
      "ready": "準備完了",
      "attention": "要確認",
      "planned": "予定",
      "sections": {
        "dashboard": {
          "label": "ダッシュボード",
          "description": "すべてのプラットフォームの結果。"
        },
        "connections": {
          "label": "接続",
          "description": "Meta、TikTok、Google、X、Microsoft。"
        },
        "campaigns": {
          "label": "キャンペーン",
          "description": "キャンペーン、広告セット、広告。"
        },
        "creatives": {
          "label": "クリエイティブ",
          "description": "画像、動画、テキスト、バリエーション。"
        },
        "audiences": {
          "label": "オーディエンス",
          "description": "同期されたセグメントとオーディエンス。"
        },
        "tracking": {
          "label": "ピクセル",
          "description": "ピクセル、CAPI、イベント、UTM。"
        },
        "budgets": {
          "label": "予算",
          "description": "予算と配分ルール。"
        },
        "tests": {
          "label": "A/Bテスト",
          "description": "クリエイティブとオーディエンスのテスト。"
        },
        "automations": {
          "label": "自動化",
          "description": "一時停止、拡張、自動アラート。"
        },
        "ai": {
          "label": "AIアナリスト",
          "description": "毎日の分析と推奨事項。"
        }
      },
      "platformDetails": [
        "広告アカウントを再接続",
        "APIアダプター予定",
        "商品フィード予定",
        "計測アダプター予定",
        "APIアクセスが必要",
        "APIアダプター予定"
      ]
    }
  }
});

export function getAdminOperationalCopy(language = 'es') {
  return COPY[normalizeLanguage(language)] || COPY.es;
}

export { COPY as ADMIN_OPERATIONAL_COPY };
