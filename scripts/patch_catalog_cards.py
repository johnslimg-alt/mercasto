from pathlib import Path
from textwrap import dedent
import re


def block(value: str) -> str:
    return dedent(value).strip('\n')


app_path = Path('src/App.jsx')
app = app_path.read_text()

old_flags = block("""
    const isPro = ad.user?.role === 'business';
    const isFav = favoriteIds.includes(ad.id);
""")
new_flags = block("""
    const isPro = ad.user?.role === 'business';
    const isCatalogFiller = Boolean(ad.is_catalog_filler);
    const isFav = favoriteIds.includes(ad.id);
""")
if new_flags not in app:
    if old_flags not in app:
        raise RuntimeError('catalog card flag anchor not found')
    app = app.replace(old_flags, new_flags, 1)

if 'Catálogo Mercasto' not in app:
    pattern = (
        r'^          \{isDestacado && .*?Top seller</span>\}\n'
        r'^          \{!isDestacado && isUrgente.*?Urgent</span>\}\n'
        r'^          \{!isDestacado && !isUrgente && isHighlighted.*?Resaltado</span>\}\n'
        r'^          \{!isDestacado && !isUrgente && !isHighlighted && isPro.*?PRO</span>\}$'
    )
    replacement = block("""
          {isCatalogFiller && <span className="badge absolute top-2.5 left-2.5 bg-slate-900/90 text-white z-10">Catálogo Mercasto</span>}
          {!isCatalogFiller && isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">Top seller</span>}
          {!isCatalogFiller && !isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">Urgent</span>}
          {!isCatalogFiller && !isDestacado && !isUrgente && isHighlighted && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">Resaltado</span>}
          {!isCatalogFiller && !isDestacado && !isUrgente && !isHighlighted && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">PRO</span>}
    """)
    app, count = re.subn(pattern, lambda _: replacement, app, count=1, flags=re.S | re.M)
    if count != 1:
        raise RuntimeError('catalog card badges anchor not found')

if 'Vende uno similar' not in app:
    pattern = r"^        \{ad\.user\?\.role !== 'business' && \(\n.*?^          \)\}"
    replacement = block("""
        {isCatalogFiller ? (
          <button
            className="w-full mt-3 btn-md bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              navigate(user ? '/post' : '/vendedores', { state: { category: ad.category } });
            }}
          >
            Vende uno similar
          </button>
        ) : ad.user?.role !== 'business' && (
          <button className="w-full mt-3 btn-md bg-[#0F172A] dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700" onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}>Contact</button>
        )}
    """)
    app, count = re.subn(pattern, lambda _: replacement, app, count=1, flags=re.S | re.M)
    if count != 1:
        raise RuntimeError('catalog card action anchor not found')

app_path.write_text(app)

controller_path = Path('backend/app/Http/Controllers/Api/AdController.php')
controller = controller_path.read_text()
if "orderBy('ads.is_catalog_filler', 'asc')" not in controller:
    anchor = '        // Сортировка (Спецификация: по дате, цене, популярности)'
    if anchor not in controller:
        raise RuntimeError('ad sorting anchor not found')
    priority = block("""
        // Настоящие пользовательские объявления всегда выше витринных ссылок каталога.
        // Для витрины конкретного продавца сохраняем его собственную сортировку без вмешательства.
        if (! $request->filled('user_id')) {
            $query->orderBy('ads.is_catalog_filler', 'asc');
        }

    """)
    controller = controller.replace(anchor, priority + anchor, 1)
    controller_path.write_text(controller)

print('Catalog cards and ordering updated.')
