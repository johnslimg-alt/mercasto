import React, { useState } from 'react'

export default function GeminiDemo() {
  const [prompt, setPrompt] = useState('Give a short friendly slogan for an online marketplace in Spanish')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.demo && data.response) setResult(data.response)
      else if (data.data) setResult(JSON.stringify(data.data, null, 2))
      else setResult(JSON.stringify(data))
    } catch (err) {
      setResult('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm max-w-2xl mx-auto">
      <h3 className="font-bold mb-2">Gemini demo</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="p-3 border rounded" />
        <div className="flex gap-2">
          <button disabled={loading} className="bg-[#12B981] text-white px-4 py-2 rounded font-bold">{loading ? 'Running...' : 'Run'}</button>
        </div>
      </form>

      <div className="mt-4">
        <h4 className="font-bold text-sm mb-2">Result</h4>
        <pre className="p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap">{result ?? 'No result yet'}</pre>
      </div>
    </div>
  )
}
