'use client';

// Party Status doubles as the marching order: ranks of two, front to back
// (lib/characters/marching-order.ts). Rearrange by dragging a box onto another
// place, or by selecting a box (click, tap, Enter or Space) and then the place
// to move it to; touch screens and keyboards use the second way. Moving onto
// a filled place swaps the two characters. While a box is picked up, an empty
// rank appears at the rear so a character can be moved behind everyone.

import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { RANK_SIZE, swapPlaces, type MarchingOrder, type SlotPosition } from '@/lib/characters/marching-order';
import styles from './PartyStatus.module.css';

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
  marchingOrder: MarchingOrder;
  onMarchingOrderChange: (order: MarchingOrder) => void;
}

const statusDotClass: Record<PartyMember['status'], string> = {
  active: styles.dotActive,
  unconscious: styles.dotUnconscious,
  dead: styles.dotDead,
};

function rankLabel(index: number, count: number): string {
  if (index === 0) return 'Front';
  if (index === count - 1) return 'Rear';
  return String(index + 1);
}

function samePlace(a: SlotPosition | null, b: SlotPosition): boolean {
  return a !== null && a.rank === b.rank && a.place === b.place;
}

export default function PartyStatus({ members, marchingOrder, onMarchingOrderChange }: PartyStatusProps) {
  const [picked, setPicked] = useState<SlotPosition | null>(null);
  const [dropTarget, setDropTarget] = useState<SlotPosition | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));

  const moveTo = (target: SlotPosition) => {
    if (picked && !samePlace(picked, target)) {
      onMarchingOrderChange(swapPlaces(marchingOrder, picked, target));
    }
    setPicked(null);
    setDropTarget(null);
  };

  const handleSelect = (position: SlotPosition, filled: boolean) => {
    if (picked) moveTo(position);
    else if (filled) setPicked(position);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, position: SlotPosition, filled: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(position, filled);
    } else if (e.key === 'Escape') {
      setPicked(null);
    }
  };

  const dropHandlers = (position: SlotPosition) => ({
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!samePlace(dropTarget, position)) setDropTarget(position);
    },
    onDragLeave: () => setDropTarget((current) => (samePlace(current, position) ? null : current)),
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      moveTo(position);
    },
  });

  // An extra empty rank at the rear, only while a character is picked up.
  const ranks: MarchingOrder = picked
    ? [...marchingOrder, Array<null>(RANK_SIZE).fill(null)]
    : marchingOrder;

  return (
    <div className={styles.partyStatus}>
      <div className={styles.sectionLabel}>Party Status</div>
      {members.length === 0 ? (
        <div className={styles.memberList}>
          <p className={styles.empty}>No party members yet.</p>
        </div>
      ) : (
        <>
          <p className={styles.hint}>
            {picked
              ? 'Choose where to move them, or press Escape to cancel.'
              : 'Marching order, front to back. Drag to rearrange.'}
          </p>
          <div className={styles.memberList}>
            {ranks.map((rank, r) => (
              <div key={r} className={styles.rankRow}>
                <span className={styles.rankLabel}>{rankLabel(r, ranks.length)}</span>
                {rank.map((id, p) => {
                  const position = { rank: r, place: p };
                  const member = id ? byId.get(id) : undefined;
                  const classNames = [
                    member ? styles.memberBox : styles.emptyPlace,
                    samePlace(picked, position) ? styles.picked : '',
                    samePlace(dropTarget, position) ? styles.dropTarget : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  if (!member) {
                    return (
                      <div
                        key={p}
                        className={classNames}
                        role="button"
                        tabIndex={picked ? 0 : -1}
                        aria-label="Empty place"
                        onClick={() => handleSelect(position, false)}
                        onKeyDown={(e) => handleKeyDown(e, position, false)}
                        {...dropHandlers(position)}
                      />
                    );
                  }

                  return (
                    <div
                      key={p}
                      className={classNames}
                      role="button"
                      tabIndex={0}
                      aria-pressed={samePlace(picked, position)}
                      aria-label={`${member.characterName}, ${rankLabel(r, ranks.length)} rank. Select to move.`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', member.id);
                        setPicked(position);
                      }}
                      onDragEnd={() => {
                        setPicked(null);
                        setDropTarget(null);
                      }}
                      onClick={() => handleSelect(position, true)}
                      onKeyDown={(e) => handleKeyDown(e, position, true)}
                      {...dropHandlers(position)}
                    >
                      <div className={styles.memberTop}>
                        <span className={`${styles.statusDot} ${statusDotClass[member.status]}`} />
                        <span className={styles.memberName}>{member.characterName}</span>
                      </div>
                      <div className={styles.memberBottom}>
                        <span className={styles.memberClass}>{member.characterClass}</span>
                        <span className={styles.memberHp}>
                          {member.maxHp > 0 ? `${member.currentHp}/${member.maxHp}` : '—/—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
