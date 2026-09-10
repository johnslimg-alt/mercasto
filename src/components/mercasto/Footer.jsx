import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  const cols = [
    { title:t("footer_categories"), links:[[t("cat_motor"),"#automotriz"],[t("cat_realestate"),"#inmuebles"],[t("cat_jobs"),"#empleos"],[t("cat_services"),"#servicios"],[t("cat_products"),"#tendencias"]] },
    { title:t("footer_help"), links:[[t("how_title"),"#como"],[t("popular_title"),"#busquedas"],[t("cat_rates"),"#planes"]] },
    { title:t("footer_legal"), links:[[t("privacy"),"#top"],[t("terms"),"#top"],[t("cookies"),"#top"]] }
  ];
  return (
    <footer id="contact" className="pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-4 footer-grid">
        <div className="footer-brand">
          <div className="flex items-center gap-2 mb-4"><span className="brand-mark">M</span><span className="font-extrabold text-lg">Mercasto</span></div>
          <p className="text-muted-foreground max-w-sm leading-relaxed">{t("tagline")}.</p>
          <a href="mailto:hola@mercasto.com" className="inline-flex items-center gap-2 mt-4 text-primary hover:underline">hola@mercasto.com <ArrowUpRight className="w-4 h-4" /></a>
        </div>
        {cols.map((col) => <div key={col.title} className="footer-col">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{col.title}</p>
          <ul className="space-y-2 text-sm">{col.links.map(([label,href]) => <li key={label}><a href={href} className="hover:text-primary transition">{label}</a></li>)}</ul>
        </div>)}
        <div className="footer-bottom">
          <p>© 2026 Mercasto · {t("made_in_mexico")}</p><p>{t("updated_ago")}</p>
        </div>
      </div>
    </footer>
  );
}
