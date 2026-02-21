import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoleVerse — AI-Powered Tabletop RPG Companion',
  description:
    'Your AI dungeon master companion. Manage campaigns, characters, and sessions across classic tabletop RPG systems.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
