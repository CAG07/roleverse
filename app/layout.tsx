import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const crimsonText = localFont({
  src: [
    { path: '../public/fonts/CrimsonText-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/CrimsonText-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/CrimsonText-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-crimson',
  display: 'swap',
});

const medievalSharp = localFont({
  src: '../public/fonts/MedievalSharp-Regular.woff2',
  weight: '400',
  variable: '--font-medieval',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RoleVerse — AI-Powered Tabletop RPG Companion',
  description:
    'Your AI dungeon master companion. Manage campaigns, characters, and sessions across classic tabletop RPG systems.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${crimsonText.variable} ${medievalSharp.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
