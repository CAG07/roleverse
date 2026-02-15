'use client';

type FGStatus = 'not_connected' | 'connected' | 'syncing';

interface FGConnectionStatusProps {
  status?: FGStatus;
}

const statusConfig: Record<FGStatus, { label: string; dotClass: string }> = {
  not_connected: { label: 'Not Connected', dotClass: 'bg-gray-400' },
  connected: { label: 'Connected', dotClass: 'bg-green-500' },
  syncing: { label: 'Syncing', dotClass: 'bg-amber-400 animate-pulse' },
};

export default function FGConnectionStatus({
  status = 'not_connected',
}: FGConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 rounded-md bg-brown-dark/50 px-3 py-1.5 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
      <span className="text-cream/70">FG: {config.label}</span>
    </div>
  );
}
