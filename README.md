# ReadyMentor — Single Netlify site (Frontend + Functions)

This repo is ready for **Option B** from our chat: deploy both the Vite React frontend and the backend as **Netlify Functions** in one site.

## Layout
- `web/` — React app (Vite)
- `netlify/functions/` — Functions: `session`, `chat`, `healthz`

## Configure (Netlify CLI)
```bash
npm i -g netlify-cli

# From repo root
netlify init  # create/link a site

# Environment variables
netlify env:set PROJECT_ID "<your-gcp-project-id>"
netlify env:set ENGINE_ID "<your-engine-id>"
netlify env:set LOCATION "global"
netlify env:set SA_CLIENT_EMAIL "service-account@<project>.iam.gserviceaccount.com"
netlify env:set SA_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Local test
netlify dev
# Open http://localhost:8888 and hit /.netlify/functions/healthz

# Deploy
netlify deploy --build       # preview
netlify deploy --prod --build
```

## Configure (Netlify UI)
- Build base: **web**
- Build command: **npm run build**
- Publish directory: **web/dist**
- Add the same env vars as above in **Site settings → Environment variables**.

## Frontend API base
Frontend reads `VITE_API_BASE=/.netlify/functions`, so it calls:
- `/.netlify/functions/session`
- `/.netlify/functions/chat`
- `/.netlify/functions/healthz`

No CORS needed since it’s the same site.
