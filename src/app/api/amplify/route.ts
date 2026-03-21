import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const AMPLIFY_APP_ID = process.env.AWS_AMPLIFY_APP_ID || 'd2qam7xccab5t8';
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// AWS Signature V4 simplified for Amplify API
async function amplifyApi(method: string, path: string): Promise<Record<string, unknown> | null> {
  if (!AWS_KEY || !AWS_SECRET) return null;

  const host = `amplify.${AWS_REGION}.amazonaws.com`;
  const url = `https://${host}${path}`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = dateStamp.slice(0, 8);

  // For simplicity, use GitHub API to check last commit status instead of raw AWS sig
  // AWS Amplify auto-deploys on push, so we check GitHub commit status
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO || 'guillermogonzalezleon-lgtm/smartconnection-intranet';

  if (!ghToken) return null;

  const res = await fetch(`https://api.github.com/repos/${ghRepo}/commits/main/status`, {
    headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { action } = await request.json();

  // Get latest build status via GitHub commit status (Amplify reports back)
  if (action === 'build_status') {
    const ghToken = process.env.GITHUB_TOKEN;
    const ghRepo = process.env.GITHUB_REPO || 'guillermogonzalezleon-lgtm/smartconnection-intranet';

    if (!ghToken) return NextResponse.json({ error: 'GITHUB_TOKEN no configurado' }, { status: 500 });

    try {
      // Get last commit
      const commitRes = await fetch(`https://api.github.com/repos/${ghRepo}/commits/main`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!commitRes.ok) return NextResponse.json({ error: `GitHub ${commitRes.status}` }, { status: 502 });
      const commit = await commitRes.json();

      // Get commit statuses (Amplify posts here)
      const statusRes = await fetch(`https://api.github.com/repos/${ghRepo}/commits/${commit.sha}/status`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
      });
      const status = statusRes.ok ? await statusRes.json() : null;

      // Get check runs (alternative way Amplify reports)
      const checksRes = await fetch(`https://api.github.com/repos/${ghRepo}/commits/${commit.sha}/check-runs`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
      });
      const checks = checksRes.ok ? await checksRes.json() : null;

      // Find Amplify check
      const amplifyCheck = checks?.check_runs?.find((c: Record<string, unknown>) =>
        String(c.name || '').toLowerCase().includes('amplify') ||
        String((c.app as Record<string, unknown>)?.name || '').toLowerCase().includes('amplify')
      );

      return NextResponse.json({
        commit: {
          sha: commit.sha?.slice(0, 7),
          message: commit.commit?.message?.split('\n')[0],
          date: commit.commit?.committer?.date,
          author: commit.commit?.author?.name,
        },
        status: status?.state || 'unknown', // pending, success, failure
        amplify: amplifyCheck ? {
          status: amplifyCheck.status, // queued, in_progress, completed
          conclusion: amplifyCheck.conclusion, // success, failure, null
          started_at: amplifyCheck.started_at,
          completed_at: amplifyCheck.completed_at,
          url: amplifyCheck.html_url,
        } : null,
        statuses: status?.statuses?.map((s: Record<string, unknown>) => ({
          context: s.context,
          state: s.state,
          description: s.description,
          url: s.target_url,
        })) || [],
      });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Health check — ping the live site
  if (action === 'health_check') {
    const urls = [
      'https://intranet.smconnection.cl',
      'https://www.smconnection.cl',
    ];

    const results = await Promise.all(urls.map(async (url) => {
      const start = Date.now();
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        return { url, status: res.status, latency: Date.now() - start, ok: res.ok };
      } catch (err) {
        return { url, status: 0, latency: Date.now() - start, ok: false, error: String(err) };
      }
    }));

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
