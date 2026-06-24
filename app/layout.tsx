import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';

const fontDisplay = localFont({
  src: '../public/fonts/MedievalSharp-Regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-display-loaded',
  display: 'swap',
});

const fontHeading = localFont({
  src: [
    {
      path: '../public/fonts/CrimsonText-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/CrimsonText-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/CrimsonText-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-heading-loaded',
  display: 'swap',
});

const fontBody = localFont({
  src: [
    {
      path: '../public/fonts/CrimsonText-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/CrimsonText-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
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
