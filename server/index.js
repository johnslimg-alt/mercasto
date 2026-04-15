import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

// POST /api/gemini
// Body: { prompt: string }
// If GEMINI_REST_URL and GEMINI_API_KEY are set, this will proxy the request there.
// Otherwise it returns a safe demo response so the frontend can work without secrets.
app.post('/api/gemini', async (req, res) => {
  const prompt = req.body?.prompt || ''
  const url = process.env.GEMINI_REST_URL
  const apiKey = process.env.GEMINI_API_KEY

  if (!url || !apiKey) {
    return res.json({ ok: true, demo: true, response: `Demo response for prompt: ${prompt}` })
  }

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    })

    const data = await apiRes.json()
    return res.status(apiRes.status).json({ ok: true, data })
  } catch (err) {
    console.error('Gemini proxy error', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Gemini proxy server listening on http://localhost:${port}`))
