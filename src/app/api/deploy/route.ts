import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseInsert } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubFile {
  path: string;
  content: string;
  message?: string;
}

async function githubApi(url: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  return res.json();
}

// Get file SHA (needed for updates)
async function getFileSha(repo: string, path: string): Promise<string | null> {
  try {
    const data = await githubApi(`/repos/${repo}/contents/${path}`);
    return data?.sha || null;
  } catch {
    return null;
  }
}

// Create or update a file in the repo
async function commitFile(repo: string, file: GitHubFile): Promise<{ success: boolean; url?: string; error?: string }> {
  const sha = await getFileSha(repo, file.path);
  const body: Record<string, unknown> = {
    message: file.message || `feat(ux-agent): ${file.path} — mejora automática desde intranet`,
    content: Buffer.from(file.content).toString('base64'),
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `GitHub ${res.status}: ${err}` };
  }
  const data = await res.json();
  return { success: true, url: data.content?.html_url };
}

// Trigger a GitHub Actions workflow
async function triggerWorkflow(repo: string, workflowId: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    return { success: false, error: `Workflow ${res.status}: ${err}` };
  }
  return { success: true };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (!GITHUB_TOKEN) return NextResponse.json({ error: 'GITHUB_TOKEN no configurado' }, { status: 500 });

  try {
    const body = await request.json();
    const { action } = body;

    // Track API usage
    supabaseInsert('analytics', { page: '/api/deploy', event: action || 'unknown', source: 'api', created_at: new Date().toISOString() }).catch(() => {});

    // ── Save improvement to Supabase ──
    if (action === 'save_improvement') {
      const { titulo, descripcion, categoria, impacto, agente, codigo } = body;
      const record = await supabaseInsert('ux_insights', {
        titulo: titulo || 'Mejora generada por IA',
        descripcion: descripcion || '',
        categoria: categoria || 'UX',
        impacto: impacto || 'Por evaluar',
        estado: 'en_progreso',
        ciclo: body.ciclo || 1,
        agente: agente || 'hoku',
        codigo: codigo || '',
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, data: record });
    }

    // ── Commit file to GitHub ──
    if (action === 'commit_file') {
      const { repo, path, content, message } = body;
      const targetRepo = repo || 'guillermogonzalezleon-lgtm/smartconnection-astro';
      const result = await commitFile(targetRepo, { path, content, message });
      if (result.success) {
        await supabaseInsert('agent_logs', {
          agent_id: 'deployer', agent_name: 'Deploy Bot',
          action: 'commit', detail: `Committed ${path} to ${targetRepo}`,
          status: 'success',
        }).catch(() => {});
      }
      return NextResponse.json(result);
    }

    // ── Commit multiple files ──
    if (action === 'commit_files') {
      const { repo, files, message } = body as { repo?: string; files: GitHubFile[]; message?: string };
      const targetRepo = repo || 'guillermogonzalezleon-lgtm/smartconnection-astro';
      const results = [];
      for (const file of files) {
        file.message = message || file.message;
        const r = await commitFile(targetRepo, file);
        results.push({ path: file.path, ...r });
      }
      const allOk = results.every(r => r.success);
      await supabaseInsert('agent_logs', {
        agent_id: 'deployer', agent_name: 'Deploy Bot',
        action: 'commit_batch', detail: `${results.length} files to ${targetRepo}`,
        status: allOk ? 'success' : 'error',
      }).catch(() => {});
      return NextResponse.json({ success: allOk, results });
    }

    // ── Trigger deploy (GitHub Actions) ──
    if (action === 'trigger_deploy') {
      const { repo, workflow } = body;
      const targetRepo = repo || 'guillermogonzalezleon-lgtm/smartconnection-astro';
      const workflowId = workflow || 'deploy-aws.yml';
      const result = await triggerWorkflow(targetRepo, workflowId);
      await supabaseInsert('agent_logs', {
        agent_id: 'deployer', agent_name: 'Deploy Bot',
        action: 'deploy', detail: `Triggered ${workflowId} on ${targetRepo}`,
        status: result.success ? 'success' : 'error',
      }).catch(() => {});
      return NextResponse.json(result);
    }

    // ── Full pipeline: save + commit + deploy ──
    if (action === 'full_pipeline') {
      const { repo, files, improvement, workflow } = body;
      const targetRepo = repo || 'guillermogonzalezleon-lgtm/smartconnection-astro';
      const steps: { step: string; success: boolean; detail?: string }[] = [];

      // Step 1: Save improvement
      if (improvement) {
        try {
          await supabaseInsert('ux_insights', {
            titulo: improvement.titulo || 'Mejora automática',
            descripcion: improvement.descripcion || '',
            categoria: improvement.categoria || 'UX',
            impacto: improvement.impacto || 'Por evaluar',
            estado: 'en_progreso',
            ciclo: improvement.ciclo || 1,
            agente: improvement.agente || 'hoku',
            created_at: new Date().toISOString(),
          });
          steps.push({ step: 'save', success: true, detail: 'Mejora guardada en Supabase' });
        } catch (err) {
          steps.push({ step: 'save', success: false, detail: String(err) });
        }
      }

      // Step 2: Commit files
      if (files && files.length > 0) {
        for (const file of files as GitHubFile[]) {
          const r = await commitFile(targetRepo, file);
          steps.push({ step: 'commit', success: r.success, detail: r.success ? `${file.path} committed` : r.error });
          if (!r.success) return NextResponse.json({ success: false, steps });
        }
      }

      // Step 3: Deploy (push to main auto-triggers AWS Amplify)
      if (workflow) {
        const r = await triggerWorkflow(targetRepo, workflow);
        steps.push({ step: 'deploy', success: r.success, detail: r.success ? 'Workflow triggered' : r.error });
      } else {
        // Commits to main already trigger auto-deploy
        steps.push({ step: 'deploy', success: true, detail: 'Auto-deploy triggered via push to main' });
      }

      const pipelineSuccess = steps.every(s => s.success);
      await supabaseInsert('agent_logs', {
        agent_id: 'deployer', agent_name: 'Pipeline Bot',
        action: 'full_pipeline', detail: JSON.stringify(steps),
        status: pipelineSuccess ? 'success' : 'error',
      }).catch(() => {});

      // Register deploy event in analytics for cross-section tracking
      await supabaseInsert('analytics', {
        source: 'deploy_pipeline',
        page: '/dashboard/deploy',
        event: pipelineSuccess ? 'deploy_success' : 'deploy_error',
        detail: `${steps.length} steps · ${targetRepo}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      return NextResponse.json({ success: pipelineSuccess, steps });
    }

    // ── List repos ──
    if (action === 'list_repos') {
      const repos = await githubApi('/user/repos?per_page=10&sort=updated');
      return NextResponse.json({ repos: repos?.map((r: Record<string, unknown>) => ({ name: r.full_name, url: r.html_url, updated: r.updated_at })) || [] });
    }

    // ── Rollback: revert repo to a previous commit's tree ──
    if (action === 'rollback' && body.commitSha) {
      const repo = body.repo || 'guillermogonzalezleon-lgtm/smartconnection-intranet';

      // 1. Get target commit's tree
      const targetCommit = await githubApi(`/repos/${repo}/git/commits/${body.commitSha}`);
      if (!targetCommit?.tree?.sha) {
        return NextResponse.json({ error: 'No se pudo obtener el tree del commit objetivo' }, { status: 400 });
      }

      // 2. Get current HEAD
      const head = await githubApi(`/repos/${repo}/git/refs/heads/main`);
      const currentSha = head?.object?.sha;
      if (!currentSha) {
        return NextResponse.json({ error: 'No se pudo obtener el HEAD actual' }, { status: 400 });
      }

      // 3. Create new commit with old tree
      const newCommit = await githubApi(`/repos/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: `revert: rollback to ${body.commitSha.slice(0, 7)} — ${body.message || 'manual rollback'}`,
          tree: targetCommit.tree.sha,
          parents: [currentSha],
        }),
      });
      if (!newCommit?.sha) {
        return NextResponse.json({ error: 'No se pudo crear el commit de rollback' }, { status: 500 });
      }

      // 4. Update main branch
      const refUpdate = await githubApi(`/repos/${repo}/git/refs/heads/main`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha, force: false }),
      });
      if (!refUpdate?.object?.sha) {
        return NextResponse.json({ error: 'No se pudo actualizar la ref de main' }, { status: 500 });
      }

      // 5. Log to Supabase
      await supabaseInsert('agent_logs', {
        agent_id: 'deployer',
        agent_name: 'Deploy Bot',
        action: 'rollback',
        detail: `Rollback to ${body.commitSha.slice(0, 7)} on ${repo} — new commit: ${newCommit.sha.slice(0, 7)}`,
        status: 'success',
      }).catch(() => {});

      return NextResponse.json({ success: true, sha: newCommit.sha });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
