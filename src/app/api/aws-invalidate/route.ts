import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const cf = new CloudFrontClient({ region: 'us-east-1' });
    const { paths } = await request.json();

    const result = await cf.send(new CreateInvalidationCommand({
      DistributionId: 'E3O4YBX3RKHQUL',
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: { Quantity: 1, Items: paths || ['/*'] },
      },
    }));

    return NextResponse.json({
      success: true,
      invalidationId: result.Invalidation?.Id,
      status: result.Invalidation?.Status,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
