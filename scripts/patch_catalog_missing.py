from pathlib import Path

app_path = Path('src/App.jsx')
lines = app_path.read_text().splitlines()

if not any('const isCatalogFiller = Boolean(ad.is_catalog_filler);' in line for line in lines):
    index = next(i for i, line in enumerate(lines) if line.strip() == "const isPro = ad.user?.role === 'business';")
    leading = lines[index][:len(lines[index]) - len(lines[index].lstrip())]
    lines.insert(index + 1, leading + 'const isCatalogFiller = Boolean(ad.is_catalog_filler);')

if not any('Catálogo Mercasto' in line for line in lines):
    start = next(i for i, line in enumerate(lines) if 'isDestacado &&' in line and 'Top seller' in line)
    end = next(i for i in range(start, len(lines)) if '!isDestacado && !isUrgente && !isHighlighted && isPro' in lines[i])
    leading = lines[start][:len(lines[start]) - len(lines[start].lstrip())]
    lines[start:end + 1] = [
        leading + '{isCatalogFiller && <span className="badge absolute top-2.5 left-2.5 bg-slate-900/90 text-white z-10">Catálogo Mercasto</span>}',
        leading + '{!isCatalogFiller && isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">Top seller</span>}',
        leading + '{!isCatalogFiller && !isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">Urgent</span>}',
        leading + '{!isCatalogFiller && !isDestacado && !isUrgente && isHighlighted && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">Resaltado</span>}',
        leading + '{!isCatalogFiller && !isDestacado && !isUrgente && !isHighlighted && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">PRO</span>}',
    ]

if not any('Vende uno similar' in line for line in lines):
    start = next(i for i, line in enumerate(lines) if line.strip() == "{ad.user?.role !== 'business' && (")
    end = next(i for i in range(start + 1, len(lines)) if lines[i].strip() == ')}')
    leading = lines[start][:len(lines[start]) - len(lines[start].lstrip())]
    lines[start:end + 1] = [
        leading + '{isCatalogFiller ? (',
        leading + '  <button',
        leading + '    className="w-full mt-3 btn-md bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] hover:text-white"',
        leading + '    onClick={(e) => {',
        leading + '      e.stopPropagation();',
        leading + "      navigate(user ? '/post' : '/vendedores', { state: { category: ad.category } });",
        leading + '    }}',
        leading + '  >',
        leading + '    Vende uno similar',
        leading + '  </button>',
        leading + ") : ad.user?.role !== 'business' && (",
        leading + '  <button className="w-full mt-3 btn-md bg-[#0F172A] dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700" onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}>Contact</button>',
        leading + ')}',
    ]

app_path.write_text('\n'.join(lines) + '\n')

controller_path = Path('backend/app/Http/Controllers/Api/AdController.php')
controller = controller_path.read_text()
if "orderBy('ads.is_catalog_filler', 'asc')" not in controller:
    anchor = '        // Сортировка (Спецификация: по дате, цене, популярности)'
    if anchor not in controller:
        raise RuntimeError('AdController sort anchor not found')
    insertion = """        // Настоящие пользовательские объявления всегда выше витринных ссылок каталога.\n        // Для витрины конкретного продавца сохраняем его собственную сортировку без вмешательства.\n        if (! $request->filled('user_id')) {\n            $query->orderBy('ads.is_catalog_filler', 'asc');\n        }\n\n"""
    controller_path.write_text(controller.replace(anchor, insertion + anchor, 1))

print('Missing catalog card and ordering changes applied.')
