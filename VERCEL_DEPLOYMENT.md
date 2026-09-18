# Vercel Deployment Guide for BlogSpy AI

BlogSpy AI is architected to deploy directly to **Vercel** as a full-stack application (Vite SPA frontend + Vercel Serverless Function API backend) with zero manual infrastructure configuration.

---

## 🚀 1-Click / Git Deployment to Vercel

### Step 1: Push Code to GitHub / GitLab / Bitbucket
Ensure your repository contains:
- `vercel.json` (Included in root: configures static frontend builds and `/api` serverless rewrites)
- `api/index.ts` (Included in root: Vercel Serverless Function entry point)
- `package.json` & `vite.config.ts`

### Step 2: Import Project in Vercel
1. Log in to [Vercel Dashboard](https://vercel.com) and click **"Add New..."** -> **"Project"**.
2. Select your repository.
3. Vercel will automatically detect **Vite** with the following presets (from `vercel.json`):
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` or `vite build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 🔑 Environment Variables Configuration

In your Vercel Project Settings under **Settings > Environment Variables**, add the following environment variables:

| Variable Name | Description | Example / Source |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini AI API key for intelligence synthesis | `AIzaSy...` (from Google AI Studio) |
| `FIREBASE_CONFIG` | *(Optional)* Raw JSON string of your Firebase configuration | `{"apiKey":"...","projectId":"..."}` |
| `VITE_FIREBASE_API_KEY` | *(Optional)* If configuring individual keys | Your Firebase API Key |
| `VITE_FIREBASE_PROJECT_ID` | *(Optional)* Firebase project identifier | `ai-studio-blogspyai-...` |
| `VITE_FIREBASE_DATABASE_ID`| *(Optional)* Named Firestore database ID | `(default)` or custom ID |

*Note: If `firebase-applet-config.json` is present in your repo, Firebase will initialize automatically from it out-of-the-box.*

---

## 🛠️ Architecture on Vercel

1. **Frontend (SPA)**:
   - Built via `vite build` into `/dist`.
   - Served globally via Vercel's Edge Network / CDN.
   - All SPA client-side routes fallback seamlessly to `index.html`.

2. **Backend API (`/api/*`)**:
   - Routed to `api/index.ts` via Vercel Serverless Functions.
   - Handles:
     - `/api/probe` (Target crawler discovery & feed analysis)
     - `/api/scrape-article` (Universal DOM extraction)
     - `/api/analyze` (Gemini AI Strategic Insights)
     - `/api/test-publish` (Controlled latency simulator)
     - `/api/settings/*` & `/api/test-webhook` (Integration hooks)
     - `/api/health` & `/api/scale-metrics` (Cluster telemetry)

3. **Database & Real-Time Sync**:
   - Firestore Client SDK connects client-side and server-side with real-time reactive snapshot streams.

---

## ⚡ Local Testing before Deployment

To test locally with the Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Or run the bundled standalone server:

```bash
npm run build
npm start
```
