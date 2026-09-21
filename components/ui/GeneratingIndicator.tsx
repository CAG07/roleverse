import styles from './GeneratingIndicator.module.css';

/** Animated progress sweep + reassuring copy shown during a slow (20-30s+) AI
 *  generation call, so a static "Generating…" button label doesn't read as
 *  hung/broken. Reuses the same sweep animation already used for file-indexing
 *  progress (OracleRefsPanel/CampaignFilesPanel). */
export function GeneratingIndicator({ label }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.track} role="progressbar" aria-label={label ?? 'Generating'}>
        <div className={styles.bar} />
      </div>
      <span className={styles.hint}>
        {label ?? 'This can take up to 30 seconds — the AI is writing a full character.'}
      </span>
    </div>
  );
}
