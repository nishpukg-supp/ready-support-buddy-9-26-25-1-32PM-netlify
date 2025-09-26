import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions'

export default function App(){
  const [session, setSession] = useState(null)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([])
  const pending = useRef(false)

  useEffect(() => { (async () => {
    const r = await fetch(`${API_BASE}/session`, { method: 'POST' })
    const { sessionName } = await r.json()
    setSession(sessionName)
  })() }, [])

  async function send(){
    if(!input || pending.current) return
    pending.current = true
    const user = { role: 'user', text: input }
    setMsgs(m => [...m, user])
    setInput('')
    const r = await fetch(`${API_BASE}/chat`,{
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ message: user.text, sessionName: session })
    })
    const data = await r.json()
    const answerText = data?.answer?.answerText ?? '(no answer)'
    const refs = data?.answer?.references || []
    setMsgs(m => [...m, { role:'assistant', text: answerText, refs }])
    pending.current = false
  }

  return (
    <div style={{maxWidth: 900, margin:'2rem auto', fontFamily:'Inter, system-ui'}}>
      <h1>ReadyMentor</h1>
      <p style={{opacity:.7}}>Read-only mentor & troubleshooter grounded on your Guides.</p>
      <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, minHeight:320}}>
        {msgs.map((m,i) => (
          <div key={i} style={{margin:'12px 0'}}>
            <div style={{fontWeight:600}}>{m.role==='user'?'You':'Mentor'}</div>
            <div style={{whiteSpace:'pre-wrap'}}>{m.text}</div>
            {!!m.refs?.length && (
              <div style={{fontSize:12, opacity:.8, marginTop:6}}>
                References:
                <ul>
                  {m.refs.flatMap(r => r.citations ?? []).map((c,j) => (
                    <li key={j}>{c?.title || c?.uri || c?.document}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{display:'flex', gap:8, marginTop:12}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Ask about any UKG Ready workflow..." style={{flex:1, padding:12, borderRadius:8, border:'1px solid #d1d5db'}}/>
        <button onClick={send} style={{padding:'12px 16px', borderRadius:8}}>Send</button>
      </div>
    </div>
  )
}
