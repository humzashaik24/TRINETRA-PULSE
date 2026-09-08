import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ApiProvider } from '@/lib/api/provider';
import { AuthBootstrap } from '@/components/auth/auth-bootstrap';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Trinetra Pulse',
  description: 'AI-powered Criminal Network Intelligence and Investigation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ApiProvider>
            <AuthBootstrap>{children}</AuthBootstrap>
          </ApiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
