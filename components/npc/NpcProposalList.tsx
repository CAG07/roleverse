/*
 * IMPORTANT: This component uses CSS Modules (not styled-jsx) intentionally.
 * Do NOT convert this file back to styled-jsx or inline styles.
 */

'use client';

import { useState } from 'react';
import { NpcProposalCard } from './NpcProposalCard';
import type { NpcProposal } from '@/lib/types/npc';

interface NpcProposalListProps {
  proposals: NpcProposal[];
  onApprove: (index: number, approved: NpcProposal) => Promise<void>;
  onReject: (index: number) => void;
}

export function NpcProposalList({ proposals, onApprove, onReject }: NpcProposalListProps) {
  const [handledIndices, setHandledIndices] = useState<Set<number>>(new Set());
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);

  const handleApprove = async (index: number, approved: NpcProposal) => {
    setProcessingIndex(index);
    try {
      await onApprove(index, approved);
      setHandledIndices((prev) => new Set([...prev, index]));
    } finally {
      setProcessingIndex(null);
    }
  };

  const handleReject = (index: number) => {
    setHandledIndices((prev) => new Set([...prev, index]));
    onReject(index);
  };

  const visible = proposals.filter((_, i) => !handledIndices.has(i));
  if (visible.length === 0) return null;

  return (
    <div>
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
  );
}
