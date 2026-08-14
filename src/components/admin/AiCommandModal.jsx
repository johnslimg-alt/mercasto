import { Loader2, Sparkles, XCircle } from 'lucide-react';
import { getAdminAiCopy } from '../../utils/adminAiCopy.js';

const AGENTS = [
  ['postgresql', '🐘'],
  ['react', '⚛️'],
  ['ceo', '👔'],
  ['lawyer', '⚖️'],
  ['notary', '📝'],
  ['advocate', '🛡️'],
  ['marketing', '📈'],
  ['seo', '🔍'],
  ['ceo_ui', '🎨'],
  ['ceo_ux', '🧠'],
  ['ui', '✨'],
];

export default function AiCommandModal({
  lang,
  closeLabel,
  aiAgentType,
  setAiAgentType,
  aiPrompt,
  setAiPrompt,
  aiResult,
  setAiResult,
  isAiProcessing,
  onSubmit,
  onClose,
}) {
  const copy = getAdminAiCopy(lang);

  const chooseAgent = (agent) => {
    setAiAgentType(agent);
    setAiResult(null);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="ai-command-title" className="bg-slate-900 w-full max-w-3xl rounded-3xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 border border-slate-700 flex flex-col max-h-[90vh]">
        <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><XCircle size={24}/></button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Sparkles className="text-indigo-400 w-6 h-6"/></div>
          <div>
            <h2 id="ai-command-title" className="text-[20px] font-bold text-white leading-none">{copy.title}</h2>
            <span className="text-[12px] text-slate-400">{copy.subtitle}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 bg-slate-800 p-1 rounded-xl w-fit">
          {AGENTS.map(([agent, icon]) => (
            <button
              key={agent}
              type="button"
              onClick={() => chooseAgent(agent)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${aiAgentType === agent ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {icon} {copy.labels[agent]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto mb-4 bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[13px] text-slate-300">
          {isAiProcessing ? (
            <div className="flex items-center gap-3 text-indigo-400"><Loader2 className="animate-spin w-5 h-5"/> {copy.processing}</div>
          ) : aiResult ? (
            <pre className="overflow-x-auto whitespace-pre-wrap">
              {aiResult.error
                ? <code className="text-red-400">{aiResult.error}</code>
                : aiResult.data
                ? <code className="text-blue-300">{JSON.stringify(aiResult.data, null, 2)}</code>
                : <code className="text-amber-300">{aiResult.response}</code>
              }
            </pre>
          ) : (
            <div className="text-slate-600 italic">{copy.ready}</div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder={copy.prompts[aiAgentType] || copy.prompts.ceo}
            className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-[14px]"
          />
          <button type="submit" disabled={isAiProcessing || !aiPrompt.trim()} className="px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]">
            {isAiProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : copy.execute}
          </button>
        </form>
      </div>
    </div>
  );
}
