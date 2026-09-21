'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/dnd35e';

interface DND35ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function DND35ESheet({ characterId, data, equipment = [], compact }: DND35ESheetProps) {
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const level = (data.level as number) ?? 0;
  const alignment = (data.alignment as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="3_5E"
      schema={schema}
      data={data}
      equipment={equipment}
      showAbilityModifiers
      metaLines={[`${race} ${characterClass} · Level ${level} · ${alignment}`]}
      hiddenFieldKeys={['alignment']}
      compact={compact}
    />
  );
}
