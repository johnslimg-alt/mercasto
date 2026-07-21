from pathlib import Path
from textwrap import dedent


def block(value: str) -> str:
    return dedent(value).strip('\n')


path = Path('scripts/check-recovery-guards.mjs')
content = path.read_text()

if 'detail pages must never synthesize ratings from an ad id' not in content:
    anchor = """assertNotContains(
  '.github/workflows/emergency-container-frontend-patch.yml',"""
    if anchor not in content:
        raise RuntimeError('catalog guard insertion anchor not found')

    checks = block("""
        assertNotContains(
          'src/components/screens/AdDetailScreen.jsx',
          '4 + (((Number(ad.id) || 1) % 10) / 10)',
          'detail pages must never synthesize ratings from an ad id'
        );

        assertNotContains(
          'src/components/screens/AdDetailScreen.jsx',
          'Comprador verificado',
          'detail pages must never display canned buyer testimonials'
        );

        assertNotContains(
          'src/components/screens/AdDetailScreen.jsx',
          'Usuario Mercasto',
          'detail pages must never display canned user testimonials'
        );

        assertContains(
          'src/App.jsx',
          'Catálogo Mercasto',
          'catalog references are visibly distinguished on result cards'
        );

        assertContains(
          'src/components/screens/AdDetailScreen.jsx',
          'Referencia de catálogo Mercasto',
          'catalog detail pages disclose that availability and seller must be confirmed'
        );

        assertContains(
          'backend/app/Http/Controllers/Api/AdController.php',
          "orderBy('ads.is_catalog_filler', 'asc')",
          'real user listings rank ahead of catalog references'
        );

    """)
    content = content.replace(anchor, checks + anchor, 1)
    path.write_text(content)

print('Catalog integrity guards updated.')
