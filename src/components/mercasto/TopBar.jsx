import { Plus, Moon, Sun, MapPin, Heart, User, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLang, LANGS } from "@/lib/i18n";

const SUBNAV = [
  ["", "cat_all"], ["Productos", "cat_products"], ["Boletos", "cat_tickets"],
  ["Turismo", "cat_tourism"], ["Motor", "cat_motor"], ["Inmuebles", "cat_realestate"],
  ["Empleos", "cat_jobs"], ["Servicios", "cat_services"], ["Negocios", "cat_business"]
];

export default function TopBar({ favCount, favoritesOnly, onFavorites, dark, onToggleDark, onPost, onCategory }) {
  const { t, lang, setLang } = useLang();
  return (
    <header className="site-header sticky top-0 z-50 border-b border-border">
      <div className="mx-auto max-w-7xl px-4">
        <div className="header-main">
          <a href="#top" className="brand-link" aria-label="Mercasto">
            <span className="brand-mark">M</span>
            <span className="brand-copy">
              <span className="brand-name">Mercasto</span>
              <span className="brand-sub">{t("brand_sub")}</span>
            </span>
          </a>
          <div className="header-actions">
            <button onClick={onToggleDark} className="header-icon" aria-label={dark ? t("theme_light") : t("theme_dark")}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <span className="location-chip"><MapPin className="w-4 h-4" />{t("all_mexico")}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="lang-trigger" aria-label={t("language")}>
                <Globe className="w-4 h-4" /><span>{lang.toUpperCase()}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto no-scrollbar">
                {LANGS.map((l) => <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className={l.code === lang ? "font-bold text-primary" : ""}>{l.label}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={onFavorites} aria-label={t("favorites") || "Favoritos"} className={`header-icon favorite-button ${favoritesOnly ? "is-active" : ""}`}>
              <Heart className={`w-5 h-5 ${favoritesOnly ? "fill-current" : ""}`} />
              {favCount > 0 && <span className="favorite-count">{favCount}</span>}
            </button>
            <span className="user-chip"><User className="w-4 h-4" />{t("guest")}</span>
            <button onClick={onPost} aria-label={t("post")} className="publish-button">
              <Plus className="w-4 h-4" /><span className="publish-label">{t("post")}</span>
            </button>
          </div>
        </div>
        <nav className="desktop-subnav no-scrollbar">
          {SUBNAV.map(([cat, key]) => <button key={key} onClick={() => onCategory(cat)}>{t(key)}</button>)}
        </nav>
      </div>
    </header>
  );
}
