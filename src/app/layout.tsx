import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Connection — Intranet',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <head>
        <link rel="shortcut icon" href="/img/smart.ico" />
        <link rel="preload" href="/img/logo_smart.svg" as="image" />
        <link rel="preload" href="/img/hoku.jpg" as="image" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
