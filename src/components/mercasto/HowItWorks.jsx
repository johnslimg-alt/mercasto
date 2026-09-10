import { useLang } from "@/lib/i18n";

const STEPS = [
["01", "Crea tu anuncio", "Añade fotos, precio, condición y ubicación."],
["02", "Recibe contactos", "WhatsApp, Telegram u otros canales habilitados."],
["03", "Verifica antes de pagar", "Verifica la identidad, el producto y las condiciones antes de pagar."],
["04", "Gestiona tu anuncio", "Edita, renueva o promociona desde tu perfil."]];


const SAFETY = [
["Evita fraudes", "Nunca pagues por adelantado. Revisa las insignias."],
["Entrega y pago", "Reúnete en público. Cuenta el dinero antes de irte."],
["Señales de verificación", "Una insignia indica una verificación; no garantiza la transacción."]];


export default function HowItWorks() {
  const { t } = useLang();
  return (
    <section data-source-location="src/components/mercasto/HowItWorks.jsx:19:4" data-dynamic-content="true" id="como" className="border-b border-border">
      <div data-source-location="src/components/mercasto/HowItWorks.jsx:20:6" data-dynamic-content="true" className="mx-auto max-w-7xl px-4 py-10">
        <h2 data-source-location="src/components/mercasto/HowItWorks.jsx:21:8" data-dynamic-content="true" className="text-2xl font-bold tracking-tight mb-6">{t("how_title")}</h2>
        <div data-source-location="src/components/mercasto/HowItWorks.jsx:22:8" data-dynamic-content="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(([num, title, desc]) =>
          <div data-source-location="src/components/mercasto/HowItWorks.jsx:24:12" data-dynamic-content="true" key={num} className="border border-border rounded-lg p-5">
              <p data-source-location="src/components/mercasto/HowItWorks.jsx:25:14" data-dynamic-content="true" className="text-2xl font-extrabold text-primary" data-collection-item-field="num">{num}</p>
              <h3 data-source-location="src/components/mercasto/HowItWorks.jsx:26:14" data-dynamic-content="true" className="font-semibold mt-2 text-sm" data-collection-item-field="title">{title}</h3>
              <p data-source-location="src/components/mercasto/HowItWorks.jsx:27:14" data-dynamic-content="true" className="text-xs text-muted-foreground mt-1 leading-relaxed" data-collection-item-field="desc">{desc}</p>
            </div>
          )}
        </div>
        <div data-source-location="src/components/mercasto/HowItWorks.jsx:31:8" data-dynamic-content="true" className="grid md:grid-cols-3 gap-4 mt-8">
          {SAFETY.map(([title, desc]) =>
          <div data-source-location="src/components/mercasto/HowItWorks.jsx:33:12" data-dynamic-content="true" key={title} className="bg-muted/50 rounded-lg p-5">
              <h3 data-source-location="src/components/mercasto/HowItWorks.jsx:34:14" data-dynamic-content="true" className="font-semibold text-sm" data-collection-item-field="title">{title}</h3>
              <p data-source-location="src/components/mercasto/HowItWorks.jsx:35:14" data-dynamic-content="true" className="text-xs text-muted-foreground mt-1 leading-relaxed" data-collection-item-field="desc">{desc}</p>
              <a data-source-location="src/components/mercasto/HowItWorks.jsx:36:14" data-dynamic-content="false" href="#top" className="text-xs text-primary hover:underline mt-2 inline-block">Saber más</a>
            </div>
          )}
        </div>
      </div>
    </section>);

}