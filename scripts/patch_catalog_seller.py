from pathlib import Path
from textwrap import dedent


def block(value: str) -> str:
    return dedent(value).strip('\n')


path = Path('src/components/screens/AdDetailScreen.jsx')
content = path.read_text()

if '¿Vendes este producto o uno parecido?' not in content:
    start = content.find('            <div className="flex items-center gap-4 mb-6 cursor-pointer group"')
    end = content.find('            <div className="flex gap-3 mt-4">', start)
    if start < 0 or end < 0:
        raise RuntimeError('seller contact section boundaries not found')

    replacement = block("""
            {isCatalogFiller ? (
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
            ) : (
              <>
                <div className="flex items-center gap-4 mb-6 cursor-pointer group" onClick={() => handleViewCompany(ad.user)}>
                  {ad.user?.avatar_url ? (
                    <img src={getImageUrl(ad.user.avatar_url)} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 group-hover:border-[#84CC16] transition-colors" alt=""/>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:border-[#84CC16] transition-colors"><User size={24} className="text-slate-400" /></div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-[16px] group-hover:text-[#65A30D] transition-colors flex items-center gap-1.5">
                      {ad.user?.name || 'Usuario'}
                      {ad.user?.is_verified && <CheckCircle className="w-4 h-4 text-[#84CC16]" title="Vendedor Verificado" />}
                    </h3>
                    <p className="text-[13px] text-slate-500 mt-0.5">En Mercasto desde {new Date(ad.user?.created_at || ad.created_at).getFullYear()}</p>
                  </div>
                </div>

                {(!currentUser || !currentUser.id) ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 text-center">
                    <p className="text-[14px] font-semibold text-amber-800 dark:text-amber-300 leading-normal">
                      {t.register_to_contact || 'Regístrate para ver los datos de contacto del vendedor.'}
                    </p>
                    <button
                      onClick={() => navigate('/profile')}
                      className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      {t.login_register || 'Iniciar sesión / Registrarse'}
                    </button>
                  </div>
                ) : (
                  <ContactButton ad={ad} user={currentUser} t={t} className="w-full mb-3" />
                )}
              </>
            )}
    """)

    content = content[:start] + replacement + '\n\n' + content[end:]
    path.write_text(content)

print('Catalog seller action updated.')
