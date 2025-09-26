// netlify/functions/chat.js
const { v1 } = require('@google-cloud/discoveryengine')

const {
  PROJECT_ID,
  LOCATION = 'global',
  ENGINE_ID,
  SA_CLIENT_EMAIL,
  SA_PRIVATE_KEY,
} = process.env

const convClient = new v1.ConversationalSearchServiceClient({
  projectId: PROJECT_ID,
  credentials: {
    client_email: SA_CLIENT_EMAIL,
    private_key: (SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
})

const SERVING_CONFIG = () =>
  `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const { message, sessionName } = JSON.parse(event.body || '{}') || {}
    if (!message) return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) }

    if (!PROJECT_ID || !ENGINE_ID || !SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) {
      const err = 'Missing env: PROJECT_ID/ENGINE_ID/SA_CLIENT_EMAIL/SA_PRIVATE_KEY'
      console.error(err)
      return { statusCode: 500, body: JSON.stringify({ error: err }) }
    }

    const [resp] = await convClient.answerQuery({
      servingConfig: SERVING_CONFIG(),
      query: { text: message },
      session: sessionName ? { name: sessionName } : undefined,
    })

    // If the API returned but no answer text, surface the raw payload for debugging.
    const answerText = resp?.answer?.answerText
    if (!answerText) {
      console.warn('NO_ANSWER_TEXT', { respSummary: Object.keys(resp || {}) })
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ debug: true, resp }) }
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(resp) }
  } catch (e) {
    console.error('CHAT_ERR', e?.message, e)
    return { statusCode: 500, body: JSON.stringify({ error: `CHAT_ERR: ${e?.message || 'unknown'}` }) }
  }
}
