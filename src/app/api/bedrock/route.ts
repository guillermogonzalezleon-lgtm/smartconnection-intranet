import { NextResponse } from 'next/server';

// Bedrock uses AWS Signature V4 — we call it via the Bedrock REST API
// In Amplify, AWS credentials come from the runtime environment
export async function POST(request: Request) {
  const { prompt, system } = await request.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });

  // Use Bedrock converse API via AWS SDK approach with fetch
  // Since we can't use boto3 in Next.js, we use the Bedrock REST API
  // But AWS Sig V4 is complex to implement in pure JS without SDK
  // Alternative: use the @aws-sdk/client-bedrock-runtime if installed

  try {
    // Try dynamic import of AWS SDK (available in Node.js runtime on Amplify)
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        system: system || 'Eres un experto en cloud AWS. Responde en español.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const text = body.content?.[0]?.text || 'Sin respuesta';

    return NextResponse.json({ result: text, tokens: (body.usage?.input_tokens || 0) + (body.usage?.output_tokens || 0) });
  } catch (err) {
    // If SDK not available, return error
    return NextResponse.json({ error: `Bedrock SDK: ${String(err).slice(0, 200)}` }, { status: 500 });
  }
}
