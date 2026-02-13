import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoleVerse — AI-Powered Tabletop RPG Companion',
  description:
    'Your AI dungeon master companion. Manage campaigns, characters, and sessions across classic tabletop RPG systems.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=MedievalSharp&family=Crimson+Text:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
