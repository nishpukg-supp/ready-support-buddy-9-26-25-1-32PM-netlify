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

const SERVING_CONFIG = () => `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    if (!PROJECT_ID || !ENGINE_ID || !SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing required environment variables' }),
      }
    }

    const { message, sessionName } = JSON.parse(event.body || '{}')
    if (!message) return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) }

    const [resp] = await convClient.answerQuery({
      servingConfig: SERVING_CONFIG(),
      query: { text: message },
      session: sessionName ? { name: sessionName } : undefined,
      // You can add: searchSpec: { contentSearchSpec: { queryExpansionSpec: {...} } }
      // Or filters here if needed.
    })

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(resp),
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
