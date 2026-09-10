import { Car, Home, Briefcase, Wrench, ShoppingBag, Store, Globe, Ticket, Medal } from "lucide-react";
import { useLang } from "@/lib/i18n";

const CATS = [
["Motor", Car, "cat_motor"],
["Inmuebles", Home, "cat_realestate"],
["Empleos", Briefcase, "cat_jobs"],
["Servicios", Wrench, "cat_services"],
["Productos", ShoppingBag, "cat_products"],
["Negocios", Store, "cat_business"],
["Turismo", Globe, "cat_tourism"],
["Boletos", Ticket, "cat_tickets"],
["Tarifas", Medal, "cat_rates"]];


export default function CategoryCircles({ onSelect }) {
  const { t } = useLang();
  return (
    <section data-source-location="src/components/mercasto/CategoryCircles.jsx:19:4" data-dynamic-content="true" className="border-b border-border relative">
      <div data-source-location="src/components/mercasto/CategoryCircles.jsx:20:6" data-dynamic-content="true" className="mx-auto max-w-7xl relative">
        <div data-source-location="src/components/mercasto/CategoryCircles.jsx:21:8" data-dynamic-content="true" className="category-track no-scrollbar flex gap-4 sm:gap-6 overflow-x-auto px-4 py-6 snap-x">
          {CATS.map(([cat, Icon, key]) =>
          <button data-source-location="src/components/mercasto/CategoryCircles.jsx:23:12" data-dynamic-content="true" key={cat} onClick={() => onSelect(cat)} className="category-button flex flex-col items-center gap-2 shrink-0 snap-start w-20 sm:w-24 group">
              <span data-source-location="src/components/mercasto/CategoryCircles.jsx:24:14" data-dynamic-content="false" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary group-hover:scale-105 transition">
                <Icon data-source-location="src/components/mercasto/CategoryCircles.jsx:25:16" data-dynamic-content="false" className="w-6 h-6 sm:w-7 sm:h-7" />
              </span>
              <span data-source-location="src/components/mercasto/CategoryCircles.jsx:27:14" data-dynamic-content="true" className="category-label text-xs text-muted-foreground group-hover:text-foreground transition text-center">{t(key)}</span>
            </button>
          )}
        </div>
        <div data-source-location="src/components/mercasto/CategoryCircles.jsx:31:8" data-dynamic-content="false" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>);

}