import * as admin from 'firebase-admin';
require('dotenv').config(); // Load env vars immediately
import { onRequest } from 'firebase-functions/v2/https';

if (!admin.apps.length) {
  admin.initializeApp();
}

import app from './app';

export const api = onRequest({
  region: 'us-central1',
  memory: '1GiB', // Puppeteer needs more memory
  timeoutSeconds: 300, // Grid generation + Gemini can take time
}, app);

// Keep legacy-style exports for frontend compatibility if needed, 
// but pointing them to the Express app or reimplementing via common logic
// Since the frontend in GMB II app/page.tsx points to /generate, /history, /report
// We can either update the frontend or keep these wrappers.
// The Express app uses /api/generate, etc. 

export const generate = api;
export const report = api;
export const history = api;
