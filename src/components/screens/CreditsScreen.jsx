import { Link } from 'react-router-dom';
import { CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const plans = [
  { credits: 100, price: '$100 MXN', label: 'Impulso', tone: 'from-lime-500 to-emerald-500' },
  { credits: 300, price: '$270 MXN', label: 'Crecimiento', tone: 'from-sky-500 to-blue-600' },
  { credits: 700, price: '$590 MXN', label: 'Pro', tone: 'from-amber-400 to-orange-500' },
];

export default function CreditsScreen() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#071120] dark:text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-4 py-2 text-sm font-bold text-lime-700 dark:bg-lime-400/15 dark:text-lime-300">
                <Sparkles size={16} />
                Créditos Mercasto
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Promociona tus anuncios</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                Compra créditos para destacar publicaciones, renovar anuncios y acelerar contactos reales en todo México.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-lime-600 dark:bg-white dark:text-slate-950"
            >
              Ver mi panel
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.credits} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.tone} text-white shadow-lg`}>
                  <Zap size={24} fill="currentColor" />
                </div>
                <h2 className="text-xl font-black">{plan.label}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{plan.credits} créditos Mercasto</p>
                <div className="mt-5 text-3xl font-black">{plan.price}</div>
                <Link
                  to="/profile"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3 text-sm font-black text-white transition hover:bg-lime-600"
                >
                  <CreditCard size={18} />
                  Comprar en mi panel
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-lime-200 bg-lime-50 p-4 text-sm text-lime-900 dark:border-lime-400/20 dark:bg-lime-400/10 dark:text-lime-100">
            <ShieldCheck className="mt-0.5 shrink-0" size={18} />
            <p>Los pagos se completan desde tu panel para mantener tu sesión segura y registrar la transacción correctamente.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
