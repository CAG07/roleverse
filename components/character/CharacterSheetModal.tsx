'use client';

import { X } from 'lucide-react';
import CharacterSheet from './CharacterSheet';
import styles from './CharacterSheetModal.module.css';

interface DCCFunnelMember {
  id: string;
  name: string;
  occupation?: string;
  hp?: { current: number; max: number };
  ac?: number;
}

interface CharacterSheetModalProps {
  open: boolean;
  onClose: () => void;
  characterId: string;
  gameSystem: string;
  characterData: Record<string, unknown>;
  equipment?: unknown[];
  rawGameDataStats?: Record<string, unknown>;
  funnelParty?: DCCFunnelMember[];
}

export default function CharacterSheetModal({
  open,
  onClose,
  characterId,
  gameSystem,
  characterData,
  equipment,
  rawGameDataStats,
  funnelParty,
}: CharacterSheetModalProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Full character sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close full character sheet"
        >
          <X size={16} />
        </button>

        <div className={styles.scrollArea}>
          <CharacterSheet
            characterId={characterId}
            gameSystem={gameSystem}
            characterData={characterData}
            equipment={equipment}
            rawGameDataStats={rawGameDataStats}
            funnelParty={funnelParty}
          />
        </div>
      </div>
    </div>
  );
}
