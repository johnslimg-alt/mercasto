import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function JobsSection({ listings }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [remoteOnly, setRemoteOnly] = useState(false);

  const jobs = listings.filter((l) => l.category === "Empleos" && (!remoteOnly || l.remote));

  return (
    <section data-source-location="src/components/mercasto/JobsSection.jsx:13:4" data-dynamic-content="true" id="empleos" className="border-b border-border">
      <div data-source-location="src/components/mercasto/JobsSection.jsx:14:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-8">
        <div data-source-location="src/components/mercasto/JobsSection.jsx:15:8" data-dynamic-content="true" className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 data-source-location="src/components/mercasto/JobsSection.jsx:16:10" data-dynamic-content="true" className="text-2xl font-bold tracking-tight">{t("jobs_title")}</h2>
          <div data-source-location="src/components/mercasto/JobsSection.jsx:17:10" data-dynamic-content="true" className="flex flex-wrap items-center gap-2 text-sm">
            <button data-source-location="src/components/mercasto/JobsSection.jsx:18:12" data-dynamic-content="true" onClick={() => setRemoteOnly((r) => !r)} className={`px-3 py-1.5 rounded-md border transition ${remoteOnly ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {t("remote_only")}
            </button>
            <button data-source-location="src/components/mercasto/JobsSection.jsx:21:12" data-dynamic-content="true" onClick={() => toast({ description: t("cv_sent") })} className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition press">{t("upload_cv")}</button>
            <button data-source-location="src/components/mercasto/JobsSection.jsx:22:12" data-dynamic-content="true" onClick={() => toast({ description: t("alert_created") })} className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition press">{t("create_alert")}</button>
          </div>
        </div>

        <div data-source-location="src/components/mercasto/JobsSection.jsx:26:8" data-dynamic-content="true" className="overflow-x-auto border border-border rounded-lg">
          <table data-source-location="src/components/mercasto/JobsSection.jsx:27:10" data-dynamic-content="true" className="w-full text-sm min-w-[640px]">
            <thead data-source-location="src/components/mercasto/JobsSection.jsx:28:12" data-dynamic-content="true">
              <tr data-source-location="src/components/mercasto/JobsSection.jsx:29:14" data-dynamic-content="true" className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th data-source-location="src/components/mercasto/JobsSection.jsx:30:16" data-dynamic-content="true" className="px-4 py-3">{t("th_role")}</th>
                <th data-source-location="src/components/mercasto/JobsSection.jsx:31:16" data-dynamic-content="true" className="px-4 py-3">{t("th_company")}</th>
                <th data-source-location="src/components/mercasto/JobsSection.jsx:32:16" data-dynamic-content="true" className="px-4 py-3">{t("th_salary")}</th>
                <th data-source-location="src/components/mercasto/JobsSection.jsx:33:16" data-dynamic-content="true" className="px-4 py-3">{t("th_location")}</th>
                <th data-source-location="src/components/mercasto/JobsSection.jsx:34:16" data-dynamic-content="true" className="px-4 py-3 text-right">{t("th_action")}</th>
              </tr>
            </thead>
            <tbody data-source-location="src/components/mercasto/JobsSection.jsx:37:12" data-dynamic-content="true" data-collection-id="listings">
              {jobs.map((l) =>
              <tr data-source-location="src/components/mercasto/JobsSection.jsx:39:16" data-dynamic-content="true" key={l.id} className="border-t border-border hover:bg-muted/30 transition" data-collection-item-id={l?.id}>
                  <td data-source-location="src/components/mercasto/JobsSection.jsx:40:18" data-dynamic-content="true" className="px-4 py-3">
                    <p data-source-location="src/components/mercasto/JobsSection.jsx:41:20" data-dynamic-content="true" className="font-medium" data-collection-item-field="title" data-collection-item-id={l?.id}>{l.title}</p>
                    <p data-source-location="src/components/mercasto/JobsSection.jsx:42:20" data-dynamic-content="true" className="text-xs text-muted-foreground" data-collection-item-field="sub_category" data-collection-item-id={l?.id}>{l.sub_category} · {l.remote ? t("remote_only") : t("full_time")}</p>
                  </td>
                  <td data-source-location="src/components/mercasto/JobsSection.jsx:44:18" data-dynamic-content="true" className="px-4 py-3 text-muted-foreground" data-collection-item-field="company" data-collection-item-id={l?.id}>{l.company}</td>
                  <td data-source-location="src/components/mercasto/JobsSection.jsx:45:18" data-dynamic-content="true" className="px-4 py-3 font-semibold text-orange-600">${l.price?.toLocaleString()}</td>
                  <td data-source-location="src/components/mercasto/JobsSection.jsx:46:18" data-dynamic-content="true" className="px-4 py-3 text-muted-foreground" data-collection-item-field="location" data-collection-item-id={l?.id}>{l.location}</td>
                  <td data-source-location="src/components/mercasto/JobsSection.jsx:47:18" data-dynamic-content="true" className="px-4 py-3 text-right">
                    <button data-source-location="src/components/mercasto/JobsSection.jsx:48:20" data-dynamic-content="true" onClick={() => toast({ title: l.title, description: l.description })} className="text-primary hover:underline press">{t("view")}</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>);

}