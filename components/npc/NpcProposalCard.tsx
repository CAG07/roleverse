/*
 * IMPORTANT: This component uses CSS Modules (not styled-jsx) intentionally.
 *
 * This is a 'use client' component rendered inside a server layout.
 * styled-jsx styles in client components are injected at runtime after JS hydration,
 * causing a Flash of Unstyled Content (FOUC) — components briefly appear
 * unstyled before styles are applied.
 *
 * CSS Modules are statically extracted at build time and injected as a <link> tag
 * in the <head>, guaranteeing styles are present before the first paint.
 *
 * Do NOT convert this file back to styled-jsx or inline styles.
 */

'use client';

import { useState } from 'react';
import styles from './NpcProposalCard.module.css';
import type { NpcProposal, NpcInput, NpcDisposition } from '@/lib/types/npc';

export interface NpcProposalCardProps {
  proposal: NpcProposal;
  onApprove: (approved: NpcProposal) => Promise<void>;
  onReject: () => void;
  isProcessing?: boolean;
}

const DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  friendly: 'Friendly',
  helpful: 'Helpful',
  neutral: 'Neutral',
  wary: 'Wary',
  hostile: 'Hostile',
};

// ── new_npc variant ──────────────────────────────────────────────────────────

function NewNpcCard({
  proposal,
  onApprove,
  onReject,
  isProcessing,
}: NpcProposalCardProps) {
  const initial = proposal.npc_data ?? {};
  const [fields, setFields] = useState<Partial<NpcInput>>({
    name: proposal.npc_name ?? '',
    race: initial.race ?? '',
    occupation: initial.occupation ?? '',
    description: initial.description ?? '',
    personality: initial.personality ?? '',
    disposition: initial.disposition ?? 'neutral',
  });
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const set = (key: keyof NpcInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const handleApprove = async () => {
    setApprovalError(null);
    try {
      await onApprove({ ...proposal, npc_name: fields.name, npc_data: { ...fields } });
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.kindBadge}>New NPC Proposed</span>
        <span className={styles.hint}>Edit before saving</span>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.fieldLabel}>
          Name <span className={styles.required}>*</span>
          <input className={styles.input} value={fields.name ?? ''} onChange={set('name')} disabled={isProcessing} />
        </label>
        <label className={styles.fieldLabel}>
          Race
          <input className={styles.input} value={fields.race ?? ''} onChange={set('race')} disabled={isProcessing} />
        </label>
        <label className={styles.fieldLabel}>
          Occupation
          <input className={styles.input} value={fields.occupation ?? ''} onChange={set('occupation')} disabled={isProcessing} />
        </label>
        <label className={styles.fieldLabel}>
          Disposition
          <select className={styles.select} value={fields.disposition ?? 'neutral'} onChange={set('disposition')} disabled={isProcessing}>
            {(Object.keys(DISPOSITION_LABELS) as NpcDisposition[]).map((d) => (
              <option key={d} value={d}>{DISPOSITION_LABELS[d]}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.fieldLabel}>
        Description
        <textarea className={styles.textarea} value={fields.description ?? ''} onChange={set('description')} rows={2} disabled={isProcessing} />
      </label>
      <label className={styles.fieldLabel}>
        Personality
        <textarea className={styles.textarea} value={fields.personality ?? ''} onChange={set('personality')} rows={2} disabled={isProcessing} />
      </label>

      {approvalError && <p className={styles.approvalError}>{approvalError}</p>}

      <div className={styles.actions}>
        <button className={styles.btnApprove} onClick={() => void handleApprove()} disabled={isProcessing || !fields.name?.trim()} type="button">
          {isProcessing ? 'Saving…' : 'Add to Roster'}
        </button>
        <button className={styles.btnReject} onClick={onReject} disabled={isProcessing} type="button">
          Reject
        </button>
      </div>
    </div>
  );
}

// ── append_facts variant ─────────────────────────────────────────────────────

function AppendFactsCard({
  proposal,
  onApprove,
  onReject,
  isProcessing,
}: NpcProposalCardProps) {
  const facts = proposal.facts_to_add ?? [];
  const [selected, setSelected] = useState<boolean[]>(facts.map(() => true));
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const toggle = (i: number) =>
    setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const handleApprove = async () => {
    const approvedFacts = facts.filter((_, i) => selected[i]);
    if (approvedFacts.length === 0) {
      onReject();
      return;
    }
    setApprovalError(null);
    try {
      await onApprove({ ...proposal, facts_to_add: approvedFacts });
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.kindBadge}>New Facts Proposed</span>
        <span className={styles.npcName}>{proposal.npc_name}</span>
      </div>

      <div className={styles.factList}>
        {facts.map((f, i) => (
          <label key={i} className={styles.factRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selected[i]}
              onChange={() => toggle(i)}
              disabled={isProcessing}
            />
            <span className={styles.factText}>{f.fact}</span>
          </label>
        ))}
      </div>

      {approvalError && <p className={styles.approvalError}>{approvalError}</p>}

      <div className={styles.actions}>
        <button
          className={styles.btnApprove}
          onClick={() => void handleApprove()}
          disabled={isProcessing || selected.every((s) => !s)}
          type="button"
        >
          {isProcessing ? 'Saving…' : 'Approve Selected'}
        </button>
        <button className={styles.btnReject} onClick={onReject} disabled={isProcessing} type="button">
          Reject All
        </button>
      </div>
    </div>
  );
}

// ── disposition_shift variant ────────────────────────────────────────────────

function DispositionShiftCard({
  proposal,
  onApprove,
  onReject,
  isProcessing,
}: NpcProposalCardProps) {
  const change = proposal.disposition_change;
  const [rollResult, setRollResult] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  if (!change) return null;

  const rollRequired = change.roll_required;

  const handleSubmit = async () => {
    setApprovalError(null);
    try {
      if (rollRequired) {
        const roll = parseInt(rollResult, 10);
        if (isNaN(roll)) return;
        const resolved =
          roll >= rollRequired.dc
            ? rollRequired.outcome_on_success
            : rollRequired.outcome_on_failure;
        await onApprove({ ...proposal, disposition_change: { ...change, to: resolved } });
      } else {
        await onApprove(proposal);
      }
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.kindBadge}>Disposition Shift Proposed</span>
        <span className={styles.npcName}>{proposal.npc_name}</span>
      </div>

      <div className={styles.shiftRow}>
        <span className={`${styles.dispBadge} ${styles[`disp_${change.from}`]}`}>
          {DISPOSITION_LABELS[change.from]}
        </span>
        <span className={styles.shiftArrow}>→</span>
        <span className={`${styles.dispBadge} ${styles[`disp_${change.to}`]}`}>
          {DISPOSITION_LABELS[change.to]}
        </span>
      </div>

      <p className={styles.shiftReason}>{change.reason}</p>

      {rollRequired && (
        <div className={styles.rollBlock}>
          <span className={styles.rollLabel}>
            {rollRequired.stat} check — DC {rollRequired.dc}
          </span>
          <div className={styles.rollInputRow}>
            <input
              className={styles.rollInput}
              type="number"
              min={1}
              max={30}
              placeholder="Roll result"
              value={rollResult}
              onChange={(e) => setRollResult(e.target.value)}
              disabled={isProcessing}
            />
            <span className={styles.rollOutcomes}>
              ≥{rollRequired.dc}: {DISPOSITION_LABELS[rollRequired.outcome_on_success]} &nbsp;
              &lt;{rollRequired.dc}: {DISPOSITION_LABELS[rollRequired.outcome_on_failure]}
            </span>
          </div>
        </div>
      )}

      {approvalError && <p className={styles.approvalError}>{approvalError}</p>}

      <div className={styles.actions}>
        <button
          className={styles.btnApprove}
          onClick={() => void handleSubmit()}
          disabled={isProcessing || (rollRequired !== undefined && rollResult.trim() === '')}
          type="button"
        >
          {isProcessing ? 'Saving…' : rollRequired ? 'Resolve Roll' : 'Apply Shift'}
        </button>
        <button className={styles.btnReject} onClick={onReject} disabled={isProcessing} type="button">
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function NpcProposalCard(props: NpcProposalCardProps) {
  if (props.proposal.kind === 'new_npc') return <NewNpcCard {...props} />;
  if (props.proposal.kind === 'append_facts') return <AppendFactsCard {...props} />;
  if (props.proposal.kind === 'disposition_shift') return <DispositionShiftCard {...props} />;
  return null;
}
