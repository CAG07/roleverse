'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/add2e';

interface ADD2ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
}

export default function ADD2ESheet({ characterId, data, equipment = [] }: ADD2ESheetProps) {
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const level = (data.level as number) ?? 0;
  const alignment = (data.alignment as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="ADD2E"
      schema={schema}
      data={data}
      equipment={equipment}
      metaLines={[`${race} ${characterClass} · Level ${level} · ${alignment}`]}
    />
  );
}
