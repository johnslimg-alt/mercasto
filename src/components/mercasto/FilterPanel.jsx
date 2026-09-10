import { Input } from "@/components/ui/input";
import { X, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n";

const CATS = [
  ["", "cat_all"], ["Productos", "cat_products"], ["Motor", "cat_motor"],
  ["Inmuebles", "cat_realestate"], ["Empleos", "cat_jobs"], ["Servicios", "cat_services"],
  ["Negocios", "cat_business"], ["Turismo", "cat_tourism"], ["Boletos", "cat_tickets"]
];
const SORTS = [["recent", "sort_recent"], ["asc", "sort_asc"], ["desc", "sort_desc"]];

export default function FilterPanel({ filters, setFilters }) {
  const { t } = useLang();
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const clear = () => setFilters({ category: "", min: "", max: "", location: "", sort: "recent", favorites: false });
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("f_category")}</span>
        <div className="no-scrollbar flex gap-2 overflow-x-auto mt-2 pb-2">
          {CATS.map(([c, key]) => <button key={key} type="button" onClick={() => setFilters((f) => ({ ...f, category: c }))} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${filters.category === c ? "border-primary text-primary bg-accent" : "border-border text-muted-foreground hover:text-foreground"}`}>{t(key)}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" min="0" value={filters.min} onChange={set("min")} placeholder={t("f_min")} className="h-9 text-xs" />
        <Input type="number" min="0" value={filters.max} onChange={set("max")} placeholder={t("f_max")} className="h-9 text-xs" />
      </div>      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={filters.location || ""} onChange={set("location")} placeholder={t("f_location")} className="h-9 pl-10 text-xs" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map(([v, key]) => <button key={key} type="button" onClick={() => setFilters((f) => ({ ...f, sort: v }))} className={`text-xs px-3 py-1.5 rounded-full border transition ${filters.sort === v ? "border-primary text-primary bg-accent" : "border-border text-muted-foreground hover:text-foreground"}`}>{t(key)}</button>)}
        <button type="button" onClick={clear} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition press">
          <X className="w-3.5 h-3.5" />{t("clear")}
        </button>
      </div>
    </div>
  );
}