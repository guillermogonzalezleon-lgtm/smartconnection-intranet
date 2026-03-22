import Head from 'next/head';

interface SeoHeadProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  keywords?: string[];
}

export const SeoHead = ({
  title,
  description,
  canonical,
  image,
  keywords = []
}: SeoHeadProps) => {
  const seoImage = image || '/images/default-social.jpg';

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical || 'https://smconnection.cl'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={seoImage} />
    </Head>
  );
};