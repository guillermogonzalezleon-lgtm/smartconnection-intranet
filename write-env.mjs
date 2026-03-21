// Writes Amplify environment variables to .env.production for Next.js SSR runtime
import { writeFileSync } from 'fs';

const vars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SESSION_SECRET',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_CALENDAR_ID',
];

const lines = vars
  .filter(v => process.env[v])
  .map(v => `${v}=${process.env[v]}`);

if (lines.length > 0) {
  writeFileSync('.env.production', lines.join('\n') + '\n');
  console.log(`[write-env] Wrote ${lines.length} env vars to .env.production`);
} else {
  console.log('[write-env] No env vars found, skipping');
}
