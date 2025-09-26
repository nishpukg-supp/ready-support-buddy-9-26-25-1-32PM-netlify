import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions'
const SHARED = import.meta.env.VITE_SHARED_SECRET

export default function App() {
  const [session, setSession] = useState(null)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([])
  const [bootErr, setBootErr] = useState('')
  const pending = useRef(false)

  const extraHeaders = {}
  if (SHARED) extraHeaders['x-readymentor-secret'] = SHARED

  async function safeJson(res) {
    try { return await res.json() } catch { return {} }
  }

  // Create session on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/session`, {
          method: 'POST',
          headers: { ...extraHeaders }
        })
        const data = await safeJson(r)
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
        if (!data?.sessionName) throw new Error('No sessionName in response')
        setSession(data.sessionName)
      } catch (e) {
        setBootErr(`SESSION_ERR: ${e.message}`)
        setMsgs(m => [...m, { role: 'assistant', text: `Session error: ${e.message}` }])
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!input || pending.current) return
    pending.current = true

    const user = { role: 'user', text: input }
    setMsgs(m => [...m, user])
    setInput('')

    try {
      const r = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify({ message: user.text, sessionName: session })
      })

      const data = await safeJson(r)

      if (!r.ok) {
        const msg = data?.error || `HTTP ${r.status}`
        setMsgs(m => [...m, { role: 'assistant', text: `Error: ${msg}` }])
        return
      }

      const answerText = data?.answer?.answerText
      const refs = data?.answer?.references || []

      // If API responded but no answer, surface debug payload so we can see root cause
      const text = answerText || (data?.debug
        ? `Debug: no answerText\n${JSON.stringify(data?.resp, null, 2)}`
        : '(no answer)')

      setMsgs(m => [...m, { role: 'assistant', text, refs }])
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', text: `CHAT_ERR: ${e.message}` }])
    } finally {
      pending.current = false
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'Inter, system-ui' }}>
      <h1>ReadyMentor</h1>
      <p style={{ opacity: .7 }}>
        Read-only mentor & troubleshooter grounded on your Guides.
        {bootErr && <span style={{ color: '#b91c1c', marginLeft: 8 }}>({bootErr})</span>}
      </p>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, minHeight: 320 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ margin: '12px 0' }}>
            <div style={{ fontWeight: 600 }}>{m.role === 'user' ? 'You' : 'Mentor'}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            {!!m.refs?.length && (
              <div style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>
                References:
                <ul>
                  {m.refs.flatMap(r => r.citations ?? []).map((c, j) => (
                    <li key={j}>{c?.title || c?.uri || c?.document}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about any UKG Ready workflow..."
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #d1d5db' }}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          disabled={pending.current}
        />
        <button onClick={send} disabled={pending.current || !session} style={{ padding: '12px 16px', borderRadius: 8 }}>
          {pending.current ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
