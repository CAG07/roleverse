'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Users, FileText, Settings, Sword } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FGConnectionStatus from './FGConnectionStatus';
import VoiceStatus from './VoiceStatus';

interface PartyMemberInfo {
  id: string;
  name: string;
  role: 'dm' | 'player';
}

interface SessionSidebarProps {
  campaignName: string;
  gameSystem: string;
  partyMembers: PartyMemberInfo[];
  isDM?: boolean;
  campaignId: string;
  onToggleNotes?: () => void;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: typeof ChevronDown;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gold/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-cream/80 hover:text-gold"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className="h-4 w-4" />
        <span className="font-medieval">{title}</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function SessionSidebar({
  campaignName,
  gameSystem,
  partyMembers,
  isDM = false,
  campaignId,
  onToggleNotes,
}: SessionSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r-2 border-gold bg-brown text-cream">
      {/* Campaign header */}
      <div className="border-b border-gold/30 p-4">
        <div className="flex items-center gap-2">
          <Sword className="h-5 w-5 text-gold" />
          <h2 className="truncate font-medieval text-lg text-gold">{campaignName}</h2>
        </div>
        <Badge variant="teal" className="mt-1">
          {gameSystem}
        </Badge>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Party Members */}
        <CollapsibleSection title="Party Members" icon={Users}>
          {partyMembers.length === 0 ? (
            <p className="text-xs text-cream/40">No members yet.</p>
          ) : (
            <ul className="space-y-1">
              {partyMembers.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-cream/70">{m.name}</span>
                  <Badge
                    variant={m.role === 'dm' ? 'gold' : 'outline'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {m.role === 'dm' ? 'DM' : 'Player'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        {/* Session Notes */}
        <CollapsibleSection title="Session Notes" icon={FileText} defaultOpen={false}>
          <button
            onClick={onToggleNotes}
            className="w-full rounded bg-brown-dark/50 px-3 py-1.5 text-xs text-cream/60 hover:text-gold"
          >
            Open Notes Panel
          </button>
        </CollapsibleSection>

        {/* Settings (DM only) */}
        {isDM && (
          <CollapsibleSection title="Settings" icon={Settings} defaultOpen={false}>
            <a
              href={`/campaigns/${campaignId}`}
              className="block rounded bg-brown-dark/50 px-3 py-1.5 text-xs text-cream/60 hover:text-gold"
            >
              Campaign Settings
            </a>
          </CollapsibleSection>
        )}
      </div>

      {/* Status indicators */}
      <div className="space-y-1.5 border-t border-gold/30 p-3">
        <FGConnectionStatus />
        <VoiceStatus />
      </div>
    </aside>
  );
}
