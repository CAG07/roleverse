'use client';

interface GenericSheetProps {
  data: Record<string, unknown>;
  systemName: string;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function GenericSheet({ data, systemName }: GenericSheetProps) {
  const entries = Object.entries(data);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded border border-gold/40 bg-cream/90 p-3 text-sm">
      <div className="border-b border-gold/30 pb-2">
        <h3 className="font-medieval text-lg text-rust">
          {(data.name as string) ?? 'Character'}
        </h3>
        <p className="text-xs text-brown/50">System: {systemName}</p>
      </div>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2 text-xs">
            <span className="min-w-[80px] font-medium text-brown/70">{key}:</span>
            <span className="whitespace-pre-wrap break-all text-brown">{renderValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
