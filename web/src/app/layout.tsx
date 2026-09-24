import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Astro Vega',
  description: 'Aplicação de Mapa Natal Vega',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
