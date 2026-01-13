import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DatoCMS Backup API',
  description: 'API service for DatoCMS automatic environment backups',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
