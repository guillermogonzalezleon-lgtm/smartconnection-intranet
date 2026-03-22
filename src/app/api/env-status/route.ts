import { NextResponse } from 'next/server';

export async function GET() {
  // No auth needed for this — just shows key status
  const keys = [
    { name: 'GROQ_API_KEY', provider: 'Groq', model: 'llama-3.3-70b' },
    { name: 'ANTHROPIC_API_KEY', provider: 'Claude', model: 'claude-haiku-4.5' },
    { name: 'GROK_API_KEY', provider: 'Grok', model: 'grok-3-mini' },
    { name: 'DEEPSEEK_API_KEY', provider: 'DeepSeek', model: 'deepseek-chat' },
    { name: 'MISTRAL_API_KEY', provider: 'Mistral', model: 'mistral-small' },
    { name: 'OPENAI_API_KEY', provider: 'OpenAI', model: 'gpt-4o-mini' },
    { name: 'COHERE_API_KEY', provider: 'Cohere', model: 'command-a' },
    { name: 'OPENROUTER_API_KEY', provider: 'OpenRouter', model: 'llama-3.3-70b' },
    { name: 'GITHUB_TOKEN', provider: 'GitHub', model: 'API' },
    { name: 'SUPABASE_URL', provider: 'Supabase', model: 'PostgreSQL' },
  ];

  const status = keys.map(k => ({
    ...k,
    configured: !!process.env[k.name],
    masked: process.env[k.name] ? process.env[k.name]!.slice(0, 8) + '...' : null,
  }));

  // AWS — check if Bedrock credentials work (they come from Amplify runtime)
  let awsConfigured = false;
  try {
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const sts = new STSClient({ region: 'us-east-1' });
    await sts.send(new GetCallerIdentityCommand({}));
    awsConfigured = true;
  } catch { awsConfigured = false; }

  status.push({ name: 'AWS_CREDENTIALS', provider: 'AWS Bedrock/S3/CF', model: 'IAM', configured: awsConfigured, masked: awsConfigured ? 'runtime...' : null });

  return NextResponse.json({
    total: status.length,
    configured: status.filter(s => s.configured).length,
    status
  });
}
