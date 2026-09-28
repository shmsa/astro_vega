import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Astro Vega V1.7 - Astrólogo Erwin Rommel',
  description: 'Aplicação Operacional de Mapa Natal Vega & Precisão Suíça',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #1e293b;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          * {
            box-sizing: border-box;
          }
          @media print {
            header, nav, button, .no-print {
              display: none !important;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            main {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
