'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/add1e';

interface ADD1ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function ADD1ESheet({ characterId, data, equipment = [], compact }: ADD1ESheetProps) {
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const level = (data.level as number) ?? 0;
  const alignment = (data.alignment as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="ADD1E"
      schema={schema}
      data={data}
      equipment={equipment}
      metaLines={[`${race} ${characterClass} · Level ${level} · ${alignment}`]}
      compact={compact}
    />
  );
}
