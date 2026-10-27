'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/dnd5e2024';

interface DND5E2024SheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function DND5E2024Sheet({ characterId, data, equipment = [], compact }: DND5E2024SheetProps) {
  const species = (data.race as string) ?? '—';
  const characterClass = (data.class as string) ?? '—';
  const subclass = (data.subclass as string) ?? '';
  const level = (data.level as number) ?? 0;
  const background = (data.background as string) ?? '—';
  const alignment = (data.alignment as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="5E_2024"
      schema={schema}
      data={data}
      equipment={equipment}
      showAbilityModifiers
      metaLines={[
        `${species} ${characterClass}${subclass ? ` (${subclass})` : ''} · Level ${level}`,
        `${background} · ${alignment}`,
      ]}
      hiddenFieldKeys={['background', 'alignment']}
      compact={compact}
    />
  );
}
