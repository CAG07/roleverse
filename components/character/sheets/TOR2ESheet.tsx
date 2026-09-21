'use client';

import BaseSheet from './BaseSheet';
import schema from '@/lib/character/sheet-schema/tor2e';

interface TOR2ESheetProps {
  characterId: string;
  data: Record<string, unknown>;
  equipment?: unknown[];
  compact?: boolean;
}

export default function TOR2ESheet({ characterId, data, equipment = [], compact }: TOR2ESheetProps) {
  const heroicCulture = (data.heroicCulture as string) ?? (data.race as string) ?? '—';
  const calling = (data.calling as string) ?? '—';

  return (
    <BaseSheet
      characterId={characterId}
      gameSystem="TOR2E"
      schema={schema}
      data={data}
      equipment={equipment}
      metaLines={[`${heroicCulture} · ${calling}`]}
      hiddenFieldKeys={['heroicCulture', 'calling']}
      compact={compact}
    />
  );
}
