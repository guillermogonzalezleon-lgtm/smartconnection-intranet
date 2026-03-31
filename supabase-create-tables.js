const puppeteer = require('puppeteer-core');

const SQL = `
CREATE TABLE IF NOT EXISTS kaizen_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number INTEGER NOT NULL,
  score_global TEXT NOT NULL DEFAULT 'C',
  total_bytes INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_files INTEGER NOT NULL DEFAULT 0,
  criticals JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  positives JSONB DEFAULT '[]',
  top_actions JSONB DEFAULT '[]',
  scores_by_area JSONB DEFAULT '{}',
  fixes_applied INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS andon_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'green',
  score TEXT DEFAULT 'A',
  detail TEXT,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project, area)
);

CREATE TABLE IF NOT EXISTS ooda_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  observe TEXT,
  orient TEXT,
  decide TEXT,
  act TEXT,
  result TEXT,
  project TEXT,
  agent TEXT,
  status TEXT NOT NULL DEFAULT 'decided',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kaizen_created ON kaizen_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_andon_project ON andon_signals(project, area);
CREATE INDEX IF NOT EXISTS idx_ooda_created ON ooda_decisions(created_at DESC);
`;

(async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    userDataDir: '/tmp/puppeteer-supabase-profile',
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const page = await browser.newPage();
  console.log('Navigating to Supabase SQL Editor...');
  await page.goto('https://supabase.com/dashboard/project/yjjtbwfgtoepsevvkzta/sql/new', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Check if we need to log in
  const url = page.url();
  if (url.includes('sign-in') || url.includes('auth')) {
    console.log('ERROR: Needs login. Using API approach instead.');
    await browser.close();
    process.exit(1);
  }

  // Wait for the Monaco editor to load
  console.log('Waiting for SQL editor...');
  try {
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
  } catch {
    console.log('ERROR: SQL editor not found. Probably needs login.');
    console.log('Current URL:', page.url());
    await browser.close();
    process.exit(1);
  }

  // Click on the editor and type SQL
  console.log('Typing SQL...');
  await page.click('.monaco-editor');
  await page.keyboard.hotkey('Meta', 'a');
  await page.keyboard.press('Backspace');

  // Use clipboard to paste (faster than typing)
  await page.evaluate((sql) => {
    navigator.clipboard.writeText(sql);
  }, SQL);
  await page.keyboard.hotkey('Meta', 'v');

  // Wait a moment for paste
  await new Promise(r => setTimeout(r, 1000));

  // Click Run button
  console.log('Clicking Run...');
  const runBtn = await page.$('button:has-text("Run"), button[aria-label="Run"]');
  if (runBtn) {
    await runBtn.click();
  } else {
    // Try keyboard shortcut
    await page.keyboard.hotkey('Meta', 'Enter');
  }

  await new Promise(r => setTimeout(r, 3000));
  console.log('Done! Check Supabase for results.');
  await browser.close();
})();
