import { Plus, Moon, Sun, MapPin, Heart, User, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLang, LANGS } from "@/lib/i18n";

const SUBNAV = [
["", "cat_all"],
["Productos", "cat_products"],
["Boletos", "cat_tickets"],
["Turismo", "cat_tourism"],
["Motor", "cat_motor"],
["Inmuebles", "cat_realestate"],
["Empleos", "cat_jobs"],
["Servicios", "cat_services"],
["Negocios", "cat_business"]];


export default function TopBar({ favCount, favoritesOnly, onFavorites, dark, onToggleDark, onPost, onCategory, id }) {
  const { t, lang, setLang } = useLang();

  return (
    <header data-source-location="src/components/mercasto/TopBar.jsx:21:4" data-dynamic-content="true" className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div data-source-location="src/components/mercasto/TopBar.jsx:22:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4">
        <div data-source-location="src/components/mercasto/TopBar.jsx:23:8" data-dynamic-content="true" className="flex items-center gap-4 py-3">
          <a data-source-location="src/components/mercasto/TopBar.jsx:24:10" data-dynamic-content="false" href="#top" className="flex items-center gap-2 shrink-0">
            <span data-source-location="src/components/mercasto/TopBar.jsx:25:12" data-dynamic-content="false" className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-extrabold text-lg">M</span>
            <span data-source-location="src/components/mercasto/TopBar.jsx:26:12" data-dynamic-content="false" className="leading-none hidden sm:block">
              <span data-source-location="src/components/mercasto/TopBar.jsx:27:14" data-dynamic-content="false" className="font-extrabold text-lg block">Mercasto</span>
              <span data-source-location="src/components/mercasto/TopBar.jsx:28:14" data-dynamic-content="false" className="text-[9px] text-muted-foreground tracking-widest">CLASIFICADOS CON IA</span>
            </span>
          </a>

          <div data-source-location="src/components/mercasto/TopBar.jsx:32:10" data-dynamic-content="true" className="flex items-center gap-3 shrink-0 ml-auto">
            <button data-source-location="src/components/mercasto/TopBar.jsx:33:12" data-dynamic-content="true" onClick={onToggleDark} className="text-muted-foreground hover:text-foreground transition" aria-label="dark mode">
              {dark ? <Sun data-source-location="src/components/mercasto/TopBar.jsx:34:22" data-dynamic-content="false" className="w-5 h-5" /> : <Moon data-source-location="src/components/mercasto/TopBar.jsx:34:52" data-dynamic-content="false" className="w-5 h-5" />}
            </button>
            <span data-source-location="src/components/mercasto/TopBar.jsx:36:12" data-dynamic-content="true" className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground"><MapPin data-source-location="src/components/mercasto/TopBar.jsx:36:94" data-dynamic-content="false" className="w-4 h-4" />{t("all_mexico")}</span>
            <DropdownMenu data-source-location="src/components/mercasto/TopBar.jsx:37:12" data-dynamic-content="true">
              <DropdownMenuTrigger data-source-location="src/components/mercasto/TopBar.jsx:38:14" data-dynamic-content="true" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground outline-none transition">
                <Globe data-source-location="src/components/mercasto/TopBar.jsx:39:16" data-dynamic-content="false" className="w-4 h-4" />{lang.toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent data-source-location="src/components/mercasto/TopBar.jsx:41:14" data-dynamic-content="true" align="end" className="max-h-80 overflow-y-auto no-scrollbar">
                {LANGS.map((l) =>
                <DropdownMenuItem data-source-location="src/components/mercasto/TopBar.jsx:43:18" data-dynamic-content="true" key={l.code} onClick={() => setLang(l.code)} className={l.code === lang ? "font-bold text-primary" : ""} data-collection-item-field="label" data-collection-item-id={l?.id || l?._id}>
                    {l.label}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button data-source-location="src/components/mercasto/TopBar.jsx:54:12" data-dynamic-content="true" onClick={onFavorites} aria-label={t("favorites") || "Favoritos"} className={`relative transition ${favoritesOnly ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Heart data-source-location="src/components/mercasto/TopBar.jsx:55:14" data-dynamic-content="false" className={`w-5 h-5 ${favoritesOnly ? "fill-current" : ""}`} />
              {favCount > 0 && <span data-source-location="src/components/mercasto/TopBar.jsx:56:31" data-dynamic-content="true" className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center" data-collection-item-field="favCount" data-collection-item-id={id}>{favCount}</span>}
            </button>
            <span data-source-location="src/components/mercasto/TopBar.jsx:58:12" data-dynamic-content="true" className="hidden md:flex items-center gap-1 text-sm text-muted-foreground"><User data-source-location="src/components/mercasto/TopBar.jsx:58:94" data-dynamic-content="false" className="w-5 h-5" />{t("guest")}</span>
            <button data-source-location="src/components/mercasto/TopBar.jsx:59:12" data-dynamic-content="true" onClick={onPost} aria-label={t("post")} className="flex items-center gap-1.5 bg-primary text-primary-foreground font-medium px-3 sm:px-4 h-11 rounded-lg text-sm press">
              <Plus data-source-location="src/components/mercasto/TopBar.jsx:60:14" data-dynamic-content="false" className="w-4 h-4" /><span data-source-location="src/components/mercasto/TopBar.jsx:60:42" data-dynamic-content="true" className="hidden sm:inline">{t("post")}</span>
            </button>
          </div>
        </div>

        <nav data-source-location="src/components/mercasto/TopBar.jsx:65:8" data-dynamic-content="true" className="no-scrollbar hidden md:flex items-center gap-6 overflow-x-auto pb-2.5 text-sm text-muted-foreground">
          {SUBNAV.map(([cat, key]) =>
          <button data-source-location="src/components/mercasto/TopBar.jsx:67:12" data-dynamic-content="true" key={key} onClick={() => onCategory(cat)} className="whitespace-nowrap hover:text-primary transition">{t(key)}</button>
          )}
        </nav>
      </div>
    </header>);

}