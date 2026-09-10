import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();

  const COLS = [
  {
    title: "Categorías",
    links: [
    [t("cat_motor"), "#automotriz"],
    [t("cat_realestate"), "#inmuebles"],
    [t("cat_jobs"), "#empleos"],
    [t("cat_services"), "#servicios"],
    [t("cat_products"), "#tendencias"]]

  },
  {
    title: "Ayuda",
    links: [
    [t("how_title"), "#como"],
    [t("popular_title"), "#busquedas"],
    [t("cat_rates"), "#planes"]]

  },
  {
    title: "Legal",
    links: [
    ["Privacidad", "#top"],
    ["Términos", "#top"],
    ["Cookies", "#top"]]

  }];


  return (
    <footer data-source-location="src/components/mercasto/Footer.jsx:37:4" data-dynamic-content="true" id="contact" className="pt-14 pb-8">
      <div data-source-location="src/components/mercasto/Footer.jsx:38:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4">
        <div data-source-location="src/components/mercasto/Footer.jsx:39:8" data-dynamic-content="true" className="grid md:grid-cols-12 gap-10">
          <div data-source-location="src/components/mercasto/Footer.jsx:40:10" data-dynamic-content="true" className="md:col-span-6">
            <div data-source-location="src/components/mercasto/Footer.jsx:41:12" data-dynamic-content="false" className="flex items-center gap-2 mb-4">
              <span data-source-location="src/components/mercasto/Footer.jsx:42:14" data-dynamic-content="false" className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-extrabold text-lg">M</span>
              <span data-source-location="src/components/mercasto/Footer.jsx:43:14" data-dynamic-content="false" className="font-extrabold text-lg">Mercasto</span>
            </div>
            <p data-source-location="src/components/mercasto/Footer.jsx:45:12" data-dynamic-content="true" className="text-muted-foreground max-w-sm leading-relaxed">{t("tagline")}.</p>
            <a data-source-location="src/components/mercasto/Footer.jsx:46:12" data-dynamic-content="false" href="mailto:hola@mercasto.com" className="inline-flex items-center gap-2 mt-5 text-primary hover:underline">
              hola@mercasto.com <ArrowUpRight data-source-location="src/components/mercasto/Footer.jsx:47:32" data-dynamic-content="false" className="w-4 h-4" />
            </a>
          </div>
          {COLS.map((col) =>
          <div data-source-location="src/components/mercasto/Footer.jsx:51:12" data-dynamic-content="true" key={col.title} className="md:col-span-2">
              <p data-source-location="src/components/mercasto/Footer.jsx:52:14" data-dynamic-content="true" className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4" data-collection-item-field="title" data-collection-item-id={col?.id || col?._id}>{col.title}</p>
              <ul data-source-location="src/components/mercasto/Footer.jsx:53:14" data-dynamic-content="true" className="space-y-2 text-sm" data-collection-item-field="links" data-collection-item-id={col?.id || col?._id}>
                {col.links.map(([label, href]) =>
              <li data-source-location="src/components/mercasto/Footer.jsx:55:18" data-dynamic-content="true" key={label}><a data-source-location="src/components/mercasto/Footer.jsx:55:34" data-dynamic-content="true" href={href} className="hover:text-primary transition" data-collection-item-field="label">{label}</a></li>
              )}
              </ul>
            </div>
          )}
        </div>
        <div data-source-location="src/components/mercasto/Footer.jsx:61:8" data-dynamic-content="true" className="mt-14 pt-6 border-t border-border flex flex-col md:flex-row justify-between gap-3 text-xs text-muted-foreground">
          <p data-source-location="src/components/mercasto/Footer.jsx:62:10" data-dynamic-content="false">© 2026 Mercasto · Hecho en México</p>
          <p data-source-location="src/components/mercasto/Footer.jsx:63:10" data-dynamic-content="true">{t("updated_ago")}</p>
        </div>
      </div>
    </footer>);

}