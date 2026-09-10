import { useState } from "react";
import { MapPin, Building2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function JobsSection({ listings }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [remoteOnly, setRemoteOnly] = useState(false);
  const jobs = listings.filter((l) => l.category === "Empleos" && (!remoteOnly || l.remote));
  const view = (l) => toast({ title: l.title, description: l.description });

  return (
    <section id="empleos" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("jobs_title")}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => setRemoteOnly((r) => !r)} className={`px-3 py-1.5 rounded-md border transition ${remoteOnly ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{t("remote_only")}</button>
            <button onClick={() => toast({ description: t("cv_sent") })} className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition press">{t("upload_cv")}</button>
            <button onClick={() => toast({ description: t("alert_created") })} className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition press">{t("create_alert")}</button>
          </div>
        </div>

        <div className="jobs-mobile-grid">
          {jobs.map((l) => (
            <article key={l.id} className="job-mobile-card" data-collection-item-id={l.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{l.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{l.company}</p>
                </div>
                {l.remote && <span className="job-remote-badge">{t("remote_only")}</span>}
              </div>
              <p className="text-lg font-bold text-orange-600 mt-3">${l.price?.toLocaleString()} MXN</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{l.location}</p>
              <button onClick={() => view(l)} className="job-view-button">{t("view")}</button>
            </article>
          ))}
        </div>

        <div className="jobs-desktop-table no-scrollbar overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">{t("th_role")}</th><th className="px-4 py-3">{t("th_company")}</th><th className="px-4 py-3">{t("th_salary")}</th><th className="px-4 py-3">{t("th_location")}</th><th className="px-4 py-3 text-right">{t("th_action")}</th>
            </tr></thead>
            <tbody data-collection-id="listings">
              {jobs.map((l) => <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition" data-collection-item-id={l.id}>
                <td className="px-4 py-3"><p className="font-medium">{l.title}</p><p className="text-xs text-muted-foreground">{l.sub_category} · {l.remote ? t("remote_only") : t("full_time")}</p></td>
                <td className="px-4 py-3 text-muted-foreground">{l.company}</td><td className="px-4 py-3 font-semibold text-orange-600">${l.price?.toLocaleString()}</td><td className="px-4 py-3 text-muted-foreground">{l.location}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => view(l)} className="text-primary hover:underline press">{t("view")}</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
