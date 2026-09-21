'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/cyberpunk2020';

interface Cyberpunk2020SheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function Cyberpunk2020Sheet({
  characterId,
  data,
  equipment = [],
  compact,
}: Cyberpunk2020SheetProps) {
  const role = (data.class as string) ?? '—';
  const realName = (data.realName as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="CYBERPUNK_2020"
      schema={schema}
      data={data}
      equipment={equipment}
      metaLines={[`${role} · ${realName}`]}
      hiddenFieldKeys={['realName']}
      compact={compact}
    />
  );
}
