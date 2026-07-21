from pathlib import Path
from textwrap import dedent, indent
import re


def block(value: str) -> str:
    return dedent(value).strip('\n')


path = Path('src/components/screens/AdDetailScreen.jsx')
content = path.read_text()

if 'hasReviews: rating > 0 && count > 0' not in content:
    pattern = r'const getAdRatingStats = \(ad = \{\}\) => \{.*?\n\};\n\nfunction RatingStars'
    replacement = block("""
        const getAdRatingStats = (ad = {}) => {
          const rawRating = Number(ad.rating_average ?? ad.average_rating ?? ad.rating ?? 0);
          const rawCount = Number(ad.reviews_count ?? ad.comments_count ?? ad.review_count ?? 0);
          const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
          const rating = count > 0 && Number.isFinite(rawRating) && rawRating > 0
            ? Math.min(5, Math.max(1, rawRating))
            : 0;
          return { rating, count, hasReviews: rating > 0 && count > 0 };
        };

        function RatingStars
    """)
    content, count = re.subn(pattern, lambda _: replacement, content, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError('rating calculation anchor not found')

old_flags = block("""
  const isOwner = currentUser && currentUser.id === ad.user_id;
  const isFav = favoriteIds.includes(ad.id);
""")
new_flags = block("""
  const isOwner = currentUser && currentUser.id === ad.user_id;
  const isCatalogFiller = Boolean(ad.is_catalog_filler);
  const isFav = favoriteIds.includes(ad.id);
""")
if new_flags not in content:
    if old_flags not in content:
        raise RuntimeError('detail catalog flag anchor not found')
    content = content.replace(old_flags, new_flags, 1)

if 'const commentPreview' in content:
    content, count = re.subn(
        r"  const ratingStats = getAdRatingStats\(ad\);\n  const commentPreview = \[.*?\n  \]\.slice\(0, Math\.min\(2, ratingStats\.count\)\);",
        '  const ratingStats = getAdRatingStats(ad);',
        content,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError('testimonial preview anchor not found')

if '{!isCatalogFiller && (' not in content:
    start = content.find('      <script type="application/ld+json"')
    end = content.find('      <div className="flex items-center justify-between mb-6">', start)
    if start < 0 or end < 0:
        raise RuntimeError('structured data boundaries not found')
    schema = content[start:end].strip('\n')
    content = content[:start] + '      {!isCatalogFiller && (\n' + indent(schema, '  ') + '\n      )}\n\n' + content[end:]

if 'data-catalog-reference' not in content:
    title_line = '            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">{localizedText(ad.title, lang)}</h1>'
    if title_line not in content:
        raise RuntimeError('detail title anchor not found')
    disclosure = block("""
            {isCatalogFiller && (
              <div className="mb-5 rounded-2xl border border-lime-300 bg-lime-50 p-4 text-slate-800 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-slate-100" data-catalog-reference>
                <div className="text-[14px] font-black">Referencia de catálogo Mercasto</div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Este producto se muestra como referencia. La disponibilidad, el precio y el vendedor deben confirmarse en una publicación real.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(currentUser ? '/post' : '/vendedores', { state: { category: ad.category } })}
                  className="mt-3 inline-flex items-center rounded-xl bg-[#84CC16] px-4 py-2 text-[13px] font-bold text-slate-950 transition-colors hover:bg-[#65A30D] hover:text-white"
                >
                  Publicar uno similar
                </button>
              </div>
            )}
    """)
    content = content.replace(title_line, title_line + '\n' + disclosure, 1)

if 'ratingStats.hasReviews && !isCatalogFiller' not in content:
    pattern = (
        r'^            <div className="mb-5 flex flex-wrap items-center gap-2 text-\[13px\] font-semibold text-slate-600 dark:text-slate-300">\n'
        r'.*?^            </div>'
    )
    replacement = block("""
            {ratingStats.hasReviews && !isCatalogFiller && (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                <RatingStars rating={ratingStats.rating} />
                <span className="text-slate-900 dark:text-white">{ratingStats.rating.toFixed(1)}</span>
                <span className="text-slate-400">({ratingStats.count} comentarios)</span>
              </div>
            )}
    """)
    content, count = re.subn(pattern, lambda _: replacement, content, count=1, flags=re.S | re.M)
    if count != 1:
        raise RuntimeError('detail rating row anchor not found')

calendar = '              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl"><Calendar size={16}/> {new Date(ad.created_at).toLocaleDateString()}</span>'
calendar_guarded = '              {!isCatalogFiller && <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl"><Calendar size={16}/> {new Date(ad.created_at).toLocaleDateString()}</span>}'
if calendar_guarded not in content:
    if calendar not in content:
        raise RuntimeError('detail date metadata anchor not found')
    content = content.replace(calendar, calendar_guarded, 1)

views = '              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl"><BarChart3 size={16}/> {ad.views || 0} vistas</span>'
views_guarded = '              {!isCatalogFiller && <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl"><BarChart3 size={16}/> {ad.views || 0} vistas</span>}'
if views_guarded not in content:
    if views not in content:
        raise RuntimeError('detail view metadata anchor not found')
    content = content.replace(views, views_guarded, 1)

if 'Comprador verificado' in content or 'Usuario Mercasto' in content:
    start = content.find('            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">')
    end = content.find('            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-100">', start)
    if start < 0 or end < 0:
        raise RuntimeError('testimonial section boundaries not found')
    content = content[:start] + content[end:]

path.write_text(content)
print('Final catalog detail integrity patch applied.')
