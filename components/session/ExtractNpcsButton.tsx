/*
 * IMPORTANT: This component uses CSS Modules (not styled-jsx) intentionally.
 * Do NOT convert this file back to styled-jsx or inline styles.
 */

'use client';

import { useState } from 'react';
import styles from './ExtractNpcsButton.module.css';
import { NpcProposalCard } from '@/components/npc/NpcProposalCard';
import type { NpcProposal } from '@/lib/types/npc';

interface ExtractNpcsButtonProps {
  campaignId: string;
  sessionId: string;
}

export function ExtractNpcsButton({ campaignId, sessionId }: ExtractNpcsButtonProps) {
  const [extracting, setExtracting] = useState(false);
  const [proposals, setProposals] = useState<NpcProposal[] | null>(null);
  const [handledIndices, setHandledIndices] = useState<Set<number>>(new Set());
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    setProposals(null);
    setHandledIndices(new Set());
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/extract-npcs`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Extraction failed' }));
        setError((data as { error?: string }).error ?? 'Extraction failed');
        return;
      }
      const data = await res.json() as { proposals: NpcProposal[] };
      setProposals(data.proposals);
    } finally {
      setExtracting(false);
    }
  };

  const handleApprove = async (index: number, proposal: NpcProposal) => {
    setProcessingIndex(index);
    try {
      if (proposal.kind === 'new_npc') {
        await fetch(`/api/campaigns/${campaignId}/npcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal.npc_data ?? { name: proposal.npc_name }),
        });
      } else if (proposal.kind === 'append_facts' && proposal.npc_id) {
        await fetch(`/api/campaigns/${campaignId}/npcs/${proposal.npc_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ known_facts: proposal.facts_to_add ?? [] }),
        });
      }
      setHandledIndices((prev) => new Set([...prev, index]));
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleReject = (index: number) => {
    setHandledIndices((prev) => new Set([...prev, index]));
  };

  const pendingCount = proposals ? proposals.filter((_, i) => !handledIndices.has(i)).length : 0;

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.btnExtract}
        type="button"
        onClick={() => void handleExtract()}
        disabled={extracting}
      >
        {extracting ? 'Extracting…' : '⟳ Extract NPCs from Session'}
      </button>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {proposals !== null && (
        <div className={styles.proposalSection}>
          <div className={styles.proposalHeader}>
            <span className={styles.proposalCount}>
              {proposals.length === 0
                ? 'No NPCs found in this transcript.'
                : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} — ${pendingCount} pending`}
            </span>
          </div>
          {proposals.map((proposal, i) => {
            if (handledIndices.has(i)) return null;
            return (
              <NpcProposalCard
                key={i}
                proposal={proposal}
                onApprove={(approved) => handleApprove(i, approved)}
                onReject={() => handleReject(i)}
                isProcessing={processingIndex === i}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
