'use client';

type VoiceState = 'inactive' | 'discord';

interface VoiceStatusProps {
  status?: VoiceState;
  users?: string[];
}

const statusConfig: Record<VoiceState, { label: string; dotClass: string }> = {
  inactive: { label: 'Voice Inactive', dotClass: 'bg-gray-400' },
  discord: { label: 'Voice Active (Discord)', dotClass: 'bg-green-500' },
};

export default function VoiceStatus({ status = 'inactive', users = [] }: VoiceStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex flex-col gap-1 rounded-md bg-brown-dark/50 px-3 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
        <span className="text-cream/70">{config.label}</span>
      </div>
      {status !== 'inactive' && users.length > 0 && (
        <div className="ml-4 text-cream/50">
          {users.map((user) => (
            <div key={user}>• {user}</div>
          ))}
        </div>
      )}
    </div>
  );
}
