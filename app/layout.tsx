import type { Metadata } from 'next';
import { Crimson_Text, MedievalSharp } from 'next/font/google';
import './globals.css';

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-crimson',
  display: 'swap',
});

const medievalSharp = MedievalSharp({
  subsets: ['latin'],
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
