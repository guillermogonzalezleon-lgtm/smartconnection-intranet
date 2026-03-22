import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return new Response('OPENAI_API_KEY no configurada', { status: 500 });

  const { text, voice } = await request.json();
  if (!text) return new Response('Texto requerido', { status: 400 });

  // Clean text for TTS
  const clean = text
    .replace(/```[\s\S]*?```/g, 'código generado')
    .replace(/[#*_`→✓●◌⟳]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{2,}/g, '. ')
    .trim()
    .slice(0, 4000); // OpenAI TTS max ~4096 chars

  if (clean.length < 5) return new Response('Texto muy corto', { status: 400 });

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice || 'nova', // nova = warm female, alloy = neutral, echo = male
        input: clean,
        response_format: 'mp3',
        speed: 1.05,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(`OpenAI TTS error: ${err}`, { status: 502 });
    }

    // Stream the audio back
    return new Response(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return new Response(`TTS error: ${String(err)}`, { status: 500 });
  }
}
