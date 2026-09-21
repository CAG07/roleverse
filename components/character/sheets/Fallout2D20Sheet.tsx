'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/fallout2d20';

interface Fallout2D20SheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function Fallout2D20Sheet({
  characterId,
  data,
  equipment = [],
  compact,
}: Fallout2D20SheetProps) {
  const origin = (data.origin as string) ?? (data.race as string) ?? '—';
  const level = (data.level as number) ?? 0;

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="FALLOUT_2D20"
      schema={schema}
      data={data}
      equipment={equipment}
      metaLines={[`${origin} · Level ${level}`]}
      hiddenFieldKeys={['origin']}
      compact={compact}
    />
  );
}
