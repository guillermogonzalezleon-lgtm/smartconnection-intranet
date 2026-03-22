import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, GetDistributionCommand } from '@aws-sdk/client-cloudfront';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const s3 = new S3Client({ region: 'sa-east-1' });
    const cf = new CloudFrontClient({ region: 'us-east-1' });

    // S3 stats
    let s3Objects = 0, s3Size = 0, s3LastModified = '';
    try {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: 'smartconnetion25', MaxKeys: 1000 }));
      s3Objects = list.KeyCount || 0;
      s3Size = (list.Contents || []).reduce((s, o) => s + (o.Size || 0), 0);
      const sorted = (list.Contents || []).sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
      s3LastModified = sorted[0]?.LastModified?.toISOString() || '';
    } catch (e) { /* s3 error */ }

    // CloudFront status
    let cfStatus = 'Unknown', cfDomain = '', cfEnabled = false;
    try {
      const dist = await cf.send(new GetDistributionCommand({ Id: 'E3O4YBX3RKHQUL' }));
      cfStatus = dist.Distribution?.Status || 'Unknown';
      cfDomain = dist.Distribution?.DomainName || '';
      cfEnabled = dist.Distribution?.DistributionConfig?.Enabled || false;
    } catch (e) { /* cf error */ }

    return NextResponse.json({
      s3: { objects: s3Objects, bytes: s3Size, mb: Math.round(s3Size / 1024 / 1024 * 10) / 10, lastModified: s3LastModified, bucket: 'smartconnetion25', region: 'sa-east-1' },
      cloudfront: { status: cfStatus, domain: cfDomain, enabled: cfEnabled, id: 'E3O4YBX3RKHQUL' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
