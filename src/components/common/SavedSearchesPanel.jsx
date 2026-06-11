import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Search, Filter, MapPin, Tag, DollarSign } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';

const localTranslations = {
  es: {
    saved_searches_title: 'Búsquedas Guardadas',
    load_failed: 'Error al cargar búsquedas guardadas',
    update_alerts_failed: 'Error al actualizar alertas',
    delete_confirm: '¿Eliminar esta búsqueda guardada?',
    delete_failed: 'Error al eliminar búsqueda',
    no_filters: 'Sin filtros',
    loading: 'Cargando búsquedas guardadas...',
    retry: 'Reintentar',
    no_saved_searches: 'No tienes búsquedas guardadas',
    no_saved_searches_desc: 'Guarda tus búsquedas favoritas para recibir notificaciones cuando haya nuevos resultados',
    tip: '💡 Consejo: Realiza una búsqueda y haz clic en "Guardar búsqueda"',
    new_results: 'nuevos',
    last_checked: 'Última verificación:',
    deactivate_alerts: 'Desactivar alertas',
    activate_alerts: 'Activar alertas',
    delete_search: 'Eliminar búsqueda',
    view_new: 'Ver {count} nuevos resultados'
  },
  en: {
    saved_searches_title: 'Saved Searches',
    load_failed: 'Error loading saved searches',
    update_alerts_failed: 'Error updating alerts',
    delete_confirm: 'Delete this saved search?',
    delete_failed: 'Error deleting search',
    no_filters: 'No filters',
    loading: 'Loading saved searches...',
    retry: 'Retry',
    no_saved_searches: 'You have no saved searches',
    no_saved_searches_desc: 'Save your favorite searches to receive notifications when there are new results',
    tip: '💡 Tip: Perform a search and click "Save search"',
    new_results: 'new',
    last_checked: 'Last checked:',
    deactivate_alerts: 'Deactivate alerts',
    activate_alerts: 'Activate alerts',
    delete_search: 'Delete search',
    view_new: 'View {count} new results'
  },
  pt: {
    saved_searches_title: 'Pesquisas Salvas',
    load_failed: 'Erro ao carregar pesquisas salvas',
    update_alerts_failed: 'Erro ao atualizar alertas',
    delete_confirm: 'Excluir esta pesquisa salva?',
    delete_failed: 'Erro ao excluir pesquisa',
    no_filters: 'Sem filtros',
    loading: 'Carregando pesquisas salvas...',
    retry: 'Tentar novamente',
    no_saved_searches: 'Você não tem pesquisas salvas',
    no_saved_searches_desc: 'Salve suas pesquisas favoritas para receber notificações quando houver novos resultados',
    tip: '💡 Dica: Faça uma pesquisa e clique em "Salvar pesquisa"',
    new_results: 'novos',
    last_checked: 'Última verificação:',
    deactivate_alerts: 'Desativar alertas',
    activate_alerts: 'Ativar alertas',
    delete_search: 'Excluir pesquisa',
    view_new: 'Ver {count} novos resultados'
  },
  ru: {
    saved_searches_title: 'Сохраненные поиски',
    load_failed: 'Ошибка при загрузке сохраненных поисков',
    update_alerts_failed: 'Ошибка при обновлении уведомлений',
    delete_confirm: 'Удалить этот сохраненный поиск?',
    delete_failed: 'Ошибка при удалении поиска',
    no_filters: 'Без фильтров',
    loading: 'Загрузка сохраненных поисков...',
    retry: 'Повторить',
    no_saved_searches: 'У вас нет сохраненных поисков',
    no_saved_searches_desc: 'Сохраняйте свои любимые поиски, чтобы получать уведомления о новых результатах',
    tip: '💡 Совет: Выполните поиск и нажмите "Сохранить поиск"',
    new_results: 'новых',
    last_checked: 'Последняя проверка:',
    deactivate_alerts: 'Отключить уведомления',
    activate_alerts: 'Включить уведомления',
    delete_search: 'Удалить поиск',
    view_new: 'Показать {count} новых результатов'
  },
  zh: {
    saved_searches_title: '保存的搜索',
    load_failed: '加载保存的搜索失败',
    update_alerts_failed: '更新通知失败',
    delete_confirm: '确定要删除此保存的搜索吗？',
    delete_failed: '删除搜索失败',
    no_filters: '无过滤条件',
    loading: '正在加载保存的搜索...',
    retry: '重试',
    no_saved_searches: '您还没有保存的搜索',
    no_saved_searches_desc: '保存您喜爱的搜索，以便在新结果出现时接收通知',
    tip: '💡 提示：进行一次搜索并点击“保存搜索”',
    new_results: '个新结果',
    last_checked: '最近检查时间：',
    deactivate_alerts: '关闭通知',
    activate_alerts: '开启通知',
    delete_search: '删除搜索',
    view_new: '查看 {count} 个新结果'
  },
  ko: {
    saved_searches_title: '저장된 검색',
    load_failed: '저장된 검색을 불러오는 중 오류가 발생했습니다',
    update_alerts_failed: '알림 업데이트 오류',
    delete_confirm: '이 저장된 검색을 삭제하시겠습니까?',
    delete_failed: '검색 삭제 오류',
    no_filters: '필터 없음',
    loading: '저장된 검색을 불러오는 중...',
    retry: '재시도',
    no_saved_searches: '저장된 검색이 없습니다',
    no_saved_searches_desc: '새로운 결과가 있을 때 알림을 받으려면 선호하는 검색을 저장하세요',
    tip: '💡 팁: 검색을 수행한 후 "검색 저장"을 클릭하세요',
    new_results: '개 신규',
    last_checked: '마지막 확인:',
    deactivate_alerts: '알림 비활성화',
    activate_alerts: '알림 활성화',
    delete_search: '검색 삭제',
    view_new: '신규 결과 {count}개 보기'
  },
  de: {
    saved_searches_title: 'Gespeicherte Suchen',
    load_failed: 'Fehler beim Laden der gespeicherten Suchen',
    update_alerts_failed: 'Fehler beim Aktualisieren der Benachrichtigungen',
    delete_confirm: 'Diese gespeicherte Suche löschen?',
    delete_failed: 'Fehler beim Löschen der Suche',
    no_filters: 'Keine Filter',
    loading: 'Gespeicherte Suchen werden geladen...',
    retry: 'Wiederholen',
    no_saved_searches: 'Sie haben keine gespeicherten Suchen',
    no_saved_searches_desc: 'Speichern Sie Ihre bevorzugten Suchen, um Benachrichtigungen bei neuen Ergebnissen zu erhalten',
    tip: '💡 Tipp: Führen Sie eine Suche aus und klicken Sie auf "Suche speichern"',
    new_results: 'neu',
    last_checked: 'Zuletzt geprüft:',
    deactivate_alerts: 'Benachrichtigungen deaktivieren',
    activate_alerts: 'Benachrichtigungen aktivieren',
    delete_search: 'Suche löschen',
    view_new: '{count} neue Ergebnisse anzeigen'
  },
  it: {
    saved_searches_title: 'Ricerche Salvate',
    load_failed: 'Errore durante il caricamento delle ricerche salvate',
    update_alerts_failed: 'Errore durante l\'aggiornamento dei dettagli',
    delete_confirm: 'Eliminare questa ricerca salvata?',
    delete_failed: 'Errore durante l\'eliminazione della ricerca',
    no_filters: 'Nessun filtro',
    loading: 'Caricamento delle ricerche salvate...',
    retry: 'Riprova',
    no_saved_searches: 'Non hai ricerche salvate',
    no_saved_searches_desc: 'Salva le tue ricerche preferite per ricevere notifiche quando ci sono nuovi risultati',
    tip: '💡 Suggerimento: Esegui una ricerca e fai clic su "Salva ricerca"',
    new_results: 'nuovi',
    last_checked: 'Ultimo controllo:',
    deactivate_alerts: 'Disattiva notifiche',
    activate_alerts: 'Attiva notifiche',
    delete_search: 'Elimina ricerca',
    view_new: 'Visualizza {count} nuovi risultati'
  },
  ar: {
    saved_searches_title: 'عمليات البحث المحفوظة',
    load_failed: 'خطأ في تحميل عمليات البحث المحفوظة',
    update_alerts_failed: 'خطأ في تحديث التنبيهات',
    delete_confirm: 'هل تريد حذف عملية البحث المحفوظة هذه؟',
    delete_failed: 'خطأ في حذف البحث',
    no_filters: 'بدون فلاتر',
    loading: 'جاري تحميل عمليات البحث المحفوظة...',
    retry: 'إعادة المحاولة',
    no_saved_searches: 'ليس لديك عمليات بحث محفوظة',
    no_saved_searches_desc: 'احفظ عمليات البحث المفضلة لديك لتلقي تنبيهات عند وجود نتائج جديدة',
    tip: '💡 نصيحة: قم بإجراء بحث وانقر فوق "حفظ البحث"',
    new_results: 'جديد',
    last_checked: 'آخر تحقق:',
    deactivate_alerts: 'تعطيل التنبيهات',
    activate_alerts: 'تفعيل التنبيهات',
    delete_search: 'حذف البحث',
    view_new: 'عرض {count} من النتائج الجديدة'
  },
  he: {
    saved_searches_title: 'חיפושים שמורים',
    load_failed: 'שגיאה בטעינת חיפושים שמורים',
    update_alerts_failed: 'שגיאה בעדכון התראות',
    delete_confirm: 'למחוק חיפוש שמור זה?',
    delete_failed: 'שגיאה במחיקת החיפוש',
    no_filters: 'ללא מסננים',
    loading: 'טוען חיפושים שמורים...',
    retry: 'נסה שוב',
    no_saved_searches: 'אין לך חיפושים שמורים',
    no_saved_searches_desc: 'שמור את החיפושים המועדפים עליך כדי לקבל התראות כשיש תוצאות חדשות',
    tip: '💡 טיפ: בצע חיפוש ולחץ על "שמור חיפוש"',
    new_results: 'חדשים',
    last_checked: 'בדיקה אחרונה:',
    deactivate_alerts: 'כבה התראות',
    activate_alerts: 'הפעל התראות',
    delete_search: 'מחק חיפוש',
    view_new: 'הצג {count} תוצאות חדשות'
  },
  yi: {
    saved_searches_title: 'געראטעוועט זוכן',
    load_failed: 'טעות ביים לאדן געראטעוועט זוכן',
    update_alerts_failed: 'טעות ביים דערהיינטיקן נאטיפיקאציעס',
    delete_confirm: 'אויסמעקן דעם געראטעוועט זוכן?',
    delete_failed: 'טעות ביים אויסמעקן זוכן',
    no_filters: 'אן פילטערס',
    loading: 'לאדנט געראטעוועט זוכן...',
    retry: 'פרובירט נאכאמאל',
    no_saved_searches: 'איר האט נישט קיין געראטעוועט זוכן',
    no_saved_searches_desc: 'ראטעוועט אייערע באליבטע זוכן צו באקומען נאטיפיקאציעס ווען עס זענען דא נייע רעזולטאטן',
    tip: '💡 עצה: טוט א זוך און דרוקט אויף "ראטעווען זוך"',
    new_results: 'נייע',
    last_checked: 'לעצטע קאָנטראָל:',
    deactivate_alerts: 'אויסלעשן נאטיפיקאציעס',
    activate_alerts: 'אנצינדן נאטיפיקאציעס',
    delete_search: 'אויסמעקן זוכן',
    view_new: 'זען {count} נייע רעזולטאטן'
  },
  ja: {
    saved_searches_title: '保存した検索',
    load_failed: '保存した検索の読み込みに失敗しました',
    update_alerts_failed: '通知の更新に失敗しました',
    delete_confirm: 'この保存した検索を削除しますか？',
    delete_failed: '検索の削除に失敗しました',
    no_filters: 'フィルターなし',
    loading: '保存した検索を読み込み中...',
    retry: '再試行',
    no_saved_searches: '保存した検索はありません',
    no_saved_searches_desc: 'お気に入りの検索を保存して、新しい結果がある時に通知を受け取りましょう',
    tip: '💡 ヒント：検索を実行し、「検索を保存」をクリックします',
    new_results: '件の新規',
    last_checked: '最終確認:',
    deactivate_alerts: '通知をオフにする',
    activate_alerts: '通知をオンにする',
    delete_search: '検索を削除',
    view_new: '{count} 件の新しい結果を見る'
  },
  fr: {
    saved_searches_title: 'Recherches enregistrées',
    load_failed: 'Erreur lors du chargement des recherches enregistrées',
    update_alerts_failed: 'Erreur lors de la mise à jour des alertes',
    delete_confirm: 'Supprimer cette recherche enregistrée ?',
    delete_failed: 'Erreur lors de la suppression de la recherche',
    no_filters: 'Sans filtres',
    loading: 'Chargement des recherches enregistrées...',
    retry: 'Réessayer',
    no_saved_searches: 'Vous n\'avez aucune recherche enregistrée',
    no_saved_searches_desc: 'Enregistrez vos recherches favorites pour recevoir des notifications en cas de nouveaux résultats',
    tip: '💡 Conseil : Effectuez une recherche et cliquez sur "Enregistrer la recherche"',
    new_results: 'nouveaux',
    last_checked: 'Dernière vérification :',
    deactivate_alerts: 'Désactiver les alertes',
    activate_alerts: 'Activer les alertes',
    delete_search: 'Supprimer la recherche',
    view_new: 'Voir {count} nouveaux résultats'
  }
};

const SavedSearchesPanel = ({ token: propToken, onSearchClick }) => {
  const { lang } = useUI();
  const t = localTranslations[lang] || localTranslations['es'];

  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://mercasto.com/api';
  const token = propToken || localStorage.getItem('auth_token') || localStorage.getItem('token');

  useEffect(() => {
    fetchSavedSearches();
  }, [token]);

  const fetchSavedSearches = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/user/saved-searches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(t.load_failed);

      const data = await response.json();
      setSearches(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAlerts = async (searchId, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE}/user/saved-searches/${searchId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ alerts_enabled: !currentStatus })
      });

      if (!response.ok) throw new Error(t.update_alerts_failed);

      const data = await response.json();
      setSearches(prev => prev.map(s => s.id === searchId ? data.data : s));
    } catch (err) {
      console.error('Error toggling alerts:', err);
      alert(t.update_alerts_failed);
    }
  };

  const deleteSearch = async (searchId) => {
    if (!confirm(t.delete_confirm)) return;

    try {
      const response = await fetch(`${API_BASE}/user/saved-searches/${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(t.delete_failed);

      setSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (err) {
      console.error('Error deleting search:', err);
      alert(t.delete_failed);
    }
  };

  const resetCount = async (searchId) => {
    try {
      const response = await fetch(`${API_BASE}/user/saved-searches/${searchId}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(t.reset_count_failed || 'Error resetting count');

      const data = await response.json();
      setSearches(prev => prev.map(s => s.id === searchId ? data.data : s));
    } catch (err) {
      console.error('Error resetting count:', err);
    }
  };

  const formatFilters = (filters) => {
    const parts = [];
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.category) parts.push(filters.category);
    if (filters.state) parts.push(filters.state);
    if (filters.city) parts.push(filters.city);
    if (filters.min_price || filters.max_price) {
      const priceRange = `$${filters.min_price || '0'} - $${filters.max_price || '∞'}`;
      parts.push(priceRange);
    }
    return parts.join(' • ') || t.no_filters;
  };

  const handleSearchClick = (search) => {
    if (onSearchClick) {
      onSearchClick(search.filters);
    }
    resetCount(search.id);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchSavedSearches}
          className="mt-2 text-blue-500 hover:text-blue-600"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="p-8 text-center text-sm">
        <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t.no_saved_searches}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {t.no_saved_searches_desc}
        </p>
        <div className="text-sm text-gray-400 dark:text-gray-500">
          {t.tip}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          {t.saved_searches_title} ({searches.length})
        </h2>
      </div>

      <div className="space-y-3">
        {searches.map((search) => (
          <div
            key={search.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 cursor-pointer" onClick={() => handleSearchClick(search)}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                    {search.name}
                  </h3>
                  {search.new_results_count > 0 && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                      +{search.new_results_count} {t.new_results}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {formatFilters(search.filters)}
                </p>
                {search.last_checked_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {t.last_checked} {new Date(search.last_checked_at).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlerts(search.id, search.alerts_enabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    search.alerts_enabled
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={search.alerts_enabled ? t.deactivate_alerts : t.activate_alerts}
                >
                  {search.alerts_enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => deleteSearch(search.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t.delete_search}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {search.new_results_count > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleSearchClick(search)}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  {t.view_new.replace('{count}', search.new_results_count)}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedSearchesPanel;
