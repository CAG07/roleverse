import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cinzel, Cinzel_Decorative, EB_Garamond } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font — zero external request at runtime, eliminating
// the render-blocking CSS @import url() that caused the FOUC.
const fontDisplay = Cinzel_Decorative({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const fontHeading = Cinzel({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-heading-loaded',
  display: 'swap',
});

const fontBody = EB_Garamond({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
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
