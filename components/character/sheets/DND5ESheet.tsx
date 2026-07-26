'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/dnd5e';

interface DND5ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
}

export default function DND5ESheet({ characterId, data, equipment = [] }: DND5ESheetProps) {
  const race = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const subclass = (data.subclass as string) ?? '';
  const level = (data.level as number) ?? 0;
  const background = (data.background as string) ?? '—';
  const alignment = (data.alignment as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="5E_2014"
      schema={schema}
      data={data}
      equipment={equipment}
      showAbilityModifiers
      metaLines={[
        `${race} ${characterClass}${subclass ? ` (${subclass})` : ''} · Level ${level}`,
        `${background} · ${alignment}`,
      ]}
    />
  );
}
