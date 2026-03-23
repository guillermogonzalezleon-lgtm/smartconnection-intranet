import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new Response('URL requerida', { status: 400 });

  // Only allow known documentation domains
  const allowed = ['docs.anthropic.com', 'console.groq.com', 'platform.openai.com', 'cookbook.openai.com', 'huggingface.co', 'nextjs.org', 'supabase.com', 'docs.aws.amazon.com', 'vercel.com', 'modelcontextprotocol.io', 'docs.github.com', 'github.com', 'learning.sap.com', 'community.sap.com', 'discovery-center.cloud.sap', 'tailwindcss.com', 'www.typescriptlang.org', 'help.figma.com', 'totaltypescript.com'];
  const domain = new URL(url).hostname;
  if (!allowed.some(d => domain.includes(d))) return new Response('Dominio no permitido', { status: 403 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 SmartConnection/1.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Response(`Error: ${res.status}`, { status: 502 });

    let html = await res.text();

    // Rewrite relative URLs to absolute
    const base = new URL(url);
    html = html
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`);

    // Inject base tag and dark mode override
    html = html.replace('</head>', `
      <base href="${base.origin}/" target="_blank">
      <style>
        body { color-scheme: dark !important; }
        a { color: #00e5b0 !important; }
        a:hover { text-decoration: underline !important; }
        img { max-width: 100% !important; }
      </style>
    </head>`);

    // Remove X-Frame-Options by serving from our domain
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response(`Proxy error: ${String(e).slice(0, 200)}`, { status: 502 });
  }
}
