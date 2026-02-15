'use client';

interface PartyMember {
  id: string;
  characterName: string;
  characterClass: string;
  currentHp: number;
  maxHp: number;
  status: 'active' | 'unconscious' | 'dead';
}

interface PartyStatusProps {
  members: PartyMember[];
}

const statusColors: Record<PartyMember['status'], string> = {
  active: 'bg-green-500',
  unconscious: 'bg-amber-400',
  dead: 'bg-red-500',
};

export default function PartyStatus({ members }: PartyStatusProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medieval text-sm text-gold">Party Status</h3>
      <div className="rounded border border-gold/40 bg-cream/80 p-2">
        {members.length === 0 ? (
          <p className="text-xs text-brown/50">No party members yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-xs text-brown">
                <span className={`inline-block h-2 w-2 rounded-full ${statusColors[m.status]}`} />
                <span className="flex-1 truncate font-medium">{m.characterName}</span>
                <span className="text-brown/60">{m.characterClass}</span>
                <span className="tabular-nums text-brown/70">
                  {m.currentHp}/{m.maxHp} HP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
