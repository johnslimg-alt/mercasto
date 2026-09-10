import { useLang } from "@/lib/i18n";

const STEPS = ["1","2","3","4"];
const SAFETY = ["1","2","3"];

export default function HowItWorks() {
  const { t } = useLang();
  return (
    <section id="como" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight mb-6">{t("how_title")}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((n) => <div key={n} className="border border-border rounded-lg p-5">
            <p className="text-2xl font-extrabold text-primary">0{n}</p>
            <h3 className="font-semibold mt-2 text-sm">{t("how_"+n+"_title")}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("how_"+n+"_desc")}</p>
          </div>)}
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {SAFETY.map((n) => <div key={n} className="bg-muted/50 rounded-lg p-5">
            <h3 className="font-semibold text-sm">{t("safety_"+n+"_title")}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("safety_"+n+"_desc")}</p>
          </div>)}
        </div>
      </div>
    </section>
  );
}
