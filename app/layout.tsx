import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cinzel_Decorative, Cinzel, EB_Garamond } from 'next/font/google';
import './globals.css';

// next/font/google downloads and self-hosts fonts at build time.
// No runtime Google CDN dependency, no FOUC — this is the reliable approach.

const fontDisplay = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const fontHeading = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-heading-loaded',
  display: 'swap',
});

const fontBody = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RoleVerse — AI-Powered Tabletop RPG Companion',
  description:
    'Your AI dungeon master companion. Manage campaigns, characters, and sessions across classic tabletop RPG systems.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontHeading.variable} ${fontBody.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
