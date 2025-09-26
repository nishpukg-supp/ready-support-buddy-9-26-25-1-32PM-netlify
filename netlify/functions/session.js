// netlify/functions/session.js
const { v1 } = require('@google-cloud/discoveryengine')

const {
  PROJECT_ID,
  LOCATION = 'global',
  ENGINE_ID,
  SA_CLIENT_EMAIL,
  SA_PRIVATE_KEY,
} = process.env

const sessionClient = new v1.SessionServiceClient({
  projectId: PROJECT_ID,
  credentials: {
    client_email: SA_CLIENT_EMAIL,
    private_key: (SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
})

exports.handler = async () => {
  try {
    if (!PROJECT_ID || !ENGINE_ID || !SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) {
      const err = 'Missing env: PROJECT_ID/ENGINE_ID/SA_CLIENT_EMAIL/SA_PRIVATE_KEY'
      console.error(err, {
        hasProject: !!PROJECT_ID,
        hasEngine: !!ENGINE_ID,
        hasEmail: !!SA_CLIENT_EMAIL,
        keyLen: (SA_PRIVATE_KEY || '').length,
      })
      return { statusCode: 500, body: JSON.stringify({ error: err }) }
    }
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}`
    const [session] = await sessionClient.createSession({ parent, session: {} })
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionName: session.name }) }
  } catch (e) {
    console.error('SESSION_ERR', e?.message, e)
    return { statusCode: 500, body: JSON.stringify({ error: `SESSION_ERR: ${e?.message || 'unknown'}` }) }
  }
}
