import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { getContactPageCopy, getContactSubjects } from '../../utils/contactPageCopy';
import {
  getSupportRequestAcknowledgementCopy,
  getSupportRequestStatusLabel,
} from '../../utils/supportRequestAcknowledgementCopy';
import {
  ChevronLeft, Mail, Clock, Send,
  CheckCircle, AlertCircle, ExternalLink, HelpCircle,
} from 'lucide-react';
import GoldenPublicPageShell from '../shell/GoldenPublicPageShell';

const SOCIALS = [
  { icon: ExternalLink, label: 'Instagram', href: 'https://instagram.com/mercasto', color: 'hover:text-pink-500' },
  { icon: ExternalLink, label: 'Facebook', href: 'https://facebook.com/mercasto', color: 'hover:text-blue-600' },
  { icon: ExternalLink, label: 'X / Twitter', href: 'https://twitter.com/mercasto', color: 'hover:text-sky-500' },
];

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactoScreen({ shellProps = {} }) {
  const navigate = useNavigate();
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  const copy = getContactPageCopy(lang);
  const acknowledgementCopy = getSupportRequestAcknowledgementCopy(lang);
  const subjects = getContactSubjects(lang);
  const contactInfo = [
    { icon: Mail, title: copy.emailCardTitle, value: 'soporte@mercasto.com', sub: copy.emailCardSub, href: 'mailto:soporte@mercasto.com', color: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300' },
    { icon: Clock, title: copy.responseTitle, value: copy.responseValue, sub: copy.responseSub, href: null, color: 'bg-slate-100 text-lime-700 dark:bg-slate-800 dark:text-lime-300' },
  ];
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverMsg, setServerMsg] = useState('');
  const [acknowledgement, setAcknowledgement] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = copy.nameRequired;
    if (!form.email.trim()) e.email = copy.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = copy.emailInvalid;
    if (!form.subject) e.subject = copy.subjectRequired;
    if (!form.message.trim()) e.message = copy.messageRequired;
    else if (form.message.trim().length < 10) e.message = copy.messageMin;
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStatus('loading');
    setAcknowledgement(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, subject: form.subject, message: form.message }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const reference = typeof data.reference === 'string' ? data.reference.trim() : '';
        const caseStatus = typeof data.status === 'string' ? data.status : 'received';
        setStatus('success');
        setServerMsg(copy.successMessage);
        setAcknowledgement(reference ? { reference, status: caseStatus } : null);
        setForm(EMPTY);
      } else {
        throw new Error('contact_submit_failed');
      }
    } catch {
      setStatus('error');
      setServerMsg(copy.genericError);
      setAcknowledgement(null);
    }
  }

  function handleChange(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }

  return (
    <GoldenPublicPageShell {...shellProps} testId="golden-contact-main" className="mcg-contact-page">
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 sticky mcg-public-sticky z-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button type="button" data-testid="contact-back" onClick={() => navigate(-1)} className="inline-flex min-h-12 items-center gap-1 px-1 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <button type="button" data-testid="contact-home" className="inline-flex min-h-12 items-center px-1 text-slate-400 cursor-pointer hover:text-lime-600 dark:text-slate-300 dark:hover:text-lime-300" onClick={() => navigate('/')}>Mercasto</button>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 font-medium dark:text-slate-300">{copy.breadcrumb}</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 dark:text-white">{copy.title}</h1>
          <p className="text-slate-500 text-lg dark:text-slate-300">{copy.subtitle}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-5 gap-8">
        {/* Form col */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">{copy.formTitle}</h2>

            {status === 'success' && (
              <div className="flex items-start gap-3 bg-lime-50 border border-lime-200 rounded-xl p-4 mb-6 dark:border-lime-900/60 dark:bg-lime-950/30">
                <CheckCircle className="w-5 h-5 text-lime-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-lime-800 dark:text-lime-300">{copy.successTitle}</p>
                  <p className="text-sm text-lime-700 mt-0.5 dark:text-lime-200">{serverMsg}</p>
                  {acknowledgement && (
                    <div className="mt-3 space-y-1.5 text-sm text-lime-800 dark:text-lime-200">
                      <p data-testid="contact-reference">
                        <span className="font-semibold">{acknowledgementCopy.referenceLabel}:</span>{' '}
                        <code className="font-mono font-bold">{acknowledgement.reference}</code>
                      </p>
                      <p data-testid="contact-status">
                        <span className="font-semibold">{acknowledgementCopy.statusLabel}:</span>{' '}
                        {getSupportRequestStatusLabel(lang, acknowledgement.status)}
                      </p>
                      <p className="pt-1 text-xs text-lime-700 dark:text-lime-300" data-testid="contact-follow-up">
                        {acknowledgementCopy.followUp}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6 dark:border-red-900/60 dark:bg-red-950/30">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{serverMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Nombre */}
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                  {copy.name} <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder={copy.namePlaceholder}
                  className={`w-full min-h-12 rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 transition dark:text-white dark:placeholder:text-slate-500 ${errors.name ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                />
                {errors.name && <p id="contact-name-error" className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                  {copy.email} <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  className={`w-full min-h-12 rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 transition dark:text-white dark:placeholder:text-slate-500 ${errors.email ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                />
                {errors.email && <p id="contact-email-error" className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Asunto */}
              <div>
                <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                  {copy.subject} <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <select
                  id="contact-subject"
                  required
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                  value={form.subject}
                  onChange={e => handleChange('subject', e.target.value)}
                  className={`w-full min-h-12 rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 transition bg-white dark:bg-slate-950 dark:text-white ${errors.subject ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <option value="" disabled>{copy.subjectPlaceholder}</option>
                  {subjects.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                {errors.subject && <p id="contact-subject-error" className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>

              {/* Mensaje */}
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                  {copy.message} <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder={copy.messagePlaceholder}
                  rows={5}
                  maxLength={2000}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 transition resize-none dark:text-white dark:placeholder:text-slate-500 ${errors.message ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.message ? <p id="contact-message-error" className="text-xs text-red-500">{errors.message}</p> : <span />}
                  <span className="text-xs text-slate-400">{form.message.length}/2000</span>
                </div>
              </div>

              <button
                type="submit"
                data-testid="contact-submit"
                disabled={status === 'loading'}
                className="w-full min-h-12 flex items-center justify-center gap-2 bg-[#84CC16] hover:bg-[#65A30D] disabled:bg-lime-300 text-slate-950 hover:text-white font-bold rounded-xl py-3 text-sm transition-colors"
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {copy.sending}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> {copy.send}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info col */}
        <div className="md:col-span-2 space-y-5">
          {/* Contact cards */}
          <div className="space-y-3">
            {contactInfo.map(({ icon: Icon, title, value, sub, href, color }, index) => (
              <div key={title} data-testid={`contact-info-${index}`} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow dark:border-slate-800 dark:bg-slate-900">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color.split(' ')[0]} ${color.split(' ')[2] || ''}`}>
                  <Icon className={`w-4.5 h-4.5 ${color.split(' ')[1]} ${color.split(' ')[3] || ''}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">{title}</p>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="font-semibold text-slate-800 hover:text-lime-600 transition-colors text-sm inline-flex min-h-12 items-center gap-1 dark:text-slate-100">
                      {value} <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ) : (
                    <p className="font-semibold text-slate-800 text-sm dark:text-slate-100">{value}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Socials */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{copy.followUs}</p>
            <div className="flex gap-3">
              {SOCIALS.map(({ icon: Icon, label, href, color }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  data-testid="contact-social"
                  className={`w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 ${color} transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300`}>
                  <Icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* FAQ teaser */}
          <button
            data-testid="contact-help"
            onClick={() => navigate('/ayuda')}
            className="w-full min-h-12 bg-lime-50 border border-lime-200 rounded-xl p-4 text-left hover:bg-lime-100 transition-colors group dark:border-lime-800/60 dark:bg-lime-950/30 dark:hover:bg-lime-950/50"
          >
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-lime-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-lime-800 text-sm dark:text-lime-300">{copy.faqTitle}</p>
                <p className="text-xs text-lime-700 mt-0.5 dark:text-lime-200">{copy.faqBody}</p>
                <p className="text-xs font-medium text-lime-600 mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                  {copy.faqLink} <ChevronLeft className="w-3 h-3 rotate-180" />
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
    </GoldenPublicPageShell>
  );
}
