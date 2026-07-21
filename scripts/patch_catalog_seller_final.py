from pathlib import Path
from textwrap import dedent, indent


def block(value: str) -> str:
    return dedent(value).strip('\n')


path = Path('src/components/screens/AdDetailScreen.jsx')
content = path.read_text()

if '¿Vendes este producto o uno parecido?' not in content:
    start = content.find('            <div className="flex items-center gap-4 mb-6 cursor-pointer group"')
    end = content.find('            <div className="flex gap-3 mt-4">', start)
    if start < 0 or end < 0:
        raise RuntimeError('seller section boundaries not found')

    existing_real_seller = content[start:end].strip('\n')
    catalog_action = block("""
        <div className="rounded-2xl border border-lime-300 bg-lime-50 p-4 text-center dark:border-lime-500/30 dark:bg-lime-500/10">
          <h3 className="text-[16px] font-black text-slate-900 dark:text-white">¿Vendes este producto o uno parecido?</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            Publica tus propias fotos, precio, ubicación y datos de contacto para recibir compradores reales.
          </p>
          <button
            type="button"
            onClick={() => navigate(currentUser ? '/post' : '/vendedores', { state: { category: ad.category } })}
            className="mt-4 w-full rounded-xl bg-[#84CC16] px-4 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-[#65A30D] hover:text-white"
          >
            Publicar gratis
          </button>
        </div>
    """)

    replacement = (
        '            {isCatalogFiller ? (\n'
        + indent(catalog_action, '              ')
        + '\n            ) : (\n'
        + '              <>\n'
        + indent(existing_real_seller, '  ')
        + '\n              </>\n'
        + '            )}\n\n'
    )
    content = content[:start] + replacement + content[end:]
    path.write_text(content)

print('Catalog seller action applied.')
