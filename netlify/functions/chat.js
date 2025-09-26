// netlify/functions/chat.js
const { v1 } = require('@google-cloud/discoveryengine')

// --- credentials helper (supports GOOGLE_CREDENTIALS or SA_* pair)
function normalizeKey(k = '') {
  // strip accidental wrapping quotes, then turn \n into real newlines
  return k.trim().replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n')
}
function getCreds() {
  const json = process.env.GOOGLE_CREDENTIALS
  if (json) {
    const obj = JSON.parse(json)
    if (!obj.client_email || !obj.private_key) {
      throw new Error('GOOGLE_CREDENTIALS missing client_email/private_key')
    }
    return { client_email: obj.client_email, private_key: normalizeKey(obj.private_key) }
  }
  const email = process.env.SA_CLIENT_EMAIL
  const key = normalizeKey(process.env.SA_PRIVATE_KEY || '')
  if (!email || !key) throw new Error('Missing SA_CLIENT_EMAIL / SA_PRIVATE_KEY')
  return { client_email: email, private_key: key }
}

const {
  PROJECT_ID,
  LOCATION = 'global',
  ENGINE_ID,
} = process.env

// Build and log the exact engine path we will call
const ENGINE_PATH = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}`
const SERVING_CONFIG = `${ENGINE_PATH}/servingConfigs/default_search`
console.log('ENGINE_PATH:', ENGINE_PATH)
console.log('SERVING_CONFIG:', SERVING_CONFIG)

let convClient
function getClient() {
  if (!convClient) {
    const creds = getCreds()
    convClient = new v1.ConversationalSearchServiceClient({
      projectId: PROJECT_ID,
      credentials: creds,
    })
  }
  return convClient
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    if (!PROJECT_ID || !ENGINE_ID) {
      const err = `Missing PROJECT_ID/ENGINE_ID (got PROJECT_ID=${PROJECT_ID || 'unset'}, ENGINE_ID=${ENGINE_ID || 'unset'})`
      console.error(err)
      return { statusCode: 500, body: JSON.stringify({ error: err }) }
    }

    const { message, sessionName } = JSON.parse(event.body || '{}') || {}
    if (!message) return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) }

    const [resp] = await getClient().answerQuery({
      servingConfig: SERVING_CONFIG,
      query: { text: message },
      session: sessionName ? { name: sessionName } : undefined,
    })

    const answerText = resp?.answer?.answerText
    if (!answerText) {
      console.warn('NO_ANSWER_TEXT', { payloadKeys: Object.keys(resp || {}) })
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ debug: true, enginePath: ENGINE_PATH, resp })
      }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(resp),
    }
  } catch (e) {
    // Bubble up engine path in error to spot mismatches quickly
    console.error('CHAT_ERR', e?.message, { enginePath: ENGINE_PATH })
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `CHAT_ERR: ${e?.message || 'unknown'}`, enginePath: ENGINE_PATH })
    }
  }
}
