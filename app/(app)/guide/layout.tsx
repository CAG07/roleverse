import type { ReactNode } from 'react';
import { GuideWikiShell } from '@/components/guide/GuideWikiShell';

export default function GuideLayout({ children }: { children: ReactNode }) {
  return <GuideWikiShell>{children}</GuideWikiShell>;
}
